# jest-coverage-reporter

A simple coverage reporter for jest which compares json-summary reports for a base branch to the current branch

## Screenshots

Success Screenshot
![success](https://github.com/arunshan/jest-cov-reporter/blob/main/images/pass.png?raw=true)

Failure Screenshot
![failure](https://github.com/arunshan/jest-cov-reporter/blob/main/images/fail.png?raw=true)


## Usage
```
- name: Coverage
        uses: adRise/jest-cov-reporter@main
        with:
          branch-coverage-report-path: ./coverage/coverage-summary.json
          base-coverage-report-path: ./coverage/master-coverage-summary.json
          delta: 0.3
          accessToken: <GITHUB_TOKEN>
          fullCoverageDiff: true
          useSameComment: true
```

## Options

1. `base-coverage-report-path`: Path to base coverage report. Required.
2. `branch-coverage-report-path`: Path to the current coverage report. Required.
3. `accessToken`: access token required to comment on a pr.
    Defaults to ${{ github.token }}
4. `fullCoverageDiff`: get the full coverage with diff or only the diff. Defaults to false
5. `delta`: Difference between the old and final test coverage. Defaults to 0.2
6. `useSameComment`: While commenting on the PR update the exisiting comment. Defaults to true.

