#!/bin/bash

echo "🚀 Setting up BreakDown AI Chrome Extension..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed."
    echo "Please install Node.js first:"
    echo "1. Install Homebrew: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    echo "2. Install Node.js: brew install node"
    echo "3. Run this script again"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Build the extension
echo "🔨 Building the extension..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Extension built successfully"
    echo ""
    echo "🎉 Setup complete! Next steps:"
    echo "1. Open Chrome and go to chrome://extensions/"
    echo "2. Enable 'Developer mode' (toggle in top right)"
    echo "3. Click 'Load unpacked'"
    echo "4. Select the 'dist' folder from this project"
    echo "5. Configure your OpenAI API key in the extension settings"
else
    echo "❌ Failed to build extension"
    exit 1
fi 