FROM node:debian

WORKDIR /usr/src/auth_service

RUN apk update --no-cache && \
    apk add sqlite openssl pnpm  prometheus-node-exporter --no-cache

ARG ENV

COPY ./asset/package.json .
COPY ./conf/pnpm_install.sh .
RUN chmod +x pnpm_install.sh && ./pnpm_install.sh

COPY ./conf/entrypoint.sh .
COPY ./asset/srcs ./srcs
COPY ./asset/tsconfig.json .

RUN chmod +x entrypoint.sh 

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]

