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
  coverageSummary.total = {};
  coverageType.forEach(type => {
    coverageSummary.total[type] = {};
    coverageDetails.forEach(detail => {
      coverageSummary.total[type][detail] = 0;
    });
  });

  classes.forEach((c) => {
    coverageSummary[c.$.name] = {};
    coverageType.forEach(type => {
      coverageSummary[c.$.name][type] = {};
      coverageDetails.forEach(detail => {
        coverageSummary[c.$.name][type][detail] = 0;
      });
    });

    c.lines && c.lines[0].line && c.lines[0].line.forEach((l) => {
      coverageSummary[c.$.name].statements.total ++;
      if (l.$.hits === '1') {
        coverageSummary[c.$.name].statements.covered ++;
      }

      if (l.$.branch === 'true') {
        coverageSummary[c.$.name].branches.total ++;
        if (l.$.hits === '1') {
          coverageSummary[c.$.name].branches.covered ++;
        }
      }
    });
    c.methods && c.methods[0].method && c.methods[0].method.forEach((m) => {
      coverageSummary[c.$.name].functions.total ++;
      if (Number(m.$['line-rate']) + Number(m.$['branch-rate']) > 0) {
        coverageSummary[c.$.name].functions.covered ++;
      }
    })
    coverageType.forEach(type => {
      coverageSummary[c.$.name][type].pct = percentage(coverageSummary[c.$.name][type].covered, coverageSummary[c.$.name][type].total);
      coverageSummary[c.$.name][type].skipped = coverageSummary[c.$.name][type].total - coverageSummary[c.$.name][type].covered;
      coverageDetails.forEach((detail) => {
        coverageSummary.total[type][detail] += coverageSummary[c.$.name][type][detail];
      });
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
