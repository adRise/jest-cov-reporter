import { DiffCoverageData } from '../../types';
import { CoverageDiffCalculator } from '../diff/CoverageDiffCalculator';
/**
 * ThresholdValidator validates coverage against thresholds
 */
export declare class ThresholdValidator {
    private diffCalculator;
    private diffCoverageReport;
    private delta;
    private changedFiles;
    private addedFiles;
    private checkNewFileFullCoverage;
    private currentDirectory;
    private newFileCoverageThreshold;
    /**
     * Create a new ThresholdValidator
     */
    constructor({ diffCalculator, delta, changedFiles, addedFiles, checkNewFileFullCoverage, currentDirectory, newFileCoverageThreshold }: {
        diffCalculator: CoverageDiffCalculator;
        delta: number;
        changedFiles: string[] | null;
        addedFiles: string[] | null;
        checkNewFileFullCoverage: boolean;
        currentDirectory: string;
        newFileCoverageThreshold?: number;
    });
    /**
     * Check if a file is in the changed files list
     * @param file - File path
     * @returns True if file is in the changed files list
     */
    checkOnlyChangedFiles(file: string): boolean;
    /**
     * Check if a file is in the added files list
     * @param file - File path
     * @returns True if file is in the added files list
     */
    checkOnlyAddedFiles(file: string): boolean;
    /**
     * Function to check if the file's coverage is below delta
     * @returns True if coverage falls below delta
     */
    checkIfTestCoverageFallsBelowDelta(): boolean;
    /**
     * Check whether any part does not have full coverage
     * @param coverageParts - Array of coverage data parts
     * @returns True if any part lacks full coverage
     */
    checkIfNewFileLacksFullCoverage(coverageParts: DiffCoverageData[]): boolean;
    /**
     * Function to check if any newly added file does not have full coverage
     * @returns True if any new file lacks full coverage
     */
    checkIfNewFileNotFullCoverage(): boolean;
}
