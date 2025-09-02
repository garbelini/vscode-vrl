import * as assert from 'assert';
import {
    VRL_FUNCTIONS,
    FALLIBLE_FUNCTIONS,
    VRL_FUNCTION_NAMES,
    getFunctionByName,
} from '../../vrlFunctions';

suite('VRL Functions Unit Tests', () => {
    test('Should have parse_cef function', () => {
        const parseCef = getFunctionByName('parse_cef');
        assert.ok(parseCef, 'parse_cef should exist');
        assert.strictEqual(parseCef!.name, 'parse_cef');
        assert.strictEqual(parseCef!.fallible, true, 'parse_cef should be fallible');
        assert.strictEqual(parseCef!.category, 'parse');
        assert.strictEqual(parseCef!.parameters.length, 2, 'parse_cef should have 2 parameters');
    });

    test('Should have comprehensive function list', () => {
        assert.ok(
            VRL_FUNCTION_NAMES.length > 80,
            `Should have many functions, got ${VRL_FUNCTION_NAMES.length}`
        );

        const expectedFunctions = [
            'parse_cef',
            'parse_json',
            'parse_timestamp',
            'parse_regex',
            'to_int',
            'to_float',
            'to_string',
            'timestamp',
            'upcase',
            'downcase',
            'encode_base64',
            'decode_base64',
            'sha1',
            'sha2',
        ];

        expectedFunctions.forEach((funcName) => {
            assert.ok(
                VRL_FUNCTION_NAMES.includes(funcName),
                `Should include function: ${funcName}`
            );
        });
    });

    test('Should correctly classify fallible vs infallible functions', () => {
        // Test fallible functions
        const expectedFallible = [
            'parse_cef',
            'parse_json',
            'parse_timestamp',
            'timestamp',
            'to_int',
            'to_float',
            'decode_base64',
        ];

        expectedFallible.forEach((funcName) => {
            assert.ok(
                FALLIBLE_FUNCTIONS.includes(funcName),
                `${funcName} should be in FALLIBLE_FUNCTIONS`
            );

            const func = getFunctionByName(funcName);
            assert.ok(func, `${funcName} should exist`);
            assert.strictEqual(func!.fallible, true, `${funcName} should be marked as fallible`);
        });

        // Test infallible functions
        const expectedInfallible = ['upcase', 'downcase', 'to_string', 'length', 'now', 'uuid_v4'];

        expectedInfallible.forEach((funcName) => {
            assert.ok(
                !FALLIBLE_FUNCTIONS.includes(funcName),
                `${funcName} should NOT be in FALLIBLE_FUNCTIONS`
            );

            const func = getFunctionByName(funcName);
            assert.ok(func, `${funcName} should exist`);
            assert.strictEqual(func!.fallible, false, `${funcName} should be marked as infallible`);
        });

        console.log(`Total functions: ${VRL_FUNCTION_NAMES.length}`);
        console.log(`Fallible functions: ${FALLIBLE_FUNCTIONS.length}`);
        console.log(
            `Infallible functions: ${VRL_FUNCTION_NAMES.length - FALLIBLE_FUNCTIONS.length}`
        );
    });

    test('Should have proper function signatures', () => {
        const testCases = [
            {
                name: 'parse_cef',
                expectedParams: ['message', 'transform_fields'],
                expectedReturnType: 'object',
            },
            {
                name: 'to_int',
                expectedParams: ['value'],
                expectedReturnType: 'int',
            },
            {
                name: 'upcase',
                expectedParams: ['text'],
                expectedReturnType: 'string',
            },
            {
                name: 'timestamp',
                expectedParams: ['value'],
                expectedReturnType: 'timestamp',
            },
        ];

        testCases.forEach(({ name, expectedParams, expectedReturnType }) => {
            const func = getFunctionByName(name);
            assert.ok(func, `Function ${name} should exist`);

            assert.strictEqual(
                func!.returnType,
                expectedReturnType,
                `${name} should return ${expectedReturnType}`
            );

            assert.strictEqual(
                func!.parameters.length,
                expectedParams.length,
                `${name} should have ${expectedParams.length} parameters`
            );

            expectedParams.forEach((paramName, index) => {
                assert.strictEqual(
                    func!.parameters[index].name,
                    paramName,
                    `${name} parameter ${index} should be named ${paramName}`
                );
            });
        });
    });

    test('Should have timestamp function with correct signature', () => {
        const timestampFunc = getFunctionByName('timestamp');
        assert.ok(timestampFunc, 'timestamp function should exist');
        assert.strictEqual(timestampFunc!.name, 'timestamp');
        assert.strictEqual(timestampFunc!.fallible, true, 'timestamp should be fallible');
        assert.strictEqual(timestampFunc!.category, 'coerce');
        assert.strictEqual(timestampFunc!.returnType, 'timestamp');
        assert.strictEqual(timestampFunc!.parameters.length, 1, 'timestamp should have 1 parameter');
        
        // Check parameter name and type
        const expectedParam = { name: 'value', type: 'any', optional: false };
        const actualParam = timestampFunc!.parameters[0];
        assert.strictEqual(actualParam.name, expectedParam.name, 
            'Parameter should be named value');
        assert.strictEqual(actualParam.type, expectedParam.type, 
            'Parameter should have type any');
        assert.strictEqual(actualParam.optional || false, expectedParam.optional, 
            'Parameter should be required');

        console.log('✓ timestamp function correctly defined as type checker function');
    });
});

// Simple error handling logic tests (without VSCode dependencies)
suite('Error Handling Logic Tests', () => {
    function hasProperErrorHandling(line: string, funcName: string): boolean {
        // Check for error propagation (!)
        const hasBang = new RegExp(`\\b${funcName}!\\s*\\(`).test(line);

        // Check for null coalescing (??)
        const hasNullCoalescing = line.includes('??');

        // Check for explicit error handling (result, err = ...)
        const hasExplicitErrorHandling = /\w+\s*,\s*\w+\s*=/.test(line);

        return hasBang || hasNullCoalescing || hasExplicitErrorHandling;
    }

    test('Should correctly detect error handling patterns', () => {
        const testCases = [
            // Invalid cases (should return false)
            { line: '.result = parse_cef(.input)', func: 'parse_cef', expected: false },
            { line: '.data = parse_json(.input)', func: 'parse_json', expected: false },
            { line: '.num = to_int(.str)', func: 'to_int', expected: false },

            // Valid cases with ! (should return true)
            { line: '.result = parse_cef!(.input)', func: 'parse_cef', expected: true },
            { line: '.data = parse_json!(.input)', func: 'parse_json', expected: true },
            { line: '.num = to_int!(.str)', func: 'to_int', expected: true },

            // Valid cases with ?? (should return true)
            { line: '.result = parse_cef(.input) ?? {}', func: 'parse_cef', expected: true },
            { line: '.data = parse_json(.input) ?? null', func: 'parse_json', expected: true },
            { line: '.num = to_int(.str) ?? 0', func: 'to_int', expected: true },

            // Valid cases with explicit error handling (should return true)
            { line: 'result, err = parse_cef(.input)', func: 'parse_cef', expected: true },
            { line: 'data, error = parse_json(.input)', func: 'parse_json', expected: true },
            { line: 'num, e = to_int(.str)', func: 'to_int', expected: true },
        ];

        testCases.forEach(({ line, func, expected }, index) => {
            const result = hasProperErrorHandling(line, func);
            console.log(`Test ${index + 1}: "${line}" -> ${result} (expected: ${expected})`);
            assert.strictEqual(result, expected, `Error handling detection failed for: "${line}"`);
        });
    });

    test('Should identify fallible function calls in code', () => {
        const lines = [
            '.result = parse_cef(.input)', // Should be detected
            '.data = parse_json(.input)', // Should be detected
            '.safe = upcase(.text)', // Should NOT be detected (not fallible)
            '.num = to_int!(.str)', // Should NOT be detected (has !)
            '.time = parse_timestamp(.date, "%Y-%m-%d") ?? now()', // Should NOT be detected (has ??)
        ];

        let detectedFallibleCalls = 0;

        lines.forEach((line) => {
            // Check each fallible function to see if it's used unsafely
            for (const func of FALLIBLE_FUNCTIONS) {
                const funcCallPattern = new RegExp(`\\b${func}\\s*\\(`);
                const match = line.match(funcCallPattern);

                if (match) {
                    const hasErrorHandling = hasProperErrorHandling(line, func);
                    if (!hasErrorHandling) {
                        console.log(`Detected unsafe fallible function: ${func} in "${line}"`);
                        detectedFallibleCalls++;
                    }
                }
            }
        });

        // We expect 2 unsafe calls: parse_cef and parse_json
        assert.strictEqual(
            detectedFallibleCalls,
            2,
            `Should detect exactly 2 unsafe fallible function calls, found ${detectedFallibleCalls}`
        );
    });
});
