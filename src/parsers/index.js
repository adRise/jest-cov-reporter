import fs from "fs";
import coberturaParser from "./cobertura";

export default (filePath, type) => {
  let parsedResult = fs.readFileSync(filePath).toString();

  switch (type) {
  case "jest":
    parsedResult = JSON.parse(parsedResult);
    break;
  case "cobertura":
    coberturaParser(parsedResult)
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
