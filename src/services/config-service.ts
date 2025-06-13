import * as core from '@actions/core';
import * as github from '@actions/github';

/**
 * Configuration for the coverage reporter action
 */
export interface CoverageConfig {
  // Repository info
  repoName: string;
  repoOwner: string;
  
  // GitHub info
  githubToken: string;
  githubClient: any;
  prNumber?: number;
  
  // Coverage settings
  fullCoverage: boolean;
  delta: number;
  customMessage: string;
  onlyCheckChangedFiles: boolean;
  prefixFilenameUrl: string;
  baseCoverageReportPath: string;
  branchCoverageReportPath: string;
  coverageType: string;
  checkNewFileCoverage: boolean;
  newFileCoverageThreshold: number;
  useSameComment: boolean;
  
  // S3 settings
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsRegion: string;
  s3Bucket: string;
  s3RepoDirectory: string;
  baseBranch: string;
  s3BaseUrl: string;
  useS3: boolean;
}

/**
 * Service to load and validate configuration from GitHub Actions inputs
 */
export class ConfigService {
  /**
   * Load configuration from GitHub Actions inputs
   * @returns Configuration object
   */
  public static loadConfig(): CoverageConfig {
    const repoName = github.context.repo.repo;
    const repoOwner = github.context.repo.owner;
    const githubToken = core.getInput('accessToken');
    const githubClient = github.getOctokit(githubToken);
    
    const prNumberInput = core.getInput('pr-number');
    const prNumber = github.context.issue.number || (prNumberInput ? Number(prNumberInput) : undefined);
    
    // Coverage settings
    const fullCoverage = JSON.parse(core.getInput('fullCoverageDiff'));
    const delta = Number(core.getInput('delta'));
    const customMessage = core.getInput('custom-message');
    const onlyCheckChangedFiles = core.getInput('only-check-changed-files') === 'true';
    const prefixFilenameUrl = core.getInput('prefix-filename-url');
    const baseCoverageReportPath = core.getInput('base-coverage-report-path');
    const branchCoverageReportPath = core.getInput('branch-coverage-report-path');
    const coverageType = core.getInput('coverageType');
    const checkNewFileCoverage = JSON.parse(core.getInput('check-new-file-full-coverage'));
    const newFileCoverageThreshold = Number(core.getInput('new-file-coverage-threshold'));
    const useSameComment = JSON.parse(core.getInput('useSameComment'));
    
    // S3 settings
    const awsAccessKeyId = core.getInput('aws-access-key-id');
    const awsSecretAccessKey = core.getInput('aws-secret-access-key');
    const awsRegion = core.getInput('aws-region');
    const s3Bucket = core.getInput('s3-bucket');
    const s3RepoDirectory = core.getInput('s3-repo-directory');
    const baseBranch = core.getInput('base-branch');
    const s3BaseUrl = core.getInput('s3-base-url');
    const useS3 = Boolean(awsAccessKeyId && awsSecretAccessKey && s3Bucket);
    
    // Debug logging for S3 configuration
    core.info('===== CONFIG SERVICE: S3 SETTINGS =====');
    core.info(`Bucket: ${s3Bucket}`);
    core.info(`Repo Directory: ${s3RepoDirectory}`);
    core.info(`Base Branch: ${baseBranch}`);
    core.info(`Using S3: ${useS3}`);
    core.info('=======================================');
    
    return {
      repoName,
      repoOwner,
      githubToken,
      githubClient,
      prNumber,
      fullCoverage,
      delta,
      customMessage,
      onlyCheckChangedFiles,
      prefixFilenameUrl,
      baseCoverageReportPath,
      branchCoverageReportPath,
      coverageType,
      checkNewFileCoverage,
      newFileCoverageThreshold,
      useSameComment,
      awsAccessKeyId,
      awsSecretAccessKey,
      awsRegion,
      s3Bucket,
      s3RepoDirectory,
      baseBranch,
      s3BaseUrl,
      useS3
    };
  }
  
  /**
   * Validate the configuration
   * @param config Configuration to validate
   * @returns True if valid, false if not
   */
  public static validateConfig(config: CoverageConfig): boolean {
    // If using S3, we may not need explicit paths
    if (config.useS3) {
      return true;
    }
    
    // Otherwise, we need both paths
    if (!config.baseCoverageReportPath || !config.branchCoverageReportPath) {
      core.setFailed('You must provide either both coverage report paths or AWS S3 credentials. ' +
        'Missing: ' + (!config.baseCoverageReportPath ? 'base-coverage-report-path ' : '') + 
        (!config.branchCoverageReportPath ? 'branch-coverage-report-path' : ''));
      return false;
    }
    
    return true;
  }
} 