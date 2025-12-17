#!/bin/bash
# Simple HTTP server script
# Usage: ./serve.sh [port]

PORT=${1:-8000}

echo "🚀 Starting local web server on port $PORT..."
echo "📂 Serving files from: $(pwd)"
echo "🌐 Open in browser: http://localhost:$PORT"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Try different server options in order of preference
if command -v python3 &> /dev/null; then
    python3 -m http.server $PORT
elif command -v python &> /dev/null; then
    python -m SimpleHTTPServer $PORT
elif command -v php &> /dev/null; then
    php -S localhost:$PORT
else
    echo "❌ No suitable web server found!"
    echo "Please install Python 3 or PHP to run a local server."
    exit 1
fi
