-- Normalize contact emails to lowercase + trimmed, collapsing case/whitespace
-- variant duplicates within each project into a single contact.
--
-- Background: the find-or-create path used a case-sensitive equality, so the
-- same address arriving in different casing (User@x.com vs user@x.com) created
-- two separate contacts with split subscription state and event history. From
-- now on emails are normalized on write; this migration repairs existing rows
-- so the `(projectId, email)` unique constraint can be enforced on the
-- normalized value.
--
-- Strategy per (projectId, lower(btrim(email))) group with more than one row:
--   * survivor = oldest row (createdAt asc, id asc as tiebreak)
--   * reassign emails / workflow executions / events / segment memberships to it
--   * merge custom data (survivor's keys win)
--   * subscribed = AND of all rows (a single unsubscribe wins)
--   * delete the now-empty duplicate rows
-- Finally, lowercase + trim every remaining email.

-- 1. Map each duplicate contact to its survivor.
CREATE TEMPORARY TABLE _contact_merge_map AS
SELECT id AS dup_id, survivor_id
FROM (
  SELECT
    id,
    FIRST_VALUE(id) OVER (
      PARTITION BY "projectId", lower(btrim(email))
      ORDER BY "createdAt" ASC, id ASC
    ) AS survivor_id
  FROM contacts
) ranked
WHERE id <> survivor_id;

-- 2. A single unsubscribe among the duplicates wins for the survivor.
UPDATE contacts s
SET subscribed = false
FROM _contact_merge_map m
JOIN contacts d ON d.id = m.dup_id
WHERE s.id = m.survivor_id
  AND d.subscribed = false;

-- 3. Merge custom data: union the duplicates' keys, then let the survivor's
--    own keys override. NULLIF keeps an all-empty result as NULL.
UPDATE contacts s
SET data = NULLIF(COALESCE(agg.dup_data, '{}'::jsonb) || COALESCE(s.data, '{}'::jsonb), '{}'::jsonb)
FROM (
  SELECT m.survivor_id, jsonb_object_agg(kv.key, kv.value) AS dup_data
  FROM _contact_merge_map m
  JOIN contacts d ON d.id = m.dup_id
  CROSS JOIN LATERAL jsonb_each(COALESCE(d.data, '{}'::jsonb)) AS kv(key, value)
  GROUP BY m.survivor_id
) agg
WHERE s.id = agg.survivor_id;

-- 4. Reassign child rows from duplicates to the survivor.
UPDATE emails e
SET "contactId" = m.survivor_id
FROM _contact_merge_map m
WHERE e."contactId" = m.dup_id;

UPDATE workflow_executions w
SET "contactId" = m.survivor_id
FROM _contact_merge_map m
WHERE w."contactId" = m.dup_id;

UPDATE events ev
SET "contactId" = m.survivor_id
FROM _contact_merge_map m
WHERE ev."contactId" = m.dup_id;

-- segment_memberships has a composite PK (contactId, segmentId). Drop any
-- duplicate membership the survivor already holds for the same segment, then
-- reassign the rest.
DELETE FROM segment_memberships dsm
USING _contact_merge_map m
WHERE dsm."contactId" = m.dup_id
  AND EXISTS (
    SELECT 1 FROM segment_memberships ssm
    WHERE ssm."contactId" = m.survivor_id
      AND ssm."segmentId" = dsm."segmentId"
  );

UPDATE segment_memberships dsm
SET "contactId" = m.survivor_id
FROM _contact_merge_map m
WHERE dsm."contactId" = m.dup_id;

-- 5. Delete the merged-away duplicate contacts.
DELETE FROM contacts c
USING _contact_merge_map m
WHERE c.id = m.dup_id;

-- 6. Normalize every remaining email. Groups are now unique on the normalized
--    value, so this cannot violate the unique constraint.
UPDATE contacts
SET email = lower(btrim(email))
WHERE email <> lower(btrim(email));

DROP TABLE _contact_merge_map;
