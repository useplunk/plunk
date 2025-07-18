#!/bin/sh

echo "Starting Prisma migrations..."
# Add retry logic for Prisma migrations
MAX_RETRIES=5
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  npx prisma migrate deploy && break
  
  RETRY_COUNT=$((RETRY_COUNT+1))
  echo "Prisma migration failed. Retry $RETRY_COUNT of $MAX_RETRIES..."
  sleep 5
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "Failed to run Prisma migrations after $MAX_RETRIES attempts."
  exit 1
fi

echo "Prisma migrations completed."

echo "Starting the API server..."
node /app/packages/api/app.js
