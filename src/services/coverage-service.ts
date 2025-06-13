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
      
      // Debug log for S3 configuration
      core.info('S3 Configuration:');
      core.info(`- Bucket: ${this.config.s3Bucket}`);
      core.info(`- Repo Directory: ${this.config.s3RepoDirectory ? this.config.s3RepoDirectory : 'Not specified'}`);
      core.info(`- Base Branch: ${this.config.baseBranch}`);
      core.info(`- S3 Base URL: ${this.config.s3BaseUrl ? this.config.s3BaseUrl : 'Not specified'}`);
      
      // Create S3 config
      const s3Config = {
        accessKeyId: this.config.awsAccessKeyId,
        secretAccessKey: this.config.awsSecretAccessKey,
        region: this.config.awsRegion,
        bucket: this.config.s3Bucket,
        repoDirectory: this.config.s3RepoDirectory,
        baseBranch: this.config.baseBranch
      };
      
      // Log the S3Config object creation
      core.info(`S3Config created with repoDirectory: ${s3Config.repoDirectory ? s3Config.repoDirectory : 'Not specified'}`);
      
      // If branch coverage report path not provided, use default
      if (!branchPath) {
        branchPath = path.resolve(this.coverageDir, 'coverage-summary.json');
        core.info(`No branch coverage report path provided, using default: ${branchPath}`);
      }
      
      // If base coverage report path not provided, download from S3
      if (!basePath) {
        basePath = path.resolve(this.coverageDir, 'master-coverage-summary.json');
        core.info(`No base coverage report path provided, downloading from S3 to: ${basePath}`);
        const downloadResult = downloadBaseReportFromS3(s3Config, basePath);
        
        // Handle first-time use case (no base coverage exists)
        if (downloadResult === 'NO_BASE_COVERAGE') {
          core.info('No base coverage found. This appears to be first-time use.');
          
          // Check if branch coverage exists
          if (!fs.existsSync(branchPath)) {
            core.setFailed('No branch coverage report found. Cannot bootstrap without a coverage report.');
            return null;
          }
          
          // Use the branch coverage as the base coverage
          core.info('Using current branch coverage as the base coverage for first-time comparison');
          fs.copyFileSync(branchPath, basePath);
          
          // Upload the branch coverage as the base coverage for future runs
          core.info('Uploading current coverage as the base coverage for future comparisons');
          const baseUploadConfig = {
            ...s3Config,
            destDir: this.config.baseBranch
          };
          
          const uploadSuccess = uploadCoverageToS3(branchPath, baseUploadConfig);
          if (!uploadSuccess) {
            core.warning('Failed to upload base coverage to S3, but continuing with comparison');
          } else {
            core.info('Successfully bootstrapped base coverage from current branch');
          }
        } else if (!downloadResult) {
          // Handle general download failure
          core.setFailed('Failed to download base coverage report from S3. Please ensure you have proper S3 permissions.');
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
          // Build paths with repo directory if provided
          const repoPath = this.config.s3RepoDirectory ? `${this.config.s3RepoDirectory}/` : '';
          const baseReportUrl = `${this.config.s3BaseUrl}/${repoPath}${this.config.baseBranch}/lcov-report/index.html`;
          const currentReportUrl = `${this.config.s3BaseUrl}/${repoPath}${destDir}/lcov-report/index.html`;
          
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
      core.info('Parsing coverage reports...');
      core.info(`Base coverage path: ${basePath}`);
      core.info(`Branch coverage path: ${branchPath}`);
      
      // Check if files exist
      if (!fs.existsSync(basePath)) {
        core.error(`Base coverage file not found: ${basePath}`);
        return null;
      }
      if (!fs.existsSync(branchPath)) {
        core.error(`Branch coverage file not found: ${branchPath}`);
        return null;
      }

      // Get the content of coverage files
      core.info('Reading coverage files...');
      const baseCoverageContent = fs.readFileSync(basePath, 'utf8');
      const branchCoverageContent = fs.readFileSync(branchPath, 'utf8');
      
      core.info(`Base coverage content length: ${baseCoverageContent.length}`);
      core.info(`Branch coverage content length: ${branchCoverageContent.length}`);
      
      // Parse the content based on coverage type
      core.info(`Using coverage type: ${this.config.coverageType}`);
      const baseCoverage = parseContent(baseCoverageContent, this.config.coverageType);
      const branchCoverage = parseContent(branchCoverageContent, this.config.coverageType);
      
      // Validate parsed coverage data
      if (!baseCoverage || !baseCoverage.total || !baseCoverage.files) {
        core.error('Invalid base coverage data structure after parsing');
        core.debug(`Base coverage data: ${JSON.stringify(baseCoverage, null, 2)}`);
        return null;
      }
      
      if (!branchCoverage || !branchCoverage.total || !branchCoverage.files) {
        core.error('Invalid branch coverage data structure after parsing');
        core.debug(`Branch coverage data: ${JSON.stringify(branchCoverage, null, 2)}`);
        return null;
      }
      
      // Get the current directory to replace the file name paths
      const currentDirectory = execSync('pwd').toString().trim();
      core.info(`Current directory: ${currentDirectory}`);
      
      return { baseCoverage, branchCoverage, currentDirectory };
    } catch (error) {
      if (error instanceof Error) {
        core.error(`Error parsing coverage reports: ${error.message}`);
        if (error.stack) {
          core.debug(`Error stack trace: ${error.stack}`);
        }
      } else {
        core.error('Unknown error parsing coverage reports');
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