#!/bin/sh
# usage: curlcheck.sh <base-url>
B=$1
for p in / /style.css /api/vars /api/kv /api/d1 /api/r2 /api/do /api/cron; do
  printf '%-10s ' "$p"; curl -s -o /tmp/cc.$$ -w '%{http_code} ' "$B$p"; head -c 160 /tmp/cc.$$ | tr '\n' ' '; echo
done; rm -f /tmp/cc.$$
