import fs from "fs";
import coberturaParser from "./cobertura";

export default (filePath, type) => {
  let parsedResult = fs.readFileSync(filePath).toString();

  switch (type) {
  case "jest":
    parsedResult = JSON.parse(parsedResult);
    break;
  case "cobertura":
    parsedResult = coberturaParser(parsedResult)
    break;
  default:
    break;
  }

  return parsedResult;
};
