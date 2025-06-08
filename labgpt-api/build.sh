#!/usr/bin/env bash
set -o errexit

echo "--- Installing Node.js dependencies ---"
npm install

echo "--- Installing Playwright browsers (Chromium) ---"
# Define a persistent path for Playwright browsers on Render
# This path is commonly used for persistent data across deploys on Render
export PLAYWRIGHT_BROWSERS_PATH="/opt/render/project/.cache/ms-playwright"

# Ensure the directory exists
mkdir -p "$PLAYWRIGHT_BROWSERS_PATH"

# Install Chromium. This will download the browser to the path specified by PLAYWRIGHT_BROWSERS_PATH
# The `--force` flag can sometimes help ensure the download happens reliably in CI/CD.
npx playwright install chromium --force

echo "--- Build complete ---"