# ────────────────────────────────────────────────
# Base image
# ────────────────────────────────────────────────
FROM node:lts

# Create a non-root user (optional but recommended)
RUN useradd -m appuser

# App code lives here
WORKDIR /usr/src/game_service

# ────────────────────────────────────────────────
# System deps  +  global PNPM
# ────────────────────────────────────────────────
RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends curl wget && \
    npm install -g pnpm && \
    rm -rf /var/lib/apt/lists/*

# ────────────────────────────────────────────────
# Copy package manifests and install deps
# ────────────────────────────────────────────────
COPY ./asset/package.json ./asset/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ────────────────────────────────────────────────
# Copy application source
# ────────────────────────────────────────────────
COPY ./asset/srcs ./srcs
COPY ./asset/tsconfig.json .
COPY ./conf/entrypoint.sh .
RUN chmod +x entrypoint.sh

# ────────────────────────────────────────────────
# Runtime environment
# ────────────────────────────────────────────────
ARG NODE_ENV=dev
ENV NODE_ENV=${NODE_ENV}
ENV PORT=3001
EXPOSE 3001

# Switch to the non-root user
USER appuser

ENTRYPOINT ["./entrypoint.sh"]
