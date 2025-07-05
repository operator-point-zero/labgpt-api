FROM ghcr.io/puppeteer/puppeteer:24.11.1

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /usr/src/app

# Copy package files from the labgpt-api subdirectory
COPY labgpt-api/package*.json ./

# Install dependencies
RUN npm ci --only=production || npm install --production

# Copy application code from the labgpt-api subdirectory
COPY labgpt-api/ ./

# Expose port (adjust if your app uses a different port)
EXPOSE 3000

CMD ["node", "server.js"]