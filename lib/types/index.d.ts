/**
 * Type definitions for coverage metrics
 */
export type CoverageMetric = 'statements' | 'branches' | 'functions' | 'lines';
/**
 * Coverage data for a specific metric
 */
export interface CoverageData {
    total: number;
    covered: number;
    skipped: number;
    pct: number;
}
/**
 * Report object for a single file
 */
export interface CoverageReport {
    [key: string]: {
        [metric in CoverageMetric]?: CoverageData;
    } & {
        filename?: string;
    };
}
/**
 * Diff coverage data for a single metric
 */
export interface DiffCoverageData {
    new: CoverageData | undefined;
    old: CoverageData | undefined;
    newPct: number;
    oldPct: number;
}
/**
 * Diff coverage report for a file
 */
export interface DiffCoverageReport {
    [filePath: string]: {
        [metric in CoverageMetric]?: DiffCoverageData;
    };
}
/**
 * Config for status headers and metrics by coverage type
 */
export interface CoverageTypeConfig {
    statusHeaders: string[];
    statusMetrics: CoverageMetric[];
    summaryMetric: CoverageMetric;
}
/**
 * Diff status object returned by createDiffLine
 */
export interface DiffStatus {
    status: 'new' | 'removed' | 'increase' | 'decrease';
    statusMessage: string;
}
/**
 * Total coverage report data
 */
export interface TotalCoverageReport {
    changesPct: number;
    covered: number;
    total: number;
    totalPct: number;
    summaryMetric: CoverageMetric;
}
/**
 * Coverage details returned by getCoverageDetails
 */
export interface CoverageDetails {
    totalCoverageLines: TotalCoverageReport;
    decreaseStatusLines: string[];
    remainingStatusLines: string[];
    statusHeader: string;
}
/**
 * Constructor options for DiffChecker
 */
export interface DiffCheckerOptions {
    changedFiles: string[] | null;
    addedFiles: string[] | null;
    coverageReportNew: CoverageReport;
    coverageReportOld: CoverageReport;
    currentDirectory: string;
    checkNewFileFullCoverage: boolean;
    delta: number;
    prefixFilenameUrl: string;
    prNumber: number;
    coverageType: 'jest' | 'cobertura';
}
