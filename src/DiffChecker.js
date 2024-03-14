const increasedCoverageIcon = ':green_circle:'
const decreasedCoverageIcon = ':red_circle:'
const newCoverageIcon = ':new:'
const removedCoverageIcon = ':yellow_circle:'
const sparkleIcon = ':sparkles:'
/**
 * DiffChecker is the simple algorithm to compare coverage
 */
export class DiffChecker {
  constructor({
    changedFiles,
    addedFiles,
    coverageReportNew,
    coverageReportOld,
    currentDirectory,
    checkNewFileFullCoverage,
    delta,
    prefixFilenameUrl,
    prNumber,
    coverageType,
  }) {
    this.diffCoverageReport = {};
    this.delta = delta;
    this.coverageReportNew = coverageReportNew;
    this.changedFiles = changedFiles;
    this.addedFiles = addedFiles;
    this.currentDirectory = currentDirectory;
    this.prefixFilenameUrl = prefixFilenameUrl;
    this.prNumber = prNumber;
    this.checkNewFileFullCoverage = checkNewFileFullCoverage;
    this.coverageType = coverageType;
    const reportNewKeys = Object.keys(coverageReportNew);
    const reportOldKeys = Object.keys(coverageReportOld);
    const reportKeys = new Set([...reportNewKeys, ...reportOldKeys]);

    /**
     * For all filePaths in coverage, generate a percentage value
     * for both base and current branch
     */
    for (const filePath of reportKeys) {
      const newCoverage = coverageReportNew[filePath] || {};
      const oldCoverage = coverageReportOld[filePath] || {};
      const metricsNewKeys = Object.keys(newCoverage);
      const metricsOldKeys = Object.keys(oldCoverage);
      const metricsKeys = new Set([...metricsNewKeys, ...metricsOldKeys]);
      console.log(filePath)
      this.diffCoverageReport[filePath] = {};
      for (const metric of metricsKeys) {
        this.diffCoverageReport[filePath][metric] = typeof newCoverage[metric] === 'object' 
          ? {
            new: newCoverage[metric],
            old: oldCoverage[metric],
            newPct: this.getPercentage(newCoverage[metric]),
            oldPct: this.getPercentage(oldCoverage[metric]),
          } 
          : newCoverage[metric];
      }
    }
  }

  checkOnlyChangedFiles(file) {
    file = file.replace(this.currentDirectory, '');
    if (this.changedFiles) {
      if (this.coverageType === 'cobertura') {
        const filename = this.diffCoverageReport[file].filename;
        return this.changedFiles.some(filePath => filePath.includes(filename));
      }
      return this.changedFiles.indexOf(file.substring(1)) > -1;
    }

    return true;
  }

  checkOnlyAddedFiles(file) {
    file = file.replace(this.currentDirectory, '');
    if (this.addedFiles) {
      if (this.coverageType === 'cobertura') {
        const filename = this.diffCoverageReport[file].filename;
        return this.addedFiles.some(filePath => filePath.includes(filename));
      }
      return this.addedFiles.indexOf(file.substring(1)) > -1;
    }

    return true;
  }

  /**
   * Create coverageDetails table
   */
  getCoverageDetails(diffOnly) {
    const keys = Object.keys(this.diffCoverageReport)
    const decreaseStatusLines = [];
    const remainingStatusLines = [];
    for (const key of keys) {
      if (this.compareCoverageValues(key) !== 0) {
        const diffStatus = this.createDiffLine(
          key.replace(this.currentDirectory, ''),
          this.diffCoverageReport[key]
        )
        if (
          (diffStatus.status === 'decrease' && this.checkOnlyChangedFiles(key)) ||
          (this.checkNewFileFullCoverage &&
            diffStatus.status === 'new' &&
            diffStatus.statusMessage.includes(decreasedCoverageIcon))
        ) {
          decreaseStatusLines.push(diffStatus.statusMessage);
        } else {
          remainingStatusLines.push(diffStatus.statusMessage);
        }
      } else {
        if (!diffOnly) {
          const diffFileCoverageData = this.diffCoverageReport[key];
          const metrics = Object.keys(diffFileCoverageData);
          let statusMessage = ` ${key.replace(this.currentDirectory, '')} `;
          metrics.forEach(metric => {
            if ('newPct' in diffFileCoverageData[metric]) {
              statusMessage += `| ${this.diffFileCoverageData[metric].newPct} `;
            }
          });
          remainingStatusLines.push(statusMessage);
        }
      }
    }
    return {
      totalCoverageLines: this.getTotalCoverageReport(this.diffCoverageReport['total']),
      decreaseStatusLines,
      remainingStatusLines,
    }
  }

  getTotalCoverageReport(diffCoverageReport) {
    const summaryMetric = this.coverageType === 'cobertura' ? 'statements' : 'lines';
    let changesPct = diffCoverageReport[summaryMetric].newPct - diffCoverageReport[summaryMetric].oldPct;
    changesPct = Math.round((changesPct + Number.EPSILON) * 100) / 100;
    return {
      changesPct,
      covered: this.coverageReportNew['total'][summaryMetric].covered,
      total: this.coverageReportNew['total'][summaryMetric].total,
      totalPct: this.coverageReportNew['total'][summaryMetric].pct,
      summaryMetric,
    }
  }

  /**
   * Function to check if the file's coverage is below delta
   * @param {*} delta
   * @returns
   */
  checkIfTestCoverageFallsBelowDelta(delta) {
    const keys = Object.keys(this.diffCoverageReport)
    for (const fileName of keys) {
      const diffCoverageData = this.diffCoverageReport[fileName]
      const keys = Object.keys(diffCoverageData)
      // No new coverage found so that means we deleted a file coverage
      const fileRemovedCoverage = Object.values(diffCoverageData).every(
        coverageData => coverageData.newPct === 0
      )
      if (fileRemovedCoverage) {
        // since the file is deleted don't include in delta calculation
        continue
      }
      for (const key of keys) {
        if (diffCoverageData[key].oldPct !== diffCoverageData[key].newPct) {
          if (-this.getPercentageDiff(diffCoverageData[key]) > delta
            && !this.isDueToRemovedLines(diffCoverageData[key])) {
            // Check only changed files
            if (this.checkOnlyChangedFiles(fileName)) {
              return true
            }
          }
        }
      }
    }

    return false
  }

  /**
   * Function to check if any newly added file does not have full coverage
   */
  checkIfNewFileNotFullCoverage() {
    if (!this.checkNewFileFullCoverage) return false
    const keys = Object.keys(this.diffCoverageReport);
    return keys.some((key) => {
      const diffCoverageData = this.diffCoverageReport[key];
      const coverageParts = Object.values(diffCoverageData);
      // No old coverage found so that means we added a new file
      const newFileCoverage = coverageParts.every((coverageData) => coverageData.oldPct === 0);
      return newFileCoverage && this.checkIfNewFileLacksFullCoverage(coverageParts) && this.checkOnlyAddedFiles(key);
    });
  }

  
  /**
   * Function to check whether any part does not have full coverage
   * @param  {} coverageParts
   * @returns  {boolean}
   */
  checkIfNewFileLacksFullCoverage(coverageParts) {
    return coverageParts.some((coverageData) => coverageData.newPct < 100);
  }

  isDueToRemovedLines(diffCoverageData) {
    const newCoverage = diffCoverageData.new;
    const oldCoverage = diffCoverageData.old;
    if (!oldCoverage || !newCoverage) return false;

    return newCoverage.covered < oldCoverage.covered &&
      (oldCoverage.covered - newCoverage.covered <= oldCoverage.total - newCoverage.total)
  }

  getFileNameUrl(name) {
    if (this.prefixFilenameUrl === '') return name;

    switch (this.coverageType) {
    case 'jest':
      return `[${name}](${this.prefixFilenameUrl}/${this.prNumber}/lcov-report/${name === 'total' ? 'index' : name.substring(1)}.html)`;
    case 'cobertura':
      return `[${name}](${this.prefixFilenameUrl}/${this.prNumber}/current/${name === 'total' ? 'index' : name.replace(/\./g, '/') + '.scala'}.html)`;
    default:
      return name;
    }

  }

  /**
   * Create the table row for the file with higher/lower coverage compared to base branch
   */
  createDiffLine(
    name,
    diffFileCoverageData
  ) {
    // No old coverage found so that means we added a new file coverage
    const fileNewCoverage = Object.values(diffFileCoverageData).every(
      coverageData => coverageData.oldPct === 0
    )
    // No new coverage found so that means we deleted a file coverage
    const fileRemovedCoverage = Object.values(diffFileCoverageData).every(
      coverageData => coverageData.newPct === 0
    )

    const metrics = Object.keys(diffFileCoverageData);

    const fileNameUrl = this.getFileNameUrl(name);
    if (fileNewCoverage) {
      let newCoverageStatusIcon = `${sparkleIcon} ${newCoverageIcon}`
      if (this.checkNewFileFullCoverage) {
        if (
          this.checkIfNewFileLacksFullCoverage(Object.values(diffFileCoverageData)) &&
          this.checkOnlyAddedFiles(name)
        ) {
          newCoverageStatusIcon = `${decreasedCoverageIcon} ${newCoverageIcon}`;
        } else {
          newCoverageStatusIcon = `${increasedCoverageIcon} ${newCoverageIcon}`;
        }
      }
      let statusMessage = ` ${newCoverageStatusIcon} | **${fileNameUrl}** `;
      metrics.forEach(metric => {
        if ('newPct' in diffFileCoverageData[metric]) {
          statusMessage += `| **${diffFileCoverageData[metric].newPct}** `;
        }
      });
      return {
        status: 'new',
        statusMessage,
      };
    } else if (fileRemovedCoverage) {
      let statusMessage =  ` ${removedCoverageIcon} | ~~${fileNameUrl}~~ `;
      metrics.forEach(metric => {
        if ('oldPct' in diffFileCoverageData[metric]) {
          statusMessage += `| ~~${diffFileCoverageData[metric].oldPct}~~ `;
        }
      });
      return {
        status: 'removed',
        statusMessage,
      }
    }
    // Coverage existed before so calculate the diff status
    const statusIcon = this.getStatusIcon(diffFileCoverageData)
    let statusMessage = ` ${statusIcon} | ${fileNameUrl} `;
    metrics.forEach(metric => {
      if ('newPct' in diffFileCoverageData[metric]) {
        statusMessage += `| ${diffFileCoverageData[metric].newPct} **(${this.getPercentageDiff(diffFileCoverageData[metric])})** `;
      }
    });
    return {
      status: statusIcon === increasedCoverageIcon ? 'increase' : 'decrease',
      statusMessage,
    }
  }

  compareCoverageValues(
    file
  ) {
    const values = Object.values(this.diffCoverageReport[file]);
    const noOldCoverage = values.every((part) => part.oldPct === 0);
    const noNewCoverage = values.every((part) => part.newPct === 0);
    const newFileWithoutCoverage = noOldCoverage && noNewCoverage && this.checkOnlyAddedFiles(file);
    const fileCoverageChanged = values.some((part) => part.oldPct !== part.newPct && !this.isDueToRemovedLines(part));

    if (newFileWithoutCoverage || fileCoverageChanged) {
      return 1;
    }

    return 0;
  }

  getPercentage(coverageData) {
    return coverageData ? coverageData.pct : 0
  }

  /**
   * Show red/green status icon for each file
   * @param {*} diffFileCoverageData
   * @returns
   */
  getStatusIcon(
    diffFileCoverageData
  ) {
    let coverageIcon = increasedCoverageIcon;
    const parts = Object.values(diffFileCoverageData);
    for (let i = 0; i < parts.length; i++) {
      const coverageData = parts[i];
      const percDiff = this.getPercentageDiff(coverageData);
      if (percDiff < 0 && Math.abs(percDiff) > this.delta) {
        coverageIcon = decreasedCoverageIcon;
        break;
      }
    }
    return coverageIcon;
  }

  /**
   * Get % diff for base vs current branch
   * @param {*} diffData
   * @returns
   */
  getPercentageDiff(diffData) {
    const diff = Number(diffData.newPct) - Number(diffData.oldPct)
    // round off the diff to 2 decimal places
    return Math.round((diff + Number.EPSILON) * 100) / 100
  }
}