/**
 * Parser for Jest coverage reports
 */
export class JestParser {
    /**
     * Parse Jest coverage report
     * @param content - JSON content from Jest coverage report
     * @returns Parsed coverage report
     */
    parse(content) {
        return JSON.parse(content);
    }
}
//# sourceMappingURL=jest.js.map