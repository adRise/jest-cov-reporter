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
- **New:** Optional AI-powered coverage analysis and recommendations

## Quick Start with AI Coverage Suggestions

Here's a complete example of using the action with AI-powered line-level coverage suggestions:

```yaml
name: Test Coverage with AI Analysis

on:
  pull_request:
    branches: [ main ]

jobs:
  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests with coverage
        run: npm test -- --coverage --coverageReporters="json-summary"
        
      - name: AI-Powered Coverage Report
        uses: adRise/jest-cov-reporter@main
        with:
          branch-coverage-report-path: ./coverage/coverage-summary.json
          base-coverage-report-path: ./coverage/coverage-summary.json
          delta: 0.3
          ai-enabled: 'true'
          ai-api-key: ${{ secrets.OPENAI_API_KEY }}
```

This will generate coverage reports with intelligent AI suggestions for improving your test coverage, including specific line-by-line recommendations.

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
| `ai-enabled` | Enable AI-powered coverage analysis and line-level suggestions | `false` |
| `ai-model` | AI model to use for analysis (e.g., 'gpt-4', 'gpt-3.5-turbo') | `gpt-4` |
| `ai-temperature` | Temperature setting for AI responses (0-1, lower = more focused) | `0.7` |
| `ai-max-tokens` | Maximum tokens for AI responses (increase for detailed line suggestions) | `2000` |
| `ai-api-key` | OpenAI API key for AI-powered coverage analysis | Required if enabled |

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

## AI-Powered Coverage Analysis (Optional)

The action includes an optional AI-powered analysis feature that provides intelligent insights about your coverage reports, including specific line-level suggestions for improving test coverage. This feature is disabled by default and requires an OpenAI API key to use.

### Basic Usage

To enable AI analysis, add the following to your workflow:

```yaml
- name: Coverage Report
  uses: adRise/jest-cov-reporter@main
  with:
    # ... existing options ...
    ai-enabled: 'true'
    ai-api-key: ${{ secrets.OPENAI_API_KEY }}
```

### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `ai-enabled` | Enable AI-powered coverage analysis and line-level suggestions | `false` |
| `ai-model` | AI model to use for analysis (e.g., 'gpt-4', 'gpt-3.5-turbo') | `gpt-4` |
| `ai-temperature` | Temperature setting for AI responses (0-1, lower = more focused) | `0.7` |
| `ai-max-tokens` | Maximum tokens for AI responses (increase for detailed line suggestions) | `2000` |
| `ai-api-key` | OpenAI API key for AI-powered coverage analysis | Required if enabled |

### Features

The AI analysis provides:

1. **General Coverage Insights**: Overall analysis of coverage trends and issues
2. **Specific Line Suggestions**: AI-generated recommendations for testing specific uncovered lines
3. **Prioritized Recommendations**: High/medium/low priority suggestions based on code importance
4. **Test Type Recommendations**: Suggestions for unit tests, integration tests, or edge case testing
5. **Uncovered Code Analysis**: Detailed breakdown of files needing coverage with code snippets

### Example Output

When AI analysis is enabled, your coverage report will include an enhanced section:

```markdown
## 🤖 AI Coverage Analysis

Analysis found 3 high priority issues and 2 medium priority recommendations for improving test coverage.

### 📋 Recommendations
- Add comprehensive unit tests for authentication logic in auth.ts
- Consider integration tests for database operations
- Focus on edge cases for error handling paths

### 🎯 Specific Line Suggestions

**src/auth/authentication.ts**
- 🔴 🧪 **Line 45**: Add unit test for token validation failure case
- 🟡 🔗 **Line 67**: Test integration with external auth provider
- 🟢 ⚠️ **Line 89**: Add edge case test for malformed input

**src/utils/database.ts**
- 🔴 🧪 **Line 23**: Test error handling for database connection failure
- 🟡 🧪 **Line 34**: Verify transaction rollback behavior

### 📊 Files Needing Coverage

**authentication.ts** (67.3% coverage)
- 8 uncovered lines: 45, 67, 89, 102, 134, 156, 178, 190
- Key uncovered code:
  - Line 45: `throw new AuthenticationError('Invalid token')`
  - Line 67: `const result = await externalAuth.validate(token)`
  - Line 89: `if (!input || typeof input !== 'string') {`

**database.ts** (72.1% coverage)
- 5 uncovered lines: 23, 34, 56, 78, 91
- Key uncovered code:
  - Line 23: `throw new DatabaseError('Connection failed')`
  - Line 34: `await transaction.rollback()`

### 🔍 Detailed Insights
⚠️ **HIGH**: Critical authentication logic lacks test coverage
   - File: src/auth/authentication.ts
   - Uncovered lines: 45, 67, 89
   - Suggested tests:
     - Test invalid token scenarios
     - Test external provider integration
     - Test input validation edge cases

✅ **IMPROVEMENT**: Database connection handling improved since last analysis
💡 **SUGGESTION**: Consider adding property-based tests for input validation
```

### Advanced Configuration

You can customize the AI analysis behavior:

```yaml
- name: Coverage Report with Enhanced AI Analysis
  uses: adRise/jest-cov-reporter@main
  with:
    # ... existing options ...
    ai-enabled: 'true'
    ai-model: 'gpt-4'  # Choose your preferred model
    ai-temperature: '0.3'  # Lower = more focused suggestions
    ai-max-tokens: '3000'  # Higher = more detailed line suggestions
    ai-api-key: ${{ secrets.OPENAI_API_KEY }}
```

### Model Recommendations

- **gpt-4**: Best for detailed, accurate line-level suggestions (recommended)
- **gpt-3.5-turbo**: Faster and cheaper, good for general insights
- **Temperature 0.3-0.5**: Best for focused, practical testing suggestions
- **Max Tokens 2000-3000**: Allows for detailed line-by-line analysis

### Using Without AI

If you don't want to use the AI analysis feature, simply omit the AI-related inputs:

```yaml
- name: Coverage Report
  uses: adRise/jest-cov-reporter@main
  with:
    branch-coverage-report-path: ./coverage/coverage-summary.json
    base-coverage-report-path: ./coverage/master-coverage-summary.json
    delta: 0.3
```

The action will work exactly the same way, just without the AI analysis section in the report.

### Security and Cost Considerations

When using AI analysis:

1. **Security**:
   - Store your OpenAI API key as a GitHub secret
   - Never commit the API key directly in your workflow files
   - Consider using a dedicated API key for this action
   - The AI only receives coverage data and file paths, not your actual source code

2. **Cost Management**:
   - Monitor your OpenAI API usage and costs
   - Consider using gpt-3.5-turbo for cost-effective analysis
   - Adjust `ai-max-tokens` based on your needs
   - The action limits analysis to the most problematic files to control costs

3. **Privacy**:
   - Only coverage statistics and uncovered line numbers are sent to OpenAI
   - Limited code snippets (only uncovered lines) may be included for context
   - No complete source files are transmitted