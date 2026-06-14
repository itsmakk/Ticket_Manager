#!/bin/sh
# Generate config.js from environment variables at container startup

CONFIG_PATH="/usr/share/nginx/html/js/config.js"

cat > "$CONFIG_PATH" << EOF
const CONFIG = {
  SUPABASE_URL: '${VITE_SUPABASE_URL:-https://your-project.supabase.co}',
  SUPABASE_ANON_KEY: '${VITE_SUPABASE_ANON_KEY:-your-anon-key}',
  RAZORPAY_KEY_ID: '${VITE_RAZORPAY_KEY_ID:-rzp_test_key}',
  SITE_URL: '${VITE_SITE_URL:-http://localhost:8080}',
};
EOF

exec nginx -g "daemon off;"
