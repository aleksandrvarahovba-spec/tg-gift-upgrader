FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy root manifests and lockfiles
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/server/package*.json ./packages/server/
COPY packages/client/package*.json ./packages/client/

# Install dependencies across all workspaces
RUN npm install

# Copy source files
COPY packages/shared ./packages/shared
COPY packages/server ./packages/server

# Build shared package
RUN npm run build:shared

# Generate Prisma client and build server
WORKDIR /app/packages/server
RUN npx prisma generate
RUN npm run build

# Run database push and seed default gifts
RUN npx prisma db push --accept-data-loss
RUN npx tsx prisma/seed.ts

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["npm", "run", "start:server"]
