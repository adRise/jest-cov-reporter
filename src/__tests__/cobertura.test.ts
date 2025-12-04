import { CoberturaParser } from '../parsers/cobertura';

describe('CoberturaParser', () => {
  const parser = new CoberturaParser();

  it('should include lines property in total that matches statements', () => {
    const coberturaXml = `<?xml version="1.0" encoding="utf-8"?>
      <coverage timestamp="123" line-rate="0.8" lines-covered="80" lines-valid="100" branch-rate="0.5" branches-covered="10" branches-valid="20" complexity="0" version="1.0">
        <packages>
          <package name="test" line-rate="0.8" branch-rate="0.5" complexity="0">
            <classes>
              <class name="TestClass" filename="test.js" line-rate="0.8" branch-rate="0.5" complexity="0">
                <methods/>
                <lines>
                  <line number="1" hits="1" branch="False"/>
                  <line number="2" hits="0" branch="False"/>
                </lines>
              </class>
            </classes>
          </package>
        </packages>
      </coverage>`;

    const result = parser.parse(coberturaXml);

    // Verify total has lines property
    expect(result.total).toBeDefined();
    expect(result.total.lines).toBeDefined();

    // Verify lines matches statements (both represent line coverage in Cobertura)
    expect(result.total.lines.total).toBe(result.total.statements.total);
    expect(result.total.lines.covered).toBe(result.total.statements.covered);
    expect(result.total.lines.pct).toBe(result.total.statements.pct);

    // Verify the actual values from the XML
    expect(result.total.lines.total).toBe(100);
    expect(result.total.lines.covered).toBe(80);
    expect(result.total.lines.pct).toBe(80);
  });

  it('should handle cobertura XML with zero lines', () => {
    const coberturaXml = `<?xml version="1.0" encoding="utf-8"?>
      <coverage timestamp="123" line-rate="0" lines-covered="0" lines-valid="0" branch-rate="0" branches-covered="0" branches-valid="0" complexity="0" version="1.0">
        <packages/>
      </coverage>`;

    const result = parser.parse(coberturaXml);

    expect(result.total.lines).toBeDefined();
    expect(result.total.lines.total).toBe(0);
    expect(result.total.lines.covered).toBe(0);
    expect(result.total.lines.pct).toBe(0);
  });

  it('should throw error for invalid XML', () => {
    expect(() => parser.parse('invalid xml')).toThrow();
  });
});
