FROM nginx:1.27-alpine

RUN apk add --no-cache openssl \
 && mkdir -p /etc/nginx/certs

COPY 40-gen-tls.sh /docker-entrypoint.d/40-gen-tls.sh
RUN chmod +x /docker-entrypoint.d/40-gen-tls.sh

COPY nginx.main.conf /etc/nginx/nginx.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html cam2.css cam2.js /usr/share/nginx/html/

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
    CMD wget -qO- http://127.0.0.1:8081/healthz >/dev/null || exit 1
