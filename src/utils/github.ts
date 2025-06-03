import { GitHub } from '@actions/github/lib/utils';
import { MAX_COMMENT_LINES } from './constants';
import * as core from '@actions/core';

type GitHubClient = InstanceType<typeof GitHub>;

export interface GitHubComment {
  id: number;
  body: string;
}

/**
 * Find a comment in a PR that contains the given identifier
 * @param githubClient - GitHub client instance
 * @param prNumber - PR number
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param identifier - Identifier to look for in comments
 * @returns The comment object or null if not found
 */
export async function findComment(
  githubClient: GitHubClient,
  prNumber: number,
  owner: string, 
  repo: string,
  identifier: string
): Promise<GitHubComment | null> {
  try {
    const { data: comments } = await githubClient.rest.issues.listComments({
      owner,
      repo,
      issue_number: prNumber,
    });

    return comments.find((comment: GitHubComment) => comment.body.includes(identifier)) || null;
  } catch (error) {
    if (error instanceof Error) {
      core.warning(`Error finding comment: ${error.message}`);
    } else {
      core.warning('Error finding comment: Unknown error');
    }
    return null;
  }
}

/**
 * Limit comment length to avoid exceeding GitHub's maximum size
 * @param commentsLines - Array of comment lines
 * @returns Truncated array of comment lines
 */
export const limitCommentLength = (commentsLines: string[]): string[] => {
  if (commentsLines.length > MAX_COMMENT_LINES) {
    const columnNumber = commentsLines[0].split('|').length;
    const ellipsisRow = '...|'.repeat(columnNumber);
    return [...commentsLines.slice(0, MAX_COMMENT_LINES), ellipsisRow];
  }
  return commentsLines;
};

/**
 * Create or update a comment in a PR
 * @param githubClient - GitHub client instance
 * @param prNumber - PR number
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param body - Comment body
 * @param commentId - Comment ID to update (if provided, update existing comment)
 * @returns The created or updated comment
 */
export async function createOrUpdateComment(
  githubClient: GitHubClient,
  prNumber: number,
  owner: string,
  repo: string,
  body: string,
  commentId?: number
): Promise<GitHubComment> {
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
    if (error instanceof Error) {
      core.warning(`Error creating/updating comment: ${error.message}`);
    } else {
      core.warning('Error creating/updating comment: Unknown error');
    }
    throw error;
  }
} 