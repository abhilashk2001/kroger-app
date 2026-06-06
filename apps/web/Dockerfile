# Custom image for the React + Vite dev server.
FROM node:22-bookworm-slim

WORKDIR /app

# Install dependencies first (cached unless package.json changes).
COPY package.json package-lock.json* ./
RUN npm install

# Copy the rest of the source.
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
