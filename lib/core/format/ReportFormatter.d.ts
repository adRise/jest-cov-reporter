import { CoverageDetails } from '../../types';
import { CoverageDiffCalculator } from '../diff/CoverageDiffCalculator';
import { ThresholdValidator } from '../threshold/ThresholdValidator';
/**
 * ReportFormatter formats coverage reports for display
 */
export declare class ReportFormatter {
    private diffCalculator;
    private thresholdValidator;
    private diffCoverageReport;
    private coverageReportNew;
    private coverageType;
    private delta;
    private currentDirectory;
    private prefixFilenameUrl;
    private prNumber;
    private isCobertura;
    private filePathMap;
    private checkNewFileFullCoverage;
    /**
     * Create a new ReportFormatter
     */
    constructor({ diffCalculator, thresholdValidator, coverageReportNew, coverageType, delta, currentDirectory, prefixFilenameUrl, prNumber, checkNewFileFullCoverage, filePathMap }: {
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
    });
    /**
     * Get the file name with URL for linking in GitHub
     * @param name - File name
     * @returns Formatted file name with URL
     */
    private getFileNameUrl;
    /**
     * Get status message with formatted metrics
     * @param prefix - Prefix string
     * @param callback - Callback for formatting each metric
     * @returns Formatted status message
     */
    private getStatusMessage;
    /**
     * Get status header for the coverage report table
     * @returns Formatted status header
     */
    private getStatusHeader;
    /**
     * Get status icon based on coverage changes
     * @param diffFileCoverageData - Diff coverage data
     * @returns Status icon
     */
    private getStatusIcon;
    /**
     * Create the table row for a file with coverage changes
     * @param name - File name
     * @param diffFileCoverageData - Diff coverage data for the file
     * @returns Diff status object
     */
    private createDiffLine;
    /**
     * Compare coverage values to determine if they've changed
     * @param file - File path
     * @returns 1 if coverage changed, 0 otherwise
     */
    private compareCoverageValues;
    /**
     * Get total coverage report information
     * @param diffCoverageReport - Diff coverage report for 'total'
     * @returns Total coverage report data
     */
    private getTotalCoverageReport;
    /**
     * Create coverage details table
     * @param diffOnly - Only include files with differences
     * @returns Coverage details object
     */
    getCoverageDetails(diffOnly: boolean): CoverageDetails;
}
