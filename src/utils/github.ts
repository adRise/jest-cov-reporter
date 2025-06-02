import { GitHub } from '@actions/github/lib/utils';
import { MAX_COMMENT_LINES } from './constants';

type GitHubClient = InstanceType<typeof GitHub>;

/**
 * Create or update comment based on commentId
 * @param commentId - ID of the existing comment to update (0 for new comment)
 * @param githubClient - GitHub API client
 * @param repoOwner - Repository owner
 * @param repoName - Repository name
 * @param messageToPost - Comment message content
 * @param prNumber - Pull request number
 */
export async function createOrUpdateComment(
  commentId: number,
  githubClient: GitHubClient,
  repoOwner: string,
  repoName: string,
  messageToPost: string,
  prNumber: number
): Promise<void> {
  if (commentId) {
    await githubClient.issues.updateComment({
      owner: repoOwner,
      repo: repoName,
      comment_id: commentId,
      body: messageToPost
    });
  } else {
    await githubClient.issues.createComment({
      repo: repoName,
      owner: repoOwner,
      body: messageToPost,
      issue_number: prNumber
    });
  }
}

/**
 * Find comment from a list of comments in a PR
 * @param githubClient - GitHub API client
 * @param repoName - Repository name
 * @param repoOwner - Repository owner
 * @param prNumber - Pull request number
 * @param identifier - Comment identifier string
 * @returns Comment ID if found, 0 otherwise
 */
export async function findComment(
  githubClient: GitHubClient,
  repoName: string,
  repoOwner: string,
  prNumber: number,
  identifier: string
): Promise<number> {
  const comments = await githubClient.issues.listComments({
    owner: repoOwner,
    repo: repoName,
    issue_number: prNumber
  });
    
  for (const comment of comments.data) {
    if (comment.body && comment.body.startsWith(identifier)) {
      return comment.id;
    }
  }
  return 0;
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