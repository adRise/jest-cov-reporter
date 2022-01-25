"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findComment = exports.createOrUpdateComment = void 0;
// @ts-nocheck
/**
 * Create or update comment based on commentId
 * @param {*} commentId
 * @param {*} githubClient
 * @param {*} repoOwner
 * @param {*} repoName
 * @param {*} messageToPost
 * @param {*} prNumber
 */
function createOrUpdateComment(commentId, githubClient, repoOwner, repoName, messageToPost, prNumber) {
    return __awaiter(this, void 0, void 0, function* () {
        if (commentId) {
            yield githubClient.issues.updateComment({
                owner: repoOwner,
                repo: repoName,
                comment_id: commentId,
                body: messageToPost
            });
        }
        else {
            yield githubClient.issues.createComment({
                repo: repoName,
                owner: repoOwner,
                body: messageToPost,
                issue_number: prNumber
            });
        }
    });
}
exports.createOrUpdateComment = createOrUpdateComment;
/**
 * findComment from a list of comments in a PR
 * @param {*} githubClient
 * @param {*} repoName
 * @param {*} repoOwner
 * @param {*} prNumber
 * @param {*} identifier
 * @returns
 */
function findComment(githubClient, repoName, repoOwner, prNumber, identifier) {
    return __awaiter(this, void 0, void 0, function* () {
        const comments = yield githubClient.issues.listComments({
            owner: repoOwner,
            repo: repoName,
            issue_number: prNumber
        });
        for (const comment of comments.data) {
            if (comment.body.startsWith(identifier)) {
                return comment.id;
            }
        }
        return 0;
    });
}
exports.findComment = findComment;
