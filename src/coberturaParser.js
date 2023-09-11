import { parseString } from 'xml2js';

const percentage = (covered, total) => {
  return total ? Number((covered / total * 100).toFixed(2)) : 0;
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

  console.log('classes: ', JSON.stringify(classes));
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
      if (l.$.hits) {
        coverageSummary[c.$.name].statements.covered ++;
      }

      if (l.$.branch) {
        coverageSummary[c.$.name].branch.total ++;
        if (l.$.hits) {
          coverageSummary[c.$.name].branch.covered ++;
        }
      }
    });
    c.methods && c.methods[0].method && c.methods[0].method.forEach((m) => {
      coverageSummary[c.$.name].functions.total ++;
      if (m.$.hits) {
        coverageSummary[c.$.name].functions.covered ++;
      }
    })
    coverageType.forEach(type => {
      coverageDetails.forEach((detail) => {
        coverageSummary.total[type][detail] += coverageSummary[c.$.name][type][detail];
      });
      coverageSummary.total[type].pct = percentage(coverageSummary.total[type].covered, coverageSummary.total[type].total);
      coverageSummary[c.$.name][type].pct = percentage(coverageSummary[c.$.name][type].covered, coverageSummary[c.$.name][type].total);
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
