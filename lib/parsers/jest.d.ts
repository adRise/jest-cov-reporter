import { CoverageReport } from '../types';
import { CoverageReportParser } from './types';
/**
 * Parser for Jest coverage reports
 */
export declare class JestParser implements CoverageReportParser {
    /**
     * Parse Jest coverage report
     * @param content - JSON content from Jest coverage report
     * @returns Parsed coverage report
     */
    parse(content: string): CoverageReport;
}
