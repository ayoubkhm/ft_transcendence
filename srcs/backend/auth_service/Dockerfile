FROM node:lts

WORKDIR /usr/src/auth_service

RUN apt-get update && \
    apt-get install -y \
        curl \
        wget && \
    npm install -g pnpm && \
    useradd -m node_exporter

ARG NODE_ENV
ENV NODE_ENV=${NODE_ENV}
COPY ./assets/package.json .
COPY ./conf/pnpm_install.sh .
RUN chmod +x pnpm_install.sh && ./pnpm_install.sh

COPY ./conf/entrypoint.sh .
COPY ./assets/srcs ./srcs
COPY ./assets/tsconfig.json .
# Runtime env vars are injected by docker-compose via env_file; no .env copy during build

RUN chmod +x entrypoint.sh 

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]

