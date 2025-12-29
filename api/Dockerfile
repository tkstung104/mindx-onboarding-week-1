# --- STAGE 1: Build stage (Use full Node.js to compile TS) ---
FROM node:20-alpine AS builder

# Set working directory in container
WORKDIR /app

# Copy package management files first to leverage Docker cache
COPY package*.json ./

# Install all dependencies (including TS compilation tools)
RUN npm install

# Copy all source code into container
COPY . .

# Compile TypeScript to JavaScript (this runs the "build" script in package.json)
RUN npm run build


# --- STAGE 2: Production stage (Keep only what's needed to run) ---
FROM node:20-alpine

WORKDIR /app

# Set default environment variable to production
ENV NODE_ENV=production

# Only copy package.json to install runtime libraries (skip devDependencies)
COPY package*.json ./
RUN npm install --omit=dev

# Copy compiled files from Stage 1
COPY --from=builder /app/dist ./dist

# Expose port 3000 according to architecture diagram
EXPOSE 3000

# Command to start API
CMD ["node", "dist/server.js"]