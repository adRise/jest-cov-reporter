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
      
      // Handle both old and new Jest coverage formats
      let files = parsed.files;
      if (!files) {
        // Try to find files in the old format
        const fileEntries = Object.entries(parsed).filter(([key, value]) => 
          key !== 'total' && typeof value === 'object' && value !== null
        );
        
        if (fileEntries.length > 0) {
          core.info('Found files in old Jest format, converting...');
          files = Object.fromEntries(fileEntries);
        } else {
          throw new Error('Invalid Jest coverage report: missing files field and no file entries found');
        }
      }
      
      // Create a new report with the correct structure
      const report: CoverageReport = {
        total: parsed.total,
        files: files
      };
      
      // Validate total structure
      const total = report.total;
      if (!total.statements || !total.branches || !total.functions || !total.lines) {
        throw new Error('Invalid Jest coverage report: total field missing required metrics');
      }
      
      // Log the structure
      core.info('Processed coverage report structure:');
      core.info(`- Total metrics: ${Object.keys(total).join(', ')}`);
      core.info(`- Number of files: ${Object.keys(report.files).length}`);
      
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