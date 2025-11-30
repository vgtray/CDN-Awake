#!/bin/sh
set -e
envsubst '$API_KEY' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf
exec nginx -g 'daemon off;'
