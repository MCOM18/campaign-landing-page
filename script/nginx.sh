#!/bin/bash

set -e

echo "Testing nginx configuration..."

nginx -t

echo "Reloading nginx..."

systemctl reload nginx

echo "Nginx reloaded successfully."
