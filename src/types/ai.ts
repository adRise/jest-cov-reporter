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
} 