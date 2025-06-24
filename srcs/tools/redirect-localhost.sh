#!/usr/bin/env bash
set -e

# 127.0.0.1   DOMAIN_NAME -> IPv4
# ::1         DOMAIN_NAME -> IPv6

if [ -z "$DOMAIN_NAME" ]; then
  echo "❌ Start: Pls define DOMAIN_NAME in env file" >&2
  exit 1
fi

if ! grep -qE "^[[:space:]]*127\.0\.0\.1[[:space:]]+$DOMAIN_NAME" /etc/hosts; then
  printf "127.0.0.1\t%s\n::1\t%s\n" "$DOMAIN_NAME" "$DOMAIN_NAME" \
    | sudo tee -a /etc/hosts
  echo "✅ Added $DOMAIN_NAME to /etc/hosts"
else
  echo "ℹ️  $DOMAIN_NAME found in /etc/hosts"
fi
