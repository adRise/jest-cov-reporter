import { CoverageReport, CoverageData, CoverageMetric } from '../types';
import { CoverageReportParser } from './types';
import * as core from '@actions/core';

/**
 * Parser for Jest coverage reports
 */
export class JestParser implements CoverageReportParser {
  /**
   * Parse Jest coverage report
   * @param content - JSON content from Jest coverage report
   * @returns Parsed coverage report
   */
  parse(content: string): CoverageReport {
    try {
      core.info('Parsing Jest coverage report...');
      const parsed = JSON.parse(content);
      
      // Log the raw structure
      core.info('Raw coverage report structure:');
      core.info(`- Top level keys: ${Object.keys(parsed).join(', ')}`);
      
      // Validate the structure
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid Jest coverage report: not an object');
      }
      
      // Check for required fields
      if (!parsed.total) {
        throw new Error('Invalid Jest coverage report: missing total field');
      }
      
      // Create a new report with the correct structure
      const report: CoverageReport = {
        total: parsed.total
      };
      
      // Process file entries
      Object.entries(parsed).forEach(([key, value]) => {
        if (key !== 'total' && typeof value === 'object' && value !== null) {
          const fileValue = value as Record<CoverageMetric, CoverageData & { uncovered?: number[] }>;
          // Add each file directly to the report with its coverage data
          report[key] = {
            statements: {
              total: fileValue.statements.total,
              covered: fileValue.statements.covered,
              skipped: fileValue.statements.skipped,
              pct: fileValue.statements.pct
            },
            branches: {
              total: fileValue.branches.total,
              covered: fileValue.branches.covered,
              skipped: fileValue.branches.skipped,
              pct: fileValue.branches.pct
            },
            functions: {
              total: fileValue.functions.total,
              covered: fileValue.functions.covered,
              skipped: fileValue.functions.skipped,
              pct: fileValue.functions.pct
            },
            lines: {
              total: fileValue.lines.total,
              covered: fileValue.lines.covered,
              skipped: fileValue.lines.skipped,
              pct: fileValue.lines.pct,
              uncovered: fileValue.lines.uncovered || []
            }
          };
        }
      });
      
      // Validate total structure
      const total = report.total;
      if (!total.statements || !total.branches || !total.functions || !total.lines) {
        throw new Error('Invalid Jest coverage report: total field missing required metrics');
      }
      
      // Log the structure
      core.info('Processed coverage report structure:');
      core.info(`- Total metrics: ${Object.keys(total).join(', ')}`);
      core.info(`- Number of files: ${Object.keys(report).length - 1}`); // Subtract 1 for total
      
      // Log file entries for debugging
      Object.keys(report).forEach(key => {
        if (key !== 'total') {
          core.info(`File: ${key}`);
          core.info(`- Statements: ${report[key].statements?.pct}`);
          core.info(`- Branches: ${report[key].branches?.pct}`);
          core.info(`- Functions: ${report[key].functions?.pct}`);
          core.info(`- Lines: ${report[key].lines?.pct}`);
          if (report[key].lines?.uncovered) {
            core.info(`- Uncovered lines: ${report[key].lines.uncovered.join(', ')}`);
          }
        }
      });
      
      return report;
    } catch (error) {
      if (error instanceof Error) {
        core.error(`Error parsing Jest coverage report: ${error.message}`);
        if (error.stack) {
          core.debug(`Parse error stack: ${error.stack}`);
        }
      }
      throw error;
    }
  }
} 