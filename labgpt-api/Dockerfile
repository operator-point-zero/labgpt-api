# Use an official Node.js runtime as a parent image
# Using a specific version is recommended for stability
FROM node:18-slim

# Set the working directory in the container
WORKDIR /usr/src/app

# Install necessary dependencies for Puppeteer/Chromium
# This is the most important step for Render
RUN apt-get update \
    && apt-get install -yq --no-install-recommends \
    chromium \
    fonts-liberation \
    libu2f-udev \
    libvulkan1 \
    ca-certificates \
    # Clean up
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install app dependencies
RUN npm install --production

# Copy the rest of your app's source code
COPY . .

# Tell Puppeteer to use the Chromium binary we installed via apt-get
# This prevents it from downloading its own version
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Your app binds to this port
EXPOSE 10000

# Define the command to run your app
# Replace 'your-main-app-file.js' with your entry point file (e.g., index.js, server.js)
CMD [ "node", "server.js" ]