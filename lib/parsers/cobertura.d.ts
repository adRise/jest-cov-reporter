import { CoverageReport } from '../types';
import { CoverageReportParser } from './types';
/**
 * Parser for Cobertura coverage reports
 */
export declare class CoberturaParser implements CoverageReportParser {
    /**
     * Parse Cobertura XML coverage report
     * @param content - XML content from Cobertura coverage report
     * @returns Parsed coverage report
     */
    parse(content: string): CoverageReport;
    /**
     * Process Cobertura XML result
     * @param result - Parsed XML result
     * @returns Coverage report
     */
    private processCobertura;
    /**
     * Process classes from Cobertura XML
     * @param classes - Class data from XML
     * @param report - Coverage report to update
     */
    private processClasses;
    /**
     * Process a single class from Cobertura XML
     * @param cls - Class data from XML
     * @param report - Coverage report to update
     */
    private processClass;
}
