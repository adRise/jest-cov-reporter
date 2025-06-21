import * as core from '@actions/core';
import OpenAI from 'openai';
import { CoverageAnalysis, AIConfig, UncoveredLineInfo } from '../types/ai';
import { CoverageReport, FileCoverage } from '../types/coverage';
import * as fs from 'fs';

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
    core.info('Raw coverage data:');
    core.info(JSON.stringify({
      currentCoverage: {
        type: typeof currentCoverage,
        isNull: currentCoverage === null,
        isUndefined: currentCoverage === undefined,
        keys: currentCoverage ? Object.keys(currentCoverage) : [],
        hasTotal: currentCoverage?.total ? 'yes' : 'no',
        hasFiles: currentCoverage?.files ? 'yes' : 'no',
        totalKeys: currentCoverage?.total ? Object.keys(currentCoverage.total) : [],
        filesKeys: currentCoverage?.files ? Object.keys(currentCoverage.files) : []
      },
      baseCoverage: baseCoverage ? {
        type: typeof baseCoverage,
        isNull: baseCoverage === null,
        isUndefined: baseCoverage === undefined,
        keys: Object.keys(baseCoverage),
        hasTotal: baseCoverage.total ? 'yes' : 'no',
        hasFiles: baseCoverage.files ? 'yes' : 'no',
        totalKeys: baseCoverage.total ? Object.keys(baseCoverage.total) : [],
        filesKeys: baseCoverage.files ? Object.keys(baseCoverage.files) : []
      } : 'not provided'
    }, null, 2));
    
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
      
      // Extract uncovered lines information
      const uncoveredFiles = this.extractUncoveredLines(currentCoverage);
      core.info(`Found ${uncoveredFiles.length} files with uncovered lines`);
      
      core.info('Sending request to OpenAI...');
      // Get analysis from OpenAI
      const response = await this.openai.chat.completions.create({
        model: this.config.model || 'gpt-4',
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 2000, // Increased for detailed line suggestions
        messages: [
          {
            role: 'system',
            content: `You are a code coverage analysis expert. Analyze the provided coverage data and generate insights, recommendations, and specific line-level suggestions for improving test coverage.
            
            Focus on:
            1. Identifying critical uncovered lines that need testing
            2. Suggesting specific test cases for uncovered code paths
            3. Prioritizing which lines are most important to cover
            4. Recommending test types (unit, integration, edge-case)
            
            Format your response as a JSON object with the following structure:
            {
              "insights": [
                {
                  "type": "warning" | "improvement" | "suggestion",
                  "message": "string",
                  "severity": "high" | "medium" | "low",
                  "file": "string (optional)",
                  "uncoveredLines": [number] (optional),
                  "suggestedTests": ["string"] (optional)
                }
              ],
              "summary": "string",
              "recommendations": ["string"],
              "lineSuggestions": [
                {
                  "file": "string",
                  "line": number,
                  "suggestion": "string - specific test suggestion for this line",
                  "priority": "high" | "medium" | "low",
                  "testType": "unit" | "integration" | "edge-case"
                }
              ]
            }`
          },
          {
            role: 'user',
            content: JSON.stringify({
              ...coverageData,
              uncoveredFiles: uncoveredFiles.slice(0, 10) // Limit to first 10 files to avoid token limits
            })
          }
        ]
      });

      core.info('Received response from OpenAI');
      core.debug(`OpenAI response: ${JSON.stringify(response, null, 2)}`);

      // Parse the response
      const analysis = JSON.parse(response.choices[0].message.content || '{}') as CoverageAnalysis;
      
      // Add the uncovered files information
      analysis.uncoveredFiles = uncoveredFiles;
      
      core.info(`Analysis complete. Found ${analysis.insights.length} insights, ${analysis.recommendations.length} recommendations, and ${analysis.lineSuggestions?.length || 0} line suggestions`);
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
   * Extract uncovered lines information from coverage data
   * @param coverage Coverage report data
   * @returns Array of uncovered line information per file
   */
  private extractUncoveredLines(coverage: CoverageReport): UncoveredLineInfo[] {
    const uncoveredFiles: UncoveredLineInfo[] = [];
    
    Object.entries(coverage.files).forEach(([filePath, fileCoverage]) => {
      const uncoveredLines: number[] = [];
      
      // Extract uncovered lines from different sources
      if (fileCoverage.uncoveredLines) {
        uncoveredLines.push(...fileCoverage.uncoveredLines);
      }
      
      if (fileCoverage.lineDetails) {
        fileCoverage.lineDetails.forEach(lineDetail => {
          if (lineDetail.hits === 0) {
            uncoveredLines.push(lineDetail.line);
          }
        });
      }
      
      // If we have uncovered lines, add to the list
      if (uncoveredLines.length > 0) {
        const uniqueLines = [...new Set(uncoveredLines)].sort((a, b) => a - b);
        
        uncoveredFiles.push({
          file: filePath,
          lines: uniqueLines,
          coverage: fileCoverage.lines.pct,
          codeSnippets: this.extractCodeSnippets(filePath, uniqueLines)
        });
      }
    });
    
    // Sort by number of uncovered lines (most problematic first)
    return uncoveredFiles.sort((a, b) => b.lines.length - a.lines.length);
  }

  /**
   * Extract code snippets for uncovered lines
   * @param filePath Path to the file
   * @param lines Array of line numbers
   * @returns Array of code snippets
   */
  private extractCodeSnippets(filePath: string, lines: number[]): Array<{ line: number; code: string }> {
    try {
      // Only extract snippets for a reasonable number of lines to avoid token limits
      const maxSnippets = 5;
      const linesToExtract = lines.slice(0, maxSnippets);
      
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const fileLines = fileContent.split('\n');
        
        return linesToExtract.map(lineNum => ({
          line: lineNum,
          code: fileLines[lineNum - 1] || '' // Line numbers are 1-based
        })).filter(snippet => snippet.code.trim().length > 0);
      }
    } catch (error) {
      core.debug(`Could not extract code snippets from ${filePath}: ${error}`);
    }
    
    return [];
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
          uncoveredLines?: number[];
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
    
    // Validate current coverage data
    if (!currentCoverage || !currentCoverage.total || !currentCoverage.files) {
      core.error('Invalid current coverage data structure');
      throw new Error('Invalid current coverage data structure');
    }

    core.debug(`Current coverage: ${JSON.stringify(currentCoverage, null, 2)}`);
    if (baseCoverage) {
      if (!baseCoverage.total || !baseCoverage.files) {
        core.error('Invalid base coverage data structure');
        throw new Error('Invalid base coverage data structure');
      }
      core.debug(`Base coverage: ${JSON.stringify(baseCoverage, null, 2)}`);
    }

    const data: CoverageData = {
      current: {
        total: currentCoverage.total,
        files: Object.entries(currentCoverage.files)
          .filter(([_, coverage]) => coverage && coverage.lines && coverage.lines.pct < 80)
          .map(([file, coverage]) => ({
            file,
            coverage: coverage.lines.pct,
            uncoveredLines: coverage.uncoveredLines || []
          }))
      }
    };

    if (baseCoverage) {
      data.base = {
        total: baseCoverage.total,
        files: Object.entries(baseCoverage.files)
          .filter(([_, coverage]) => coverage && coverage.lines && coverage.lines.pct < 80)
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