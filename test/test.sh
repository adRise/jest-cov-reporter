#!/bin/bash

# Check if PR number is provided
if [ -z "$1" ]; then
  echo "Usage: ./test/test.sh <PR_NUMBER> [GITHUB_TOKEN]"
  exit 1
fi

PR_NUMBER=$1

# Use provided token or check for GitHub CLI authentication
if [ -n "$2" ]; then
  GITHUB_TOKEN=$2
else
  # Try to get token from GitHub CLI if available
  if command -v gh &> /dev/null; then
    TOKEN_STATUS=$(gh auth status 2>&1)
    if [[ $TOKEN_STATUS == *"Logged in"* ]]; then
      echo "Using GitHub CLI authentication"
      export GITHUB_TOKEN=$(gh auth token)
    else
      echo "GitHub CLI not authenticated. Please log in using 'gh auth login' or provide a token."
      exit 1
    fi
  else
    echo "GitHub CLI not found and no token provided."
    echo "Please install GitHub CLI and login with 'gh auth login'"
    echo "Or provide a token as the second argument"
    exit 1
  fi
fi

# Check if we have a token now
if [ -z "$GITHUB_TOKEN" ]; then
  echo "Could not get GitHub token. Please provide it as an argument."
  exit 1
fi

# Build the project first
echo "Building project..."
npm run build

# Run the test script
echo "Running test with PR #$PR_NUMBER..."
node test/run-test-cli.js $PR_NUMBER 