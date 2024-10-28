#!/bin/bash

echo "Baking Environment Variables..."

if [ -z "${API_URI}" ]; then
    echo "API_URI is not set. Exiting..."
    exit 1
fi

if [ -z "${AWS_REGION}" ]; then
    echo "AWS_REGION is not set. Exiting..."
    exit 1
fi

# Find and replace baked values with real values for the API_URI AND AWS_REGION
find /app/packages/dashboard/public /app/packages/dashboard/.next -type f -name "*.js" |
while read file; do
    sed -i "s|PLUNK_API_URI|${API_URI}|g" "$file"
    sed -i "s|PLUNK_AWS_REGION|${AWS_REGION}|g" "$file"
done

echo "Environment Variables Baked."