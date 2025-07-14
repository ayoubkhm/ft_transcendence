#!/bin/sh

echo "📦 Building TypeScript..."
pnpm run build

echo "🚀 Starting service..."
exec pnpm run start
