import { CoverageDiffCalculator } from '../core/diff/CoverageDiffCalculator';
import { ThresholdValidator } from '../core/threshold/ThresholdValidator';
import { CoverageReport } from '../types';

describe('ThresholdValidator', () => {
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
    'file3.js': {
      statements: { total: 5, covered: 4, skipped: 0, pct: 80 },
      branches: { total: 2, covered: 1, skipped: 0, pct: 50 },
      functions: { total: 2, covered: 1, skipped: 0, pct: 50 },
      lines: { total: 5, covered: 4, skipped: 0, pct: 80 }
    },
    'total': {
      statements: { total: 25, covered: 21, skipped: 0, pct: 84 },
      branches: { total: 12, covered: 9, skipped: 0, pct: 75 },
      functions: { total: 9, covered: 7, skipped: 0, pct: 77.8 },
      lines: { total: 25, covered: 21, skipped: 0, pct: 84 }
    }
  };

  let diffCalculator: CoverageDiffCalculator;

  beforeEach(() => {
    diffCalculator = new CoverageDiffCalculator({
      coverageReportNew: mockNewReport,
      coverageReportOld: mockOldReport,
      coverageType: 'jest',
      currentDirectory: '/test'
    });
  });

  it.skip('should detect when coverage falls below delta', () => {
    const validator = new ThresholdValidator({
      diffCalculator,
      delta: 0.2,
      changedFiles: ['/test/file1.js'],
      addedFiles: ['file2.js', 'file3.js'],
      checkNewFileFullCoverage: false,
      currentDirectory: '/test'
    });

    // There's a 5% decrease in branches in file1.js
    expect(validator.checkIfTestCoverageFallsBelowDelta()).toBe(true);
  });

  it('should not detect a coverage drop if delta is high enough', () => {
    const validator = new ThresholdValidator({
      diffCalculator,
      delta: 10, // Set a high delta threshold
      changedFiles: ['file1.js'],
      addedFiles: ['file2.js', 'file3.js'],
      checkNewFileFullCoverage: false,
      currentDirectory: '/test'
    });

    expect(validator.checkIfTestCoverageFallsBelowDelta()).toBe(false);
  });

  it.skip('should identify new files that lack full coverage', () => {
    const validator = new ThresholdValidator({
      diffCalculator,
      delta: 0.2,
      changedFiles: ['file1.js'],
      addedFiles: ['file3.js'], // file3.js has less than 100% coverage
      checkNewFileFullCoverage: true,
      currentDirectory: '/test'
    });

    expect(validator.checkIfNewFileNotFullCoverage()).toBe(true);
  });

  it('should not report new files lacking coverage when the flag is disabled', () => {
    const validator = new ThresholdValidator({
      diffCalculator,
      delta: 0.2,
      changedFiles: ['file1.js'],
      addedFiles: ['file3.js'], // file3.js has less than 100% coverage
      checkNewFileFullCoverage: false, // Disable the check
      currentDirectory: '/test'
    });

    expect(validator.checkIfNewFileNotFullCoverage()).toBe(false);
  });

  it('should check if file is in changed files list', () => {
    const validator = new ThresholdValidator({
      diffCalculator,
      delta: 0.2,
      changedFiles: ['file1.js'],
      addedFiles: ['file2.js', 'file3.js'],
      checkNewFileFullCoverage: false,
      currentDirectory: '/test'
    });

    expect(validator.checkOnlyChangedFiles('/test/file1.js')).toBe(true);
    expect(validator.checkOnlyChangedFiles('/test/file2.js')).toBe(false);
  });

  it('should check if file is in added files list', () => {
    const validator = new ThresholdValidator({
      diffCalculator,
      delta: 0.2,
      changedFiles: ['file1.js'],
      addedFiles: ['file2.js', 'file3.js'],
      checkNewFileFullCoverage: false,
      currentDirectory: '/test'
    });

    expect(validator.checkOnlyAddedFiles('/test/file2.js')).toBe(true);
    expect(validator.checkOnlyAddedFiles('/test/file1.js')).toBe(false);
  });
}); 