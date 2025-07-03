# Use Debian as the base image
FROM debian:bullseye-slim

# Install dependencies (curl, gnupg, jq, netcat, procps)
RUN apt-get update && apt-get upgrade -y && apt-get install -y \
    curl \
    gnupg \
    jq \
    netcat \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Download and install Vault
RUN curl -fsSL https://apt.releases.hashicorp.com/gpg | gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com bullseye main" | tee /etc/apt/sources.list.d/vault.list \
    && apt-get update && apt-get install -y vault \
    && rm -rf /var/lib/apt/lists/*

# Generate TLS certs (self-signed)
RUN mkdir -p /vault/tls
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /vault/tls/server.key \
    -out /vault/tls/server.crt \
    -subj "/C=US/ST=CA/L=San Francisco/O=Vault/OU=IT Department/CN=vault"

RUN mkdir -p /vault/token

# Expose Vault port
EXPOSE 8200

# Copy Vault configuration file
COPY config.hcl /vault/config/config.hcl

# Copy initialization script
COPY init_vault.sh /vault/init_vault.sh

# Make initialization script executable
RUN chmod +x /vault/init_vault.sh

# Set entrypoint to the initialization script (which must launch Vault in foreground)
ENTRYPOINT ["/vault/init_vault.sh"]
