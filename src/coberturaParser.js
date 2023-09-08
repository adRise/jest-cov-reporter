import { parseString } from 'xml2js';

const classesFromPackages = (packages) => {
  let classes = [];

  packages.forEach((packages) => {
    packages.package.forEach((pack) => {
      pack.classes.forEach((c) => {
        classes = classes.concat(c.class);
      });
    });
  });

  console.log('classes: ', classes);
  return classes;
};

const unpackage = (packages) => {
  const classes = classesFromPackages(packages);
  const summary = {};

  classes.forEach((c) => {
    const linesCovered = !c.lines || !c.lines[0].line ? [] : c.lines[0].line.map((l) => {
      return {
        line: Number(l.$.number),
        hit: Number(l.$.hits)
      };
    }).reduce((acc, val) => {
      return acc + (val.hit > 0 ? 1 : 0);
    }, 0);
    const linesTotal = c.lines && c.lines[0].line ? c.lines[0].line.length : 0;

    const functionsCovered = !c.methods || !c.methods[0].method ? [] : c.methods[0].method.map((m) => {
      return {
        name: m.$.name,
        line: Number(m.lines[0].line[0].$.number),
        hit: Number(m.lines[0].line[0].$.hits)
      };
    }).reduce((acc, val) => {
      return acc + (val.hit > 0 ? 1 : 0);
    }, 0);
    const functionsTotal = c.methods && c.methods[0].method ? c.methods[0].method.length : 0;

    summary[c.$.name] = {
      lines: {
        total: linesTotal,
        covered: linesCovered,
        skipped: linesTotal - linesCovered,
        pct: linesCovered/linesTotal,
      },
      functions: {
        total: functionsTotal,
        covered: functionsCovered,
        skipped: functionsTotal - functionsCovered,
        pct: functionsCovered/functionsTotal,
      }
    }
    const classCov = {
      title: c.$.name,
      file: c.$.filename,
      functions: {
        found: c.methods && c.methods[ 0 ].method ? c.methods[ 0 ].method.length : 0,
        hit: 0,
        details: !c.methods || !c.methods[ 0 ].method ? [] : c.methods[ 0 ].method.map((m) => {
          return {
            name: m.$.name,
            line: Number(m.lines[ 0 ].line[ 0 ].$.number),
            hit: Number(m.lines[ 0 ].line[ 0 ].$.hits)
          };
        })
      },
      lines: {
        found: c.lines && c.lines[ 0 ].line ? c.lines[ 0 ].line.length : 0,
        hit: 0,
        details: !c.lines || !c.lines[ 0 ].line ? [] : c.lines[ 0 ].line.map((l) => {
          return {
            line: Number(l.$.number),
            hit: Number(l.$.hits)
          };
        })
      }
    };

    return classCov;
  });

  return summary;
};

export const coberturaParseContent = (xmlString) => {
  return new Promise((resolve, reject) => {
    parseString(xmlString, (err, parseResult) => {
      if (err) {
        reject(err);
      }
      console.log('parseString: ', parseResult.toString());
      resolve(unpackage(parseResult.coverage.packages));
    });
  });
};
