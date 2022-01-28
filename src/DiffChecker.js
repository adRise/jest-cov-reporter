const increasedCoverageIcon = ':green_circle:'
const decreasedCoverageIcon = ':red_circle:'
const newCoverageIcon = ':sparkles: :new:'
const removedCoverageIcon = ':yellow_circle:'
/**
 * DiffChecker is the simple algorithm to compare coverage
 */
export class DiffChecker {
  constructor(
    coverageReportNew,
    coverageReportOld,
    delta
  ) {
    this.diffCoverageReport = {};
    this.delta = delta;
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
          newPct: this.getPercentage(coverageReportNew[filePath] ? coverageReportNew[filePath].branches : null),
          oldPct: this.getPercentage(coverageReportOld[filePath] ? coverageReportOld[filePath].branches : null)
        },
        statements: {
          newPct: this.getPercentage(coverageReportNew[filePath] ? coverageReportNew[filePath].statements : null),
          oldPct: this.getPercentage(coverageReportOld[filePath] ? coverageReportOld[filePath].statements : null)
        },
        lines: {
          newPct: this.getPercentage(coverageReportNew[filePath] ? coverageReportNew[filePath].lines : null),
          oldPct: this.getPercentage(coverageReportOld[filePath] ? coverageReportOld[filePath].lines : null)
        },
        functions: {
          newPct: this.getPercentage(coverageReportNew[filePath] ? coverageReportNew[filePath].functions : null),
          oldPct: this.getPercentage(coverageReportOld[filePath] ? coverageReportOld[filePath].functions : null)
        }
      }
    }
  }

  /**
   * Create coverageDetails table
   * @param {*} diffOnly 
   * @param {*} currentDirectory 
   * @returns 
   */
  getCoverageDetails(diffOnly, currentDirectory) {
    const keys = Object.keys(this.diffCoverageReport)
    const decreaseStatusLines = [];
    const remainingStatusLines = [];
    for (const key of keys) {
      if (this.compareCoverageValues(this.diffCoverageReport[key]) !== 0) {
        const diffStatus = this.createDiffLine(
          key.replace(currentDirectory, ''),
          this.diffCoverageReport[key]
        )
        if (diffStatus.status === 'decrease') {
          decreaseStatusLines.push(diffStatus.statusMessage)
        } else {
          remainingStatusLines.push(diffStatus.statusMessage)
        }
      } else {
        if (!diffOnly) {
          remainingStatusLines.push(
            `${key.replace(currentDirectory, '')} | ${
              this.diffCoverageReport[key].statements.newPct
            } | ${this.diffCoverageReport[key].branches.newPct} | ${
              this.diffCoverageReport[key].functions.newPct
            } | ${this.diffCoverageReport[key].lines.newPct}`
          )
        }
      }
    }
    return {
      decreaseStatusLines,
      remainingStatusLines,
    }
  }

  /**
   * Function to check if the file's coverage is below delta
   * @param {*} delta 
   * @returns 
   */
  checkIfTestCoverageFallsBelowDelta(delta) {
    const keys = Object.keys(this.diffCoverageReport)
    for (const key of keys) {
      const diffCoverageData = this.diffCoverageReport[key]
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
          if (-this.getPercentageDiff(diffCoverageData[key]) > delta) {
            return true
          }
        }
      }
    }

    return false
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
    console.log('diffFileCoverageData', diffFileCoverageData)
    // No old coverage found so that means we added a new file coverage
    const fileNewCoverage = Object.values(diffFileCoverageData).every(
      coverageData => coverageData.oldPct === 0
    )
    // No new coverage found so that means we deleted a file coverage
    const fileRemovedCoverage = Object.values(diffFileCoverageData).every(
      coverageData => coverageData.newPct === 0
    )
    if (fileNewCoverage) {
      return {
        status: 'new',
        statusMessage: ` ${newCoverageIcon} | **${name}** | **${diffFileCoverageData.statements.newPct}** | **${diffFileCoverageData.branches.newPct}** | **${diffFileCoverageData.functions.newPct}** | **${diffFileCoverageData.lines.newPct}**`
      }
    } else if (fileRemovedCoverage) {
      return {
        status: 'removed',
        statusMessage: ` ${removedCoverageIcon} | ~~${name}~~ | ~~${diffFileCoverageData.statements.oldPct}~~ | ~~${diffFileCoverageData.branches.oldPct}~~ | ~~${diffFileCoverageData.functions.oldPct}~~ | ~~${diffFileCoverageData.lines.oldPct}~~`
      }
    }
    // Coverage existed before so calculate the diff status
    const statusIcon = this.getStatusIcon(diffFileCoverageData)

    return {
      status: statusIcon === increasedCoverageIcon ? 'increase' : 'decrease',
      statusMessage: ` ${statusIcon} | ${name} | ${
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
      if (diffCoverageData[key].oldPct !== diffCoverageData[key].newPct) {
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
    // let overallDiff = 0
    // Object.values(diffFileCoverageData).forEach(coverageData => {
    //   console.log('this.getPercentageDiff(coverageData)', this.getPercentageDiff(coverageData))
    //   overallDiff = overallDiff + this.getPercentageDiff(coverageData)
    // })
    // if (overallDiff < 0) {
    //   return decreasedCoverageIcon
    // }
    // return increasedCoverageIcon
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