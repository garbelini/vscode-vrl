import * as assert from 'assert';
import { VrlDiagnosticsProvider } from '../../diagnostics';

suite('VRL Diagnostics Integration Tests (Headless)', () => {
    let diagnosticsProvider: VrlDiagnosticsProvider;

    setup(() => {
        diagnosticsProvider = new VrlDiagnosticsProvider();
    });

    teardown(() => {
        diagnosticsProvider.dispose();
    });

    test('Should detect fallible functions without error handling', async () => {
        const testContent = `# Test file with invalid fallible function usage
.result = parse_cef(.input)
.data = parse_json(.content)
.timestamp = parse_timestamp(.date, "%Y-%m-%d")
.number = to_int(.value)

# These should be valid (no errors expected)
.good_result = parse_cef!(.input)
.safe_data = parse_json(.content) ?? {}
.parsed_time = parse_timestamp(.date, "%Y-%m-%d") ?? now()
result, err = to_int(.value)
`;

        // Create mock document
        const mockDoc = {
            uri: { path: 'test://test.vrl' },
            languageId: 'vrl',
            getText: () => testContent,
            lineAt: (line: number) => ({
                text: testContent.split('\n')[line] || '',
            }),
            fileName: 'test.vrl',
        };

        // Validate the document
        diagnosticsProvider.validateDocument(mockDoc as any);

        // Get diagnostics from our collection
        const vscode = (global as any).vscode;
        const allDiagnostics = vscode.languages.getDiagnostics(mockDoc.uri);

        // Filter for only ERROR severity diagnostics about fallible functions
        const errorDiagnostics = allDiagnostics.filter(
            (diag: any) =>
                diag.severity === vscode.DiagnosticSeverity.Error &&
                diag.message.includes('error handling')
        );

        console.log(
            `Headless test: Found ${allDiagnostics.length} total diagnostics, ${errorDiagnostics.length} error diagnostics`
        );
        errorDiagnostics.forEach((diag: any, index: number) => {
            console.log(`  ${index + 1}. Line ${diag.range.start.line}: ${diag.message}`);
        });

        // We expect exactly 4 errors for the 4 fallible functions used incorrectly
        assert.strictEqual(
            errorDiagnostics.length,
            4,
            `Expected 4 error diagnostics for fallible functions without error handling, got ${errorDiagnostics.length}`
        );

        // Check that each error is about missing error handling
        const expectedErrors = ['parse_cef', 'parse_json', 'parse_timestamp', 'to_int'];

        expectedErrors.forEach((funcName) => {
            const diagnostic = errorDiagnostics.find((diag: any) =>
                diag.message.includes(funcName)
            );
            assert.ok(
                diagnostic,
                `Expected error for ${funcName}, but it was not found in: ${errorDiagnostics.map((d: any) => d.message).join(', ')}`
            );
            assert.ok(
                diagnostic.message.includes('error handling'),
                `Expected error message to mention error handling, got: ${diagnostic.message}`
            );
            assert.strictEqual(
                diagnostic.severity,
                vscode.DiagnosticSeverity.Error,
                `Expected error severity, got ${diagnostic.severity}`
            );
        });
    });

    test('Should detect VRL control flow syntax errors', async () => {
        const testContent = `if .name == "test" {
  .result = "match"
}
else {
  .result = "no match"
}`;

        const mockDoc = {
            uri: { path: 'test://control-flow.vrl' },
            languageId: 'vrl',
            getText: () => testContent,
            lineAt: (line: number) => ({
                text: testContent.split('\n')[line] || '',
            }),
            fileName: 'control-flow.vrl',
        };

        diagnosticsProvider.validateDocument(mockDoc as any);

        const vscode = (global as any).vscode;
        const allDiagnostics = vscode.languages.getDiagnostics(mockDoc.uri);

        const controlFlowErrors = allDiagnostics.filter(
            (diag: any) =>
                diag.severity === vscode.DiagnosticSeverity.Error &&
                diag.message.includes('same line')
        );

        console.log(`Control flow test: Found ${controlFlowErrors.length} control flow errors`);

        // Should detect 1 error - else on wrong line
        assert.strictEqual(
            controlFlowErrors.length,
            1,
            `Expected 1 control flow error, got ${controlFlowErrors.length}`
        );

        assert.ok(
            controlFlowErrors[0].message.includes('same line'),
            'Error should mention same line rule'
        );
    });

    test('Should properly handle multi-line function calls', async () => {
        const testContent = `# Multi-line function calls test

# This should trigger an error - missing error handling
.result = parse_json(
    .message
)

# This should be valid - has error handling with !
.result2 = parse_json!(
    .message
)

# This should be valid - has null coalescing
.result3 = parse_json(
    .message
) ?? {}

# This should trigger an error - nested function call without error handling
.result4 = replace!(
    parse_json(.nested_message),
    "old",
    "new"
)

# Complex multi-line example with proper error handling
.parsed_data = parse_timestamp!(
    .log_entry.timestamp,
    "%Y-%m-%d %H:%M:%S"
)`;

        const mockDoc = {
            uri: { path: 'test://multiline.vrl' },
            languageId: 'vrl',
            getText: () => testContent,
            lineAt: (line: number) => ({
                text: testContent.split('\n')[line] || '',
            }),
            fileName: 'multiline.vrl',
        };

        diagnosticsProvider.validateDocument(mockDoc as any);

        const vscode = (global as any).vscode;
        const allDiagnostics = vscode.languages.getDiagnostics(mockDoc.uri);

        const errorDiagnostics = allDiagnostics.filter(
            (diag: any) =>
                diag.severity === vscode.DiagnosticSeverity.Error &&
                diag.message.includes('error handling')
        );

        console.log(`Multi-line test: Found ${errorDiagnostics.length} error diagnostics`);
        errorDiagnostics.forEach((diag: any, index: number) => {
            console.log(`  ${index + 1}. Line ${diag.range.start.line}: ${diag.message}`);
        });

        // We expect exactly 2 errors:
        // 1. Multi-line parse_json without error handling
        // 2. Nested parse_json without error handling
        assert.strictEqual(
            errorDiagnostics.length,
            2,
            `Expected 2 error diagnostics for multi-line fallible functions without error handling, got ${errorDiagnostics.length}`
        );

        // Check that the errors are for parse_json functions
        const parseJsonErrors = errorDiagnostics.filter((diag: any) =>
            diag.message.includes('parse_json')
        );

        assert.strictEqual(
            parseJsonErrors.length,
            2,
            'Both errors should be for parse_json functions'
        );
    });

    test('Should not flag valid VRL code', async () => {
        const testContent = `# Valid VRL code
.good_result = parse_cef!(.input)
.safe_data = parse_json(.content) ?? {}
.parsed_time = parse_timestamp(.date, "%Y-%m-%d") ?? now()
result, err = to_int(.value)

if .name == "test" {
  .result = "match"
} else {
  .result = "no match"
}`;

        const mockDoc = {
            uri: { path: 'test://valid.vrl' },
            languageId: 'vrl',
            getText: () => testContent,
            lineAt: (line: number) => ({
                text: testContent.split('\n')[line] || '',
            }),
            fileName: 'valid.vrl',
        };

        diagnosticsProvider.validateDocument(mockDoc as any);

        const vscode = (global as any).vscode;
        const allDiagnostics = vscode.languages.getDiagnostics(mockDoc.uri);

        const errorDiagnostics = allDiagnostics.filter(
            (diag: any) => diag.severity === vscode.DiagnosticSeverity.Error
        );

        console.log(`Valid code test: Found ${errorDiagnostics.length} errors in valid code`);

        // Should have no errors for valid code
        assert.strictEqual(
            errorDiagnostics.length,
            0,
            `Expected no errors for valid code, got ${errorDiagnostics.length}`
        );
    });
});
