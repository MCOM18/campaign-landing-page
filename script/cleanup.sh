#!/bin/bash

set -e

APP_DIR="/var/www/subscription.jojoapp.in"

echo "===== Cleaning application directory ====="

# Skip if application directory doesn't exist
if [ ! -d "$APP_DIR" ]; then
    echo "Application directory does not exist. Skipping cleanup."
    exit 0
fi

cd "$APP_DIR"

find . -mindepth 1 \
    ! -name ".env" \
    ! -name ".env.*" \
    ! -name ".git" \
    ! -name ".gitignore" \
    -exec rm -rf {} + 2>/dev/null || true

echo "Cleanup completed successfully."

exit 0
