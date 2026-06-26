FROM node:18-alpine AS frontend-build

# Set working directory for frontend
WORKDIR /app

# Install frontend dependencies
COPY package*.json ./
RUN npm install

# Copy frontend source and build
COPY . .
RUN npm run build

# ========================================

FROM node:18-alpine AS backend

WORKDIR /app

# Install backend dependencies
COPY pos-backend/package*.json ./pos-backend/
RUN cd pos-backend && npm install

# Copy backend source
COPY pos-backend/ ./pos-backend/

# Copy built frontend from previous stage
COPY --from=frontend-build /app/build ./build

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "pos-backend/server.js"]
