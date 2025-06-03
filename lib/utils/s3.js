import * as core from '@actions/core';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Uploads coverage report to S3
 * @param {string} sourcePath - Path to the coverage report
 * @param {Object} config - S3 configuration
 * @returns {boolean} - Whether the upload was successful
 */
export const uploadCoverageToS3 = (sourcePath, config) => {
  const {
    accessKeyId,
    secretAccessKey,
    region,
    bucket,
    destDir
  } = config;

  if (!accessKeyId || !secretAccessKey || !bucket || !destDir) {
    core.info('S3 credentials not provided, skipping upload');
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

    // Upload coverage summary
    const uploadCmd = `aws s3 cp ${sourcePath} s3://${bucket}/${destDir}/coverage-summary.json --acl public-read`;
    core.info(`Uploading coverage summary to S3: ${bucket}/${destDir}/coverage-summary.json`);
    execSync(uploadCmd, { stdio: 'inherit' });

    // Upload lcov report if it exists
    const lcovReportDir = path.resolve(path.dirname(sourcePath), 'lcov-report');
    if (fs.existsSync(lcovReportDir)) {
      const uploadLcovCmd = `aws s3 cp ${lcovReportDir} s3://${bucket}/${destDir}/lcov-report --recursive --acl public-read`;
      core.info(`Uploading lcov report to S3: ${bucket}/${destDir}/lcov-report`);
      execSync(uploadLcovCmd, { stdio: 'inherit' });
    }

    return true;
  } catch (error) {
    core.warning(`Error uploading coverage to S3: ${error.message}`);
    return false;
  }
};

/**
 * Downloads base coverage report from S3
 * @param {Object} config - S3 configuration
 * @param {string} destPath - Path to save the downloaded file
 * @returns {boolean} - Whether the download was successful
 */
export const downloadBaseReportFromS3 = (config, destPath) => {
  const {
    accessKeyId,
    secretAccessKey,
    region,
    bucket,
    baseBranch
  } = config;

  if (!accessKeyId || !secretAccessKey || !bucket || !baseBranch) {
    core.info('S3 credentials not provided, skipping download');
    return false;
  }

  try {
    // Setup AWS CLI environment
    process.env.AWS_ACCESS_KEY_ID = accessKeyId;
    process.env.AWS_SECRET_ACCESS_KEY = secretAccessKey;
    process.env.AWS_REGION = region || 'us-east-2';

    // Ensure the destination directory exists
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // Download base coverage report
    const s3Path = `s3://${bucket}/${baseBranch}/coverage-summary.json`;
    const downloadCmd = `aws s3 cp ${s3Path} ${destPath}`;
    
    core.info(`Downloading base coverage report from S3: ${s3Path}`);
    execSync(downloadCmd, { stdio: 'inherit' });
    
    return fs.existsSync(destPath);
  } catch (error) {
    core.warning(`Error downloading base coverage from S3: ${error.message}`);
    return false;
  }
}; 