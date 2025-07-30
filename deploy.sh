#!/bin/bash

echo "Building for deployment..."

# Build the application
npm run build

# Copy static files to correct location for deployment
echo "Copying static files to deployment directory..."
cp -r dist/public/* dist/

echo "Static deployment files ready in dist/ directory"
echo "You can now deploy as a static site"

# List the final structure
echo "Final deployment structure:"
ls -la dist/