/**
 * Mathematical Utilities Test Suite
 * 
 * Tests for mathematically rigorous utility functions with:
 * - Edge case validation
 * - Boundary condition verification
 * - Type consistency checks
 * - Expected vs actual value assertions
 */

const assert = require('assert');
const mathUtils = require('../src/utils/mathUtils');

const {
    CONSTANTS,
    safeDivide,
    clamp,
    calculateFleschScore,
    countSyllables,
    countTotalSyllables,
    calculateTextDensity,
    calculateQualityScore,
    calculateReadingTime,
    formatBytes,
    calculateSuccessRate,
    generateHashSuffix,
    calculateRateLimitWait,
    calculateReadabilityScore,
    safeCompare,
    exceedsThreshold
} = mathUtils;

let passed = 0;
let failed = 0;
let total = 0;

function test(description, fn) {
    total++;
    try {
        fn();
        passed++;
        console.log(`  ✅ ${description}`);
    } catch (error) {
        failed++;
        console.log(`  ❌ ${description}`);
        console.log(`     Error: ${error.message}`);
    }
}

function assertEqual(actual, expected, message = '') {
    if (actual !== expected) {
        throw new Error(`${message}\nExpected: ${expected}\nActual: ${actual}`);
    }
}

function assertDeepEqual(actual, expected, message = '') {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(
            `${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`
        );
    }
}

function assertThrows(fn, message = '') {
    try {
        fn();
        throw new Error(`${message}\nExpected function to throw, but it did not`);
    } catch (error) {
        if (error.message.includes('Expected function to throw')) {
            throw error;
        }
        // Function threw as expected
    }
}

console.log('\n🔬 Mathematical Utilities Test Suite\n');
console.log('=====================================\n');

// ==========================================
// safeDivide tests
// ==========================================
console.log('📐 safeDivide:');

test('normal division', () => {
    assertEqual(safeDivide(10, 2), 5);
});

test('division by zero returns fallback', () => {
    assertEqual(safeDivide(10, 0), null);
});

test('division by zero with custom fallback', () => {
    assertEqual(safeDivide(10, 0, 0), 0);
});

test('division with non-numbers returns fallback', () => {
    assertEqual(safeDivide('10', 2), null);
});

test('division with very small denominator (near zero)', () => {
    assertEqual(safeDivide(10, 1e-15), null);
});

test('division with Infinity returns fallback', () => {
    assertEqual(safeDivide(Infinity, 2), null);
});

test('division with NaN returns fallback', () => {
    assertEqual(safeDivide(NaN, 2), null);
});

// ==========================================
// clamp tests
// ==========================================
console.log('\n📐 clamp:');

test('value within range unchanged', () => {
    assertEqual(clamp(5, 0, 10), 5);
});

test('value below min clamped to min', () => {
    assertEqual(clamp(-5, 0, 10), 0);
});

test('value above max clamped to max', () => {
    assertEqual(clamp(15, 0, 10), 10);
});

test('value at min remains at min', () => {
    assertEqual(clamp(0, 0, 10), 0);
});

test('value at max remains at max', () => {
    assertEqual(clamp(10, 0, 10), 10);
});

test('invalid range (min > max) throws error', () => {
    assertThrows(() => clamp(5, 10, 0));
});

test('non-number value defaults to min', () => {
    assertEqual(clamp('abc', 0, 10), 0);
});

test('Infinity value clamped to max', () => {
    assertEqual(clamp(Infinity, 0, 10), 10);
});

test('negative range works correctly', () => {
    assertEqual(clamp(-5, -10, -1), -5);
});

// ==========================================
// calculateFleschScore tests
// ==========================================
console.log('\n📐 calculateFleschScore:');

test('insufficient words returns invalid', () => {
    const result = calculateFleschScore(3, 1, 5);
    assertEqual(result.valid, false);
});

test('zero sentences returns invalid', () => {
    const result = calculateFleschScore(10, 0, 15);
    assertEqual(result.valid, false);
});

test('valid input returns clamped score', () => {
    const result = calculateFleschScore(100, 10, 150);
    assertEqual(result.valid, true);
    assert(result.value >= 0 && result.value <= 100, 'Score should be in [0, 100]');
});

test('extremely complex text clamps to 0', () => {
    // Very few words, many syllables
    const result = calculateFleschScore(5, 1, 50);
    assertEqual(result.valid, true);
    assertEqual(result.value, 0);
});

test('very simple text clamps to 100', () => {
    // Short sentences, few syllables
    const result = calculateFleschScore(50, 50, 50);
    assertEqual(result.valid, true);
    assertEqual(result.value, 100);
});

// ==========================================
// countSyllables tests
// ==========================================
console.log('\n📐 countSyllables:');

test('empty string returns 0', () => {
    assertEqual(countSyllables(''), 0);
});

test('short word returns 1', () => {
    assertEqual(countSyllables('the'), 1);
});

test('two-syllable word', () => {
    assertEqual(countSyllables('hello'), 2);
});

test('silent-e handling', () => {
    assertEqual(countSyllables('make'), 1);
});

test('-le ending adds syllable', () => {
    assertEqual(countSyllables('table'), 2);
});

test('non-string input returns 1', () => {
    assertEqual(countSyllables(null), 1);
});

test('word with numbers strips them', () => {
    assertEqual(countSyllables('test123'), 1);
});

// ==========================================
// calculateTextDensity tests
// ==========================================
console.log('\n📐 calculateTextDensity:');

test('normal text density', () => {
    assertEqual(calculateTextDensity(50, 100), 0.5);
});

test('empty element (both zero) returns 0', () => {
    assertEqual(calculateTextDensity(0, 0), 0);
});

test('text without HTML (impossible state) returns null', () => {
    assertEqual(calculateTextDensity(50, 0), null);
});

test('negative values return null', () => {
    assertEqual(calculateTextDensity(-5, 100), null);
});

test('non-number input returns null', () => {
    assertEqual(calculateTextDensity('50', 100), null);
});

// ==========================================
// calculateQualityScore tests
// ==========================================
console.log('\n📐 calculateQualityScore:');

test('base score with no bonuses', () => {
    const result = calculateQualityScore({ wordCount: 0, paragraphCount: 0, avgWordsPerSentence: 0 });
    assertEqual(result, 50);
});

test('maximum bonuses cap at 100', () => {
    const result = calculateQualityScore({
        wordCount: 2000,
        paragraphCount: 10,
        avgWordsPerSentence: 15
    });
    assertEqual(result, 100);
});

test('quality score never goes below 0', () => {
    const result = calculateQualityScore({}, -50); // Start at -50
    assertEqual(result, 0);
});

// ==========================================
// calculateReadingTime tests
// ==========================================
console.log('\n📐 calculateReadingTime:');

test('empty content returns null', () => {
    assertEqual(calculateReadingTime(0), null);
});

test('negative word count returns null', () => {
    assertEqual(calculateReadingTime(-5), null);
});

test('normal content calculates correctly', () => {
    assertEqual(calculateReadingTime(200, 200), 1);
});

test('rounds up to next minute', () => {
    assertEqual(calculateReadingTime(201, 200), 2);
});

test('zero WPM returns null', () => {
    assertEqual(calculateReadingTime(100, 0), null);
});

// ==========================================
// formatBytes tests
// ==========================================
console.log('\n📐 formatBytes:');

test('zero bytes', () => {
    assertEqual(formatBytes(0), '0 Bytes');
});

test('negative bytes returns null', () => {
    assertEqual(formatBytes(-100), null);
});

test('kilobytes formatted correctly', () => {
    assertEqual(formatBytes(1024), '1 KB');
});

test('megabytes formatted correctly', () => {
    assertEqual(formatBytes(1024 * 1024), '1 MB');
});

test('gigabytes formatted correctly', () => {
    assertEqual(formatBytes(1024 * 1024 * 1024), '1 GB');
});

test('large petabytes handled (caps at PB)', () => {
    const pb = Math.pow(1024, 5);
    const result = formatBytes(pb);
    assert(result.includes('PB'), 'Should include PB unit');
});

test('non-number returns null', () => {
    assertEqual(formatBytes('100'), null);
});

test('NaN returns null', () => {
    assertEqual(formatBytes(NaN), null);
});

// ==========================================
// calculateSuccessRate tests
// ==========================================
console.log('\n📐 calculateSuccessRate:');

test('zero total returns zero rate', () => {
    const result = calculateSuccessRate(0, 0);
    assertEqual(result.rate, 0);
    assertEqual(result.percentage, '0.0');
});

test('100% success rate', () => {
    const result = calculateSuccessRate(10, 10);
    assertEqual(result.rate, 1);
    assertEqual(result.percentage, '100.0');
});

test('50% success rate', () => {
    const result = calculateSuccessRate(5, 10);
    assertEqual(result.rate, 0.5);
    assertEqual(result.percentage, '50.0');
});

test('negative successful returns zero', () => {
    const result = calculateSuccessRate(-5, 10);
    assertEqual(result.rate, 0);
});

// ==========================================
// generateHashSuffix tests
// ==========================================
console.log('\n📐 generateHashSuffix:');

test('generates hash of requested length', () => {
    const hash = generateHashSuffix('test', 16);
    assertEqual(hash.length, 16);
});

test('minimum length is 8', () => {
    const hash = generateHashSuffix('test', 4);
    assertEqual(hash.length, 8);
});

test('maximum length is 64', () => {
    const hash = generateHashSuffix('test', 100);
    assertEqual(hash.length, 64);
});

test('same input produces same hash', () => {
    const hash1 = generateHashSuffix('consistent-input');
    const hash2 = generateHashSuffix('consistent-input');
    assertEqual(hash1, hash2);
});

test('different inputs produce different hashes', () => {
    const hash1 = generateHashSuffix('input1');
    const hash2 = generateHashSuffix('input2');
    assert(hash1 !== hash2, 'Hashes should differ');
});

// ==========================================
// calculateRateLimitWait tests
// ==========================================
console.log('\n📐 calculateRateLimitWait:');

test('positive wait time calculated correctly', () => {
    assertEqual(calculateRateLimitWait(1000, 500), 500);
});

test('minimum wait time enforced', () => {
    assertEqual(calculateRateLimitWait(1000, 999, 100), 100);
});

test('negative raw wait uses minimum', () => {
    assertEqual(calculateRateLimitWait(1000, 1500, 100), 100);
});

// ==========================================
// safeCompare tests
// ==========================================
console.log('\n📐 safeCompare:');

test('equal values return 0', () => {
    assertEqual(safeCompare(5, 5), 0);
});

test('nearly equal values (within epsilon) return 0', () => {
    assertEqual(safeCompare(0.1 + 0.2, 0.3), 0);
});

test('first value greater returns 1', () => {
    assertEqual(safeCompare(10, 5), 1);
});

test('first value less returns -1', () => {
    assertEqual(safeCompare(5, 10), -1);
});

// ==========================================
// exceedsThreshold tests
// ==========================================
console.log('\n📐 exceedsThreshold:');

test('value exceeds threshold', () => {
    assertEqual(exceedsThreshold(0.5, 0.3), true);
});

test('value equals threshold (false due to epsilon)', () => {
    assertEqual(exceedsThreshold(0.3, 0.3), false);
});

test('floating point edge case handled correctly', () => {
    // 0.1 + 0.2 = 0.30000000000000004 in JS
    assertEqual(exceedsThreshold(0.1 + 0.2, 0.3), false);
});

// ==========================================
// Summary
// ==========================================
console.log('\n=====================================');
console.log(`\n📊 Test Results: ${passed}/${total} passed`);
if (failed > 0) {
    console.log(`   ❌ ${failed} tests failed\n`);
    process.exit(1);
} else {
    console.log('   ✅ All tests passed!\n');
    process.exit(0);
}
