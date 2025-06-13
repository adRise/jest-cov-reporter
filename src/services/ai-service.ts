import * as core from '@actions/core';
import OpenAI from 'openai';
import { CoverageAnalysis, CoverageInsight, AIConfig } from '../types/ai';
import { CoverageReport, FileCoverage } from '../types/coverage';

/**
 * Service for analyzing coverage data using OpenAI
 */
export class AIService {
  private config: AIConfig;
  private openai: OpenAI | null = null;

  constructor(config: AIConfig) {
    this.config = config;
    core.info('Initializing AI Service...');
    core.info(`AI Analysis enabled: ${config.enabled}`);
    
    if (config.enabled && !config.apiKey) {
      core.error('OpenAI API key is required when AI analysis is enabled');
      throw new Error('OpenAI API key is required when AI analysis is enabled');
    }
    
    if (config.enabled) {
      core.info(`Using OpenAI model: ${config.model || 'gpt-4'}`);
      core.info(`Temperature: ${config.temperature || 0.7}`);
      core.info(`Max tokens: ${config.maxTokens || 1000}`);
      this.openai = new OpenAI({
        apiKey: config.apiKey
      });
    }
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
    core.info('Starting coverage analysis...');
    
    if (!this.config.enabled) {
      core.info('AI analysis is disabled, skipping analysis');
      return {
        insights: [],
        summary: 'AI analysis is disabled',
        recommendations: []
      };
    }

    if (!this.openai) {
      core.error('OpenAI client not initialized');
      return {
        insights: [],
        summary: 'Error: OpenAI client not initialized',
        recommendations: []
      };
    }

    try {
      core.info('Preparing coverage data for analysis...');
      // Prepare coverage data for analysis
      const coverageData = this.prepareCoverageData(currentCoverage, baseCoverage);
      core.debug(`Prepared coverage data: ${JSON.stringify(coverageData, null, 2)}`);
      
      core.info('Sending request to OpenAI...');
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

      core.info('Received response from OpenAI');
      core.debug(`OpenAI response: ${JSON.stringify(response, null, 2)}`);

      // Parse the response
      const analysis = JSON.parse(response.choices[0].message.content || '{}') as CoverageAnalysis;
      
      core.info(`Analysis complete. Found ${analysis.insights.length} insights and ${analysis.recommendations.length} recommendations`);
      core.debug(`Full analysis: ${JSON.stringify(analysis, null, 2)}`);
      
      return analysis;
    } catch (error) {
      core.error(`Error in AI analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
      if (error instanceof Error && error.stack) {
        core.debug(`Error stack trace: ${error.stack}`);
      }
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

    core.info('Preparing coverage data...');
    core.debug(`Current coverage: ${JSON.stringify(currentCoverage, null, 2)}`);
    if (baseCoverage) {
      core.debug(`Base coverage: ${JSON.stringify(baseCoverage, null, 2)}`);
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

    core.info(`Prepared data includes ${data.current.files.length} files with low coverage`);
    if (data.base) {
      core.info(`Base coverage includes ${data.base.files.length} files with low coverage`);
    }

    return data;
  }
} 