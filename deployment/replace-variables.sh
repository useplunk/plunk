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

# Process each directory that might contain JS files
for dir in "/app/packages/dashboard/public" "/app/packages/dashboard/.next"; do
    if [ -d "$dir" ]; then
        # Find all JS files and process them
        find "$dir" -type f -name "*.js" -o -name "*.mjs" | while read -r file; do
            if [ -f "$file" ]; then
                # Replace environment variables
                sed -i "s|PLUNK_API_URI|${API_URI}|g" "$file"
                sed -i "s|PLUNK_AWS_REGION|${AWS_REGION}|g" "$file"
                echo "Processed: $file"
            fi
        done
    else
        echo "Warning: Directory $dir does not exist, skipping..."
    fi
done

echo "Environment Variables Baked."
