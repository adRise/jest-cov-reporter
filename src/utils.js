/**
 * Create or update comment based on commentId
 * @param {*} commentId 
 * @param {*} githubClient 
 * @param {*} repoOwner 
 * @param {*} repoName 
 * @param {*} messageToPost 
 * @param {*} prNumber 
 */
export async function createOrUpdateComment(
  commentId,
  githubClient,
  repoOwner,
  repoName,
  messageToPost,
  prNumber
) {
  console.log(messageToPost);
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

/**
 * findComment from a list of comments in a PR
 * @param {*} githubClient 
 * @param {*} repoName 
 * @param {*} repoOwner 
 * @param {*} prNumber 
 * @param {*} identifier 
 * @returns 
 */
export async function findComment(
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