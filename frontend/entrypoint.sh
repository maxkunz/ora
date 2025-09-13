#!/bin/sh

# /usr/share/nginx/html/env-config.js dynamisch erzeugen
cat <<EOF > /usr/share/nginx/html/env-config.js
window.ENV = {
  API_URL: "${API_URL}",
}
EOF

# Starte NGINX
nginx -g "daemon off;"