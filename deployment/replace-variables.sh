#!/usr/bin/env bash
set -e

echo "Baking Environment Variables..."

if [ -z "${NEXT_PUBLIC_API_URI}" ]; then
    echo "NEXT_PUBLIC_API_URI is not set. Exiting..."
    exit 1
fi

if [ -z "${NEXT_PUBLIC_AWS_REGION}" ]; then
    echo "NEXT_PUBLIC_AWS_REGION is not set. Exiting..."
    exit 1
fi

# Process each directory that might contain JS files
for dir in "/app/packages/dashboard/public" "/app/packages/dashboard/.next"; do
    if [ -d "$dir" ]; then
        # Find all JS files and process them
        find "$dir" -type f -name "*.js" -o -name "*.mjs" | while read -r file; do
            if [ -f "$file" ]; then
                # Replace environment variables
                sed -i "s|PLUNK_API_URI|${NEXT_PUBLIC_API_URI}|g" "$file"
                sed -i "s|PLUNK_AWS_REGION|${NEXT_PUBLIC_AWS_REGION}|g" "$file"
                echo "Processed: $file"
            fi
        done
    else
        echo "Warning: Directory $dir does not exist, skipping..."
    fi
done

echo "Environment Variables Baked."
