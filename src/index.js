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
    // commit sha
    const commitSha = github.context.sha
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

    // Read the json summary files for base and branch coverage
    const codeCoverageNew = JSON.parse(fs.readFileSync(branchCoverageReportPath).toString());
    const codeCoverageOld = JSON.parse(fs.readFileSync(baseCoverageReportPath).toString());

    // Perform analysis
    const diffChecker = new DiffChecker(codeCoverageNew, codeCoverageOld);
    
    // Get the current directory to replace the file name paths
    const currentDirectory = execSync('pwd')
      .toString()
      .trim()
    
    // Get coverage details.
    // fullCoverage: This will provide a full coverage report. You can set it to false if you do not need full coverage
    const coverageDetails = diffChecker.getCoverageDetails(
      !fullCoverage,
      `${currentDirectory}/`
    )

    // Add a comment to PR with full coverage report
    let messageToPost = '## Test coverage results :test_tube: \n\n'

    // If coverageDetails length is 0 that means there is no change between base and head
    if (coverageDetails.length === 0) {
      messageToPost =
              'No changes to code coverage between the master branch and the head branch'
    } else {
      // If coverage details is below delta then post a message
      if (diffChecker.checkIfTestCoverageFallsBelowDelta(delta)) {
        messageToPost += `Current PR reduces the test coverage percentage by ${delta} for some tests \n\n`
      }
      // Show coverage table for all files that were affected because of this PR
      messageToPost +=
              'Status | File | % Stmts | % Branch | % Funcs | % Lines \n -----|-----|---------|----------|---------|------ \n'
      messageToPost += coverageDetails.join('\n')
    }

    messageToPost = `${commentIdentifier} \n Commit SHA: ${commitSha} \n ${messageToPost}`
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
    if (diffChecker.checkIfTestCoverageFallsBelowDelta(delta)) {
      throw Error(messageToPost)
    }
  } catch (error) {
    core.setFailed(error)
  }
}

main();
