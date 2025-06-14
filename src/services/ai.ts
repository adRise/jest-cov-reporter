import { CoverageAnalysis, CoverageInsight, AIConfig } from '../types/ai';
import { CoverageReport } from '../types/coverage';
import * as core from '@actions/core';

export class AIService {
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
  }

  async analyzeCoverage(
    currentCoverage: CoverageReport,
    baseCoverage?: CoverageReport
  ): Promise<CoverageAnalysis> {
    if (!this.config.enabled) {
      return {
        insights: [],
        summary: 'AI analysis is disabled',
        recommendations: []
      };
    }

    try {
      const insights: CoverageInsight[] = [];
      
      // Analyze overall coverage
      if (currentCoverage.total.lines.pct < 80) {
        insights.push({
          type: 'warning',
          message: 'Overall line coverage is below 80%',
          severity: 'high'
        });
      }

      // Analyze file-specific coverage
      Object.entries(currentCoverage.files).forEach(([file, coverage]) => {
        if (coverage.lines.pct < 70) {
          insights.push({
            type: 'warning',
            message: `Low coverage in ${file}`,
            severity: 'medium',
            file
          });
        }
      });

      // Compare with base coverage if available
      if (baseCoverage) {
        const coverageDiff = currentCoverage.total.lines.pct - baseCoverage.total.lines.pct;
        if (coverageDiff < 0) {
          insights.push({
            type: 'warning',
            message: `Coverage decreased by ${Math.abs(coverageDiff).toFixed(2)}%`,
            severity: 'high'
          });
        } else if (coverageDiff > 0) {
          insights.push({
            type: 'improvement',
            message: `Coverage increased by ${coverageDiff.toFixed(2)}%`,
            severity: 'low'
          });
        }
      }

      // Generate recommendations
      const recommendations = this.generateRecommendations(insights);

      return {
        insights,
        summary: this.generateSummary(insights),
        recommendations
      };
    } catch (error) {
      core.warning(`Error in AI analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        insights: [],
        summary: 'Error during AI analysis',
        recommendations: []
      };
    }
  }

  private generateSummary(insights: CoverageInsight[]): string {
    const highSeverity = insights.filter(i => i.severity === 'high').length;
    const mediumSeverity = insights.filter(i => i.severity === 'medium').length;
    const lowSeverity = insights.filter(i => i.severity === 'low').length;

    return `Analysis found ${highSeverity} high, ${mediumSeverity} medium, and ${lowSeverity} low severity issues.`;
  }

  private generateRecommendations(insights: CoverageInsight[]): string[] {
    const recommendations: string[] = [];

    if (insights.some(i => i.severity === 'high')) {
      recommendations.push('Consider adding more test cases for files with low coverage');
    }

    if (insights.some(i => i.type === 'warning')) {
      recommendations.push('Review files with coverage warnings and add missing test cases');
    }

    if (insights.some(i => i.type === 'improvement')) {
      recommendations.push('Great job on improving coverage! Consider maintaining this level');
    }

    return recommendations;
  }
} 