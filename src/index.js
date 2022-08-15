import * as core from '@actions/core';
import { DiffChecker } from './DiffChecker';
import * as github from '@actions/github';
import fs from 'fs';
import { execSync } from 'child_process';
import { createOrUpdateComment, findComment } from './utils';

async function main() {
  try {
    // repo name
    const repoName = github.context.repo.repo
    // get the repo owner
    const repoOwner = github.context.repo.owner
    
    // github token
    const githubToken = core.getInput('accessToken')
    // Full coverage (true/false)
    const fullCoverage = JSON.parse(core.getInput('fullCoverageDiff'))
    // delta coverage. Defaults to 0.2
    const delta = Number(core.getInput('delta'))
    const githubClient = github.getOctokit(githubToken)
    // PR number
    const prNumber = github.context.issue.number
    // Use the same comment for posting diff updates on a PR
    const useSameComment = JSON.parse(core.getInput('useSameComment'))

    // get the custom message
    const customMessage = core.getInput('custom-message');

    // Only check changed files in PR
    const onlyCheckChangedFiles = core.getInput('only-check-changed-files');

    // Add prefix to file name URLs
    const prefixFilenameUrl = core.getInput('prefix-filename-url')
    
    // comment ID to uniquely identify a comment.
    const commentIdentifier = `<!-- codeCoverageDiffComment -->`

    // The base coverage json summary report. This should be master/main summary report.
    const baseCoverageReportPath = core.getInput('base-coverage-report-path');

    // branch coverage json summary report
    const branchCoverageReportPath = core.getInput('branch-coverage-report-path');

    // If either of base or branch summary report does not exist, then exit with failure.
    if (!baseCoverageReportPath || !branchCoverageReportPath) {
      core.setFailed(`Validation Failure: Missing ${baseCoverageReportPath ? 'branch-coverage-report-path' : 'base-coverage-report-path'}`);
      return;
    }

    let changedFiles = null;
    if (onlyCheckChangedFiles) {
      const files = await githubClient.pulls.listFiles({
        owner: repoOwner,
        repo: repoName,
        pull_number: prNumber,
      });
      changedFiles = files.data ? files.data.map(file => file.filename) : [];
    }

    // Read the json summary files for base and branch coverage
    const coverageReportNew = JSON.parse(fs.readFileSync(branchCoverageReportPath).toString());
    const coverageReportOld = JSON.parse(fs.readFileSync(baseCoverageReportPath).toString());

    // Get the current directory to replace the file name paths
    const currentDirectory = execSync('pwd')
      .toString()
      .trim()

    const pullRequest = await githubClient.pulls.get({
      owner: repoOwner,
      repo: repoName,
      pull_number: prNumber,
    });

    console.log(Array.prototype.some)
    const checkNewFileFullCoverage = !((pullRequest.data.labels || []).some(label => label.name.includes('skip-new-file-full-coverage')));
    console.log(checkNewFileFullCoverage)

    // Perform analysis
    const diffChecker = new DiffChecker({ coverageReportNew, coverageReportOld, delta, changedFiles, currentDirectory, prefixFilenameUrl, prNumber, checkNewFileFullCoverage });
    
    // Get coverage details.
    // fullCoverage: This will provide a full coverage report. You can set it to false if you do not need full coverage
    const { decreaseStatusLines, remainingStatusLines, totalCoverageLines } = diffChecker.getCoverageDetails(!fullCoverage)

    const isCoverageBelowDelta = diffChecker.checkIfTestCoverageFallsBelowDelta(delta);
    // Add a comment to PR with full coverage report
    let messageToPost = `## Coverage Report \n\n`

    messageToPost += `* **Status**: ${isCoverageBelowDelta ? ':x: **Failed**' : ':white_check_mark: **Passed**'} \n`

    // Add the custom message if it exists
    if (customMessage !== '') {
      messageToPost += `* ${customMessage} \n`;
    }

    // If coverageDetails length is 0 that means there is no change between base and head
    if (remainingStatusLines.length === 0 && decreaseStatusLines.length === 0) {
      messageToPost +=
              '* No changes to code coverage between the master branch and the current head branch'
      messageToPost += '\n--- \n\n'
    } else {
      // If coverage details is below delta then post a message
      if (isCoverageBelowDelta) {
        messageToPost += `* Current PR reduces the test coverage percentage by ${delta} for some tests \n`
      }
      messageToPost += '--- \n\n'
      if (decreaseStatusLines.length > 0) {
        messageToPost +=
              'Status | Changes Missing Coverage | Stmts | Branch | Funcs | Lines \n -----|-----|---------|----------|---------|------ \n'
        messageToPost += decreaseStatusLines.join('\n')
        messageToPost += '\n--- \n\n'
      }

      // Show coverage table for all files that were affected because of this PR
      if (remainingStatusLines.length > 0) {
        messageToPost += '<details>'
        messageToPost += '<summary markdown="span">Click to view remaining coverage report</summary>\n\n'
        messageToPost +=
              'Status | File | Stmts | Branch | Funcs | Lines \n -----|-----|---------|----------|---------|------ \n'
        messageToPost += remainingStatusLines.join('\n')
        messageToPost += '\n';
        messageToPost += '</details>';
        messageToPost += '\n\n--- \n\n'
      }
    }

    if (totalCoverageLines) {
      const {
        lineChangesPct,
        linesCovered,
        linesTotal,
        linesTotalPct
      } = totalCoverageLines
      messageToPost +=
            `| Total | ${linesTotalPct}% | \n :-----|-----: \n Change from base: | ${lineChangesPct}% \n Covered Lines: | ${linesCovered} \n Total Lines: | ${linesTotal} \n`;
    }

    messageToPost = `${commentIdentifier} \n ${messageToPost}`
    let commentId = null

    // If useSameComment is true, then find the comment and then update that comment.
    // If not, then create a new comment
    if (useSameComment) {
      commentId = await findComment(
        githubClient,
        repoName,
        repoOwner,
        prNumber,
        commentIdentifier
      )
    }

    await createOrUpdateComment(
      commentId,
      githubClient,
      repoOwner,
      repoName,
      messageToPost,
      prNumber
    )
      
    // check if the test coverage is falling below delta/tolerance.
    if (diffChecker.checkIfNewFileNotFullCoverage() || diffChecker.checkIfTestCoverageFallsBelowDelta(delta)) {
      throw Error(messageToPost);
    }
  } catch (error) {
    core.setFailed(error)
  }
}

main();
