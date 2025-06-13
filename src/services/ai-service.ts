import * as core from '@actions/core';
import OpenAI from 'openai';
import { CoverageAnalysis, CoverageInsight, AIConfig } from '../types/ai';
import { CoverageReport, FileCoverage } from '../types/coverage';

/**
 * Service for analyzing coverage data using OpenAI
 */
export class AIService {
  private config: AIConfig;
  private openai: OpenAI;

  constructor(config: AIConfig) {
    this.config = config;
    if (config.enabled && !config.apiKey) {
      throw new Error('OpenAI API key is required when AI analysis is enabled');
    }
    this.openai = new OpenAI({
      apiKey: config.apiKey
    });
  }

  /**
   * Analyze coverage data and generate insights using OpenAI
   * @param currentCoverage Current branch coverage data
   * @param baseCoverage Optional base branch coverage data for comparison
   * @returns Analysis results including insights and recommendations
   */
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
      // Prepare coverage data for analysis
      const coverageData = this.prepareCoverageData(currentCoverage, baseCoverage);
      
      // Get analysis from OpenAI
      const response = await this.openai.chat.completions.create({
        model: this.config.model || 'gpt-4',
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 1000,
        messages: [
          {
            role: 'system',
            content: `You are a code coverage analysis expert. Analyze the provided coverage data and generate insights, recommendations, and a summary. 
            Focus on identifying areas of concern, improvements, and actionable recommendations.
            Format your response as a JSON object with the following structure:
            {
              "insights": [
                {
                  "type": "warning" | "improvement" | "suggestion",
                  "message": "string",
                  "severity": "high" | "medium" | "low",
                  "file": "string (optional)"
                }
              ],
              "summary": "string",
              "recommendations": ["string"]
            }`
          },
          {
            role: 'user',
            content: JSON.stringify(coverageData)
          }
        ]
      });

      // Parse the response
      const analysis = JSON.parse(response.choices[0].message.content || '{}') as CoverageAnalysis;
      
      return analysis;
    } catch (error) {
      core.warning(`Error in AI analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        insights: [],
        summary: 'Error during AI analysis',
        recommendations: []
      };
    }
  }

  /**
   * Prepare coverage data for AI analysis
   * @param currentCoverage Current branch coverage data
   * @param baseCoverage Optional base branch coverage data
   * @returns Formatted coverage data for analysis
   */
  private prepareCoverageData(currentCoverage: CoverageReport, baseCoverage?: CoverageReport) {
    interface CoverageData {
      current: {
        total: FileCoverage;
        files: Array<{
          file: string;
          coverage: number;
        }>;
      };
      base?: {
        total: FileCoverage;
        files: Array<{
          file: string;
          coverage: number;
        }>;
      };
    }

    const data: CoverageData = {
      current: {
        total: currentCoverage.total,
        files: Object.entries(currentCoverage.files)
          .filter(([_, coverage]) => coverage.lines.pct < 80)
          .map(([file, coverage]) => ({
            file,
            coverage: coverage.lines.pct
          }))
      }
    };

    if (baseCoverage) {
      data.base = {
        total: baseCoverage.total,
        files: Object.entries(baseCoverage.files)
          .filter(([_, coverage]) => coverage.lines.pct < 80)
          .map(([file, coverage]) => ({
            file,
            coverage: coverage.lines.pct
          }))
      };
    }

    return data;
  }
} 