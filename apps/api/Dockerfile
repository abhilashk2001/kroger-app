# Custom image for the Express + TypeScript API.
FROM node:22-bookworm-slim

# Prisma's query engine needs openssl present in the image.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first. This layer is cached and only re-runs when
# package.json changes - so code edits don't trigger a full reinstall.
COPY package.json package-lock.json* ./
RUN npm install

# Generate the Prisma client (needs the schema file to exist).
COPY prisma ./prisma
RUN npx prisma generate

# Copy the rest of the source.
COPY . .

EXPOSE 3000

# Dev server with hot-reload (tsx watch). docker-compose overrides nothing here.
CMD ["npm", "run", "dev"]
