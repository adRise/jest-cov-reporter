import { parseString } from 'xml2js';
import { CoverageReport } from '../types';
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
    let parsedReport: CoverageReport = {};

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
   * Process Cobertura XML result
   * @param result - Parsed XML result
   * @returns Coverage report
   */
  private processCobertura(result: any): CoverageReport {
    const report: CoverageReport = {};
    const coverage = result.coverage;
    
    // Get totals from the root coverage element
    const linesTotal = parseInt(coverage.$['lines-valid']) || 0;
    const linesCovered = parseInt(coverage.$['lines-covered']) || 0;
    const branchesTotal = parseInt(coverage.$['branches-valid']) || 0;
    const branchesCovered = parseInt(coverage.$['branches-covered']) || 0;
    
    // Process packages
    const packages = coverage.packages?.package;
    if (packages) {
      if (Array.isArray(packages)) {
        packages.forEach((pkg: any) => {
          if (pkg.classes?.class) {
            this.processClasses(pkg.classes.class, report);
          }
        });
      } else {
        if (packages.classes?.class) {
          this.processClasses(packages.classes.class, report);
        }
      }
    }

    // Calculate line and branch percentages
    const linePct = linesTotal > 0 ? (linesCovered / linesTotal) * 100 : 0;
    const branchPct = branchesTotal > 0 ? (branchesCovered / branchesTotal) * 100 : 0;

    // Add total summary
    // Note: Cobertura doesn't track functions separately, so we use lines for both statements and lines
    report.total = {
      statements: {
        total: linesTotal,
        covered: linesCovered,
        skipped: 0,
        pct: linePct
      },
      branches: {
        total: branchesTotal,
        covered: branchesCovered,
        skipped: 0,
        pct: branchPct
      },
      functions: {
        total: 0,
        covered: 0,
        skipped: 0,
        pct: 0
      }
    };

    return report;
  }

  /**
   * Process classes from Cobertura XML
   * @param classes - Class data from XML
   * @param report - Coverage report to update
   */
  private processClasses(classes: any, report: CoverageReport): void {
    if (Array.isArray(classes)) {
      classes.forEach((cls: any) => {
        this.processClass(cls, report);
      });
    } else {
      this.processClass(classes, report);
    }
  }

  /**
   * Process a single class from Cobertura XML
   * @param cls - Class data from XML
   * @param report - Coverage report to update
   */
  private processClass(cls: any, report: CoverageReport): void {
    const filename = cls.$.filename;
    const lineRate = parseFloat(cls.$['line-rate']) || 0;
    const branchRate = parseFloat(cls.$['branch-rate']) || 0;
    
    // Count lines and branches from the class's lines
    let linesTotal = 0;
    let linesCovered = 0;
    let branchesTotal = 0;
    let branchesCovered = 0;
    
    if (cls.lines?.line) {
      const lines = Array.isArray(cls.lines.line) ? cls.lines.line : [cls.lines.line];
      
      lines.forEach((line: any) => {
        // Count lines
        linesTotal++;
        const hits = parseInt(line.$.hits) || 0;
        if (hits > 0) {
          linesCovered++;
        }
        
        // Count branches if present
        if (line.$['condition-coverage']) {
          // Parse condition coverage like "50% (1/2)"
          const match = line.$['condition-coverage'].match(/\((\d+)\/(\d+)\)/);
          if (match) {
            const covered = parseInt(match[1]);
            const total = parseInt(match[2]);
            branchesCovered += covered;
            branchesTotal += total;
          }
        }
      });
    }
    
    // If we couldn't count lines/branches from the detailed data, 
    // calculate from the rates
    if (linesTotal === 0 && cls.methods?.method) {
      // Try to count from methods
      const methods = Array.isArray(cls.methods.method) ? cls.methods.method : [cls.methods.method];
      methods.forEach((method: any) => {
        if (method.lines?.line) {
          const methodLines = Array.isArray(method.lines.line) ? method.lines.line : [method.lines.line];
          linesTotal += methodLines.length;
          methodLines.forEach((line: any) => {
            const hits = parseInt(line.$.hits) || 0;
            if (hits > 0) linesCovered++;
          });
        }
      });
    }
    
    // Calculate percentages
    const linePct = lineRate * 100;
    const branchPct = branchRate * 100;

    report[filename] = {
      statements: {
        total: linesTotal,
        covered: linesCovered,
        skipped: 0,
        pct: linePct
      },
      branches: {
        total: branchesTotal,
        covered: branchesCovered,
        skipped: 0,
        pct: branchPct
      },
      functions: {
        total: 0,
        covered: 0,
        skipped: 0,
        pct: 0
      },
      filename
    };
  }
} 