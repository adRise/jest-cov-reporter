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

      // Log total structure
      core.info('Total coverage structure:');
      core.info(JSON.stringify(parsed.total, null, 2));
      
      // Create a new report with the correct structure
      const report: CoverageReport = {
        total: {
          statements: {
            total: parsed.total.statements?.total || 0,
            covered: parsed.total.statements?.covered || 0,
            skipped: parsed.total.statements?.skipped || 0,
            pct: parsed.total.statements?.pct || 0
          },
          branches: {
            total: parsed.total.branches?.total || 0,
            covered: parsed.total.branches?.covered || 0,
            skipped: parsed.total.branches?.skipped || 0,
            pct: parsed.total.branches?.pct || 0
          },
          functions: {
            total: parsed.total.functions?.total || 0,
            covered: parsed.total.functions?.covered || 0,
            skipped: parsed.total.functions?.skipped || 0,
            pct: parsed.total.functions?.pct || 0
          },
          lines: {
            total: parsed.total.lines?.total || 0,
            covered: parsed.total.lines?.covered || 0,
            skipped: parsed.total.lines?.skipped || 0,
            pct: parsed.total.lines?.pct || 0
          }
        }
      };
      
      // Process file entries
      Object.entries(parsed).forEach(([key, value]) => {
        if (key !== 'total' && typeof value === 'object' && value !== null) {
          core.info(`Processing file: ${key}`);
          core.info(`File coverage structure: ${JSON.stringify(value, null, 2)}`);
          
          const fileValue = value as Record<CoverageMetric, CoverageData & { uncovered?: number[] }>;
          
          // Validate file coverage data
          if (!fileValue.statements || !fileValue.branches || !fileValue.functions || !fileValue.lines) {
            core.warning(`Skipping file ${key}: missing required coverage metrics`);
            return;
          }
          
          // Add each file directly to the report with its coverage data
          report[key] = {
            statements: {
              total: fileValue.statements.total || 0,
              covered: fileValue.statements.covered || 0,
              skipped: fileValue.statements.skipped || 0,
              pct: fileValue.statements.pct || 0
            },
            branches: {
              total: fileValue.branches.total || 0,
              covered: fileValue.branches.covered || 0,
              skipped: fileValue.branches.skipped || 0,
              pct: fileValue.branches.pct || 0
            },
            functions: {
              total: fileValue.functions.total || 0,
              covered: fileValue.functions.covered || 0,
              skipped: fileValue.functions.skipped || 0,
              pct: fileValue.functions.pct || 0
            },
            lines: {
              total: fileValue.lines.total || 0,
              covered: fileValue.lines.covered || 0,
              skipped: fileValue.lines.skipped || 0,
              pct: fileValue.lines.pct || 0,
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