import * as core from '@actions/core';
import * as github from '@actions/github';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { CoverageDiffCalculator } from './core/diff/CoverageDiffCalculator';
import { ReportFormatter } from './core/format/ReportFormatter';
import { ThresholdValidator } from './core/threshold/ThresholdValidator';
import parseContent from './parsers';
import { COMMENT_IDENTIFIER } from './utils/constants';
import { createOrUpdateComment, findComment } from './utils/github';
import { uploadCoverageToS3, downloadBaseReportFromS3 } from './utils/s3';

/**
 * Main function that runs the coverage reporter
 */
async function main() {
    try {
        // repo name
        const repoName = github.context.repo.repo;
        // get the repo owner
        const repoOwner = github.context.repo.owner;
        // github token
        const githubToken = core.getInput('accessToken');
        // Full coverage (true/false)
        const fullCoverage = JSON.parse(core.getInput('fullCoverageDiff'));
        // delta coverage. Defaults to 0.2
        const delta = Number(core.getInput('delta'));
        const githubClient = github.getOctokit(githubToken);
        // PR number
        const prNumber = github.context.issue.number || core.getInput('pr-number');
        // Use the same comment for posting diff updates on a PR
        const useSameComment = JSON.parse(core.getInput('useSameComment'));
        // get the custom message
        const customMessage = core.getInput('custom-message');
        // Only check changed files in PR
        const onlyCheckChangedFiles = core.getInput('only-check-changed-files');
        // Add prefix to file name URLs
        const prefixFilenameUrl = core.getInput('prefix-filename-url');
        
        // S3 configuration
        const awsAccessKeyId = core.getInput('aws-access-key-id');
        const awsSecretAccessKey = core.getInput('aws-secret-access-key');
        const awsRegion = core.getInput('aws-region');
        const s3Bucket = core.getInput('s3-bucket');
        const baseBranch = core.getInput('base-branch');
        const s3BaseUrl = core.getInput('s3-base-url');
        
        const useS3 = awsAccessKeyId && awsSecretAccessKey && s3Bucket;
        
        // Determine file paths based on whether S3 is being used
        let baseCoverageReportPath = core.getInput('base-coverage-report-path');
        let branchCoverageReportPath = core.getInput('branch-coverage-report-path');
        
        // Coverage directory path - default to './coverage'
        const coverageDir = path.resolve('./coverage');
        if (!fs.existsSync(coverageDir)) {
            fs.mkdirSync(coverageDir, { recursive: true });
        }
        
        // If using S3 and in a PR context
        if (useS3) {
            core.info('AWS credentials provided, using S3 for coverage reports');
            // Create S3 config
            const s3Config = {
                accessKeyId: awsAccessKeyId,
                secretAccessKey: awsSecretAccessKey,
                region: awsRegion,
                bucket: s3Bucket,
                baseBranch: baseBranch
            };
            
            // If branch coverage report path not provided, use default
            if (!branchCoverageReportPath) {
                branchCoverageReportPath = path.resolve(coverageDir, 'coverage-summary.json');
                core.info(`No branch coverage report path provided, using default: ${branchCoverageReportPath}`);
            }
            
            // If base coverage report path not provided, download from S3
            if (!baseCoverageReportPath) {
                baseCoverageReportPath = path.resolve(coverageDir, 'master-coverage-summary.json');
                core.info(`No base coverage report path provided, downloading from S3 to: ${baseCoverageReportPath}`);
                const downloadSuccess = downloadBaseReportFromS3(s3Config, baseCoverageReportPath);
                
                if (!downloadSuccess) {
                    core.setFailed('Failed to download base coverage report from S3. Please ensure the base branch coverage exists in S3 or provide a local base coverage report path.');
                    return;
                }
            }
            
            // Upload current coverage to S3 if it exists
            if (fs.existsSync(branchCoverageReportPath)) {
                const destDir = prNumber ? `${prNumber}` : baseBranch;
                const uploadConfig = {
                    ...s3Config,
                    destDir
                };
                
                const uploadSuccess = uploadCoverageToS3(branchCoverageReportPath, uploadConfig);
                if (!uploadSuccess) {
                    core.warning('Failed to upload coverage to S3, but continuing with comparison');
                }
                
                // Update the custom message with S3 links if provided
                if (s3BaseUrl && !customMessage.includes(s3BaseUrl)) {
                    const baseReportUrl = `${s3BaseUrl}/${baseBranch}/lcov-report/index.html`;
                    const currentReportUrl = `${s3BaseUrl}/${destDir}/lcov-report/index.html`;
                    
                    core.setOutput('base-report-url', baseReportUrl);
                    core.setOutput('current-report-url', currentReportUrl);
                    
                    if (!customMessage) {
                        core.info('Setting custom message with S3 links');
                        const newCustomMessage = `[Base Coverage Report](${baseReportUrl}) - [Current Branch Coverage Report](${currentReportUrl})`;
                        core.setInput('custom-message', newCustomMessage);
                    }
                }
            }
        } else {
            // Traditional approach - check for required coverage paths
            if (!baseCoverageReportPath || !branchCoverageReportPath) {
                core.setFailed('You must provide either both coverage report paths or AWS S3 credentials. ' +
                    'Missing: ' + (!baseCoverageReportPath ? 'base-coverage-report-path ' : '') + 
                    (!branchCoverageReportPath ? 'branch-coverage-report-path' : ''));
                return;
            }
            core.info('Using provided coverage report paths');
        }
        
        // Check if the required files exist
        if (!fs.existsSync(baseCoverageReportPath) || !fs.existsSync(branchCoverageReportPath)) {
            core.setFailed(`Required coverage reports not found. Base: ${baseCoverageReportPath}, Branch: ${branchCoverageReportPath}`);
            return;
        }
        
        // get the coverage type
        const coverageType = core.getInput('coverageType');

        // check new file coverage
        const checkNewFileCoverage = JSON.parse(core.getInput('check-new-file-full-coverage'));
        // new file coverage threshold
        const newFileCoverageThreshold = Number(core.getInput('new-file-coverage-threshold'));

        // Get the content of coverage files
        const baseCoverageContent = fs.readFileSync(baseCoverageReportPath, 'utf8');
        const branchCoverageContent = fs.readFileSync(branchCoverageReportPath, 'utf8');

        // Parse the content based on coverage type
        const baseCoverage = parseContent(baseCoverageContent, coverageType);
        const branchCoverage = parseContent(branchCoverageContent, coverageType);

        // Files that has changed in the PR compared to base (master or main branch)
        let filesChanged = [];
        // Check if it's a PR and if we should only check changed files
        if (prNumber && onlyCheckChangedFiles === 'true') {
            core.info(`Getting files changed in PR #${prNumber}`);
            const changesResponse = await githubClient.rest.pulls.listFiles({
                owner: repoOwner,
                repo: repoName,
                pull_number: prNumber,
            });
            // Filter out files that don't have coverage or aren't relevant
            filesChanged = changesResponse.data
                .filter((file) => file.status !== 'removed' && !file.filename.includes('test'))
                .map((file) => file.filename);
        }

        // Calculate coverage diff
        const coverageDiffCalculator = new CoverageDiffCalculator();
        const coverageDiff = coverageDiffCalculator.calculate(
            baseCoverage,
            branchCoverage,
            {
                filesChanged,
                onlyCheckChangedFiles: onlyCheckChangedFiles === 'true',
                fullCoverageDiff,
                checkNewFileCoverage,
                newFileCoverageThreshold,
                coverageType,
            }
        );

        // Validate thresholds
        const thresholdValidator = new ThresholdValidator();
        const { pass, errorMessages } = thresholdValidator.validate(coverageDiff, {
            delta,
            coverageType,
        });

        // Format the report
        const reportFormatter = new ReportFormatter();
        const formattedReport = reportFormatter.format(coverageDiff, {
            customMessage,
            prefixFilenameUrl,
            errorMessages,
            coverageType,
        });

        // Post the report as a comment if it's a PR
        if (prNumber) {
            let commentId;
            if (useSameComment) {
                const comment = await findComment(githubClient, prNumber, repoOwner, repoName, COMMENT_IDENTIFIER);
                if (comment) {
                    commentId = comment.id;
                }
            }
            await createOrUpdateComment(
                githubClient,
                prNumber,
                repoOwner,
                repoName,
                formattedReport,
                commentId
            );
        } else {
            core.info('No PR number found. Not posting a comment.');
            core.info(formattedReport);
        }

        if (!pass) {
            core.setFailed('Coverage failed to meet the threshold requirements.');
        }
    } catch (error) {
        core.setFailed(`Action failed with error: ${error.message}`);
    }
}

// Run the action
main();
