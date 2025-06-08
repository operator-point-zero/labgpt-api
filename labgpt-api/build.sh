#!/usr/bin/env bash
set -o errexit # Exit immediately if a command exits with a non-zero status.

# --- Step 1: Install Node.js dependencies ---
echo "--- Installing Node.js dependencies ---"
npm install

# --- Step 2: Configure and Install Playwright Browsers ---
echo "--- Configuring Playwright browser installation path ---"

# Set Playwright's browser download path to a persistent location on Render.
# This ensures that the downloaded browser is available during runtime.
export PLAYWRIGHT_BROWSERS_PATH="/opt/render/project/.cache/ms-playwright"

# Create the directory if it doesn't already exist.
# The -p flag ensures parent directories are also created if missing.
mkdir -p "$PLAYWRIGHT_BROWSERS_PATH"

echo "--- Installing Playwright browsers (Chromium) into: $PLAYWRIGHT_BROWSERS_PATH ---"

# Install only Chromium to save space and time.
# The --force flag ensures it attempts the download even if it thinks it's already there,
# which can sometimes help reliability in CI/CD environments where caching might interfere.
npx playwright install chromium --force

# Verify if the executable exists after installation
# This is a crucial diagnostic step. The exact path might vary slightly based on Playwright version,
# but it will typically be within the PLAYWRIGHT_BROWSERS_PATH.
# We'll check for the `headless_shell` or `chrome` executable.
if [ -f "$PLAYWRIGHT_BROWSERS_PATH/chromium_headless_shell-1169/chrome-linux/headless_shell" ]; then
    echo "✅ Playwright Chromium executable found at: $PLAYWRIGHT_BROWSERS_PATH/chromium_headless_shell-1169/chrome-linux/headless_shell"
else
    echo "❌ Playwright Chromium executable NOT found at expected path after install!"
    # List the contents of the Playwright cache directory for debugging
    echo "--- Contents of Playwright cache directory ($PLAYWRIGHT_BROWSERS_PATH): ---"
    ls -R "$PLAYWRIGHT_BROWSERS_PATH" || echo "  (Directory does not exist or is empty)"
    echo "------------------------------------------------------------------------"
    exit 1 # Fail the build if the browser isn't found
fi

echo "--- Build complete ---"