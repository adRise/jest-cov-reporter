import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import parseContent from '../parsers';
import { CoverageConfig } from './config-service';
import { uploadCoverageToS3, downloadBaseReportFromS3 } from '../utils/s3';

/**
 * Service to handle coverage report operations
 */
export class CoverageService {
  private config: CoverageConfig;
  private coverageDir: string;
  
  /**
   * Create a new coverage service instance
   * @param config - Configuration for the service
   */
  constructor(config: CoverageConfig) {
    this.config = config;
    this.coverageDir = path.resolve('./coverage');
    this.ensureCoverageDir();
  }
  
  /**
   * Ensure the coverage directory exists
   */
  private ensureCoverageDir(): void {
    if (!fs.existsSync(this.coverageDir)) {
      fs.mkdirSync(this.coverageDir, { recursive: true });
    }
  }
  
  /**
   * Prepare coverage report paths, downloading from S3 if necessary
   * @returns Object containing the report paths or null on failure
   */
  public async prepareCoverageReports(): Promise<{ basePath: string, branchPath: string } | null> {
    let basePath = this.config.baseCoverageReportPath;
    let branchPath = this.config.branchCoverageReportPath;
    
    // Handle S3 if credentials are provided
    if (this.config.useS3) {
      core.info('AWS credentials provided, using S3 for coverage reports');
      
      // Create S3 config
      const s3Config = {
        accessKeyId: this.config.awsAccessKeyId,
        secretAccessKey: this.config.awsSecretAccessKey,
        region: this.config.awsRegion,
        bucket: this.config.s3Bucket,
        baseBranch: this.config.baseBranch
      };
      
      // If branch coverage report path not provided, use default
      if (!branchPath) {
        branchPath = path.resolve(this.coverageDir, 'coverage-summary.json');
        core.info(`No branch coverage report path provided, using default: ${branchPath}`);
      }
      
      // If base coverage report path not provided, download from S3
      if (!basePath) {
        basePath = path.resolve(this.coverageDir, 'master-coverage-summary.json');
        core.info(`No base coverage report path provided, downloading from S3 to: ${basePath}`);
        const downloadSuccess = downloadBaseReportFromS3(s3Config, basePath);
        
        if (!downloadSuccess) {
          core.setFailed('Failed to download base coverage report from S3. Please ensure the base branch coverage exists in S3 or provide a local base coverage report path.');
          return null;
        }
      }
      
      // Upload current coverage to S3 if it exists
      if (fs.existsSync(branchPath)) {
        const destDir = this.config.prNumber ? `${this.config.prNumber}` : this.config.baseBranch;
        const uploadConfig = {
          ...s3Config,
          destDir
        };
        
        const uploadSuccess = uploadCoverageToS3(branchPath, uploadConfig);
        if (!uploadSuccess) {
          core.warning('Failed to upload coverage to S3, but continuing with comparison');
        }
        
        // Update the custom message with S3 links if provided
        if (this.config.s3BaseUrl && !this.config.customMessage.includes(this.config.s3BaseUrl)) {
          const baseReportUrl = `${this.config.s3BaseUrl}/${this.config.baseBranch}/lcov-report/index.html`;
          const currentReportUrl = `${this.config.s3BaseUrl}/${destDir}/lcov-report/index.html`;
          
          core.setOutput('base-report-url', baseReportUrl);
          core.setOutput('current-report-url', currentReportUrl);
          
          if (!this.config.customMessage) {
            const newCustomMessage = `[Base Coverage Report](${baseReportUrl}) - [Current Branch Coverage Report](${currentReportUrl})`;
            core.info(`Setting custom message with S3 links: ${newCustomMessage}`);
            // Note: We can't modify the config directly, so we'll return this separately
            return { 
              basePath, 
              branchPath, 
              newCustomMessage 
            } as any;
          }
        }
      }
    }
    
    // Check if the required files exist
    if (!fs.existsSync(basePath) || !fs.existsSync(branchPath)) {
      core.setFailed(`Required coverage reports not found. Base: ${basePath}, Branch: ${branchPath}`);
      return null;
    }
    
    return { basePath, branchPath };
  }
  
  /**
   * Parse coverage reports from files
   * @param basePath - Path to the base coverage report
   * @param branchPath - Path to the branch coverage report
   * @returns Object containing the parsed reports or null on failure
   */
  public parseCoverageReports(basePath: string, branchPath: string): { 
    baseCoverage: any, 
    branchCoverage: any,
    currentDirectory: string
  } | null {
    try {
      // Get the content of coverage files
      const baseCoverageContent = fs.readFileSync(basePath, 'utf8');
      const branchCoverageContent = fs.readFileSync(branchPath, 'utf8');
      
      // Parse the content based on coverage type
      const baseCoverage = parseContent(baseCoverageContent, this.config.coverageType);
      const branchCoverage = parseContent(branchCoverageContent, this.config.coverageType);
      
      // Get the current directory to replace the file name paths
      const currentDirectory = execSync('pwd').toString().trim();
      
      return { baseCoverage, branchCoverage, currentDirectory };
    } catch (error) {
      if (error instanceof Error) {
        core.setFailed(`Error parsing coverage reports: ${error.message}`);
      } else {
        core.setFailed('Unknown error parsing coverage reports');
      }
      return null;
    }
  }
  
  /**
   * Get files changed in the PR
   * @returns Object containing arrays of changed and added files
   */
  public async getChangedFiles(): Promise<{ changedFiles: string[], addedFiles: string[] }> {
    const changedFiles: string[] = [];
    const addedFiles: string[] = [];
    
    // Only proceed if it's a PR and we're configured to check changed files
    if (this.config.prNumber && this.config.onlyCheckChangedFiles) {
      try {
        core.info(`Getting files changed in PR #${this.config.prNumber}`);
        const changesResponse = await this.config.githubClient.rest.pulls.listFiles({
          owner: this.config.repoOwner,
          repo: this.config.repoName,
          pull_number: this.config.prNumber,
        });
        
        // Filter out files that don't have coverage or aren't relevant
        changesResponse.data.forEach((file: any) => {
          const filename = file.filename;
          if (file.status !== 'removed' && !filename.includes('test')) {
            changedFiles.push(filename);
            
            if (file.status === 'added') {
              addedFiles.push(filename);
            }
          }
        });
      } catch (error) {
        if (error instanceof Error) {
          core.warning(`Error getting changed files: ${error.message}`);
        } else {
          core.warning('Unknown error getting changed files');
        }
      }
    }
    
    return { changedFiles, addedFiles };
  }
  
  /**
   * Check if we should enforce full coverage for new files
   * @returns Boolean indicating whether to enforce full coverage
   */
  public async shouldEnforceFullCoverage(): Promise<boolean> {
    // Start with the config value
    let enforceFullCoverage = this.config.checkNewFileCoverage;
    
    // Check for skip label if in PR context
    if (this.config.prNumber) {
      try {
        const pullRequest = await this.config.githubClient.rest.pulls.get({
          owner: this.config.repoOwner,
          repo: this.config.repoName,
          pull_number: this.config.prNumber,
        });
        
        // Skip if the PR has the skip label
        if (pullRequest.data.labels.some((label: any) => 
          label.name && label.name.includes('skip-new-file-full-coverage'))) {
          enforceFullCoverage = false;
        }
      } catch (error) {
        if (error instanceof Error) {
          core.warning(`Error checking PR labels: ${error.message}`);
        } else {
          core.warning('Unknown error checking PR labels');
        }
      }
    }
    
    return enforceFullCoverage;
  }
} 