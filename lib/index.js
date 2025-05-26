import * as core from '@actions/core';
import * as github from '@actions/github';
import { execSync } from 'child_process';
import { CoverageDiffCalculator } from './core/diff/CoverageDiffCalculator';
import { ReportFormatter } from './core/format/ReportFormatter';
import { ThresholdValidator } from './core/threshold/ThresholdValidator';
import parseContent from './parsers';
import { COMMENT_IDENTIFIER } from './utils/constants';
import { createOrUpdateComment, findComment } from './utils/github';
/**
 * Main function that runs the coverage reporter
 */
async function main() {
    try {
        // repo name
        const repoName = github.context.repo.repo;
        // get the repo owner
        const repoOwner = github.context.repo.owner;
        // github token
        const githubToken = core.getInput('accessToken');
        // Full coverage (true/false)
        const fullCoverage = JSON.parse(core.getInput('fullCoverageDiff'));
        // delta coverage. Defaults to 0.2
        const delta = Number(core.getInput('delta'));
        const githubClient = github.getOctokit(githubToken);
        // PR number
        const prNumber = github.context.issue.number;
        // Use the same comment for posting diff updates on a PR
        const useSameComment = JSON.parse(core.getInput('useSameComment'));
        // get the custom message
        const customMessage = core.getInput('custom-message');
        // Only check changed files in PR
        const onlyCheckChangedFiles = core.getInput('only-check-changed-files');
        // Add prefix to file name URLs
        const prefixFilenameUrl = core.getInput('prefix-filename-url');
        // The base coverage json summary report. This should be master/main summary report.
        const baseCoverageReportPath = core.getInput('base-coverage-report-path');
        // branch coverage json summary report
        const branchCoverageReportPath = core.getInput('branch-coverage-report-path');
        // check newly added file whether have full coverage tests
        const checkNewFileFullCoverageInput = core.getInput('check-new-file-full-coverage') === 'true';
        const coverageType = core.getInput('coverageType');
        // If either of base or branch summary report does not exist, then exit with failure.
        if (!baseCoverageReportPath || !branchCoverageReportPath) {
            core.setFailed(`Validation Failure: Missing ${baseCoverageReportPath ? 'branch-coverage-report-path' : 'base-coverage-report-path'}`);
            return;
        }
        let changedFiles = null;
        let addedFiles = null;
        if (onlyCheckChangedFiles === 'true') {
            const files = await githubClient.pulls.listFiles({
                owner: repoOwner,
                repo: repoName,
                pull_number: prNumber,
            });
            changedFiles = files.data ? files.data.map(file => file.filename) : [];
            addedFiles = files.data ? files.data.filter(file => file.status === 'added').map(file => file.filename) : [];
        }
        const coverageReportNew = parseContent(branchCoverageReportPath, coverageType);
        const coverageReportOld = parseContent(baseCoverageReportPath, coverageType);
        // Get the current directory to replace the file name paths
        const currentDirectory = execSync('pwd')
            .toString()
            .trim();
        const pullRequest = await githubClient.pulls.get({
            owner: repoOwner,
            repo: repoName,
            pull_number: prNumber,
        });
        const checkNewFileFullCoverage = checkNewFileFullCoverageInput &&
            !pullRequest.data.labels.some(label => label.name && label.name.includes('skip-new-file-full-coverage'));
        // Create diff calculator
        const diffCalculator = new CoverageDiffCalculator({
            coverageReportNew,
            coverageReportOld,
            coverageType,
            currentDirectory
        });
        // Create threshold validator
        const thresholdValidator = new ThresholdValidator({
            diffCalculator,
            delta,
            changedFiles,
            addedFiles,
            checkNewFileFullCoverage,
            currentDirectory
        });
        // Create report formatter
        const reportFormatter = new ReportFormatter({
            diffCalculator,
            thresholdValidator,
            coverageReportNew,
            coverageType,
            delta,
            currentDirectory,
            prefixFilenameUrl,
            prNumber,
            checkNewFileFullCoverage
        });
        // Get coverage details.
        // fullCoverage: This will provide a full coverage report. You can set it to false if you do not need full coverage
        const { decreaseStatusLines, remainingStatusLines, totalCoverageLines, statusHeader } = reportFormatter.getCoverageDetails(!fullCoverage);
        const isCoverageBelowDelta = thresholdValidator.checkIfTestCoverageFallsBelowDelta();
        const isNotFullCoverageOnNewFile = thresholdValidator.checkIfNewFileNotFullCoverage();
        // Add a comment to PR with full coverage report
        let messageToPost = `## Coverage Report \n\n`;
        messageToPost += `* **Status**: ${isNotFullCoverageOnNewFile || isCoverageBelowDelta ? ':x: **Failed**' : ':white_check_mark: **Passed**'} \n`;
        // Add the custom message if it exists
        if (customMessage !== '') {
            messageToPost += `* ${customMessage} \n`;
        }
        // If coverageDetails length is 0 that means there is no change between base and head
        if (remainingStatusLines.length === 0 && decreaseStatusLines.length === 0) {
            messageToPost +=
                '* No changes to code coverage between the master branch and the current head branch';
            messageToPost += '\n--- \n\n';
        }
        else {
            if (isNotFullCoverageOnNewFile) {
                messageToPost += `* Current PR does not have full coverage for new files \n`;
            }
            // If coverage details is below delta then post a message
            if (isCoverageBelowDelta) {
                messageToPost += `* Current PR reduces the test coverage percentage by ${delta} for some tests \n`;
            }
            messageToPost += '--- \n\n';
            if (decreaseStatusLines.length > 0) {
                messageToPost +=
                    `Status | Changes Missing Coverage | ${statusHeader} ---------|------ \n`;
                messageToPost += decreaseStatusLines.join('\n');
                messageToPost += '\n--- \n\n';
            }
            // Show coverage table for all files that were affected because of this PR
            if (remainingStatusLines.length > 0) {
                messageToPost += '<details>';
                messageToPost += '<summary markdown="span">Click to view remaining coverage report</summary>\n\n';
                messageToPost +=
                    `Status | File | ${statusHeader} ---------|------ \n`;
                messageToPost += remainingStatusLines.join('\n');
                messageToPost += '\n';
                messageToPost += '</details>';
                messageToPost += '\n\n--- \n\n';
            }
        }
        if (totalCoverageLines) {
            const { changesPct, covered, total, totalPct, summaryMetric, } = totalCoverageLines;
            messageToPost +=
                `| Total | ${totalPct}% | \n :-----|-----: \n Change from base: | ${changesPct}% \n Covered ${summaryMetric}: | ${covered} \n Total ${summaryMetric}: | ${total} \n`;
        }
        messageToPost = `${COMMENT_IDENTIFIER} \n ${messageToPost}`;
        let commentId = 0;
        // If useSameComment is true, then find the comment and then update that comment.
        // If not, then create a new comment
        if (useSameComment) {
            commentId = await findComment(githubClient, repoName, repoOwner, prNumber, COMMENT_IDENTIFIER);
        }
        await createOrUpdateComment(commentId, githubClient, repoOwner, repoName, messageToPost, prNumber);
        // check if the test coverage is falling below delta/tolerance.
        if (isNotFullCoverageOnNewFile || isCoverageBelowDelta) {
            throw Error(messageToPost);
        }
    }
    catch (error) {
        if (error instanceof Error) {
            core.setFailed(error.message);
        }
        else {
            core.setFailed('An unknown error occurred');
        }
    }
}
main();
//# sourceMappingURL=index.js.map