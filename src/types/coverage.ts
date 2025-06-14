/**
 * Represents coverage metrics for a specific aspect (lines, statements, etc.)
 */
export interface CoverageMetrics {
  /** Total number of items */
  total: number;
  
  /** Number of covered items */
  covered: number;
  
  /** Number of skipped items */
  skipped: number;
  
  /** Coverage percentage */
  pct: number;
}

/**
 * Represents coverage data for a single file
 */
export interface FileCoverage {
  /** Line coverage metrics */
  lines: CoverageMetrics;
  
  /** Statement coverage metrics */
  statements: CoverageMetrics;
  
  /** Function coverage metrics */
  functions: CoverageMetrics;
  
  /** Branch coverage metrics */
  branches: CoverageMetrics;
}

/**
 * Represents a complete coverage report
 */
export interface CoverageReport {
  /** Overall coverage metrics */
  total: FileCoverage;
  
  /** Coverage data for individual files */
  files: Record<string, FileCoverage>;
} 