SELECT clicks."link", a."name", count(clicks.id)::int FROM clicks
JOIN emails e on clicks."emailId" = e.id
JOIN actions a on e."actionId" = a.id
WHERE clicks."link" NOT LIKE '%unsubscribe%' AND DATE(clicks."createdAt") BETWEEN DATE($1) AND DATE($2) AND a."projectId" = $3
GROUP BY a."name", clicks."link"