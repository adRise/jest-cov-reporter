#!/usr/bin/env node
const path = require('path');
const { execSync, spawnSync } = require('child_process');

// GitHub token from environment variable
const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error('Please set GITHUB_TOKEN environment variable');
  process.exit(1);
}

// Ensure we have PR number as argument
const prNumber = process.argv[2];
if (!prNumber) {
  console.error('Usage: node test/run-test-cli.js <PR_NUMBER>');
  process.exit(1);
}

// Get repository information from the git remote
const getRepoInfo = () => {
  try {
    const remote = execSync('git remote get-url origin').toString().trim();
    // Expected format: git@github.com:username/repo.git or https://github.com/username/repo.git
    let match;
    if (remote.startsWith('git@')) {
      match = remote.match(/git@github\.com:([^\/]+)\/([^\.]+)\.git/);
    } else {
      match = remote.match(/https:\/\/github\.com\/([^\/]+)\/([^\.]+)(?:\.git)?/);
    }
    
    if (match && match.length === 3) {
      return { owner: match[1], repo: match[2] };
    }
    throw new Error('Could not parse repository info from git remote');
  } catch (error) {
    console.error('Error getting repository info:', error.message);
    process.exit(1);
  }
};

const { owner, repo } = getRepoInfo();
console.log(`Repository: ${owner}/${repo}`);
console.log(`PR Number: ${prNumber}`);

// Path to our reports
const baseCoveragePath = path.resolve(__dirname, 'reports/base-coverage.json');
const branchCoveragePath = path.resolve(__dirname, 'reports/current-coverage.json');

// Set up GitHub Actions-style environment variables
process.env.INPUT_BASE_COVERAGE_REPORT_PATH = baseCoveragePath;
process.env.INPUT_BRANCH_COVERAGE_REPORT_PATH = branchCoveragePath;
process.env.INPUT_ACCESSTOKEN = token;
process.env.INPUT_FULLCOVERAGEDIFF = 'true';
process.env.INPUT_DELTA = '0.2';
process.env.INPUT_USESAMECOMMENT = 'true';
process.env.INPUT_CUSTOM_MESSAGE = 'This is a test comment from the refactored jest-cov-reporter';
process.env.INPUT_ONLY_CHECK_CHANGED_FILES = 'false';
process.env.INPUT_PREFIX_FILENAME_URL = '';
process.env.INPUT_CHECK_NEW_FILE_FULL_COVERAGE = 'true';
process.env.INPUT_COVERAGETYPE = 'jest';

// Set GitHub context
process.env.GITHUB_REPOSITORY = `${owner}/${repo}`;
process.env.GITHUB_EVENT_NAME = 'pull_request';
process.env.GITHUB_EVENT_PATH = path.resolve(__dirname, 'github-event.json');

// Create a fake GitHub event payload
const eventPayload = {
  pull_request: {
    number: parseInt(prNumber, 10),
    labels: []
  },
  repository: {
    owner: {
      login: owner
    },
    name: repo
  },
  issue: {
    number: parseInt(prNumber, 10)
  }
};

// Write the event payload to a file
const fs = require('fs');
fs.writeFileSync(process.env.GITHUB_EVENT_PATH, JSON.stringify(eventPayload, null, 2));

console.log('Running jest-cov-reporter...');
try {
  const result = spawnSync('node', [path.resolve(__dirname, '../dest/index.js')], {
    stdio: 'inherit',
    env: process.env
  });
  
  if (result.status !== 0) {
    console.error(`Process exited with code ${result.status}`);
    process.exit(result.status);
  }
  
  console.log('Successfully ran jest-cov-reporter');
} catch (error) {
  console.error('Error running jest-cov-reporter:', error);
  process.exit(1);
} finally {
  // Clean up the event file
  if (fs.existsSync(process.env.GITHUB_EVENT_PATH)) {
    fs.unlinkSync(process.env.GITHUB_EVENT_PATH);
  }
} 