# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install
COPY . .
RUN pnpm run build

# Client stage
FROM node:20-alpine AS client-builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install
COPY . .
RUN pnpm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --production

COPY --from=builder /app/server/dist ./server/dist
COPY --from=client-builder /app/dist ./dist
COPY server/package.json ./server/
COPY .env.example .env.local

EXPOSE 5174 3000
CMD ["node", "server/dist/index.js"]
