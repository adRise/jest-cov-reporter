import { parseString } from 'xml2js';
/**
 * Parser for Cobertura coverage reports
 */
export class CoberturaParser {
    /**
     * Parse Cobertura XML coverage report
     * @param content - XML content from Cobertura coverage report
     * @returns Parsed coverage report
     */
    parse(content) {
        let parsedReport = {};
        // Parse synchronously to make the function synchronous
        parseString(content, { explicitArray: false }, (err, result) => {
            if (err) {
                throw new Error(`Failed to parse Cobertura XML: ${err.message}`);
            }
            parsedReport = this.processCobertura(result);
        });
        return parsedReport;
    }
    /**
     * Process Cobertura XML result
     * @param result - Parsed XML result
     * @returns Coverage report
     */
    processCobertura(result) {
        const report = {};
        const coverages = result.coverage.packages.package;
        let statements = 0;
        let statementsTotal = 0;
        let branches = 0;
        let branchesTotal = 0;
        let functions = 0;
        let functionsTotal = 0;
        if (Array.isArray(coverages)) {
            coverages.forEach((pkg) => {
                const classes = pkg.classes.class;
                this.processClasses(classes, report);
                // Sum up package totals
                statementsTotal += parseInt(pkg.$.line_rate);
                statements += parseInt(pkg.$.line_rate_covered);
                branchesTotal += parseInt(pkg.$.branch_rate);
                branches += parseInt(pkg.$.branch_rate_covered);
                functionsTotal += parseInt(pkg.$.function_rate);
                functions += parseInt(pkg.$.function_rate_covered);
            });
        }
        else {
            const classes = coverages.classes.class;
            this.processClasses(classes, report);
            // Get totals from the single package
            statementsTotal = parseInt(coverages.$.line_rate);
            statements = parseInt(coverages.$.line_rate_covered);
            branchesTotal = parseInt(coverages.$.branch_rate);
            branches = parseInt(coverages.$.branch_rate_covered);
            functionsTotal = parseInt(coverages.$.function_rate);
            functions = parseInt(coverages.$.function_rate_covered);
        }
        // Add total summary
        report.total = {
            statements: {
                total: statementsTotal,
                covered: statements,
                skipped: 0,
                pct: statementsTotal > 0 ? (statements / statementsTotal) * 100 : 0
            },
            branches: {
                total: branchesTotal,
                covered: branches,
                skipped: 0,
                pct: branchesTotal > 0 ? (branches / branchesTotal) * 100 : 0
            },
            functions: {
                total: functionsTotal,
                covered: functions,
                skipped: 0,
                pct: functionsTotal > 0 ? (functions / functionsTotal) * 100 : 0
            }
        };
        return report;
    }
    /**
     * Process classes from Cobertura XML
     * @param classes - Class data from XML
     * @param report - Coverage report to update
     */
    processClasses(classes, report) {
        if (Array.isArray(classes)) {
            classes.forEach((cls) => {
                this.processClass(cls, report);
            });
        }
        else {
            this.processClass(classes, report);
        }
    }
    /**
     * Process a single class from Cobertura XML
     * @param cls - Class data from XML
     * @param report - Coverage report to update
     */
    processClass(cls, report) {
        const filename = cls.$.filename;
        const statements = parseInt(cls.$.line_rate_covered);
        const statementsTotal = parseInt(cls.$.line_rate);
        const branches = parseInt(cls.$.branch_rate_covered);
        const branchesTotal = parseInt(cls.$.branch_rate);
        const functions = parseInt(cls.$.function_rate_covered);
        const functionsTotal = parseInt(cls.$.function_rate);
        report[filename] = {
            statements: {
                total: statementsTotal,
                covered: statements,
                skipped: 0,
                pct: statementsTotal > 0 ? (statements / statementsTotal) * 100 : 0
            },
            branches: {
                total: branchesTotal,
                covered: branches,
                skipped: 0,
                pct: branchesTotal > 0 ? (branches / branchesTotal) * 100 : 0
            },
            functions: {
                total: functionsTotal,
                covered: functions,
                skipped: 0,
                pct: functionsTotal > 0 ? (functions / functionsTotal) * 100 : 0
            },
            filename
        };
    }
}
