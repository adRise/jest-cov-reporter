/**
 * Represents a single insight about code coverage
 */
export interface CoverageInsight {
  /** Type of insight: warning, improvement, or suggestion */
  type: 'warning' | 'improvement' | 'suggestion';
  
  /** Human-readable message describing the insight */
  message: string;
  
  /** Severity level of the insight */
  severity: 'high' | 'medium' | 'low';
  
  /** Optional file path this insight relates to */
  file?: string;
  
  /** Optional line number this insight relates to */
  line?: number;

  /** Optional specific lines that need coverage */
  uncoveredLines?: number[];

  /** Optional suggested test cases for specific lines */
  suggestedTests?: string[];
}

/**
 * Represents detailed information about uncovered lines in a file
 */
export interface UncoveredLineInfo {
  /** File path */
  file: string;
  
  /** Array of uncovered line numbers */
  lines: number[];
  
  /** Line coverage percentage for this file */
  coverage: number;
  
  /** Optional code snippets for uncovered lines */
  codeSnippets?: Array<{
    line: number;
    code: string;
  }>;
}

/**
 * Configuration for AI analysis
 */
export interface AIConfig {
  /** Whether AI analysis is enabled */
  enabled: boolean;
  
  /** Optional AI model to use (e.g., 'gpt-4') */
  model?: string;
  
  /** Optional temperature setting for AI responses (0-1) */
  temperature?: number;
  
  /** Optional maximum tokens for AI responses */
  maxTokens?: number;
  
  /** Optional API key for AI service */
  apiKey?: string;
}

/**
 * Complete analysis of coverage data
 */
export interface CoverageAnalysis {
  /** List of individual insights about the coverage */
  insights: CoverageInsight[];
  
  /** Summary of the analysis */
  summary: string;
  
  /** List of actionable recommendations */
  recommendations: string[];

  /** Detailed information about uncovered lines per file */
  uncoveredFiles?: UncoveredLineInfo[];

  /** AI-generated suggestions for specific lines that need coverage */
  lineSuggestions?: Array<{
    file: string;
    line: number;
    suggestion: string;
    priority: 'high' | 'medium' | 'low';
    testType: 'unit' | 'integration' | 'edge-case';
  }>;
} 