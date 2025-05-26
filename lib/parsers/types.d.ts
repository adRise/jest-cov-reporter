import { CoverageReport } from '../types';
/**
 * Parser interface for coverage report parsers
 */
export interface CoverageReportParser {
    /**
     * Parse coverage report data from a string
     * @param content - Report content to parse
     * @returns Parsed coverage report
     */
    parse(content: string): CoverageReport;
}
/**
 * Factory for creating coverage report parsers
 */
export interface CoverageReportParserFactory {
    /**
     * Create a parser for the specified coverage type
     * @param type - Coverage type
     * @returns Coverage report parser
     */
    createParser(type: string): CoverageReportParser;
}
