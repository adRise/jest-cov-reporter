import { parseString } from 'xml2js';

const percentage = (covered, total) => {
  return total ? Number((covered / total * 100).toFixed(2)) : 100;
};

const classesFromPackages = (packages) => {
  let classes = [];

  packages.forEach((packages) => {
    packages.package.forEach((pack) => {
      pack.classes.forEach((c) => {
        classes = classes.concat(c.class);
      });
    });
  });

  return classes;
};

const unpackage = (packages) => {
  const classes = classesFromPackages(packages);
  const coverageType = ['lines', 'functions', 'branches', 'statements'];
  const coverageDetails = ['total', 'covered', 'skipped', 'pct'];
  const coverageSummary = {};

  // initial package total coverage with 0
  coverageSummary.total = {};
  coverageType.forEach(type => {
    coverageSummary.total[type] = {};
    coverageDetails.forEach(detail => {
      coverageSummary.total[type][detail] = 0;
    });
  });

  // calculate coverage of each class in this package
  classes.forEach((c) => {
    const className = c.$.name;

    // initial class coverage with 0
    coverageSummary[className] = {};
    coverageType.forEach(type => {
      coverageSummary[className][type] = {};
      coverageDetails.forEach(detail => {
        coverageSummary[className][type][detail] = 0;
      });
    });

    let lineEnd = 0;
    const skippedLine = [];
    c.lines && c.lines[0].line && c.lines[0].line.forEach((l) => {
      // calculate statements coverage
      coverageSummary[className].statements.total ++;
      if (l.$.hits === '1') {
        coverageSummary[className].statements.covered ++;
      } else {
        coverageSummary[className].statements.skipped ++;
        if (!skippedLine.includes(Number(l.$.number))) {
          skippedLine.push(Number(l.$.number));
        }
      }

      // calculate branches coverage
      if (l.$.branch === 'true') {
        coverageSummary[className].branches.total ++;
        if (l.$.hits === '1') {
          coverageSummary[className].branches.covered ++;
        } else {
          coverageSummary[className].branches.skipped ++;
        }
      }

      if (lineEnd < Number(l.$.number)) lineEnd = Number(l.$.number);
    });

    // calculate lines coverage
    coverageSummary[className].lines.total = lineEnd;
    coverageSummary[className].lines.skipped = skippedLine.length;
    coverageSummary[className].lines.covered = coverageSummary[className].lines.total - coverageSummary[className].lines.skipped;

    c.methods && c.methods[0].method && c.methods[0].method.forEach((m) => {
      // calculate functions coverage
      coverageSummary[className].functions.total ++;
      if (Number(m.$['line-rate']) + Number(m.$['branch-rate']) > 0) {
        coverageSummary[className].functions.covered ++;
      } else {
        coverageSummary[className].functions.skipped ++;
      }
    })

    // calculate package total coverage
    coverageType.forEach(type => {
      coverageDetails.forEach((detail) => {
        coverageSummary.total[type][detail] += coverageSummary[className][type][detail];
      });
      coverageSummary[className][type].pct = percentage(coverageSummary[className][type].covered, coverageSummary[className][type].total);
      coverageSummary.total[type].pct = percentage(coverageSummary.total[type].covered, coverageSummary.total[type].total);
    });
  });

  return coverageSummary;
};

export const coberturaParseContent = (xmlString) => {
  return new Promise((resolve, reject) => {
    parseString(xmlString, (err, parseResult) => {
      if (err) {
        reject(err);
      }
      resolve(unpackage(parseResult.coverage.packages));
    });
  });
};
