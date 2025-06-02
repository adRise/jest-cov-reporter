import { CoverageDiffCalculator } from '../core/diff/CoverageDiffCalculator';
import { CoverageReport } from '../types';

describe('CoverageDiffCalculator', () => {
  const mockOldReport: CoverageReport = {
    'file1.js': {
      statements: { total: 10, covered: 8, skipped: 0, pct: 80 },
      branches: { total: 5, covered: 4, skipped: 0, pct: 80 },
      functions: { total: 3, covered: 3, skipped: 0, pct: 100 },
      lines: { total: 10, covered: 8, skipped: 0, pct: 80 }
    },
    'total': {
      statements: { total: 10, covered: 8, skipped: 0, pct: 80 },
      branches: { total: 5, covered: 4, skipped: 0, pct: 80 },
      functions: { total: 3, covered: 3, skipped: 0, pct: 100 },
      lines: { total: 10, covered: 8, skipped: 0, pct: 80 }
    }
  };

  const mockNewReport: CoverageReport = {
    'file1.js': {
      statements: { total: 15, covered: 12, skipped: 0, pct: 80 },
      branches: { total: 8, covered: 6, skipped: 0, pct: 75 },
      functions: { total: 5, covered: 4, skipped: 0, pct: 80 },
      lines: { total: 15, covered: 12, skipped: 0, pct: 80 }
    },
    'file2.js': {
      statements: { total: 5, covered: 5, skipped: 0, pct: 100 },
      branches: { total: 2, covered: 2, skipped: 0, pct: 100 },
      functions: { total: 2, covered: 2, skipped: 0, pct: 100 },
      lines: { total: 5, covered: 5, skipped: 0, pct: 100 }
    },
    'total': {
      statements: { total: 20, covered: 17, skipped: 0, pct: 85 },
      branches: { total: 10, covered: 8, skipped: 0, pct: 80 },
      functions: { total: 7, covered: 6, skipped: 0, pct: 85.7 },
      lines: { total: 20, covered: 17, skipped: 0, pct: 85 }
    }
  };

  it('should calculate the diff correctly', () => {
    const calculator = new CoverageDiffCalculator({
      coverageReportNew: mockNewReport,
      coverageReportOld: mockOldReport,
      coverageType: 'jest',
      currentDirectory: '/test'
    });

    const diff = calculator.getDiffCoverageReport();
    
    // Check file1.js diffs
    expect(diff['file1.js'].statements?.newPct).toBe(80);
    expect(diff['file1.js'].statements?.oldPct).toBe(80);
    expect(diff['file1.js'].branches?.newPct).toBe(75);
    expect(diff['file1.js'].branches?.oldPct).toBe(80);
    expect(diff['file1.js'].functions?.newPct).toBe(80);
    expect(diff['file1.js'].functions?.oldPct).toBe(100);
    
    // Check file2.js (new file)
    expect(diff['file2.js'].statements?.newPct).toBe(100);
    expect(diff['file2.js'].statements?.oldPct).toBe(0);
    
    // Check totals
    expect(diff['total'].lines?.newPct).toBe(85);
    expect(diff['total'].lines?.oldPct).toBe(80);
  });

  it('should calculate percentage diffs correctly', () => {
    const calculator = new CoverageDiffCalculator({
      coverageReportNew: mockNewReport,
      coverageReportOld: mockOldReport,
      coverageType: 'jest',
      currentDirectory: '/test'
    });
    
    const diff = calculator.getDiffCoverageReport();
    
    const branchesDiff = calculator.getPercentageDiff(diff['file1.js'].branches!);
    expect(branchesDiff).toBe(-5);
    
    const functionsDiff = calculator.getPercentageDiff(diff['file1.js'].functions!);
    expect(functionsDiff).toBe(-20);
    
    const totalLinesDiff = calculator.getPercentageDiff(diff['total'].lines!);
    expect(totalLinesDiff).toBe(5);
  });
}); 