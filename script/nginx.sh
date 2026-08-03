#!/bin/bash
set -e

nginx -t

systemctl restart nginx

echo "Nginx reloaded successfully."
