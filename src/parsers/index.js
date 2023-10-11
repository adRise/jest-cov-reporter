import fs from "fs";
import coberturaParser from "./cobertura";

export default (filePath, type) => {
  let parsedResult;

  switch (type) {
  case "jest":
    parsedResult = JSON.parse(fs.readFileSync(filePath).toString());
    break;
  case "cobertura":
    coberturaParser(fs.readFileSync(filePath).toString())
      .then((result) => {
        parsedResult = result;
      })
      .catch((err) => {
        console.error(err);
      });
    break;
  default:
    break;
  }

  return parsedResult;
};
