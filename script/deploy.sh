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

echo "========================================="
echo "Reading Build Version"
echo "========================================="

if [ ! -f build_version.txt ]; then
    echo "ERROR: build_version.txt not found!"
    exit 1
fi

VERSION=$(cat build_version.txt)

if [ -z "$VERSION" ]; then
    echo "ERROR: Version is empty!"
    exit 1
fi

echo "Build Version : $VERSION"

echo


if grep -q "^NEXT_PUBLIC_APP_VERSION=" .env.production; then
    sed -i "s/^NEXT_PUBLIC_APP_VERSION=.*/NEXT_PUBLIC_APP_VERSION=${VERSION}/" .env.production
else
    echo "NEXT_PUBLIC_APP_VERSION=${VERSION}" >> .env.production
fi

echo "========================================"
echo "Installing Dependencies"
echo "========================================"

npm install

echo "========================================"
echo "Building Next.js"
echo "========================================"

NODE_OPTIONS="--max-old-space-size=4096" \
npm run build:prod -- --version="$VERSION"

echo "========================================"
echo "Deployment Completed"
echo "========================================"
