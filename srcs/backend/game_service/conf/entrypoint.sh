#!/bin/sh


if [ "$NODE_ENV" = "dev" ]; then
    exec pnpm run dev
else
    pnpm run build
    exec pnpm run start
fi