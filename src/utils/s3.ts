import * as core from '@actions/core';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * S3 configuration interface
 */
export interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
  bucket: string;
  repoDirectory?: string;
  baseBranch?: string;
  destDir?: string;
}

/**
 * Check if AWS CLI is available
 * @returns Boolean indicating if AWS CLI is available
 */
export const checkAwsCliAvailable = (): boolean => {
  try {
    execSync('aws --version', { stdio: 'pipe' });
    return true;
  } catch (error) {
    core.warning('AWS CLI is not available. Please make sure AWS CLI is installed in your CI environment.');
    core.warning('You can add it to your workflow with: actions/setup-python followed by pip install awscli');
    return false;
  }
};

/**
 * Uploads coverage report to S3
 * @param sourcePath - Path to the coverage report
 * @param config - S3 configuration
 * @returns Whether the upload was successful
 */
export const uploadCoverageToS3 = (sourcePath: string, config: S3Config): boolean => {
  const {
    accessKeyId,
    secretAccessKey,
    region,
    bucket,
    repoDirectory,
    destDir
  } = config;

  if (!accessKeyId || !secretAccessKey || !bucket || !destDir) {
    core.info('S3 credentials not provided, skipping upload');
    return false;
  }

  // Check if AWS CLI is available
  if (!checkAwsCliAvailable()) {
    core.warning('Skipping S3 upload due to missing AWS CLI');
    return false;
  }

  try {
    // Ensure the coverage directory exists
    if (!fs.existsSync(sourcePath)) {
      core.warning(`Source directory ${sourcePath} does not exist`);
      return false;
    }

    // Setup AWS CLI environment
    process.env.AWS_ACCESS_KEY_ID = accessKeyId;
    process.env.AWS_SECRET_ACCESS_KEY = secretAccessKey;
    process.env.AWS_REGION = region || 'us-east-2';

    // Construct the S3 path with repo directory if provided
    const s3Path = repoDirectory 
      ? `s3://${bucket}/${repoDirectory}/${destDir}/coverage-summary.json`
      : `s3://${bucket}/${destDir}/coverage-summary.json`;

    // Upload coverage summary
    const uploadCmd = `aws s3 cp ${sourcePath} ${s3Path} --acl public-read`;
    core.info(`Uploading coverage summary to S3: ${s3Path}`);
    execSync(uploadCmd, { stdio: 'inherit' });

    // Upload lcov report if it exists
    const lcovReportDir = path.resolve(path.dirname(sourcePath), 'lcov-report');
    if (fs.existsSync(lcovReportDir)) {
      const lcovS3Path = repoDirectory
        ? `s3://${bucket}/${repoDirectory}/${destDir}/lcov-report`
        : `s3://${bucket}/${destDir}/lcov-report`;

      const uploadLcovCmd = `aws s3 cp ${lcovReportDir} ${lcovS3Path} --recursive --acl public-read`;
      core.info(`Uploading lcov report to S3: ${lcovS3Path}`);
      execSync(uploadLcovCmd, { stdio: 'inherit' });
    }

    return true;
  } catch (error) {
    if (error instanceof Error) {
      core.warning(`Error uploading coverage to S3: ${error.message}`);
    } else {
      core.warning(`Error uploading coverage to S3: Unknown error`);
    }
    return false;
  }
};

/**
 * Downloads base coverage report from S3
 * @param config - S3 configuration
 * @param destPath - Path to save the downloaded file
 * @returns Boolean indicating success, or special string 'NO_BASE_COVERAGE' if base coverage doesn't exist
 */
export const downloadBaseReportFromS3 = (config: S3Config, destPath: string): boolean | 'NO_BASE_COVERAGE' => {
  const {
    accessKeyId,
    secretAccessKey,
    region,
    bucket,
    repoDirectory,
    baseBranch
  } = config;

  if (!accessKeyId || !secretAccessKey || !bucket || !baseBranch) {
    core.info('S3 credentials not provided, skipping download');
    return false;
  }

  // Check if AWS CLI is available
  if (!checkAwsCliAvailable()) {
    core.warning('Skipping S3 download due to missing AWS CLI');
    return false;
  }

  try {
    // Log configuration details for debugging
    core.info('S3 Download Config:');
    core.info(`- Bucket: ${bucket}`);
    core.info(`- Repo Directory: ${repoDirectory ? repoDirectory : 'Not specified'}`);
    core.info(`- Base Branch: ${baseBranch}`);
    
    // Setup AWS CLI environment
    process.env.AWS_ACCESS_KEY_ID = accessKeyId;
    process.env.AWS_SECRET_ACCESS_KEY = secretAccessKey;
    process.env.AWS_REGION = region || 'us-east-2';

    // Ensure the destination directory exists
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // Construct the S3 path with repo directory if provided
    const s3Path = repoDirectory
      ? `s3://${bucket}/${repoDirectory}/${baseBranch}/coverage-summary.json`
      : `s3://${bucket}/${baseBranch}/coverage-summary.json`;

    // Check if the file exists in S3 before downloading
    try {
      // Use aws s3 ls to check if the file exists
      const checkCmd = `aws s3 ls ${s3Path}`;
      execSync(checkCmd, { stdio: 'pipe' });
    } catch (error) {
      // File doesn't exist in S3
      core.info(`Base coverage report not found in S3: ${s3Path}`);
      return 'NO_BASE_COVERAGE';
    }

    // Download base coverage report
    const downloadCmd = `aws s3 cp ${s3Path} ${destPath}`;
    
    core.info(`Downloading base coverage report from S3: ${s3Path}`);
    execSync(downloadCmd, { stdio: 'inherit' });
    
    return fs.existsSync(destPath);
  } catch (error) {
    if (error instanceof Error) {
      core.warning(`Error downloading base coverage from S3: ${error.message}`);
    } else {
      core.warning(`Error downloading base coverage from S3: Unknown error`);
    }
    return false;
  }
}; 