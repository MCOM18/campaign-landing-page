#!/bin/bash

set -e

source /home/ec2-user/.bashrc || source /etc/profile

if [ -s "$NVM_DIR/nvm.sh" ]; then
    . "$NVM_DIR/nvm.sh"
fi

APP_DIR="/var/www/subscription.jojoapp.in"

echo "========================================"
echo "Starting Application Deployment"
echo "========================================"

cd "$APP_DIR"

echo "Current Directory: $(pwd)"

echo "Node Version:"
node -v

echo "NPM Version:"
npm -v

echo "Updating App Version and Build Time"
echo "========================================"

if [ ! -f build_version.txt ]; then
    echo "ERROR: build_version.txt not found"
    exit 1
fi

if [ ! -f build_time.txt ]; then
    echo "ERROR: build_time.txt not found"
    exit 1
fi

VERSION=$(cat build_version.txt)
BUILD_TIME=$(cat build_time.txt)

echo "Version: $VERSION"
echo "Build Time: $BUILD_TIME"

for ENV_FILE in .env .env.production; do

    echo "Updating $ENV_FILE"

    touch "$ENV_FILE"

    if grep -q "^NEXT_PUBLIC_APP_VERSION=" "$ENV_FILE"; then
        sed -i "s|^NEXT_PUBLIC_APP_VERSION=.*|NEXT_PUBLIC_APP_VERSION=${VERSION}|" "$ENV_FILE"
    else
        echo "NEXT_PUBLIC_APP_VERSION=${VERSION}" >> "$ENV_FILE"
    fi

    if grep -q "^NEXT_PUBLIC_BUILD_TIME=" "$ENV_FILE"; then
        sed -i "s|^NEXT_PUBLIC_BUILD_TIME=.*|NEXT_PUBLIC_BUILD_TIME=${BUILD_TIME}|" "$ENV_FILE"
    else
        echo "NEXT_PUBLIC_BUILD_TIME=${BUILD_TIME}" >> "$ENV_FILE"
    fi

done

echo "========================================"
echo "Environment files updated"
echo "========================================"

grep "^NEXT_PUBLIC_APP_VERSION=" .env
grep "^NEXT_PUBLIC_BUILD_TIME=" .env

grep "^NEXT_PUBLIC_APP_VERSION=" .env.production
grep "^NEXT_PUBLIC_BUILD_TIME=" .env.production

echo "========================================"
echo "Installing Dependencies"
echo "========================================"

npm install

echo "========================================"
echo "Building Next.js"
echo "========================================"

npm run build

echo "========================================"
echo "Deployment Completed"
echo "========================================"
