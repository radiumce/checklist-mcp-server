#!/usr/bin/env bash

# This script installs the plan-checklist standalone CLI to ~/.local/bin
# Usage: curl -fsSL https://raw.githubusercontent.com/chene/checklist-mcp-server/main/scripts/install-cli.sh | bash

set -e

# Define installation variables
INSTALL_DIR="$HOME/.local/bin"
EXECUTABLE_NAME="plan-checklist"
EXECUTABLE_PATH="$INSTALL_DIR/$EXECUTABLE_NAME"

# You can adjust this URL to match your main branch raw Github URL or your actual deployment server.
# Current assumption: Downloading the esbuild bundled script from the main branch.
DOWNLOAD_URL="https://raw.githubusercontent.com/chene/checklist-mcp-server/main/dist/plan-checklist.cjs"

echo "========================================="
echo " Installing plan-checklist CLI client..."
echo "========================================="

# 1. Create ~/.local/bin if it doesn't exist
if [ ! -d "$INSTALL_DIR" ]; then
    echo "Creating directory $INSTALL_DIR..."
    mkdir -p "$INSTALL_DIR"
fi

# 2. Download or copy the standalone executable
if [ "$1" = "--local" ] || [ -f "./dist/plan-checklist.cjs" ]; then
    echo "Installing from local dist/plan-checklist.cjs..."
    if [ ! -f "dist/plan-checklist.cjs" ]; then
        echo "Error: dist/plan-checklist.cjs not found. Please run 'npm run build:cli' first."
        exit 1
    fi
    cp dist/plan-checklist.cjs "$EXECUTABLE_PATH"
else
    echo "Downloading standalone executable from $DOWNLOAD_URL..."
    if command -v curl >/dev/null 2>&1; then
        # We use -f to fail silently on server errors, -s for silent mode, -L for location redirects
        if ! curl -fsSL "$DOWNLOAD_URL" -o "$EXECUTABLE_PATH"; then
            echo "Error: Failed to download the executable. Make sure the 'dist/plan-checklist.cjs' is pushed to the repository main branch."
            exit 1
        fi
    elif command -v wget >/dev/null 2>&1; then
        if ! wget -qO "$EXECUTABLE_PATH" "$DOWNLOAD_URL"; then
            echo "Error: Failed to download the executable. Make sure the 'dist/plan-checklist.cjs' is pushed to the repository main branch."
            exit 1
        fi
    else
        echo "Error: Neither curl nor wget is installed."
        exit 1
    fi
fi

# 3. Apply executable permissions
chmod +x "$EXECUTABLE_PATH"
echo "Successfully installed to $EXECUTABLE_PATH"

# 4. Check if ~/.local/bin is in PATH
if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
    echo ""
    echo "⚠️  WARNING: $INSTALL_DIR is not in your PATH."
    echo "To use the 'plan-checklist' command globally, add the following line to your shell profile (~/.bashrc, ~/.zshrc, etc.):"
    echo ""
    echo '    export PATH="$HOME/.local/bin:$PATH"'
    echo ""
    echo "Then restart your terminal or run: source ~/.bashrc (or ~/.zshrc)"
else
    echo "✓ $INSTALL_DIR is already in your PATH."
fi

echo ""
echo "Installation complete! Try running:"
echo "    plan-checklist"
echo "========================================="
