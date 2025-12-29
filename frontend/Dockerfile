# --- STAGE 1: Build stage ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy code and build React application
COPY . .
RUN npm run build

# --- STAGE 2: Production stage (Use Nginx to serve static files) ---
FROM nginx:stable-alpine

# Copy built files from Stage 1 to Nginx default directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Configure Nginx to serve Single Page Application (SPA)
# (Create a small config file to handle React Router if needed)
RUN echo "server { \
    listen 8080; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files \$uri \$uri/ /index.html; \
    } \
}" > /etc/nginx/conf.d/default.conf

# Expose port 8080 according to architecture diagram
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]