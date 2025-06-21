import { parseString } from 'xml2js';
import { CoverageReport, FileCoverage, DetailedLineCoverage } from '../types/coverage';
import { CoverageReportParser } from './types';

/**
 * Parser for Cobertura coverage reports
 */
export class CoberturaParser implements CoverageReportParser {
  /**
   * Parse Cobertura XML coverage report
   * @param content - XML content from Cobertura coverage report
   * @returns Parsed coverage report
   */
  parse(content: string): CoverageReport {
    let parsedReport: CoverageReport = { total: this.createEmptyFileCoverage(), files: {} };

    // Parse synchronously to make the function synchronous
    parseString(content, { explicitArray: false }, (err, result) => {
      if (err) {
        throw new Error(`Failed to parse Cobertura XML: ${err.message}`);
      }

      parsedReport = this.processCobertura(result);
    });

    return parsedReport;
  }

  /**
   * Create empty file coverage structure
   */
  private createEmptyFileCoverage(): FileCoverage {
    return {
      lines: { total: 0, covered: 0, skipped: 0, pct: 0 },
      statements: { total: 0, covered: 0, skipped: 0, pct: 0 },
      functions: { total: 0, covered: 0, skipped: 0, pct: 0 },
      branches: { total: 0, covered: 0, skipped: 0, pct: 0 }
    };
  }

  /**
   * Process Cobertura XML result
   * @param result - Parsed XML result
   * @returns Coverage report
   */
  private processCobertura(result: any): CoverageReport {
    const report: CoverageReport = {
      total: this.createEmptyFileCoverage(),
      files: {}
    };
    
    const coverages = result.coverage.packages.package;
    let totalStats = {
      lines: { total: 0, covered: 0 },
      statements: { total: 0, covered: 0 },
      branches: { total: 0, covered: 0 },
      functions: { total: 0, covered: 0 }
    };

    if (Array.isArray(coverages)) {
      coverages.forEach((pkg: any) => {
        const classes = pkg.classes.class;
        this.processClasses(classes, report, totalStats);
      });
    } else {
      const classes = coverages.classes.class;
      this.processClasses(classes, report, totalStats);
    }

    // Calculate total percentages
    report.total = {
      lines: {
        total: totalStats.lines.total,
        covered: totalStats.lines.covered,
        skipped: 0,
        pct: totalStats.lines.total > 0 ? (totalStats.lines.covered / totalStats.lines.total) * 100 : 0
      },
      statements: {
        total: totalStats.statements.total,
        covered: totalStats.statements.covered,
        skipped: 0,
        pct: totalStats.statements.total > 0 ? (totalStats.statements.covered / totalStats.statements.total) * 100 : 0
      },
      branches: {
        total: totalStats.branches.total,
        covered: totalStats.branches.covered,
        skipped: 0,
        pct: totalStats.branches.total > 0 ? (totalStats.branches.covered / totalStats.branches.total) * 100 : 0
      },
      functions: {
        total: totalStats.functions.total,
        covered: totalStats.functions.covered,
        skipped: 0,
        pct: totalStats.functions.total > 0 ? (totalStats.functions.covered / totalStats.functions.total) * 100 : 0
      }
    };

    return report;
  }

  /**
   * Process classes from Cobertura XML
   * @param classes - Class data from XML
   * @param report - Coverage report to update
   * @param totalStats - Total statistics accumulator
   */
  private processClasses(classes: any, report: CoverageReport, totalStats: any): void {
    if (Array.isArray(classes)) {
      classes.forEach((cls: any) => {
        this.processClass(cls, report, totalStats);
      });
    } else {
      this.processClass(classes, report, totalStats);
    }
  }

  /**
   * Process a single class from Cobertura XML
   * @param cls - Class data from XML
   * @param report - Coverage report to update
   * @param totalStats - Total statistics accumulator
   */
  private processClass(cls: any, report: CoverageReport, totalStats: any): void {
    const filename = cls.$.filename;
    const lineRate = parseFloat(cls.$['line-rate'] || '0');
    const branchRate = parseFloat(cls.$['branch-rate'] || '0');
    
    // Extract line details from the lines section
    const lineDetails: DetailedLineCoverage[] = [];
    const uncoveredLines: number[] = [];
    let linesTotal = 0;
    let linesCovered = 0;

    // Process line information if available
    if (cls.lines && cls.lines.line) {
      const lines = Array.isArray(cls.lines.line) ? cls.lines.line : [cls.lines.line];
      
      lines.forEach((line: any) => {
        const lineNumber = parseInt(line.$.number);
        const hits = parseInt(line.$.hits || '0');
        const isBranch = line.$.branch === 'true';
        
        linesTotal++;
        if (hits > 0) {
          linesCovered++;
        } else {
          uncoveredLines.push(lineNumber);
        }

        lineDetails.push({
          line: lineNumber,
          hits: hits,
          branch: isBranch
        });
      });
    }

    // Calculate metrics
    const linePct = linesTotal > 0 ? (linesCovered / linesTotal) * 100 : 0;
    
    // Create file coverage
    const fileCoverage: FileCoverage = {
      lines: {
        total: linesTotal,
        covered: linesCovered,
        skipped: 0,
        pct: linePct,
        uncovered: uncoveredLines
      },
      statements: {
        total: linesTotal, // In Cobertura, statements often map to lines
        covered: linesCovered,
        skipped: 0,
        pct: linePct
      },
      functions: {
        total: 0, // Would need to extract from methods if available
        covered: 0,
        skipped: 0,
        pct: 0
      },
      branches: {
        total: 0, // Would need to calculate from branch data
        covered: 0,
        skipped: 0,
        pct: branchRate * 100
      },
      lineDetails: lineDetails.sort((a, b) => a.line - b.line),
      uncoveredLines: uncoveredLines.sort((a, b) => a - b)
    };

    // Process methods for function coverage if available
    if (cls.methods && cls.methods.method) {
      const methods = Array.isArray(cls.methods.method) ? cls.methods.method : [cls.methods.method];
      let functionsTotal = methods.length;
      let functionsCovered = 0;

      methods.forEach((method: any) => {
        const methodLineRate = parseFloat(method.$['line-rate'] || '0');
        const methodBranchRate = parseFloat(method.$['branch-rate'] || '0');
        
        // Consider a method covered if it has some coverage
        if (methodLineRate > 0 || methodBranchRate > 0) {
          functionsCovered++;
        }
      });

      fileCoverage.functions = {
        total: functionsTotal,
        covered: functionsCovered,
        skipped: 0,
        pct: functionsTotal > 0 ? (functionsCovered / functionsTotal) * 100 : 0
      };
    }

    report.files[filename] = fileCoverage;

    // Update total stats
    totalStats.lines.total += linesTotal;
    totalStats.lines.covered += linesCovered;
    totalStats.statements.total += linesTotal;
    totalStats.statements.covered += linesCovered;
    totalStats.functions.total += fileCoverage.functions.total;
    totalStats.functions.covered += fileCoverage.functions.covered;
    // Branch stats would need more detailed processing
  }
} 