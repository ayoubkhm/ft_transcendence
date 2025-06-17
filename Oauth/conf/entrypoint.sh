#!/bin/sh

node_exporter &

if [ "$ENV" = "dev" ]; then
    exec pnpm dev
else
    pnpm build
    exec pnpm start;
fi