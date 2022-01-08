const fs = require('fs');
  
export const parseCoverageFile = (path) => {
    const data = fs.readFileSync(path, {encoding:'utf8', flag:'r'});
    return data;
}