import { MAX_COMMENT_LINES } from './constants';
import * as core from '@actions/core';

/**
 * Create or update comment based on commentId
 * @param commentId - ID of the existing comment to update (0 for new comment)
 * @param githubClient - GitHub API client
 * @param repoOwner - Repository owner
 * @param repoName - Repository name
 * @param messageToPost - Comment message content
 * @param prNumber - Pull request number
 */
export async function createOrUpdateComment(commentId, githubClient, repoOwner, repoName, messageToPost, prNumber) {
    if (commentId) {
        await githubClient.issues.updateComment({
            owner: repoOwner,
            repo: repoName,
            comment_id: commentId,
            body: messageToPost
        });
    }
    else {
        await githubClient.issues.createComment({
            repo: repoName,
            owner: repoOwner,
            body: messageToPost,
            issue_number: prNumber
        });
    }
}

/**
 * Find a comment in a PR that contains the given identifier
 * @param {Object} githubClient - GitHub client instance
 * @param {number} prNumber - PR number
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} identifier - Identifier to look for in comments
 * @returns {Object|null} - The comment object or null if not found
 */
export const findComment = async (githubClient, prNumber, owner, repo, identifier) => {
  try {
    const { data: comments } = await githubClient.rest.issues.listComments({
      owner,
      repo,
      issue_number: prNumber,
    });

    return comments.find(comment => comment.body.includes(identifier)) || null;
  } catch (error) {
    core.warning(`Error finding comment: ${error.message}`);
    return null;
  }
};

/**
 * Limit comment length to avoid exceeding GitHub's maximum size
 * @param commentsLines - Array of comment lines
 * @returns Truncated array of comment lines
 */
export const limitCommentLength = (commentsLines) => {
    if (commentsLines.length > MAX_COMMENT_LINES) {
        const columnNumber = commentsLines[0].split('|').length;
        const ellipsisRow = '...|'.repeat(columnNumber);
        return [...commentsLines.slice(0, MAX_COMMENT_LINES), ellipsisRow];
    }
    return commentsLines;
};

/**
 * Create or update a comment in a PR
 * @param {Object} githubClient - GitHub client instance
 * @param {number} prNumber - PR number
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} body - Comment body
 * @param {number|null} commentId - Comment ID to update (if null, create new comment)
 * @returns {Object} - The created or updated comment
 */
export const createOrUpdateComment = async (githubClient, prNumber, owner, repo, body, commentId) => {
  try {
    if (commentId) {
      core.info(`Updating comment ID ${commentId}`);
      const { data: comment } = await githubClient.rest.issues.updateComment({
        owner,
        repo,
        comment_id: commentId,
        body,
      });
      return comment;
    } else {
      core.info('Creating new comment');
      const { data: comment } = await githubClient.rest.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body,
      });
      return comment;
    }
  } catch (error) {
    core.warning(`Error creating/updating comment: ${error.message}`);
    throw error;
  }
};
