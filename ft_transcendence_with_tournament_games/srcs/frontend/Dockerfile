FROM node:lts

WORKDIR /usr/src/frontend

# Install pnpm for consistent installs
RUN npm install -g pnpm

# Copy lockfile and package definition
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install

# Copy application source
COPY . .

# Expose Vite dev server port
EXPOSE 4000

# Start Vite in development mode
CMD ["pnpm", "run", "dev"]