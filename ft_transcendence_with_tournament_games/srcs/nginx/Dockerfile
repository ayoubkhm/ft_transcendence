# Use official nginx base image
FROM nginx:alpine
 
# Install openssl for certificate generation
RUN apk add --no-cache openssl
 
# Domain for SSL certificate (default: localhost)
ARG DOMAIN=localhost
ENV DOMAIN=${DOMAIN}
 
# Generate a self-signed SSL certificate
RUN mkdir -p /etc/nginx/ssl && \
    openssl req -x509 -nodes -days 365 \
        -newkey rsa:2048 \
        -subj "/CN=${DOMAIN}" \
        -keyout /etc/nginx/ssl/nginx.key \
        -out /etc/nginx/ssl/nginx.crt

# Copy configuration files
COPY nginx.conf /etc/nginx/nginx.conf
COPY proxy_params /etc/nginx/proxy_params
COPY waf.conf /etc/nginx/waf.conf

# Expose HTTP and HTTPS ports
EXPOSE 80 443

# Run nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
