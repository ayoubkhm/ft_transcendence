#!/bin/sh

if [ "$NODE_ENV" = "dev" ]; then
    exec pnpm run dev
else
    echo "--- Running build ---"
    pnpm run build
    echo "--- Build finished. Listing files... ---"
    ls -R
    echo "--- Starting application ---"
    exec pnpm run start
fi