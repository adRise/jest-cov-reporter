import { CoverageMetric, CoverageDetails, DiffCoverageData, DiffCoverageReport, DiffStatus, TotalCoverageReport } from '../../types';
import { ICONS, STATUS_BY_COVERAGE_TYPE } from '../../utils/constants';
import { limitCommentLength } from '../../utils/github';
import { CoverageDiffCalculator } from '../diff/CoverageDiffCalculator';
import { ThresholdValidator } from '../threshold/ThresholdValidator';
import * as core from '@actions/core';

/**
 * ReportFormatter formats coverage reports for display
 */
export class ReportFormatter {
  private diffCalculator: CoverageDiffCalculator;
  private thresholdValidator: ThresholdValidator;
  private diffCoverageReport: DiffCoverageReport;
  private coverageReportNew: Record<string, any>;
  private coverageType: string;
  private delta: number;
  private currentDirectory: string;
  private prefixFilenameUrl: string;
  private prNumber: number;
  private isCobertura: boolean;
  private filePathMap: Record<string, string> = {};
  private checkNewFileFullCoverage: boolean;
  private coverageThreshold: number;

  /**
   * Create a new ReportFormatter
   */
  constructor({
    diffCalculator,
    thresholdValidator,
    coverageReportNew,
    coverageType,
    delta,
    currentDirectory,
    prefixFilenameUrl,
    prNumber,
    checkNewFileFullCoverage,
    filePathMap = {},
    coverageThreshold = 80
  }: {
    diffCalculator: CoverageDiffCalculator;
    thresholdValidator: ThresholdValidator;
    coverageReportNew: Record<string, any>;
    coverageType: string;
    delta: number;
    currentDirectory: string;
    prefixFilenameUrl: string;
    prNumber: number;
    checkNewFileFullCoverage: boolean;
    filePathMap?: Record<string, string>;
    coverageThreshold?: number;
  }) {
    this.diffCalculator = diffCalculator;
    this.thresholdValidator = thresholdValidator;
    this.diffCoverageReport = diffCalculator.getDiffCoverageReport();
    this.coverageReportNew = coverageReportNew;
    this.coverageType = coverageType;
    this.delta = delta;
    this.currentDirectory = currentDirectory;
    this.prefixFilenameUrl = prefixFilenameUrl;
    this.prNumber = prNumber;
    this.isCobertura = coverageType === 'cobertura';
    this.filePathMap = filePathMap;
    this.checkNewFileFullCoverage = checkNewFileFullCoverage;
    this.coverageThreshold = coverageThreshold;
  }

  /**
   * Get the file name with URL for linking in GitHub
   * @param name - File name
   * @returns Formatted file name with URL
   */
  private getFileNameUrl(name: string): string {
    if (this.prefixFilenameUrl === '') return name;

    if (this.isCobertura) {
      return `[${name}](${this.prefixFilenameUrl}/${this.prNumber}/current/${name === 'total' ? 'index' : name.replace(/\./g, '/') + '.scala'}.html)`;
    }
    return `[${name}](${this.prefixFilenameUrl}/${this.prNumber}/lcov-report/${name === 'total' ? 'index' : name.substring(1)}.html)`;
  }

  /**
   * Get status message with formatted metrics
   * @param prefix - Prefix string
   * @param callback - Callback for formatting each metric
   * @returns Formatted status message
   */
  private getStatusMessage(prefix: string, callback: (metric: string) => string): string {
    let statusMessage = prefix;
    const { statusMetrics } = STATUS_BY_COVERAGE_TYPE[this.coverageType];
    for (const metric of statusMetrics) {
      statusMessage += callback(metric);
    }
    return statusMessage;
  }

  /**
   * Get status header for the coverage report table
   * @returns Formatted status header
   */
  private getStatusHeader(): string {
    let statusMessage = '';
    let splitLine = '';
    const { statusHeaders } = STATUS_BY_COVERAGE_TYPE[this.coverageType];
    for (const header of statusHeaders) {
      statusMessage += ` ${header} |`;
      splitLine += ' ----- |';
    }
    return `${statusMessage} \n ${splitLine}`;
  }

  /**
   * Get status icon based on coverage changes
   * @param diffFileCoverageData - Diff coverage data
   * @returns Status icon
   */
  private getStatusIcon(diffFileCoverageData: Record<string, DiffCoverageData>): string {
    let coverageIcon = ICONS.INCREASED_COVERAGE;
    const parts = Object.values(diffFileCoverageData);
    for (let i = 0; i < parts.length; i++) {
      const coverageData = parts[i];
      const percDiff = this.diffCalculator.getPercentageDiff(coverageData);
      if (percDiff < 0 && Math.abs(percDiff) > this.delta) {
        coverageIcon = ICONS.DECREASED_COVERAGE;
        break;
      }
    }
    return coverageIcon;
  }

  /**
   * Create the table row for a file with coverage changes
   * @param name - File name
   * @param diffFileCoverageData - Diff coverage data for the file
   * @returns Diff status object
   */
  private createDiffLine(
    name: string,
    diffFileCoverageData: Record<string, DiffCoverageData>
  ): DiffStatus {
    // No old coverage found so that means we added a new file coverage
    const fileNewCoverage = Object.values(diffFileCoverageData).every(
      coverageData => coverageData.oldPct === 0
    );
    // No new coverage found so that means we deleted a file coverage
    const fileRemovedCoverage = Object.values(diffFileCoverageData).every(
      coverageData => coverageData.newPct === 0
    );

    const fileNameUrl = this.getFileNameUrl(name);
    if (fileNewCoverage) {
      let newCoverageStatusIcon = `${ICONS.SPARKLE} ${ICONS.NEW_COVERAGE}`;
      if (this.checkNewFileFullCoverage) {
        if (
          this.thresholdValidator.checkIfNewFileLacksFullCoverage(Object.values(diffFileCoverageData)) &&
          this.thresholdValidator.checkOnlyAddedFiles(name)
        ) {
          newCoverageStatusIcon = `${ICONS.DECREASED_COVERAGE} ${ICONS.NEW_COVERAGE}`;
        } else {
          newCoverageStatusIcon = `${ICONS.INCREASED_COVERAGE} ${ICONS.NEW_COVERAGE}`;
        }
      }
      const statusMessage = this.getStatusMessage(` ${newCoverageStatusIcon} | **${fileNameUrl}** `, (metric) => `| **${diffFileCoverageData[metric]?.newPct ?? 0}** `);

      return {
        status: 'new',
        statusMessage,
      };
    } else if (fileRemovedCoverage) {
      const statusMessage = this.getStatusMessage(` ${ICONS.REMOVED_COVERAGE} | ~~${fileNameUrl}~~ `, (metric) => `| ~~${diffFileCoverageData[metric]?.oldPct ?? 0}~~ `);
      return {
        status: 'removed',
        statusMessage,
      };
    }
    // Coverage existed before so calculate the diff status
    const statusIcon = this.getStatusIcon(diffFileCoverageData);
    const statusMessage = this.getStatusMessage(` ${statusIcon} | ${fileNameUrl} `, (metric) => {
      const diffData = diffFileCoverageData[metric];
      if (!diffData) return '| N/A ';
      return `| ${diffData.newPct} **(${this.diffCalculator.getPercentageDiff(diffData)})** `;
    });
    
    return {
      status: statusIcon === ICONS.INCREASED_COVERAGE ? 'increase' : 'decrease',
      statusMessage,
    };
  }

  /**
   * Compare coverage values to determine if they've changed
   * @param file - File path
   * @returns 1 if coverage changed, 0 otherwise
   */
  private compareCoverageValues(file: string): number {
    const values = Object.values(this.diffCoverageReport[file]);
    const noOldCoverage = values.every((part) => part.oldPct === 0);
    const noNewCoverage = values.every((part) => part.newPct === 0);
    const newFileWithoutCoverage = noOldCoverage && noNewCoverage && this.thresholdValidator.checkOnlyAddedFiles(file);
    const fileCoverageChanged = values.some((part) => part.oldPct !== part.newPct && !this.diffCalculator.isDueToRemovedLines(part));

    if (newFileWithoutCoverage || fileCoverageChanged) {
      return 1;
    }

    return 0;
  }

  /**
   * Get total coverage report information
   * @param diffCoverageReport - Diff coverage report for 'total'
   * @returns Total coverage report data
   */
  private getTotalCoverageReport(diffCoverageReport: Record<string, DiffCoverageData>): TotalCoverageReport {
    const { summaryMetric } = STATUS_BY_COVERAGE_TYPE[this.coverageType];
    const summaryMetricKey = summaryMetric as CoverageMetric;
    let changesPct = diffCoverageReport[summaryMetricKey].newPct - diffCoverageReport[summaryMetricKey].oldPct;
    changesPct = Math.round((changesPct + Number.EPSILON) * 100) / 100;
    return {
      changesPct,
      covered: this.coverageReportNew['total'][summaryMetricKey].covered,
      total: this.coverageReportNew['total'][summaryMetricKey].total,
      totalPct: this.coverageReportNew['total'][summaryMetricKey].pct,
      summaryMetric: summaryMetricKey,
    };
  }

  /**
   * Get files with low coverage and suggestions
   * @returns Array of files with low coverage and suggestions
   */
  private getLowCoverageFiles(): Array<{ file: string; metrics: Record<string, number>; suggestions: string[]; uncoveredLines?: number[] }> {
    const lowCoverageFiles: Array<{ file: string; metrics: Record<string, number>; suggestions: string[]; uncoveredLines?: number[] }> = [];
    
    Object.entries(this.coverageReportNew).forEach(([file, data]) => {
      if (file === 'total') return;
      
      const metrics: Record<string, number> = {};
      const suggestions: string[] = [];
      const uncoveredLines: number[] = [];
      
      // Check each metric
      ['statements', 'branches', 'functions', 'lines'].forEach(metric => {
        const coverage = data[metric]?.pct || 0;
        metrics[metric] = coverage;
        
        if (coverage < this.coverageThreshold) {
          suggestions.push(this.getSuggestionForMetric(metric, coverage));
        }
      });

      // Get uncovered lines if available
      if (data.lines?.uncovered) {
        uncoveredLines.push(...data.lines.uncovered);
      }
      
      // If any metric is below threshold, add to low coverage files
      if (Object.values(metrics).some(coverage => coverage < this.coverageThreshold)) {
        lowCoverageFiles.push({ file, metrics, suggestions, uncoveredLines });
      }
    });
    
    // Sort by lowest coverage
    return lowCoverageFiles.sort((a, b) => {
      const aMin = Math.min(...Object.values(a.metrics));
      const bMin = Math.min(...Object.values(b.metrics));
      return aMin - bMin;
    });
  }

  /**
   * Get suggestion for a specific metric
   * @param metric - Coverage metric
   * @param coverage - Current coverage percentage
   * @returns Suggestion string
   */
  private getSuggestionForMetric(metric: string, coverage: number): string {
    const diff = this.coverageThreshold - coverage;
    switch (metric) {
      case 'statements':
        return `Add ${diff.toFixed(1)}% more statement coverage by writing tests for untested code paths`;
      case 'branches':
        return `Add ${diff.toFixed(1)}% more branch coverage by testing different conditional paths`;
      case 'functions':
        return `Add ${diff.toFixed(1)}% more function coverage by testing all function calls`;
      case 'lines':
        return `Add ${diff.toFixed(1)}% more line coverage by testing uncovered lines`;
      default:
        return `Add ${diff.toFixed(1)}% more coverage for ${metric}`;
    }
  }

  /**
   * Format uncovered lines for display
   * @param lines - Array of uncovered line numbers
   * @param file - File path
   * @returns Formatted string of uncovered lines
   */
  private formatUncoveredLines(lines: number[], file: string): string {
    if (!lines.length) return '';
    
    // Group consecutive line numbers
    const groups: number[][] = [];
    let currentGroup: number[] = [];
    
    lines.sort((a, b) => a - b).forEach((line, index) => {
      if (index === 0 || line === lines[index - 1] + 1) {
        currentGroup.push(line);
      } else {
        groups.push([...currentGroup]);
        currentGroup = [line];
      }
    });
    if (currentGroup.length) {
      groups.push(currentGroup);
    }
    
    // Format groups into ranges
    const ranges = groups.map(group => {
      if (group.length === 1) return group[0];
      return `${group[0]}-${group[group.length - 1]}`;
    });
    
    // Create links to the uncovered lines
    const baseUrl = this.prefixFilenameUrl ? `${this.prefixFilenameUrl}/${this.prNumber}/lcov-report/${file.substring(1)}.html` : '';
    if (baseUrl) {
      return ranges.map(range => {
        if (typeof range === 'number') {
          return `[L${range}](${baseUrl}#L${range})`;
        }
        const [start, end] = range.split('-');
        return `[L${start}-L${end}](${baseUrl}#L${start})`;
      }).join(', ');
    }
    
    return ranges.map(range => `L${range}`).join(', ');
  }

  /**
   * Format low coverage report
   * @returns Formatted low coverage report
   */
  private formatLowCoverageReport(): string {
    const lowCoverageFiles = this.getLowCoverageFiles();
    if (lowCoverageFiles.length === 0) return '';

    let report = '\n\n## 📊 Files Needing More Coverage\n\n';
    report += '| File | Coverage | Uncovered Lines | Suggestions |\n';
    report += '|------|----------|-----------------|-------------|\n';

    lowCoverageFiles.forEach(({ file, metrics, suggestions, uncoveredLines }) => {
      const fileNameUrl = this.getFileNameUrl(file);
      const lowestMetric = Object.entries(metrics)
        .sort(([, a], [, b]) => a - b)[0];
      const uncoveredLinesStr = uncoveredLines?.length 
        ? this.formatUncoveredLines(uncoveredLines, file)
        : 'No line data available';
      report += `| ${fileNameUrl} | ${lowestMetric[0]}: ${lowestMetric[1].toFixed(1)}% | ${uncoveredLinesStr} | ${suggestions[0]} |\n`;
    });

    return report;
  }

  /**
   * Create coverage details table
   * @param diffOnly - Only include files with differences
   * @returns Coverage details object
   */
  public getCoverageDetails(diffOnly: boolean): CoverageDetails {
    const keys = Object.keys(this.diffCoverageReport);
    const decreaseStatusLines: string[] = [];
    const remainingStatusLines: string[] = [];
    
    // Add low coverage report
    const lowCoverageReport = this.formatLowCoverageReport();
    if (lowCoverageReport) {
      remainingStatusLines.push(lowCoverageReport);
    }
    
    for (const key of keys) {
      if (this.compareCoverageValues(key) !== 0) {
        const diffStatus = this.createDiffLine(
          key.replace(this.currentDirectory, ''),
          this.diffCoverageReport[key]
        );
        if (
          (diffStatus.status === 'decrease' && this.thresholdValidator.checkOnlyChangedFiles(key)) ||
          (this.checkNewFileFullCoverage &&
            diffStatus.status === 'new' &&
            diffStatus.statusMessage.includes(ICONS.DECREASED_COVERAGE))
        ) {
          decreaseStatusLines.push(diffStatus.statusMessage);
        } else {
          remainingStatusLines.push(diffStatus.statusMessage);
        }
      } else {
        if (!diffOnly) {
          const statusMessage = this.getStatusMessage(` ${key.replace(this.currentDirectory, '')} `, (metric) => {
            const data = this.diffCoverageReport[key][metric as CoverageMetric];
            return `| ${data?.newPct ?? 0} `;
          });
          remainingStatusLines.push(statusMessage);
        }
      }
    }
    
    return {
      totalCoverageLines: this.getTotalCoverageReport(this.diffCoverageReport['total']),
      decreaseStatusLines: limitCommentLength(decreaseStatusLines),
      remainingStatusLines: limitCommentLength(remainingStatusLines),
      statusHeader: this.getStatusHeader(),
    };
  }
} 