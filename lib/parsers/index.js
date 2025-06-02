import fs from 'fs';
import { CoberturaParser } from './cobertura';
import { JestParser } from './jest';
/**
 * Factory for creating coverage report parsers
 */
class CoverageParserFactory {
    /**
     * Create a parser for the specified coverage type
     * @param type - Coverage type ('jest' or 'cobertura')
     * @returns Coverage report parser
     */
    createParser(type) {
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
 * Parse coverage report from a file
 * @param filePath - Path to coverage report file
 * @param type - Type of coverage report ('jest' or 'cobertura')
 * @returns Parsed coverage report
 */
export default function parseContent(filePath, type) {
    const content = fs.readFileSync(filePath).toString();
    const factory = new CoverageParserFactory();
    const parser = factory.createParser(type);
    return parser.parse(content);
}
