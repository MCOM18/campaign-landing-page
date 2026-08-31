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
