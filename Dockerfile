FROM node:20-slim

WORKDIR /app

# Install backend dependencies
COPY pos-backend/package*.json ./
RUN npm install --omit=dev --no-audit

# Copy backend source
COPY pos-backend/ ./

# Expose server port
EXPOSE 3000

# Start server
CMD ["node", "server.js"]
