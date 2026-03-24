#!/bin/bash
# Script to push WoWtron updates to GitHub
# Run this script with your GitHub Personal Access Token

if [ -z "$1" ]; then
    echo "Usage: ./push-to-github.sh YOUR_GITHUB_TOKEN"
    echo ""
    echo "To create a token:"
    echo "1. Go to https://github.com/settings/tokens"
    echo "2. Click 'Generate new token (classic)'"
    echo "3. Select 'repo' scope"
    echo "4. Copy the token and run: ./push-to-github.sh YOUR_TOKEN"
    exit 1
fi

TOKEN="$1"
cd /home/z/my-project

git remote set-url origin https://kurashitai:${TOKEN}@github.com/kurashitai/wowtron.git
git push origin master

echo ""
echo "Push completed!"
