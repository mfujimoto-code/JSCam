#!/bin/sh
set -e
mkdir -p /etc/nginx/certs

SAN="DNS:localhost,IP:127.0.0.1"
if [ -n "$TLS_SAN" ]; then
  SAN="$SAN,$TLS_SAN"
fi

printf '%s\n' \
  '[req]' \
  'default_bits=2048' \
  'prompt=no' \
  'distinguished_name=dn' \
  'x509_extensions=v3_req' \
  '[dn]' \
  'CN=localhost' \
  '[v3_req]' \
  "subjectAltName=${SAN}" \
  > /tmp/tls.cnf

openssl req -x509 -nodes -newkey rsa:2048 -days 825 \
  -keyout /etc/nginx/certs/tls.key \
  -out /etc/nginx/certs/tls.crt \
  -config /tmp/tls.cnf

rm -f /tmp/tls.cnf
echo "TLS certificate generated with SAN=${SAN}"
