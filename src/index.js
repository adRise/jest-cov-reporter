import * as core from '@actions/core';

async function main() {
    const baseCoverageReportPath = core.getInput('base-coverage-report-path');
    const branchCoverageReportPath = core.getInput('branch-coverage-report-path');
    if (!baseCoverageReportPath || !branchCoverageReportPath) {
        core.setFailed(`Validation Failure: Missing ${baseCoverageReportPath ? 'branch-coverage-report-path' : 'base-coverage-report-path'}`);
        return;
    }
    
}

main();
