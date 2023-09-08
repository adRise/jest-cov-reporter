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

  return classes;
};

const unpackage = (packages) => {
  const classes = classesFromPackages(packages);

  return classes.map((c) => {
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

    classCov.functions.hit = classCov.functions.details.reduce((acc, val) => {
      return acc + (val.hit > 0 ? 1 : 0);
    }, 0);

    classCov.lines.hit = classCov.lines.details.reduce((acc, val) => {
      return acc + (val.hit > 0 ? 1 : 0);
    }, 0);

    return classCov;
  });
};

export const coberturaParseContent = (xmlString) => {
  return new Promise((resolve, reject) => {
    parseString(xmlString, (err, parseResult) => {
      if (err) {
        reject(err);
      }
      console.log('parseString: ', parseResult);
      resolve(unpackage(parseResult.coverage.packages));
    });
  });
};
