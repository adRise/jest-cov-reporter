import * as core from '@actions/core';
import { CoverageConfig } from './config-service';
import { COMMENT_IDENTIFIER } from '../utils/constants';
import { createOrUpdateComment, findComment } from '../utils/github';
import { CoverageDiffCalculator } from '../core/diff/CoverageDiffCalculator';
import { ReportFormatter } from '../core/format/ReportFormatter';
import { ThresholdValidator } from '../core/threshold/ThresholdValidator';

/**
 * Service to handle report generation and commenting on PRs
 */
export class ReportService {
  private config: CoverageConfig;
  
  /**
   * Create a new report service
   * @param config - Configuration object
   */
  constructor(config: CoverageConfig) {
    this.config = config;
  }
  
  /**
   * Process coverage data and generate a report
   * @param params - Parameters for report generation
   * @returns Object containing report results
   */
  public async processReport({
    baseCoverage,
    branchCoverage,
    currentDirectory,
    changedFiles,
    addedFiles,
    checkNewFileFullCoverage
  }: {
    baseCoverage: any;
    branchCoverage: any;
    currentDirectory: string;
    changedFiles: string[];
    addedFiles: string[];
    checkNewFileFullCoverage: boolean;
  }): Promise<{
    report: string;
    success: boolean;
  }> {
    // Create diff calculator
    const diffCalculator = new CoverageDiffCalculator({
      coverageReportNew: branchCoverage,
      coverageReportOld: baseCoverage,
      coverageType: this.config.coverageType,
      currentDirectory
    });

    // Create threshold validator
    const thresholdValidator = new ThresholdValidator({
      diffCalculator,
      delta: this.config.delta,
      changedFiles,
      addedFiles,
      checkNewFileFullCoverage,
      currentDirectory,
      newFileCoverageThreshold: this.config.newFileCoverageThreshold
    });

    // Create report formatter
    const reportFormatter = new ReportFormatter({
      diffCalculator,
      thresholdValidator,
      coverageReportNew: branchCoverage,
      coverageType: this.config.coverageType,
      delta: this.config.delta,
      currentDirectory,
      prefixFilenameUrl: this.config.prefixFilenameUrl,
      prNumber: this.config.prNumber || 0,
      checkNewFileFullCoverage
    });

    // Get coverage details
    const { decreaseStatusLines, remainingStatusLines, totalCoverageLines, statusHeader } = 
      reportFormatter.getCoverageDetails(!this.config.fullCoverage);

    const isCoverageBelowDelta = thresholdValidator.checkIfTestCoverageFallsBelowDelta();
    const isNotFullCoverageOnNewFile = thresholdValidator.checkIfNewFileNotFullCoverage();
    const success = !isCoverageBelowDelta && !isNotFullCoverageOnNewFile;

    // Generate report message
    let messageToPost = `## Coverage Report \n\n`;
    messageToPost += `* **Status**: ${!success ? ':x: **Failed**' : ':white_check_mark: **Passed**'} \n`;

    // Add the custom message if it exists
    if (this.config.customMessage !== '') {
      messageToPost += `* ${this.config.customMessage} \n`;
    }

    // If coverageDetails length is 0 that means there is no change between base and head
    if (remainingStatusLines.length === 0 && decreaseStatusLines.length === 0) {
      messageToPost +=
              '* No changes to code coverage between the master branch and the current head branch';
      messageToPost += '\n--- \n\n';
    } else {
      if (isNotFullCoverageOnNewFile) {
        messageToPost += `* Current PR does not meet the required ${this.config.newFileCoverageThreshold}% coverage threshold for new files \n`;
      }
      // If coverage details is below delta then post a message
      if (isCoverageBelowDelta) {
        messageToPost += `* Current PR reduces the test coverage percentage by ${this.config.delta} for some tests \n`;
      }
      messageToPost += '--- \n\n';
      if (decreaseStatusLines.length > 0) {
        messageToPost +=
              `Status | Changes Missing Coverage | ${statusHeader} ---------|------ \n`;
        messageToPost += decreaseStatusLines.join('\n');
        messageToPost += '\n--- \n\n';
      }

      // Show coverage table for all files that were affected because of this PR
      if (remainingStatusLines.length > 0) {
        messageToPost += '<details>';
        messageToPost += '<summary markdown="span">Click to view remaining coverage report</summary>\n\n';
        messageToPost +=
              `Status | File | ${statusHeader} ---------|------ \n`;
        messageToPost += remainingStatusLines.join('\n');
        messageToPost += '\n';
        messageToPost += '</details>';
        messageToPost += '\n\n--- \n\n';
      }
    }

    if (totalCoverageLines) {
      const {
        changesPct,
        covered,
        total,
        totalPct,
        summaryMetric,
      } = totalCoverageLines;
      messageToPost +=
            `| Total | ${totalPct}% | \n :-----|-----: \n Change from base: | ${changesPct}% \n Covered ${summaryMetric}: | ${covered} \n Total ${summaryMetric}: | ${total} \n`;
    }

    messageToPost = `${COMMENT_IDENTIFIER} \n ${messageToPost}`;
    
    return { report: messageToPost, success };
  }
  
  /**
   * Post a report to GitHub PR
   * @param report - Report content to post
   * @returns True if posting was successful
   */
  public async postReport(report: string): Promise<boolean> {
    try {
      // Only post if we have a PR number
      if (this.config.prNumber) {
        let commentId: number | undefined;
        
        // Find existing comment if we're updating
        if (this.config.useSameComment) {
          const comment = await findComment(
            this.config.githubClient, 
            this.config.prNumber, 
            this.config.repoOwner, 
            this.config.repoName, 
            COMMENT_IDENTIFIER
          );
          
          if (comment) {
            commentId = comment.id;
          }
        }
        
        // Create or update comment
        await createOrUpdateComment(
          this.config.githubClient,
          this.config.prNumber,
          this.config.repoOwner,
          this.config.repoName,
          report,
          commentId
        );
        
        return true;
      } else {
        core.info('No PR number found. Not posting a comment.');
        core.info(report);
        return false;
      }
    } catch (error) {
      if (error instanceof Error) {
        core.warning(`Error posting report: ${error.message}`);
      } else {
        core.warning('Unknown error posting report');
      }
      return false;
    }
  }
} 