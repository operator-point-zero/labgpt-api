# Use Node.js base image
FROM node:18-slim

# Set working directory
WORKDIR /usr/src/app

# Install Puppeteer/Chromium dependencies
RUN apt-get update \
    && apt-get install -yq --no-install-recommends \
    chromium \
    fonts-liberation \
    libu2f-udev \
    libvulkan1 \
    ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy package files from subfolder
COPY labgpt-api/package*.json ./

# Install production dependencies
RUN npm install --production

# Copy app code from subfolder
COPY labgpt-api .

# Set Puppeteer Chromium path
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Expose the correct port
EXPOSE 10000

# Start the server
CMD ["node", "server.js"]
