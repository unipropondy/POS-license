FROM node:18-alpine

WORKDIR /app

# Install backend dependencies (omit dev dependencies for speed)
COPY pos-backend/package*.json ./
RUN npm install --omit=dev

# Copy backend source files
COPY pos-backend/ ./

# Expose server port
EXPOSE 3000

# Start backend API
CMD ["node", "server.js"]
