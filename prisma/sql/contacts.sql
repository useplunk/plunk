WITH date_range AS (
    SELECT generate_series(
        (SELECT DATE_TRUNC('day', MIN("createdAt")) FROM contacts),
        DATE_TRUNC('day', NOW()) + INTERVAL '1 day',
        INTERVAL '1 day'
    ) AS day
)

SELECT
    dr.day,
    SUM(COALESCE(ct.count, 0)) OVER (ORDER BY dr.day) as count
FROM date_range dr
LEFT JOIN (
    SELECT
        DATE_TRUNC('day', c."createdAt") AS day,
        COUNT(c.id) as count
    FROM contacts c
    WHERE "projectId" = $1
    GROUP BY DATE_TRUNC('day', c."createdAt")
) ct ON dr.day = ct.day
WHERE dr.day < DATE_TRUNC('day', NOW())
ORDER BY dr.day DESC
LIMIT 30;