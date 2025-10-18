FROM node:24-alpine
WORKDIR /app

# Install dependencies (dev deps needed for tsx)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source
COPY . .

# Default: run the beachhead entrypoint (Node server + beacon)
ENV PORT=30018
ENV DISCOVERY_TARGET=host.docker.internal:53530
CMD ["npx","tsx","examples/docker/beachhead/entrypoint.ts"]

