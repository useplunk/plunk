-- Synthetic contact corpus for the contact-search benchmark.
--
-- Invoked by run.sh with `-v contacts=<n> -v project=<id>`. Generates a realistic
-- email distribution: ~45% gmail.com (so there is a genuinely low-selectivity search
-- term to test against), a long tail of corporate domains, and firstname/lastname
-- local parts drawn from a fixed corpus so search-term selectivity is reproducible.
--
-- Emails get a wide numeric suffix: without it the name x separator x domain space is
-- only ~400k combinations and 2M draws collide into ~1.5M distinct values. The real
-- (projectId, email) unique index already exists at seed time (migrations run first),
-- so collisions are dropped by ON CONFLICT and the tenant lands slightly under target;
-- run.sh reports the actual row count it measured against.

\set ON_ERROR_STOP on

INSERT INTO projects (id, name, public, secret, "createdAt", "updatedAt")
VALUES (:'project', 'Benchmark Project', :'project' || '-public', :'project' || '-secret', now(), now())
ON CONFLICT (id) DO NOTHING;

-- A second tenant holding 20% extra rows, so `projectId` is a genuinely selective
-- predicate rather than matching the whole table.
INSERT INTO projects (id, name, public, secret, "createdAt", "updatedAt")
VALUES ('bench_other', 'Benchmark Other', 'bench_other-public', 'bench_other-secret', now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO contacts (id, email, data, subscribed, "projectId", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  (ARRAY['james','mary','john','patricia','robert','jennifer','michael','linda','william',
         'elizabeth','david','barbara','richard','susan','joseph','jessica','thomas','sarah',
         'charles','karen','chris','nancy','daniel','lisa','matthew','betty','anthony',
         'margaret','mark','sandra','donald','ashley','steven','kimberly','paul','emily',
         'andrew','donna','joshua','michelle','marc','laura','pau','carla','jordi','nuria',
         'sergio','elena','ivan','marta'])[1 + floor(random()*50)::int]
  || (ARRAY['.','','_','-'])[1 + floor(random()*4)::int]
  || (ARRAY['smith','johnson','williams','brown','jones','garcia','miller','davis','rodriguez',
            'martinez','hernandez','lopez','gonzalez','wilson','anderson','thomas','taylor',
            'moore','jackson','martin','lee','perez','thompson','white','harris','sanchez',
            'clark','ramirez','lewis','robinson','walker','young','allen','king','wright',
            'scott','torres','nguyen','hill','flores','sanz','puig','ferrer','soler','vila',
            'roca','bosch','mas','serra','pons'])[1 + floor(random()*50)::int]
  || floor(random()*999999)::text
  || '@'
  || (ARRAY['gmail.com','gmail.com','gmail.com','gmail.com','gmail.com','gmail.com','gmail.com',
            'gmail.com','gmail.com','gmail.com','gmail.com','gmail.com','gmail.com','gmail.com',
            'gmail.com','gmail.com','gmail.com','gmail.com',
            'hotmail.com','hotmail.com','hotmail.com','hotmail.com',
            'yahoo.com','yahoo.com','yahoo.com','outlook.com','outlook.com','icloud.com',
            'live.com','protonmail.com','aol.com','gmx.com','yandex.com','mail.ru',
            'acme.co','globex.com','initech.com','umbrella.io','hooli.com','piedpiper.com'
           ])[1 + floor(random()*40)::int],
  jsonb_build_object(
    'firstName', (ARRAY['james','mary','john','robert','elena','pau'])[1 + floor(random()*6)::int],
    'plan', (ARRAY['free','pro','enterprise'])[1 + floor(random()*3)::int],
    'signupSource', (ARRAY['web','api','import','referral'])[1 + floor(random()*4)::int]
  ),
  random() > 0.08,
  CASE WHEN g <= :contacts THEN :'project' ELSE 'bench_other' END,
  now() - (random() * interval '900 days'),
  now()
FROM generate_series(1, (:contacts * 1.2)::bigint) g
ON CONFLICT ("projectId", email) DO NOTHING;

VACUUM (ANALYZE) contacts;
