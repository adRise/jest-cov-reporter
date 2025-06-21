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

  /** Optional array of uncovered line numbers */
  uncovered?: number[];
}

/**
 * Represents detailed line coverage information
 */
export interface DetailedLineCoverage {
  /** Line number */
  line: number;
  
  /** Number of hits (0 = uncovered) */
  hits: number;
  
  /** Whether this line is a branch */
  branch?: boolean;
  
  /** Optional code content for this line */
  code?: string;
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

  /** Optional detailed line-by-line coverage information */
  lineDetails?: DetailedLineCoverage[];

  /** Optional uncovered line numbers (for quick access) */
  uncoveredLines?: number[];
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