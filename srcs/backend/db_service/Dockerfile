FROM node:lts

WORKDIR /usr/src/db_service

# Install system dependencies and pnpm
RUN apt-get update && \
    apt-get install -y \
        sqlite3 \
        openssl \
        curl \
        wget && \
    npm install -g pnpm && \
    useradd -m node_exporter

# Set environment
ARG NODE_ENV
ENV NODE_ENV=${NODE_ENV}

# Copy Node.js dependencies manifest and install
COPY ./asset/package.json .
COPY ./conf/pnpm_install.sh .
RUN chmod +x pnpm_install.sh && ./pnpm_install.sh

# Copy entrypoint script and source
COPY ./conf/entrypoint.sh .
COPY ./asset/srcs ./srcs
COPY ./asset/tsconfig.json .

RUN chmod +x entrypoint.sh

# Expose default port
EXPOSE 3002

ENTRYPOINT ["./entrypoint.sh"]