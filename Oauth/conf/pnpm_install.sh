#!/bin/sh

if [ "$ENV" = "dev" ]; then
    pnpm install;
else
    pnpm install --prod;
fi