FROM owasp/modsecurity-crs:nginx

# Copie ta conf comme template AVEC bons droits
USER root

COPY nginx.conf /etc/nginx/templates/nginx.conf.template
COPY waf.conf /etc/nginx/waf.conf
COPY proxy_params /etc/nginx/proxy_params

# Fix les permissions pour que le script d'entrée puisse l’écrire
RUN chown -R nginx:nginx /etc/nginx/templates \
    && chmod -R 644 /etc/nginx/templates

RUN openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/selfsigned.key \
  -out /etc/nginx/ssl/selfsigned.crt \
  -subj "/C=FR/ST=Paris/L=Paris/O=MyOrg/CN=localhost"


USER nginx
