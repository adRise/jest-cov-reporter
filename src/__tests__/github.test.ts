import { createOrUpdateComment, findComment, limitCommentLength } from '../utils/github';
import { MAX_COMMENT_LINES } from '../utils/constants';

// Mock GitHub client
const mockGithubClient = {
  issues: {
    createComment: jest.fn(),
    updateComment: jest.fn(),
    listComments: jest.fn()
  }
};

describe('GitHub Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrUpdateComment', () => {
    it('should create a new comment when no commentId is provided', async () => {
      await createOrUpdateComment(
        0,
        mockGithubClient as any,
        'owner',
        'repo',
        'message',
        123
      );

      expect(mockGithubClient.issues.createComment).toHaveBeenCalledWith({
        repo: 'repo',
        owner: 'owner',
        body: 'message',
        issue_number: 123
      });
      expect(mockGithubClient.issues.updateComment).not.toHaveBeenCalled();
    });

    it('should update an existing comment when commentId is provided', async () => {
      await createOrUpdateComment(
        456,
        mockGithubClient as any,
        'owner',
        'repo',
        'message',
        123
      );

      expect(mockGithubClient.issues.updateComment).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        comment_id: 456,
        body: 'message'
      });
      expect(mockGithubClient.issues.createComment).not.toHaveBeenCalled();
    });
  });

  describe('findComment', () => {
    it('should find a comment with the matching identifier', async () => {
      mockGithubClient.issues.listComments.mockResolvedValueOnce({
        data: [
          { id: 1, body: 'other comment' },
          { id: 2, body: 'identifier\nsome content' },
          { id: 3, body: 'another comment' }
        ]
      });

      const result = await findComment(
        mockGithubClient as any,
        'repo',
        'owner',
        123,
        'identifier'
      );

      expect(result).toBe(2);
      expect(mockGithubClient.issues.listComments).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        issue_number: 123
      });
    });

    it('should return 0 when no matching comment is found', async () => {
      mockGithubClient.issues.listComments.mockResolvedValueOnce({
        data: [
          { id: 1, body: 'other comment' },
          { id: 3, body: 'another comment' }
        ]
      });

      const result = await findComment(
        mockGithubClient as any,
        'repo',
        'owner',
        123,
        'identifier'
      );

      expect(result).toBe(0);
    });

    it('should handle comments with undefined body', async () => {
      mockGithubClient.issues.listComments.mockResolvedValueOnce({
        data: [
          { id: 1, body: undefined },
          { id: 2, body: 'identifier\nsome content' }
        ]
      });

      const result = await findComment(
        mockGithubClient as any,
        'repo',
        'owner',
        123,
        'identifier'
      );

      expect(result).toBe(2);
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