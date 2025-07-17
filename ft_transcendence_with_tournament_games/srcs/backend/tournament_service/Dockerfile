# ─────────────────────────────
# Base image
# ─────────────────────────────
FROM node:lts

RUN useradd -m appuser

WORKDIR /usr/src/tournament_service

# ─────────────────────────────
# Install pnpm and system deps
# ─────────────────────────────
RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends curl wget && \
    npm install -g pnpm && \
    rm -rf /var/lib/apt/lists/*

# ─────────────────────────────
# Copy and install dependencies
# ─────────────────────────────
COPY ./asset/package.json ./asset/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ─────────────────────────────
# Copy sources and config
# ─────────────────────────────
COPY ./asset/srcs ./srcs
COPY ./asset/tsconfig.json .
COPY ./conf/entrypoint.sh .
RUN chmod +x entrypoint.sh

# ─────────────────────────────
# Set environment and start
# ─────────────────────────────
ARG NODE_ENV=dev
ENV NODE_ENV=${NODE_ENV}
ENV PORT=3000
EXPOSE 3000

RUN mkdir -p /usr/src/tournament_service/dist && chown -R appuser:appuser /usr/src/tournament_service


USER appuser

ENTRYPOINT ["./entrypoint.sh"]
