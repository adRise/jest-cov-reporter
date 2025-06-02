import { STATUS_BY_COVERAGE_TYPE } from '../../utils/constants';
/**
 * CoverageDiffCalculator handles the calculation of differences between coverage reports
 */
export class CoverageDiffCalculator {
    /**
     * Create a new CoverageDiffCalculator
     * @param coverageReportNew - New coverage report
     * @param coverageReportOld - Old (base) coverage report
     * @param coverageType - Type of coverage report ('jest' or 'cobertura')
     * @param currentDirectory - Current working directory
     */
    constructor({ coverageReportNew, coverageReportOld, coverageType, currentDirectory }) {
        this.diffCoverageReport = {};
        this.filePathMap = {};
        this.coverageReportNew = coverageReportNew;
        this.coverageReportOld = coverageReportOld;
        this.coverageType = coverageType;
        this.isCobertura = coverageType === 'cobertura';
        this.currentDirectory = currentDirectory;
        this.calculateDiff();
    }
    /**
     * Calculate differences between coverage reports
     */
    calculateDiff() {
        const reportNewKeys = Object.keys(this.coverageReportNew);
        const reportOldKeys = Object.keys(this.coverageReportOld);
        const reportKeys = new Set([...reportNewKeys, ...reportOldKeys]);
        /**
         * For all filePaths in coverage, generate a percentage value
         * for both base and current branch
         */
        for (const filePath of reportKeys) {
            const newCoverage = this.coverageReportNew[filePath] || {};
            const oldCoverage = this.coverageReportOld[filePath] || {};
            this.diffCoverageReport[filePath] = {};
            const { statusMetrics } = STATUS_BY_COVERAGE_TYPE[this.coverageType];
            for (const metric of statusMetrics) {
                this.diffCoverageReport[filePath][metric] = {
                    new: newCoverage[metric],
                    old: oldCoverage[metric],
                    newPct: this.getPercentage(newCoverage[metric]),
                    oldPct: this.getPercentage(oldCoverage[metric]),
                };
            }
            if (this.isCobertura) {
                this.filePathMap[filePath] = newCoverage.filename || filePath;
            }
        }
    }
    /**
     * Get coverage percentage from coverage data
     * @param coverageData - Coverage data object
     * @returns Percentage value or 0 if data is undefined
     */
    getPercentage(coverageData) {
        return coverageData ? coverageData.pct : 0;
    }
    /**
     * Get percentage difference between old and new coverage
     * @param diffData - Diff coverage data
     * @returns Rounded percentage difference
     */
    getPercentageDiff(diffData) {
        const diff = Number(diffData.newPct) - Number(diffData.oldPct);
        // round off the diff to 2 decimal places
        return Math.round((diff + Number.EPSILON) * 100) / 100;
    }
    /**
     * Check if coverage decrease is due to removed lines
     * @param diffCoverageData - Diff coverage data
     * @returns True if decrease is due to removed lines
     */
    isDueToRemovedLines(diffCoverageData) {
        const newCoverage = diffCoverageData.new;
        const oldCoverage = diffCoverageData.old;
        if (!oldCoverage || !newCoverage)
            return false;
        return newCoverage.covered < oldCoverage.covered &&
            (oldCoverage.covered - newCoverage.covered <= oldCoverage.total - newCoverage.total);
    }
    /**
     * Get the diff coverage report
     * @returns Diff coverage report
     */
    getDiffCoverageReport() {
        return this.diffCoverageReport;
    }
}
