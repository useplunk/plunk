#!/bin/sh

echo "Starting Prisma migrations..."
npx prisma migrate deploy
echo "Prisma migrations completed."

sh replace-variables.sh &&

nginx &

echo "Starting the API server..."
node packages/api/app.js &
echo "API server started in the background."

echo "Starting the Dashboard..."
cd packages/dashboard
npx next start -p 5000 -H 0.0.0.0
echo "Dashboard started."
