# ================================
# 1. Build Stage
# ================================
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copy package management files
COPY package*.json ./

# Install all dependencies (including devDependencies required for compilation)
RUN npm ci

# Copy configuration and source files
COPY tsconfig*.json nest-cli.json ./
COPY src/ ./src/

# Build the NestJS application
RUN npm run build

# Remove development dependencies to keep production image light
RUN npm prune --omit=dev

# ================================
# 2. Production Stage
# ================================
FROM node:20-alpine AS production

ENV NODE_ENV=production
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Copy production node_modules from builder
COPY --chown=node:node --from=builder /usr/src/app/node_modules ./node_modules

# Copy compiled JavaScript output
COPY --chown=node:node --from=builder /usr/src/app/dist ./dist

# Use non-root node user for better security
USER node

# Expose default application port
EXPOSE 3000

# Start the application
CMD ["node", "dist/main"]
