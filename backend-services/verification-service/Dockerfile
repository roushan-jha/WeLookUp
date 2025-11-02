FROM node:18-alpine
WORKDIR /usr/src/app

# Copy package files first for optimized layer caching
COPY package*.json ./
RUN npm install

# Copy source code and .env
COPY . .

# Command to run the service
CMD ["node", "server.js"]