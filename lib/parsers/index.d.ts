import { CoverageReport } from '../types';
/**
 * Parse coverage report from a file
 * @param filePath - Path to coverage report file
 * @param type - Type of coverage report ('jest' or 'cobertura')
 * @returns Parsed coverage report
 */
export default function parseContent(filePath: string, type: string): CoverageReport;
