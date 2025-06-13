import { CoverageReport } from '../types';
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
      
      // Validate the structure
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid Jest coverage report: not an object');
      }
      
      // Check for required fields
      if (!parsed.total) {
        throw new Error('Invalid Jest coverage report: missing total field');
      }
      
      if (!parsed.files) {
        throw new Error('Invalid Jest coverage report: missing files field');
      }
      
      // Validate total structure
      const total = parsed.total;
      if (!total.statements || !total.branches || !total.functions || !total.lines) {
        throw new Error('Invalid Jest coverage report: total field missing required metrics');
      }
      
      // Log the structure
      core.info('Jest coverage report structure:');
      core.info(`- Total metrics: ${Object.keys(total).join(', ')}`);
      core.info(`- Number of files: ${Object.keys(parsed.files).length}`);
      
      return parsed;
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