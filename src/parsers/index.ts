import fs from 'fs';
import { CoverageReport } from '../types';
import { CoberturaParser } from './cobertura';
import { JestParser } from './jest';
import { CoverageReportParser, CoverageReportParserFactory } from './types';

/**
 * Factory for creating coverage report parsers
 */
class CoverageParserFactory implements CoverageReportParserFactory {
  /**
   * Create a parser for the specified coverage type
   * @param type - Coverage type ('jest' or 'cobertura')
   * @returns Coverage report parser
   */
  createParser(type: string): CoverageReportParser {
    switch (type) {
      case 'jest':
        return new JestParser();
      case 'cobertura':
        return new CoberturaParser();
      default:
        throw new Error(`Unsupported coverage type: ${type}`);
    }
  }
}

/**
 * Parse coverage report from a file path or content string
 * @param pathOrContent - Path to coverage report file or content string
 * @param type - Type of coverage report ('jest' or 'cobertura')
 * @returns Parsed coverage report
 */
export default function parseContent(pathOrContent: string, type: string): CoverageReport {
  let content: string;
  
  try {
    // Check if the input is a file path and if the file exists
    if (fs.existsSync(pathOrContent) && fs.statSync(pathOrContent).isFile()) {
      // If it's a file path, read the file content
      content = fs.readFileSync(pathOrContent).toString();
    } else {
      // Otherwise, assume it's already the content
      content = pathOrContent;
    }
  } catch (error) {
    // If there's an error checking or reading the file, assume it's content
    content = pathOrContent;
  }
  
  const factory = new CoverageParserFactory();
  const parser = factory.createParser(type);
  
  return parser.parse(content);
} 