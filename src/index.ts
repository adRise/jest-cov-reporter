import * as core from '@actions/core';
import { ConfigService } from './services/config-service';
import { CoverageService } from './services/coverage-service';
import { ReportService } from './services/report-service';

/**
 * Main function that runs the coverage reporter
 */
async function main(): Promise<void> {
  try {
    // 1. Load and validate configuration
    const config = ConfigService.loadConfig();
    if (!ConfigService.validateConfig(config)) {
      return;
    }
    
    // 2. Set up services
    const coverageService = new CoverageService(config);
    const reportService = new ReportService(config);
    
    // 3. Prepare coverage reports (download from S3 if needed)
    const reportPaths = await coverageService.prepareCoverageReports();
    if (!reportPaths) {
      return;
    }
    
    // Extract paths and handle custom message if needed
    const { basePath, branchPath, newCustomMessage } = reportPaths as any;
    if (newCustomMessage) {
      config.customMessage = newCustomMessage;
    }
    
    // 4. Parse coverage reports
    const parsedReports = coverageService.parseCoverageReports(basePath, branchPath);
    if (!parsedReports) {
      return;
    }
    
    const { baseCoverage, branchCoverage, currentDirectory } = parsedReports;
    
    // 5. Get changed files from GitHub PR
    const { changedFiles, addedFiles } = await coverageService.getChangedFiles();
    
    // 6. Check if we should enforce full coverage for new files
    const checkNewFileFullCoverage = await coverageService.shouldEnforceFullCoverage();
    
    // 7. Process the coverage data and generate a report
    const { report, success } = await reportService.processReport({
      baseCoverage,
      branchCoverage,
      currentDirectory,
      changedFiles,
      addedFiles,
      checkNewFileFullCoverage
    });
    
    // 8. Post the report to GitHub PR or console
    await reportService.postReport(report);
    
    // 9. Set action status based on coverage result
    if (!success) {
      core.setFailed('Coverage failed to meet the threshold requirements.');
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('An unknown error occurred');
    }
  }
}

// Run the action
main(); 