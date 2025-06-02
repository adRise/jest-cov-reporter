/**
 * ThresholdValidator validates coverage against thresholds
 */
export class ThresholdValidator {
    /**
     * Create a new ThresholdValidator
     */
    constructor({ diffCalculator, delta, changedFiles, addedFiles, checkNewFileFullCoverage, currentDirectory }) {
        this.diffCalculator = diffCalculator;
        this.diffCoverageReport = diffCalculator.getDiffCoverageReport();
        this.delta = delta;
        this.changedFiles = changedFiles;
        this.addedFiles = addedFiles;
        this.checkNewFileFullCoverage = checkNewFileFullCoverage;
        this.currentDirectory = currentDirectory;
    }
    /**
     * Check if a file is in the changed files list
     * @param file - File path
     * @returns True if file is in the changed files list
     */
    checkOnlyChangedFiles(file) {
        file = file.replace(this.currentDirectory, '');
        if (this.changedFiles) {
            return this.changedFiles.indexOf(file.substring(1)) > -1;
        }
        return true;
    }
    /**
     * Check if a file is in the added files list
     * @param file - File path
     * @returns True if file is in the added files list
     */
    checkOnlyAddedFiles(file) {
        file = file.replace(this.currentDirectory, '');
        if (this.addedFiles) {
            return this.addedFiles.indexOf(file.substring(1)) > -1;
        }
        return true;
    }
    /**
     * Function to check if the file's coverage is below delta
     * @returns True if coverage falls below delta
     */
    checkIfTestCoverageFallsBelowDelta() {
        const keys = Object.keys(this.diffCoverageReport);
        for (const fileName of keys) {
            const diffCoverageData = this.diffCoverageReport[fileName];
            const metricKeys = Object.keys(diffCoverageData);
            // No new coverage found so that means we deleted a file coverage
            const fileRemovedCoverage = Object.values(diffCoverageData).every(coverageData => coverageData.newPct === 0);
            if (fileRemovedCoverage) {
                // since the file is deleted don't include in delta calculation
                continue;
            }
            for (const metricKey of metricKeys) {
                const coverageForMetric = diffCoverageData[metricKey];
                if (coverageForMetric && coverageForMetric.oldPct !== coverageForMetric.newPct) {
                    if (-this.diffCalculator.getPercentageDiff(coverageForMetric) > this.delta
                        && !this.diffCalculator.isDueToRemovedLines(coverageForMetric)) {
                        // Check only changed files
                        if (this.checkOnlyChangedFiles(fileName)) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }
    /**
     * Check whether any part does not have full coverage
     * @param coverageParts - Array of coverage data parts
     * @returns True if any part lacks full coverage
     */
    checkIfNewFileLacksFullCoverage(coverageParts) {
        return coverageParts.some((coverageData) => coverageData.newPct < 100);
    }
    /**
     * Function to check if any newly added file does not have full coverage
     * @returns True if any new file lacks full coverage
     */
    checkIfNewFileNotFullCoverage() {
        if (!this.checkNewFileFullCoverage)
            return false;
        const keys = Object.keys(this.diffCoverageReport);
        return keys.some((key) => {
            const diffCoverageData = this.diffCoverageReport[key];
            const coverageParts = Object.values(diffCoverageData);
            // No old coverage found so that means we added a new file
            const newFileCoverage = coverageParts.every((coverageData) => coverageData.oldPct === 0);
            return newFileCoverage && this.checkIfNewFileLacksFullCoverage(coverageParts) && this.checkOnlyAddedFiles(key);
        });
    }
}
