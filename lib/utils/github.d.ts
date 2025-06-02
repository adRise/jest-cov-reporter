import { GitHub } from '@actions/github/lib/utils';
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
export declare function createOrUpdateComment(commentId: number, githubClient: GitHubClient, repoOwner: string, repoName: string, messageToPost: string, prNumber: number): Promise<void>;
/**
 * Find comment from a list of comments in a PR
 * @param githubClient - GitHub API client
 * @param repoName - Repository name
 * @param repoOwner - Repository owner
 * @param prNumber - Pull request number
 * @param identifier - Comment identifier string
 * @returns Comment ID if found, 0 otherwise
 */
export declare function findComment(githubClient: GitHubClient, repoName: string, repoOwner: string, prNumber: number, identifier: string): Promise<number>;
/**
 * Limit comment length to avoid exceeding GitHub's maximum size
 * @param commentsLines - Array of comment lines
 * @returns Truncated array of comment lines
 */
export declare const limitCommentLength: (commentsLines: string[]) => string[];
export {};
