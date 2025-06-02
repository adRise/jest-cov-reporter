import { CoverageDiffCalculator } from '../core/diff/CoverageDiffCalculator';
import { ReportFormatter } from '../core/format/ReportFormatter';
import { ThresholdValidator } from '../core/threshold/ThresholdValidator';
import { CoverageReport } from '../types';
import { ICONS } from '../utils/constants';

// Mock ThresholdValidator to make tests more deterministic
jest.mock('../core/threshold/ThresholdValidator', () => {
  return {
    ThresholdValidator: jest.fn().mockImplementation(() => {
      return {
        checkOnlyChangedFiles: jest.fn().mockReturnValue(true),
        checkOnlyAddedFiles: jest.fn((path) => path.includes('file2.js') || path.includes('file3.js')),
        checkIfNewFileLacksFullCoverage: jest.fn((parts) => {
          // Check if any part is less than 100%
          return parts.some((part) => part.newPct < 100);
        }),
        checkIfNewFileNotFullCoverage: jest.fn().mockReturnValue(true),
      };
    }),
  };
});

describe('ReportFormatter', () => {
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
  let thresholdValidator: ThresholdValidator;
  let formatter: ReportFormatter;

  beforeEach(() => {
    diffCalculator = new CoverageDiffCalculator({
      coverageReportNew: mockNewReport,
      coverageReportOld: mockOldReport,
      coverageType: 'jest',
      currentDirectory: '/test'
    });

    thresholdValidator = new ThresholdValidator({
      diffCalculator,
      delta: 0.2,
      changedFiles: ['file1.js'],
      addedFiles: ['file2.js', 'file3.js'],
      checkNewFileFullCoverage: true,
      currentDirectory: '/test'
    });

    formatter = new ReportFormatter({
      diffCalculator,
      thresholdValidator,
      coverageReportNew: mockNewReport,
      coverageType: 'jest',
      delta: 0.2,
      currentDirectory: '/test',
      prefixFilenameUrl: 'https://example.com/coverage',
      prNumber: 123,
      checkNewFileFullCoverage: true
    });
  });

  it('should generate coverage details correctly', () => {
    const details = formatter.getCoverageDetails(false);
    
    // Check if all sections are present
    expect(details).toHaveProperty('totalCoverageLines');
    expect(details).toHaveProperty('decreaseStatusLines');
    expect(details).toHaveProperty('remainingStatusLines');
    expect(details).toHaveProperty('statusHeader');
    
    // Check total coverage report
    expect(details.totalCoverageLines.totalPct).toBe(84);
    expect(details.totalCoverageLines.changesPct).toBe(4);
    expect(details.totalCoverageLines.summaryMetric).toBe('lines');
    
    // Check if we have decrease status lines (file1.js branches coverage went down)
    expect(details.decreaseStatusLines.length).toBeGreaterThan(0);
    
    // Check if decrease status lines include the red circle icon
    const hasDecreaseIcon = details.decreaseStatusLines.some(line => 
      line.includes(ICONS.DECREASED_COVERAGE));
    expect(hasDecreaseIcon).toBe(true);
    
    // Check if we have remaining status lines
    expect(details.remainingStatusLines.length).toBeGreaterThan(0);
  });

  it('should only include diffs when diffOnly is true', () => {
    const fullDetails = formatter.getCoverageDetails(false);
    const diffOnlyDetails = formatter.getCoverageDetails(true);
    
    // When diffOnly is true, we should have fewer or equal remaining lines
    expect(diffOnlyDetails.remainingStatusLines.length).toBeLessThanOrEqual(
      fullDetails.remainingStatusLines.length
    );
  });

  it('should show new files with appropriate icons', () => {
    const details = formatter.getCoverageDetails(false);
    
    // Check if new files with full coverage get green icon
    const hasNewFullCoverageIcon = details.remainingStatusLines.some(line => 
      line.includes(ICONS.INCREASED_COVERAGE) && line.includes(ICONS.NEW_COVERAGE) && line.includes('file2.js'));
    expect(hasNewFullCoverageIcon).toBe(true);
    
    // Check if new files without full coverage get red icon
    const hasNewPartialCoverageIcon = details.decreaseStatusLines.some(line => 
      line.includes(ICONS.DECREASED_COVERAGE) && line.includes(ICONS.NEW_COVERAGE) && line.includes('file3.js'));
    expect(hasNewPartialCoverageIcon).toBe(true);
  });
}); 