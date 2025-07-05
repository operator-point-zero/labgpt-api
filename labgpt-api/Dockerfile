# FROM ghcr.io/puppeteer/puppeteer:24.11.1

# ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
#     PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# WORKDIR /usr/src

# # Copy package files from the labgpt-api subdirectory
# COPY labgpt-api/package*.json ./labgpt-api/

# # Fix ownership and permissions for the labgpt-api directory
# USER root
# RUN chown -R pptruser:pptruser /usr/src/labgpt-api
# USER pptruser

# # Change to the labgpt-api directory for npm install
# WORKDIR /usr/src/labgpt-api
# RUN npm ci --only=production || npm install --production

# # Go back to parent directory and copy all files
# WORKDIR /usr/src
# COPY labgpt-api/ ./labgpt-api/

# # Fix ownership again after copying
# USER root
# RUN chown -R pptruser:pptruser /usr/src/labgpt-api
# USER pptruser

# # Expose port (adjust if your app uses a different port)
# EXPOSE 3000

# CMD ["node", "labgpt-api/server.js"]

# FROM ghcr.io/puppeteer/puppeteer:24.11.1

# WORKDIR /usr/src

# # Copy package files from the labgpt-api subdirectory
# COPY labgpt-api/package*.json ./labgpt-api/

# # Fix ownership and permissions for the labgpt-api directory
# USER root
# RUN chown -R pptruser:pptruser /usr/src/labgpt-api
# USER pptruser

# # Change to the labgpt-api directory for npm install
# WORKDIR /usr/src/labgpt-api
# RUN npm ci --only=production || npm install --production

# # Go back to parent directory and copy all files
# WORKDIR /usr/src
# COPY labgpt-api/ ./labgpt-api/

# # Fix ownership again after copying
# USER root
# RUN chown -R pptruser:pptruser /usr/src/labgpt-api
# USER pptruser

# # Expose port
# EXPOSE 3000

# CMD ["node", "labgpt-api/server.js"]

# Use the official Puppeteer image which has Chrome pre-installed
FROM ghcr.io/puppeteer/puppeteer:24.11.1

# Set working directory
WORKDIR /usr/src

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Switch to root to install dependencies and set permissions
USER root

# Copy package files first for better Docker layer caching
COPY labgpt-api/package*.json ./labgpt-api/

# Install dependencies
RUN cd labgpt-api && npm ci --only=production --no-audit --no-fund

# Copy application files
COPY labgpt-api/ ./labgpt-api/

# Set proper ownership and permissions
RUN chown -R pptruser:pptruser /usr/src/labgpt-api && \
    chmod -R 755 /usr/src/labgpt-api

# Switch back to pptruser
USER pptruser

# Expose port
EXPOSE 3000

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/pdf/health || exit 1

# Start the application
CMD ["node", "labgpt-api/server.js"]