import { CoverageMetric, CoverageDetails, DiffCoverageData, DiffCoverageReport, DiffStatus, TotalCoverageReport } from '../../types';
import { ICONS, STATUS_BY_COVERAGE_TYPE } from '../../utils/constants';
import { limitCommentLength } from '../../utils/github';
import { CoverageDiffCalculator } from '../diff/CoverageDiffCalculator';
import { ThresholdValidator } from '../threshold/ThresholdValidator';

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
    filePathMap = {}
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
   * Create coverage details table
   * @param diffOnly - Only include files with differences
   * @returns Coverage details object
   */
  public getCoverageDetails(diffOnly: boolean): CoverageDetails {
    const keys = Object.keys(this.diffCoverageReport);
    const decreaseStatusLines: string[] = [];
    const remainingStatusLines: string[] = [];
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