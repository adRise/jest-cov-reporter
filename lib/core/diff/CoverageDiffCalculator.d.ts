import { CoverageData, CoverageReport, DiffCoverageData, DiffCoverageReport } from '../../types';
/**
 * CoverageDiffCalculator handles the calculation of differences between coverage reports
 */
export declare class CoverageDiffCalculator {
    protected diffCoverageReport: DiffCoverageReport;
    protected filePathMap: Record<string, string>;
    protected coverageReportNew: CoverageReport;
    protected coverageReportOld: CoverageReport;
    protected coverageType: string;
    protected isCobertura: boolean;
    protected currentDirectory: string;
    /**
     * Create a new CoverageDiffCalculator
     * @param coverageReportNew - New coverage report
     * @param coverageReportOld - Old (base) coverage report
     * @param coverageType - Type of coverage report ('jest' or 'cobertura')
     * @param currentDirectory - Current working directory
     */
    constructor({ coverageReportNew, coverageReportOld, coverageType, currentDirectory }: {
        coverageReportNew: CoverageReport;
        coverageReportOld: CoverageReport;
        coverageType: string;
        currentDirectory: string;
    });
    /**
     * Calculate differences between coverage reports
     */
    protected calculateDiff(): void;
    /**
     * Get coverage percentage from coverage data
     * @param coverageData - Coverage data object
     * @returns Percentage value or 0 if data is undefined
     */
    protected getPercentage(coverageData?: CoverageData): number;
    /**
     * Get percentage difference between old and new coverage
     * @param diffData - Diff coverage data
     * @returns Rounded percentage difference
     */
    getPercentageDiff(diffData: DiffCoverageData): number;
    /**
     * Check if coverage decrease is due to removed lines
     * @param diffCoverageData - Diff coverage data
     * @returns True if decrease is due to removed lines
     */
    isDueToRemovedLines(diffCoverageData: DiffCoverageData): boolean;
    /**
     * Get the diff coverage report
     * @returns Diff coverage report
     */
    getDiffCoverageReport(): DiffCoverageReport;
}
