import { CoverageReport, FileCoverage, DetailedLineCoverage } from '../types/coverage';
import { CoverageReportParser } from './types';
import * as core from '@actions/core';

/**
 * Jest coverage report structure
 */
interface JestCoverageReport {
  total: JestFileCoverage;
  [filePath: string]: JestFileCoverage;
}

interface JestFileCoverage {
  lines: JestMetrics;
  statements: JestMetrics;
  functions: JestMetrics;
  branches: JestMetrics;
  // Additional Jest-specific fields for detailed analysis
  statementMap?: Record<string, { start: { line: number; column: number }; end: { line: number; column: number } }>;
  fnMap?: Record<string, any>;
  branchMap?: Record<string, any>;
  s?: Record<string, number>; // Statement hit counts
  f?: Record<string, number>; // Function hit counts
  b?: Record<string, number[]>; // Branch hit counts
}

interface JestMetrics {
  total: number;
  covered: number;
  skipped: number;
  pct: number;
}

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
      const parsed: JestCoverageReport = JSON.parse(content);
      
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
        total: this.convertFileCoverage(parsed.total),
        files: {}
      };
      
      // Process file entries
      Object.entries(parsed).forEach(([key, value]) => {
        if (key !== 'total' && typeof value === 'object' && value !== null) {
          core.info(`Processing file: ${key}`);
          
          const fileCoverage = this.convertFileCoverage(value as JestFileCoverage, key);
          report.files[key] = fileCoverage;
        }
      });
      
      // Log the structure
      core.info('Processed coverage report structure:');
      core.info(`- Number of files: ${Object.keys(report.files).length}`);
      
      // Log file entries for debugging
      Object.entries(report.files).forEach(([filePath, fileCoverage]) => {
        core.info(`File: ${filePath}`);
        core.info(`- Statements: ${fileCoverage.statements.pct}%`);
        core.info(`- Branches: ${fileCoverage.branches.pct}%`);
        core.info(`- Functions: ${fileCoverage.functions.pct}%`);
        core.info(`- Lines: ${fileCoverage.lines.pct}%`);
        if (fileCoverage.uncoveredLines && fileCoverage.uncoveredLines.length > 0) {
          core.info(`- Uncovered lines: ${fileCoverage.uncoveredLines.slice(0, 10).join(', ')}${fileCoverage.uncoveredLines.length > 10 ? '...' : ''}`);
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

  /**
   * Convert Jest file coverage to our enhanced format
   * @param jestCoverage Jest coverage data
   * @param filePath Optional file path for detailed analysis
   * @returns Enhanced file coverage data
   */
  private convertFileCoverage(jestCoverage: JestFileCoverage, filePath?: string): FileCoverage {
    const fileCoverage: FileCoverage = {
      lines: {
        total: jestCoverage.lines?.total || 0,
        covered: jestCoverage.lines?.covered || 0,
        skipped: jestCoverage.lines?.skipped || 0,
        pct: jestCoverage.lines?.pct || 0
      },
      statements: {
        total: jestCoverage.statements?.total || 0,
        covered: jestCoverage.statements?.covered || 0,
        skipped: jestCoverage.statements?.skipped || 0,
        pct: jestCoverage.statements?.pct || 0
      },
      functions: {
        total: jestCoverage.functions?.total || 0,
        covered: jestCoverage.functions?.covered || 0,
        skipped: jestCoverage.functions?.skipped || 0,
        pct: jestCoverage.functions?.pct || 0
      },
      branches: {
        total: jestCoverage.branches?.total || 0,
        covered: jestCoverage.branches?.covered || 0,
        skipped: jestCoverage.branches?.skipped || 0,
        pct: jestCoverage.branches?.pct || 0
      }
    };

    // Extract detailed line information if available
    if (jestCoverage.statementMap && jestCoverage.s) {
      const lineDetails: DetailedLineCoverage[] = [];
      const uncoveredLines: number[] = [];

      Object.entries(jestCoverage.statementMap).forEach(([statementId, statementInfo]) => {
        const hits = jestCoverage.s![statementId] || 0;
        const lineNumber = statementInfo.start.line;

        // Add to line details
        lineDetails.push({
          line: lineNumber,
          hits: hits,
          branch: false
        });

        // Track uncovered lines
        if (hits === 0) {
          uncoveredLines.push(lineNumber);
        }
      });

      // Add branch information if available
      if (jestCoverage.branchMap && jestCoverage.b) {
        Object.entries(jestCoverage.branchMap).forEach(([branchId, branchInfo]: [string, any]) => {
          const branchHits = jestCoverage.b![branchId] || [];
          const lineNumber = branchInfo.line;

          // Check if any branch path is uncovered
          const hasUncoveredBranch = branchHits.some((hits: number) => hits === 0);
          
          if (hasUncoveredBranch) {
            // Find existing line detail or create new one
            let lineDetail = lineDetails.find(detail => detail.line === lineNumber);
            if (lineDetail) {
              lineDetail.branch = true;
            } else {
              lineDetails.push({
                line: lineNumber,
                hits: hasUncoveredBranch ? 0 : 1,
                branch: true
              });
            }

            // Add to uncovered lines if not already there
            if (!uncoveredLines.includes(lineNumber)) {
              uncoveredLines.push(lineNumber);
            }
          }
        });
      }

      // Sort and deduplicate uncovered lines
      const uniqueUncoveredLines = [...new Set(uncoveredLines)].sort((a, b) => a - b);
      
      fileCoverage.lineDetails = lineDetails.sort((a, b) => a.line - b.line);
      fileCoverage.uncoveredLines = uniqueUncoveredLines;
      fileCoverage.lines.uncovered = uniqueUncoveredLines;
    }

    return fileCoverage;
  }
} 