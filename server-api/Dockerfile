# API Server Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Cloud Run provides the PORT environment variable
ENV PORT 8080
EXPOSE 8080

# Run the application
CMD ["npm", "start"]
