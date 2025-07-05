FROM ghcr.io/puppeteer/puppeteer:24.11.1

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /usr/src

# Copy package files from the labgpt-api subdirectory
COPY labgpt-api/package*.json ./labgpt-api/

# Change to the labgpt-api directory for npm install
WORKDIR /usr/src/labgpt-api
RUN npm ci --only=production || npm install --production

# Go back to parent directory and copy all files
WORKDIR /usr/src
COPY labgpt-api/ ./labgpt-api/

# Expose port (adjust if your app uses a different port)
EXPOSE 3000

CMD ["node", "labgpt-api/server.js"]