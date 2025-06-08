import { createOrUpdateComment, findComment, limitCommentLength } from '../utils/github';
import { MAX_COMMENT_LINES } from '../utils/constants';

// Mock GitHub client
const mockGithubClient = {
  rest: {
    issues: {
      createComment: jest.fn(),
      updateComment: jest.fn(),
      listComments: jest.fn()
    }
  }
};

describe('GitHub Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrUpdateComment', () => {
    it('should create a new comment when no commentId is provided', async () => {
      mockGithubClient.rest.issues.createComment.mockResolvedValueOnce({
        data: { id: 123, body: 'message' }
      });

      await createOrUpdateComment(
        mockGithubClient as any,
        123,
        'owner',
        'repo',
        'message'
      );

      expect(mockGithubClient.rest.issues.createComment).toHaveBeenCalledWith({
        repo: 'repo',
        owner: 'owner',
        body: 'message',
        issue_number: 123
      });
      expect(mockGithubClient.rest.issues.updateComment).not.toHaveBeenCalled();
    });

    it('should update an existing comment when commentId is provided', async () => {
      mockGithubClient.rest.issues.updateComment.mockResolvedValueOnce({
        data: { id: 456, body: 'message' }
      });

      await createOrUpdateComment(
        mockGithubClient as any,
        123,
        'owner',
        'repo',
        'message',
        456
      );

      expect(mockGithubClient.rest.issues.updateComment).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        comment_id: 456,
        body: 'message'
      });
      expect(mockGithubClient.rest.issues.createComment).not.toHaveBeenCalled();
    });
  });

  describe('findComment', () => {
    it('should find a comment with the matching identifier', async () => {
      mockGithubClient.rest.issues.listComments.mockResolvedValueOnce({
        data: [
          { id: 1, body: 'other comment' },
          { id: 2, body: 'identifier\nsome content' },
          { id: 3, body: 'another comment' }
        ]
      });

      const result = await findComment(
        mockGithubClient as any,
        123,
        'owner',
        'repo',
        'identifier'
      );

      expect(result).toEqual({ id: 2, body: 'identifier\nsome content' });
      expect(mockGithubClient.rest.issues.listComments).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        issue_number: 123
      });
    });

    it('should return null when no matching comment is found', async () => {
      mockGithubClient.rest.issues.listComments.mockResolvedValueOnce({
        data: [
          { id: 1, body: 'other comment' },
          { id: 3, body: 'another comment' }
        ]
      });

      const result = await findComment(
        mockGithubClient as any,
        123,
        'owner',
        'repo',
        'identifier'
      );

      expect(result).toBeNull();
    });

    it('should handle comments with undefined body', async () => {
      mockGithubClient.rest.issues.listComments.mockResolvedValueOnce({
        data: [
          { id: 1, body: undefined },
          { id: 2, body: 'identifier\nsome content' }
        ]
      });

      const result = await findComment(
        mockGithubClient as any,
        123,
        'owner',
        'repo',
        'identifier'
      );

      expect(result).toEqual({ id: 2, body: 'identifier\nsome content' });
      
      // Make sure it safely skips undefined bodies
      const checkCall = mockGithubClient.rest.issues.listComments.mock.calls[0];
      expect(checkCall).toBeDefined();
    });
  });

  describe('limitCommentLength', () => {
    it('should not modify arrays under the limit', () => {
      const lines = Array(MAX_COMMENT_LINES - 1).fill('line');
      const result = limitCommentLength(lines);
      expect(result).toHaveLength(MAX_COMMENT_LINES - 1);
      expect(result).toBe(lines); // Same reference
    });

    it('should truncate arrays over the limit', () => {
      const lines = Array(MAX_COMMENT_LINES + 10).fill('line|value');
      const result = limitCommentLength(lines);
      expect(result).toHaveLength(MAX_COMMENT_LINES + 1); // +1 for the ellipsis row
      expect(result[MAX_COMMENT_LINES]).toContain('...');
    });

    it('should create proper ellipsis based on column count', () => {
      const lines = Array(MAX_COMMENT_LINES + 10).fill('col1|col2|col3');
      const result = limitCommentLength(lines);
      expect(result[MAX_COMMENT_LINES]).toBe('...|...|...|');
    });
  });
}); 