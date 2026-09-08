#!/usr/bin/env bash
# Fetch a page from the unpublished dev theme.
#
# Shopify's ?preview_theme_id= requires a cookie handshake — a plain curl
# silently returns the LIVE theme instead, which makes verification lie.
# This establishes the session first, then fetches.
#
# Usage:  ./scripts/preview.sh /pages/trade
#         ./scripts/preview.sh /products/colorfill-box | grep -c 'quick-order-list'
set -euo pipefail

THEME_ID="${DEV_THEME_ID:-130931064929}"
STORE="${DEV_STORE:-unika.co.nz}"   # primary domain; myshopify 301s here and drops the cookie
PATH_PART="${1:-/}"
JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT

# Handshake: sets the preview cookie for this session
curl -sL -c "$JAR" -b "$JAR" \
  "https://${STORE}/?preview_theme_id=${THEME_ID}" -o /dev/null

# Now fetch the page we actually want, reusing the cookie
curl -sL -b "$JAR" "https://${STORE}${PATH_PART}"
