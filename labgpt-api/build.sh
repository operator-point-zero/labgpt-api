#!/usr/bin/env bash
set -o errexit

echo "--- Installing Node.js dependencies ---"
npm install

echo "--- Installing Playwright browsers (Chromium) ---"
# Playwright's installation usually handles its cache path well.
# However, if you face issues, you can explicitly set PLAYWRIGHT_BROWSERS_PATH
# export PLAYWRIGHT_BROWSERS_PATH="/opt/render/.cache/playwright/browsers"

# Install only Chromium to save space/time, as you're using `chromium` directly in your code.
npx playwright install chromium

echo "--- Build complete ---"