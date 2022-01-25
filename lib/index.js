"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const core = __importStar(require("@actions/core"));
const DiffChecker_1 = require("./DiffChecker");
const github = __importStar(require("@actions/github"));
const fs_1 = __importDefault(require("fs"));
const child_process_1 = require("child_process");
const utils_1 = require("./utils");
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // repo name
            const repoName = github.context.repo.repo;
            // get the repo owner
            const repoOwner = github.context.repo.owner;
            // commit sha
            const commitSha = github.context.sha;
            // github token
            const githubToken = core.getInput('accessToken');
            // Full coverage (true/false)
            const fullCoverage = JSON.parse(core.getInput('fullCoverageDiff'));
            // delta coverage. Defaults to 0.2
            const delta = Number(core.getInput('delta'));
            const githubClient = github.getOctokit(githubToken);
            // PR number
            const prNumber = github.context.issue.number;
            // Use the same comment for posting diff updates on a PR
            const useSameComment = JSON.parse(core.getInput('useSameComment'));
            // comment ID to uniquely identify a comment.
            const commentIdentifier = `<!-- codeCoverageDiffComment -->`;
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
            const codeCoverageNew = JSON.parse(fs_1.default.readFileSync(branchCoverageReportPath).toString());
            const codeCoverageOld = JSON.parse(fs_1.default.readFileSync(baseCoverageReportPath).toString());
            // Perform analysis
            const diffChecker = new DiffChecker_1.DiffChecker(codeCoverageNew, codeCoverageOld);
            // Get the current directory to replace the file name paths
            const currentDirectory = child_process_1.execSync('pwd')
                .toString()
                .trim();
            // Get coverage details.
            // fullCoverage: This will provide a full coverage report. You can set it to false if you do not need full coverage
            const coverageDetails = diffChecker.getCoverageDetails(!fullCoverage, `${currentDirectory}/`);
            // Add a comment to PR with full coverage report
            let messageToPost = '## Test coverage results :test_tube: \n\n';
            // If coverageDetails length is 0 that means there is no change between base and head
            if (coverageDetails.length === 0) {
                messageToPost =
                    'No changes to code coverage between the master branch and the head branch';
            }
            else {
                // If coverage details is below delta then post a message
                if (diffChecker.checkIfTestCoverageFallsBelowDelta(delta)) {
                    messageToPost += `Current PR reduces the test coverage percentage by ${delta} for some tests \n\n`;
                }
                // Show coverage table for all files that were affected because of this PR
                messageToPost += '<details>';
                messageToPost += '<summary markdown="span">Click to view coverage report</summary>\n\n';
                messageToPost +=
                    'Status | File | % Stmts | % Branch | % Funcs | % Lines \n -----|-----|---------|----------|---------|------ \n';
                messageToPost += coverageDetails.join('\n');
                messageToPost += '</details>';
            }
            messageToPost = `${commentIdentifier} \n Commit SHA: ${commitSha} \n ${messageToPost}`;
            let commentId = null;
            // If useSameComment is true, then find the comment and then update that comment.
            // If not, then create a new comment
            if (useSameComment) {
                commentId = yield utils_1.findComment(githubClient, repoName, repoOwner, prNumber, commentIdentifier);
            }
            yield utils_1.createOrUpdateComment(commentId, githubClient, repoOwner, repoName, messageToPost, prNumber);
            // check if the test coverage is falling below delta/tolerance.
            if (diffChecker.checkIfTestCoverageFallsBelowDelta(delta)) {
                throw Error(messageToPost);
            }
        }
        catch (error) {
            // @ts-ignore
            core.setFailed(error);
        }
    });
}
main();
