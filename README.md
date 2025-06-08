# Jest Coverage Reporter

A modern, TypeScript-based GitHub Action that compares code coverage reports between branches and provides detailed feedback in pull requests.

## Screenshots

Success Screenshot
![success](https://github.com/arunshan/jest-cov-reporter/blob/main/images/pass.png?raw=true)

Failure Screenshot
![failure](https://github.com/arunshan/jest-cov-reporter/blob/main/images/fail.png?raw=true)

## Features

- Compare code coverage between base and current branches
- Detect decreased coverage in changed files
- Require 100% coverage for newly added files
- Support for Jest and Cobertura coverage reports
- Detailed GitHub PR comments with coverage changes
- Configurable thresholds and options
- **New:** Automatic S3 upload/download of coverage reports

## Usage

### Basic Usage
```yaml
- name: Coverage Report
  uses: adRise/jest-cov-reporter@main
  with:
    branch-coverage-report-path: ./coverage/coverage-summary.json
    base-coverage-report-path: ./coverage/master-coverage-summary.json
    delta: 0.3
    accessToken: ${{ secrets.GITHUB_TOKEN }}
    fullCoverageDiff: true
    useSameComment: true
```

### With S3 Integration
```yaml
- name: Coverage Report with S3
  uses: adRise/jest-cov-reporter@main
  with:
    branch-coverage-report-path: ./coverage/coverage-summary.json
    delta: 0.3
    accessToken: ${{ secrets.GITHUB_TOKEN }}
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws-region: 'us-east-2'
    s3-bucket: 'your-coverage-bucket'
    s3-repo-directory: 'my-project'  # Optional: organize multiple repos in one bucket
    base-branch: 'main'
    pr-number: ${{ github.event.pull_request.number }}
    s3-base-url: 'https://your-s3-url.amazonaws.com'
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `base-coverage-report-path` | Path to base coverage report | Not required if AWS credentials provided |
| `branch-coverage-report-path` | Path to the current coverage report | Not required if AWS credentials provided |
| `accessToken` | Access token required to comment on a PR | `${{ github.token }}` |
| `fullCoverageDiff` | Get the full coverage with diff or only the diff | `false` |
| `delta` | Difference threshold between the old and final test coverage | `0.2` |
| `useSameComment` | Update existing comment on the PR instead of creating new ones | `true` |
| `custom-message` | Pass any custom string which will be displayed in the comment | `''` |
| `only-check-changed-files` | Only test for changed files in the PR | `true` |
| `prefix-filename-url` | Add a base URL to the filenames and make it a hyperlink | `''` |
| `check-new-file-full-coverage` | Check newly added files whether have full coverage tests | `true` |
| `new-file-coverage-threshold` | Threshold for new file coverage | `100` |
| `coverageType` | Tools that generate code coverage | `jest` |
| `aws-access-key-id` | AWS access key ID for S3 operations | Optional |
| `aws-secret-access-key` | AWS secret access key for S3 operations | Optional |
| `aws-region` | AWS region for S3 operations | `us-east-2` |
| `s3-bucket` | S3 bucket name for storing coverage reports | Optional |
| `s3-repo-directory` | Directory inside the S3 bucket dedicated to this repository | `''` |
| `base-branch` | Base branch name (e.g., main or master) | `main` |
| `pr-number` | Pull request number | Optional, auto-detected in PR context |
| `s3-base-url` | Base URL for S3 coverage reports | Optional |

## S3 Integration

This action supports two approaches for managing coverage reports:

### 1. Traditional (Direct Path) Approach

You can specify the paths to your coverage reports directly:

```yaml
- name: Coverage Report
  uses: adRise/jest-cov-reporter@main
  with:
    branch-coverage-report-path: ./coverage/coverage-summary.json
    base-coverage-report-path: ./coverage/master-coverage-summary.json
    delta: 0.3
```

### 2. S3 Integration Approach

Alternatively, you can use S3 to store and retrieve coverage reports:

```yaml
- name: Coverage Report with S3
  uses: adRise/jest-cov-reporter@main
  with:
    branch-coverage-report-path: ./coverage/coverage-summary.json
    delta: 0.3
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws-region: 'us-east-2'
    s3-bucket: 'your-coverage-bucket'
    s3-repo-directory: 'my-project'  # Optional: organize multiple repos in one bucket
    base-branch: 'main'
```

When AWS credentials are provided, the action will:

1. Automatically download the base coverage report from S3 if `base-coverage-report-path` is not provided
2. Upload the current coverage report to S3 after tests run
3. Create links to the HTML coverage reports in the PR comment

The S3 path structure used is:
- Base branch: `s3://{bucket}/[{repo-directory}/]{base-branch}/coverage-summary.json`
- PR branch: `s3://{bucket}/[{repo-directory}/]{pr-number}/coverage-summary.json`
- HTML reports: `s3://{bucket}/[{repo-directory}/]{branch-or-pr}/lcov-report/`

If you specify `s3-repo-directory`, all coverage reports will be organized under that directory in the S3 bucket. This is particularly useful when you have multiple repositories sharing the same S3 bucket.

This allows for persistent storage of coverage reports across CI runs and easy comparison between branches.

### First-Time Use Bootstrapping

When using S3 integration in a repository for the first time, no base coverage data will exist. The action handles this case automatically:

1. It detects that no base coverage report exists in S3
2. Uses the current branch's coverage report as the baseline
3. Uploads this coverage to the base branch location in S3
4. Proceeds with the comparison (which will show no differences on first run)

This makes it easy to start using the action in new repositories without any manual setup. The first run establishes the baseline, and subsequent runs will show the coverage differences.

### Organizing Multiple Repositories

If you have multiple repositories that need to store coverage reports in the same S3 bucket, use the `s3-repo-directory` parameter to keep them organized:

```yaml
# Repository A
- name: Coverage Report for Repo A
  uses: adRise/jest-cov-reporter@main
  with:
    branch-coverage-report-path: ./coverage/coverage-summary.json
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    s3-bucket: 'coverage-reports-bucket'
    s3-repo-directory: 'repo-a'
    base-branch: 'main'
```

```yaml
# Repository B
- name: Coverage Report for Repo B
  uses: adRise/jest-cov-reporter@main
  with:
    branch-coverage-report-path: ./coverage/coverage-summary.json
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    s3-bucket: 'coverage-reports-bucket'
    s3-repo-directory: 'repo-b'
    base-branch: 'main'
```

This creates the following structure in your S3 bucket:
```
coverage-reports-bucket/
├── repo-a/
│   ├── main/
│   │   ├── coverage-summary.json
│   │   └── lcov-report/
│   └── 123/  # PR number
│       ├── coverage-summary.json
│       └── lcov-report/
└── repo-b/
    ├── main/
    │   ├── coverage-summary.json
    │   └── lcov-report/
    └── 456/  # PR number
        ├── coverage-summary.json
        └── lcov-report/
```

### Hybrid Approach

You can also use a hybrid approach, where you specify one path locally and use S3 for the other:

```yaml
- name: Coverage Report Hybrid
  uses: adRise/jest-cov-reporter@main
  with:
    branch-coverage-report-path: ./coverage/coverage-summary.json  # Use local path for current branch
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}           # Use S3 for base branch
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws-region: 'us-east-2'
    s3-bucket: 'your-coverage-bucket'
    s3-repo-directory: 'my-project'  # Optional
    base-branch: 'main'
```

This flexibility allows you to choose the approach that best fits your workflow.

## Full Coverage for New Files

The `check-new-file-full-coverage` option enforces that all newly added files have 100% test coverage. This encourages developers to write comprehensive tests for new code.

You can add a label to your PR called `skip-new-file-full-coverage` to bypass this check for specific PRs.

## Generating Coverage Reports

### Jest Configuration

To generate coverage reports in the correct format for this action, ensure your Jest command includes the following options:

```bash
jest --coverage --coverageReporters="json-summary"
```

In your CI workflow, you might include something like:

```yaml
- name: Run tests with coverage
  run: npm test -- --coverage --coverageReporters="json-summary"

- name: Verify coverage report exists
  run: |
    if [ -f "coverage/coverage-summary.json" ]; then
      echo "Coverage report exists"
    else
      echo "ERROR: Coverage report not found!"
      exit 1
    fi
```

This will ensure that the `coverage-summary.json` file needed by this action is properly generated.

## Development

### Prerequisites

- Node.js (v16+)
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build the project
npm run build
```

### Project Structure

```
/src
  /core            # Core functionality
    /diff          # Coverage diff calculation
    /threshold     # Coverage threshold validation
    /format        # Report formatting
  /parsers         # Coverage report parsers
  /utils           # Utility functions
  /types           # TypeScript types
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT