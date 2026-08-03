#!/bin/bash

set -e

APP_DIR="/var/www/subscription.jojoapp.in"

echo "========================================"
echo "Starting Application Deployment"
echo "========================================"

# Check if application directory exists
if [ ! -d "$APP_DIR" ]; then
    echo "ERROR: Application directory does not exist: $APP_DIR"
    exit 1
fi

cd "$APP_DIR"

echo "Current Directory: $(pwd)"

echo "Node Version:"
node -v

echo "NPM Version:"
npm -v

echo "========================================"
echo "Installing Dependencies..."
echo "========================================"

npm install

echo "========================================"
echo "Building Next.js Application..."
echo "========================================"

npm run build

echo "========================================"
echo "Deployment completed successfully."
echo "========================================"

exit 0
