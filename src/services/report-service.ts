import * as core from '@actions/core';
import { CoverageConfig } from './config-service';
import { COMMENT_IDENTIFIER } from '../utils/constants';
import { createOrUpdateComment, findComment } from '../utils/github';
import { CoverageDiffCalculator } from '../core/diff/CoverageDiffCalculator';
import { ReportFormatter } from '../core/format/ReportFormatter';
import { ThresholdValidator } from '../core/threshold/ThresholdValidator';
import { CoverageAnalysis } from '../types/ai';

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
    checkNewFileFullCoverage,
    aiAnalysis
  }: {
    baseCoverage: any;
    branchCoverage: any;
    currentDirectory: string;
    changedFiles: string[];
    addedFiles: string[];
    checkNewFileFullCoverage: boolean;
    aiAnalysis?: CoverageAnalysis;
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

    // Add AI analysis section if available
    if (aiAnalysis && aiAnalysis.insights.length > 0) {
      messageToPost += '\n\n## 🤖 AI Coverage Analysis\n\n';
      messageToPost += `${aiAnalysis.summary}\n\n`;
      
      if (aiAnalysis.recommendations.length > 0) {
        messageToPost += '### 📋 Recommendations\n';
        aiAnalysis.recommendations.forEach(rec => {
          messageToPost += `- ${rec}\n`;
        });
        messageToPost += '\n';
      }

      // Add line-level suggestions if available
      if (aiAnalysis.lineSuggestions && aiAnalysis.lineSuggestions.length > 0) {
        messageToPost += '### 🎯 Specific Line Suggestions\n\n';
        
        // Group suggestions by file
        const suggestionsByFile = aiAnalysis.lineSuggestions.reduce((acc, suggestion) => {
          if (!acc[suggestion.file]) {
            acc[suggestion.file] = [];
          }
          acc[suggestion.file].push(suggestion);
          return acc;
        }, {} as Record<string, typeof aiAnalysis.lineSuggestions>);

        Object.entries(suggestionsByFile).forEach(([file, suggestions]) => {
          messageToPost += `**${file}**\n`;
          suggestions.forEach(suggestion => {
            const priorityEmoji = suggestion.priority === 'high' ? '🔴' : 
                                 suggestion.priority === 'medium' ? '🟡' : '🟢';
            const testTypeEmoji = suggestion.testType === 'unit' ? '🧪' : 
                                 suggestion.testType === 'integration' ? '🔗' : '⚠️';
            messageToPost += `- ${priorityEmoji} ${testTypeEmoji} **Line ${suggestion.line}**: ${suggestion.suggestion}\n`;
          });
          messageToPost += '\n';
        });
      }

      // Add uncovered files summary if available
      if (aiAnalysis.uncoveredFiles && aiAnalysis.uncoveredFiles.length > 0) {
        messageToPost += '### 📊 Files Needing Coverage\n\n';
        
        // Show top 5 files with most uncovered lines
        const topUncoveredFiles = aiAnalysis.uncoveredFiles.slice(0, 5);
        topUncoveredFiles.forEach(fileInfo => {
          const fileName = fileInfo.file.split('/').pop() || fileInfo.file;
          messageToPost += `**${fileName}** (${fileInfo.coverage.toFixed(1)}% coverage)\n`;
          messageToPost += `- ${fileInfo.lines.length} uncovered lines: ${fileInfo.lines.slice(0, 10).join(', ')}${fileInfo.lines.length > 10 ? '...' : ''}\n`;
          
          // Add code snippets if available
          if (fileInfo.codeSnippets && fileInfo.codeSnippets.length > 0) {
            messageToPost += '- Key uncovered code:\n';
            fileInfo.codeSnippets.slice(0, 3).forEach(snippet => {
              messageToPost += `  - Line ${snippet.line}: \`${snippet.code.trim()}\`\n`;
            });
          }
          messageToPost += '\n';
        });
      }

      messageToPost += '### 🔍 Detailed Insights\n';
      aiAnalysis.insights.forEach(insight => {
        const emoji = insight.type === 'warning' ? '⚠️' : 
                     insight.type === 'improvement' ? '✅' : '💡';
        messageToPost += `${emoji} **${insight.severity.toUpperCase()}**: ${insight.message}\n`;
        if (insight.file) {
          messageToPost += `   - File: ${insight.file}\n`;
        }
        if (insight.uncoveredLines && insight.uncoveredLines.length > 0) {
          messageToPost += `   - Uncovered lines: ${insight.uncoveredLines.join(', ')}\n`;
        }
        if (insight.suggestedTests && insight.suggestedTests.length > 0) {
          messageToPost += `   - Suggested tests:\n`;
          insight.suggestedTests.forEach(test => {
            messageToPost += `     - ${test}\n`;
          });
        }
      });
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