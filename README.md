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

## Usage

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

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `base-coverage-report-path` | Path to base coverage report | Required |
| `branch-coverage-report-path` | Path to the current coverage report | Required |
| `accessToken` | Access token required to comment on a PR | `${{ github.token }}` |
| `fullCoverageDiff` | Get the full coverage with diff or only the diff | `false` |
| `delta` | Difference threshold between the old and final test coverage | `0.2` |
| `useSameComment` | Update existing comment on the PR instead of creating new ones | `true` |
| `custom-message` | Pass any custom string which will be displayed in the comment | `''` |
| `only-check-changed-files` | Only test for changed files in the PR | `true` |
| `prefix-filename-url` | Add a base URL to the filenames and make it a hyperlink | `''` |
| `check-new-file-full-coverage` | Check newly added files whether have full coverage tests | `true` |
| `coverageType` | Tools that generate code coverage, supports 'jest' and 'cobertura' | `'jest'` |

## Full Coverage for New Files

The `check-new-file-full-coverage` option enforces that all newly added files have 100% test coverage. This encourages developers to write comprehensive tests for new code.

You can add a label to your PR called `skip-new-file-full-coverage` to bypass this check for specific PRs.

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

