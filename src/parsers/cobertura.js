import { parseString } from 'xml2js';

const coverageType = ['functions', 'branches', 'statements'];
const coverageDetails = ['total', 'covered', 'skipped', 'pct'];

const percentage = (covered, total) => {
  return total ? Number((covered / total * 100).toFixed(2)) : 100;
};

const initialCoverageWithZero = (coverageSummary, name) => {
  coverageSummary[name] = {};
  coverageType.forEach(type => {
    coverageSummary[name][type] = {};
    coverageDetails.forEach(detail => {
      coverageSummary[name][type][detail] = 0;
    });
  });
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
  const coverageSummary = {};
  const packageName = 'total';
  initialCoverageWithZero(coverageSummary, packageName);

  // calculate coverage of each class in this package
  classes.forEach((c) => {
    const className = c.$.name;
    initialCoverageWithZero(coverageSummary, className);

    c.lines && c.lines[0].line && c.lines[0].line.forEach((l) => {
      // calculate statements coverage
      coverageSummary[className].statements.total ++;
      if (l.$.hits !== '0') {
        coverageSummary[className].statements.covered ++;
      } else {
        coverageSummary[className].statements.skipped ++;
      }

      // calculate branches coverage
      if (l.$.branch === 'true') {
        coverageSummary[className].branches.total ++;
        if (l.$.hits !== '0') {
          coverageSummary[className].branches.covered ++;
        } else {
          coverageSummary[className].branches.skipped ++;
        }
      }
    });

    c.methods && c.methods[0].method && c.methods[0].method.forEach((m) => {
      // calculate functions coverage
      coverageSummary[className].functions.total ++;
      if (Number(m.$['line-rate']) + Number(m.$['branch-rate']) > 0) {
        coverageSummary[className].functions.covered ++;
      } else {
        coverageSummary[className].functions.skipped ++;
      }
    })

    // accumulate package total coverage
    coverageType.forEach(type => {
      coverageDetails.forEach((detail) => {
        coverageSummary[packageName][type][detail] += coverageSummary[className][type][detail];
      });
      coverageSummary[className][type].pct = percentage(coverageSummary[className][type].covered, coverageSummary[className][type].total);
      coverageSummary[packageName][type].pct = percentage(coverageSummary[packageName][type].covered, coverageSummary[packageName][type].total);
    });

    coverageSummary[className].filename = c.$['filename'];
  });

  return coverageSummary;
};

export default (xmlString) => {
  let result = {};
  parseString(xmlString, (err, parseResult) => {
    if (err) {
      console.error('Error encountered during Cobertura parsing: ', err);
    } else {
      result = unpackage(parseResult.coverage.packages);
    }
  });
  return result;
};
