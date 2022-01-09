import * as core from '@actions/core';
import {DiffChecker} from './DiffChecker';
import * as github from '@actions/github';
import fs from 'fs';
import {execSync} from 'child_process'

async function main() {
  try {
    const repoName = github.context.repo.repo
    const repoOwner = github.context.repo.owner
    const commitSha = github.context.sha
    const githubToken = core.getInput('accessToken')
    const fullCoverage = JSON.parse(core.getInput('fullCoverageDiff'))
    const delta = Number(core.getInput('delta'))
    const githubClient = github.getOctokit(githubToken)
    const prNumber = github.context.issue.number
    const branchNameBase = github.context.payload.pull_request.base.ref
    const branchNameHead = github.context.payload.pull_request.head.ref
    const useSameComment = JSON.parse(core.getInput('useSameComment'))
    const commentIdentifier = `<!-- codeCoverageDiffComment -->`
    const deltaCommentIdentifier = `<!-- codeCoverageDeltaComment -->`
    const baseCoverageReportPath = core.getInput('base-coverage-report-path');
    const branchCoverageReportPath = core.getInput('branch-coverage-report-path');
    if (!baseCoverageReportPath || !branchCoverageReportPath) {
      core.setFailed(`Validation Failure: Missing ${baseCoverageReportPath ? 'branch-coverage-report-path' : 'base-coverage-report-path'}`);
      return;
    }

    const codeCoverageNew = JSON.parse(fs.readFileSync(branchCoverageReportPath).toString());

    const codeCoverageOld = JSON.parse(fs.readFileSync(baseCoverageReportPath).toString())

    const diffChecker = new DiffChecker(codeCoverageNew, codeCoverageOld)
    let messageToPost = `## Test coverage results :test_tube: \n
          Code coverage diff between base branch:${branchNameBase} and head branch: ${branchNameHead} \n\n`

    const currentDirectory = execSync('pwd')
      .toString()
      .trim()
    const coverageDetails = diffChecker.getCoverageDetails(
      !fullCoverage,
      `${currentDirectory}/`
    )
    if (coverageDetails.length === 0) {
      messageToPost =
              'No changes to code coverage between the base branch and the head branch'
    } else {
      messageToPost +=
              'Status | File | % Stmts | % Branch | % Funcs | % Lines \n -----|-----|---------|----------|---------|------ \n'
      messageToPost += coverageDetails.join('\n')
    }
    messageToPost = `${commentIdentifier}\nCommit SHA:${commitSha}\n${messageToPost}`
    let commentId = null
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
      console.log('**** diffChecker.checkIfTestCoverageFallsBelowDelta(delta) **', diffChecker.checkIfTestCoverageFallsBelowDelta(delta))
      if (useSameComment) {
        commentId = await findComment(
          githubClient,
          repoName,
          repoOwner,
          prNumber,
          deltaCommentIdentifier
        )
      }
      messageToPost = `Current PR reduces the test coverage percentage by ${delta} for some tests`
      messageToPost = `${deltaCommentIdentifier}\nCommit SHA:${commitSha}\n${messageToPost}`
      await createOrUpdateComment(
        commentId,
        githubClient,
        repoOwner,
        repoName,
        messageToPost,
        prNumber
      )
      // throw Error(messageToPost)
      core.setFailed(Error(messageToPost))
    }
  } catch (error) {
    console.log('fatal error', error)
    core.setFailed(error)
  }
}

async function createOrUpdateComment(
  commentId,
  githubClient,
  repoOwner,
  repoName,
  messageToPost,
  prNumber
) {
  if (commentId) {
    await githubClient.issues.updateComment({
      owner: repoOwner,
      repo: repoName,
      comment_id: commentId,
      body: messageToPost
    })
  } else {
    await githubClient.issues.createComment({
      repo: repoName,
      owner: repoOwner,
      body: messageToPost,
      issue_number: prNumber
    })
  }
}
  
async function findComment(
  githubClient,
  repoName,
  repoOwner,
  prNumber,
  identifier
) {
  const comments = await githubClient.issues.listComments({
    owner: repoOwner,
    repo: repoName,
    issue_number: prNumber
  })
  
  for (const comment of comments.data) {
    if (comment.body.startsWith(identifier)) {
      return comment.id
    }
  }
  return 0
}
  

main();
