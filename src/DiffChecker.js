const increasedCoverageIcon = ':green_circle:'
const decreasedCoverageIcon = ':red_circle:'
const newCoverageIcon = ':sparkles: :new:'
const removedCoverageIcon = ':yellow_circle:'
/**
 * DiffChecker is the simple algorithm to compare coverage
 */
export class DiffChecker {
  constructor({
    coverageReportNew,
    coverageReportOld,
    delta,
    changedFiles,
    currentDirectory,
    prefixFilenameUrl,
    prNumber
  }) {
    this.diffCoverageReport = {};
    this.delta = delta;
    this.coverageReportNew = coverageReportNew;
    this.changedFiles = changedFiles;
    this.currentDirectory = currentDirectory;
    this.prefixFilenameUrl = prefixFilenameUrl;
    this.prNumber = prNumber;
    const reportNewKeys = Object.keys(coverageReportNew)
    const reportOldKeys = Object.keys(coverageReportOld)
    const reportKeys = new Set([...reportNewKeys, ...reportOldKeys])

    /**
     * For all filePaths in coverage, generate a percentage value
     * for both base and current branch
     */
    for (const filePath of reportKeys) {
      this.diffCoverageReport[filePath] = {
        branches: {
          new: coverageReportNew[filePath] ? coverageReportNew[filePath].branches : null,
          old: coverageReportOld[filePath] ? coverageReportOld[filePath].branches : null,
          newPct: this.getPercentage(coverageReportNew[filePath] ? coverageReportNew[filePath].branches : null),
          oldPct: this.getPercentage(coverageReportOld[filePath] ? coverageReportOld[filePath].branches : null)
        },
        statements: {
          new: coverageReportNew[filePath] ? coverageReportNew[filePath].statements : null,
          old: coverageReportOld[filePath] ? coverageReportOld[filePath].statements : null,
          newPct: this.getPercentage(coverageReportNew[filePath] ? coverageReportNew[filePath].statements : null),
          oldPct: this.getPercentage(coverageReportOld[filePath] ? coverageReportOld[filePath].statements : null)
        },
        lines: {
          new: coverageReportNew[filePath] ? coverageReportNew[filePath].lines : null,
          old: coverageReportOld[filePath] ? coverageReportOld[filePath].lines : null,
          newPct: this.getPercentage(coverageReportNew[filePath] ? coverageReportNew[filePath].lines : null),
          oldPct: this.getPercentage(coverageReportOld[filePath] ? coverageReportOld[filePath].lines : null)
        },
        functions: {
          new: coverageReportNew[filePath] ? coverageReportNew[filePath].functions : null,
          old: coverageReportOld[filePath] ? coverageReportOld[filePath].functions : null,
          newPct: this.getPercentage(coverageReportNew[filePath] ? coverageReportNew[filePath].functions : null),
          oldPct: this.getPercentage(coverageReportOld[filePath] ? coverageReportOld[filePath].functions : null)
        }
      }
    }
  }

  checkOnlyChangedFiles(file) {
    file = file.replace(this.currentDirectory, '');
    if (this.changedFiles) {
      return this.changedFiles.indexOf(file) > -1;
    }

    return true;
  }

  /**
   * Create coverageDetails table
   * @param {*} diffOnly 
   * @returns 
   */
  getCoverageDetails(diffOnly) {
    const keys = Object.keys(this.diffCoverageReport)
    const decreaseStatusLines = [];
    const remainingStatusLines = [];
    for (const key of keys) {
      if (this.compareCoverageValues(this.diffCoverageReport[key]) !== 0) {
        const diffStatus = this.createDiffLine(
          key.replace(this.currentDirectory, ''),
          this.diffCoverageReport[key]
        )
        if (diffStatus.status === 'decrease' && this.checkOnlyChangedFiles(key)) {
          decreaseStatusLines.push(diffStatus.statusMessage)
        } else {
          remainingStatusLines.push(diffStatus.statusMessage)
        }
      } else {
        if (!diffOnly) {
          remainingStatusLines.push(
            `${key.replace(this.currentDirectory, '')} | ${
              this.diffCoverageReport[key].statements.newPct
            } | ${this.diffCoverageReport[key].branches.newPct} | ${
              this.diffCoverageReport[key].functions.newPct
            } | ${this.diffCoverageReport[key].lines.newPct}`
          )
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
    let lineChangesPct = diffCoverageReport.lines.newPct - diffCoverageReport.lines.oldPct;
    lineChangesPct = Math.round((lineChangesPct + Number.EPSILON) * 100) / 100;
    return {
      lineChangesPct,
      linesCovered: this.coverageReportNew['total'].lines.covered,
      linesTotal: this.coverageReportNew['total'].lines.total,
      linesTotalPct: this.coverageReportNew['total'].lines.pct
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

  isDueToRemovedLines(diffCoverageData) {
    const newCoverage = diffCoverageData.new;
    const oldCoverage = diffCoverageData.old;
    if (!oldCoverage || !newCoverage) return false;

    return newCoverage.covered - oldCoverage.covered < 0 && 
      (oldCoverage.covered - newCoverage.covered === oldCoverage.total - newCoverage.total)
  }

  /**
   * Create the table row for the file with higher/lower coverage compared to base branch
   * @param {*} name 
   * @param {*} diffFileCoverageData 
   * @returns 
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

    const fileNameUrl = this.prefixFilenameUrl !== '' ? `[${name}](${this.prefixFilenameUrl}/${this.prNumber}/lcov-report/${name}})` : name;
    if (fileNewCoverage) {
      return {
        status: 'new',
        statusMessage: ` ${newCoverageIcon} | **${fileNameUrl}** | **${diffFileCoverageData.statements.newPct}** | **${diffFileCoverageData.branches.newPct}** | **${diffFileCoverageData.functions.newPct}** | **${diffFileCoverageData.lines.newPct}**`
      }
    } else if (fileRemovedCoverage) {
      return {
        status: 'removed',
        statusMessage: ` ${removedCoverageIcon} | ~~${fileNameUrl}~~ | ~~${diffFileCoverageData.statements.oldPct}~~ | ~~${diffFileCoverageData.branches.oldPct}~~ | ~~${diffFileCoverageData.functions.oldPct}~~ | ~~${diffFileCoverageData.lines.oldPct}~~`
      }
    }
    // Coverage existed before so calculate the diff status
    const statusIcon = this.getStatusIcon(diffFileCoverageData)
    return {
      status: statusIcon === increasedCoverageIcon ? 'increase' : 'decrease',
      statusMessage: ` ${statusIcon} | ${fileNameUrl} | ${
        diffFileCoverageData.statements.newPct
      } **(${this.getPercentageDiff(diffFileCoverageData.statements)})** | ${
        diffFileCoverageData.branches.newPct
      } **(${this.getPercentageDiff(diffFileCoverageData.branches)})** | ${
        diffFileCoverageData.functions.newPct
      } **(${this.getPercentageDiff(diffFileCoverageData.functions)})** | ${
        diffFileCoverageData.lines.newPct
      } **(${this.getPercentageDiff(diffFileCoverageData.lines)})**`
    }
  }

  compareCoverageValues(
    diffCoverageData
  ) {
    const keys = Object.keys(diffCoverageData)
    for (const key of keys) {
      if (diffCoverageData[key].oldPct !== diffCoverageData[key].newPct && !this.isDueToRemovedLines(diffCoverageData[key])) {
        return 1
      }
    }
    return 0
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