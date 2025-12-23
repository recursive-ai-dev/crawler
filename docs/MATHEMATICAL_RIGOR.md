# Mathematical Rigor Implementation

## Overview

This document describes the mathematically rigorous refactoring applied to the LPS Crawler codebase. All mathematical operations now have:

- **Explicit domain validation** - Input types and ranges are verified
- **Defined edge case behavior** - Division by zero, empty inputs, boundary conditions all handled
- **Bounded outputs** - All scores and percentages have guaranteed ranges
- **Type consistency** - Returns are predictable types, never mixing numbers/strings unexpectedly
- **Documented invariants** - Each function states its guarantees

## Core Mathematical Utilities

### `src/utils/mathUtils.js`

New centralized module containing all mathematical functions with rigorous definitions:

| Function | Domain | Range | Edge Cases |
|----------|--------|-------|------------|
| `safeDivide(a, b, fallback)` | a,b ∈ ℝ | ℝ ∪ {fallback} | b=0 → fallback, NaN → fallback |
| `clamp(v, min, max)` | v ∈ ℝ, min≤max | [min, max] | ±∞ → bounds, NaN → min |
| `calculateFleschScore(w, s, sy)` | w≥5, s≥1 | MathResult{valid, value∈[0,100]} | insufficient data → {valid:false} |
| `countSyllables(word)` | string | ℤ⁺ ∪ {0} | empty→0, null→1, non-string→1 |
| `calculateTextDensity(t, h)` | t,h ≥ 0 | [0,1] ∪ null | h=0,t>0 → null (impossible state) |
| `calculateQualityScore(metrics)` | object | [0, 100] | always bounded |
| `calculateReadingTime(words, wpm)` | w>0, wpm>0 | ℤ⁺ ∪ null | w=0 → null |
| `formatBytes(bytes)` | bytes ≥ 0 | string ∪ null | negative → null, 0 → "0 Bytes" |
| `calculateSuccessRate(s, t)` | s≥0, t>0 | {rate: [0,1], percentage: string} | always consistent types |
| `generateHashSuffix(input, len)` | string, [8,64] | hex string | SHA-256 based, collision-resistant |
| `calculateRateLimitWait(i, e, min)` | all ≥ 0 | ≥ minWait | always positive |
| `safeCompare(a, b)` | a,b ∈ ℝ | {-1, 0, 1} | epsilon-tolerant |
| `exceedsThreshold(v, t)` | v,t ∈ ℝ | boolean | epsilon-tolerant |

## Key Fixes Applied

### 1. Division by Zero Protection

**Before:**
```javascript
const fleschScore = 206.835 - 1.015 * (wordCount / Math.max(sentences.length, 1))
    - 84.6 * (syllables / Math.max(wordCount, 1));
```

**After:**
```javascript
if (wordCount < MIN_WORDS_FOR_FLESCH || sentenceCount < MIN_SENTENCES_FOR_FLESCH) {
    return { valid: false, value: null, reason: 'Insufficient data' };
}
const rawFlesch = FLESCH_BASE 
    - (FLESCH_SENTENCE_FACTOR * avgSentenceWords)
    - (FLESCH_SYLLABLE_FACTOR * avgSyllablesPerWord);
fleschReadingEase = Math.round(clamp(rawFlesch, 0, 100));
```

### 2. Bounded Score Outputs

**Before:** Scores could range from -∞ to +∞
**After:** All scores clamped to defined ranges:
- Readability score: [-100, 200]
- Quality score: [0, 100]
- Flesch score: [0, 100]

### 3. Rate Limiter Infinite Loop Prevention

**Before:** Potential infinite recursion with negative wait times
**After:**
- Minimum wait time enforced (100ms)
- Maximum recursion depth (10)
- Explicit bounds on all timing calculations

### 4. Type-Consistent Success Rates

**Before:**
```javascript
successRate: this.downloadStats.total > 0 
  ? (successful / total * 100).toFixed(1)  // string: "50.0"
  : 0  // number: 0
```

**After:**
```javascript
return {
  rate: 0.5,           // Always number
  percentage: "50.0"   // Always string
};
```

### 5. Collision-Resistant Hashing

**Before:** MD5 with 8 hex characters (32-bit, collision at ~65K files)
**After:** SHA-256 with 16 hex characters (64-bit, collision at ~4B files)

### 6. Improved Syllable Counting

**Before:** Simple vowel count (300% error on words like "queue")
**After:** Linguistic rules:
- Vowel group counting
- Silent-e handling
- Special suffix patterns

### 7. Floating-Point Safe Comparisons

**Before:**
```javascript
if (density > 0.3) score += 20;  // May fail for 0.1 + 0.2
```

**After:**
```javascript
const greaterThan = (a, b) => (a - b) > EPSILON;
if (greaterThan(density, 0.3)) positiveScore += 20;
```

## Files Modified

| File | Changes |
|------|---------|
| `src/utils/mathUtils.js` | **NEW** - Centralized math utilities |
| `src/utils/rateLimiter.js` | Bounded recursion, positive wait times |
| `src/utils/mediaDownloader.js` | Type-consistent stats, collision-resistant hashing |
| `src/extractors/BaseExtractor.js` | Bounded constructor options |
| `src/extractors/TextExtractor.js` | Fixed Flesch, quality score, text density |
| `src/extractors/MFTExtractor.js` | Bounded options, safe statistics |
| `src/extractors/TBRExtractor.js` | Bounded options validation |
| `src/extractors/AudioExtractor.js` | Bounded options validation |
| `src/extractors/PDFExtractor.js` | Bounded options validation |
| `tests/mathUtils.test.js` | **NEW** - 68 unit tests for math utilities |

## Test Coverage

```
📊 Test Results: 68/68 passed
   ✅ All tests passed!
```

Test categories:
- Safe division (7 tests)
- Clamp function (9 tests)
- Flesch score calculation (5 tests)
- Syllable counting (7 tests)
- Text density (5 tests)
- Quality score (3 tests)
- Reading time (5 tests)
- Bytes formatting (8 tests)
- Success rate (4 tests)
- Hash generation (5 tests)
- Rate limit wait (3 tests)
- Safe comparison (4 tests)
- Threshold checking (3 tests)

## Usage Example

```javascript
const { 
    safeDivide, 
    clamp, 
    calculateFleschScore,
    formatBytes,
    calculateSuccessRate 
} = require('./src/utils/mathUtils');

// Safe division
const average = safeDivide(total, count, 0);  // Returns 0 if count is 0

// Bounded clamping
const score = clamp(rawScore, 0, 100);  // Always in [0, 100]

// Flesch score with validity
const flesch = calculateFleschScore(wordCount, sentenceCount, syllables);
if (flesch.valid) {
    console.log(`Readability: ${flesch.value}`);  // Guaranteed [0, 100]
}

// Type-consistent rates
const { rate, percentage } = calculateSuccessRate(10, 20);
// rate: 0.5 (number), percentage: "50.0" (string)
```

## Mathematical Invariants

1. **Score bounds are always enforced**
   - ∀ quality score q: 0 ≤ q ≤ 100
   - ∀ Flesch score f: 0 ≤ f ≤ 100
   - ∀ readability score r: -100 ≤ r ≤ 200

2. **Division never fails silently**
   - All divisions use `safeDivide()` or explicit checks
   - Zero denominators return defined fallback values

3. **Types are predictable**
   - Null indicates undefined/invalid state
   - Numbers are always finite (no NaN/Infinity leakage)
   - Strings are never accidentally returned as numbers

4. **Recursion is bounded**
   - Rate limiter has max depth of 10
   - All recursive calls have termination guarantees

5. **Floating-point comparisons are safe**
   - Epsilon tolerance of 1e-10 for equality
   - No raw `>` or `<` comparisons on floating-point values
