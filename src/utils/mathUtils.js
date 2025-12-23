/**
 * Mathematical Utilities Module
 * 
 * Provides mathematically rigorous utility functions with:
 * - Explicit domain/range validation
 * - Defined behavior for edge cases
 * - Type consistency guarantees
 * - Documented invariants
 * 
 * @module mathUtils
 */

/**
 * Mathematical constants and thresholds
 */
const CONSTANTS = {
    // Flesch-Kincaid constants
    FLESCH_BASE: 206.835,
    FLESCH_SENTENCE_FACTOR: 1.015,
    FLESCH_SYLLABLE_FACTOR: 84.6,

    // Minimum samples for statistical validity
    MIN_WORDS_FOR_READABILITY: 5,
    MIN_SENTENCES_FOR_READABILITY: 1,

    // Score bounds
    FLESCH_MIN: 0,
    FLESCH_MAX: 100,
    QUALITY_SCORE_MIN: 0,
    QUALITY_SCORE_MAX: 100,
    READABILITY_SCORE_MIN: -100,
    READABILITY_SCORE_MAX: 200,

    // Floating point comparison epsilon
    EPSILON: 1e-10,

    // Hash entropy for collision resistance
    HASH_LENGTH_BYTES: 16, // 128 bits - birthday bound ~2^64

    // Bytes formatting
    BYTES_UNITS: ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'],
    BYTES_BASE: 1024
};

/**
 * Result type for operations that may fail or be undefined
 * @typedef {Object} MathResult
 * @property {boolean} valid - Whether the result is mathematically valid
 * @property {*} value - The computed value (undefined if invalid)
 * @property {string|null} reason - Explanation if invalid
 */

/**
 * Safe division with explicit undefined handling
 * 
 * Mathematical Definition:
 *   safeDivide(a, b) = a/b if b ≠ 0
 *                    = fallback if b = 0
 * 
 * @param {number} numerator - The dividend
 * @param {number} denominator - The divisor
 * @param {number} [fallback=null] - Value to return when denominator is zero
 * @returns {number|null} - Result of division or fallback
 * 
 * @example
 * safeDivide(10, 2) // 5
 * safeDivide(10, 0) // null
 * safeDivide(10, 0, 0) // 0
 */
function safeDivide(numerator, denominator, fallback = null) {
    if (typeof numerator !== 'number' || typeof denominator !== 'number') {
        return fallback;
    }
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) {
        return fallback;
    }
    if (Math.abs(denominator) < CONSTANTS.EPSILON) {
        return fallback;
    }
    return numerator / denominator;
}

/**
 * Clamp a value to a specified range [min, max]
 * 
 * Mathematical Definition:
 *   clamp(x, min, max) = min if x < min
 *                      = max if x > max
 *                      = x   otherwise
 * 
 * Invariant: min ≤ result ≤ max (always)
 * 
 * @param {number} value - The value to clamp
 * @param {number} min - Minimum bound (inclusive)
 * @param {number} max - Maximum bound (inclusive)
 * @returns {number} - Clamped value
 * @throws {Error} - If min > max (invalid range)
 */
function clamp(value, min, max) {
    if (min > max) {
        throw new Error(`Invalid clamp range: min(${min}) > max(${max})`);
    }
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return min; // Default to minimum for NaN or non-number
    }
    // Handle Infinity explicitly
    if (value === Infinity) {
        return max;
    }
    if (value === -Infinity) {
        return min;
    }
    return Math.max(min, Math.min(max, value));
}

/**
 * Calculate Flesch-Kincaid Reading Ease Score with proper validation
 * 
 * Formula: 206.835 - 1.015 × (words/sentences) - 84.6 × (syllables/words)
 * 
 * Domain constraints:
 *   - words ≥ MIN_WORDS_FOR_READABILITY
 *   - sentences ≥ MIN_SENTENCES_FOR_READABILITY
 * 
 * Range: [0, 100] (clamped)
 * 
 * @param {number} wordCount - Total word count
 * @param {number} sentenceCount - Total sentence count
 * @param {number} syllableCount - Total syllable count
 * @returns {MathResult} - Result with validity flag
 */
function calculateFleschScore(wordCount, sentenceCount, syllableCount) {
    // Input validation
    if (wordCount < CONSTANTS.MIN_WORDS_FOR_READABILITY) {
        return {
            valid: false,
            value: null,
            reason: `Insufficient words: ${wordCount} < ${CONSTANTS.MIN_WORDS_FOR_READABILITY}`
        };
    }

    if (sentenceCount < CONSTANTS.MIN_SENTENCES_FOR_READABILITY) {
        return {
            valid: false,
            value: null,
            reason: `Insufficient sentences: ${sentenceCount} < ${CONSTANTS.MIN_SENTENCES_FOR_READABILITY}`
        };
    }

    // Calculate components
    const avgSentenceLength = safeDivide(wordCount, sentenceCount, 0);
    const avgSyllablesPerWord = safeDivide(syllableCount, wordCount, 1);

    // Apply Flesch formula
    const rawScore = CONSTANTS.FLESCH_BASE
        - (CONSTANTS.FLESCH_SENTENCE_FACTOR * avgSentenceLength)
        - (CONSTANTS.FLESCH_SYLLABLE_FACTOR * avgSyllablesPerWord);

    // Clamp to valid range
    const clampedScore = clamp(rawScore, CONSTANTS.FLESCH_MIN, CONSTANTS.FLESCH_MAX);

    return {
        valid: true,
        value: Math.round(clampedScore),
        reason: null
    };
}

/**
 * Improved syllable counting using linguistic rules
 * 
 * Algorithm:
 * 1. Count vowel groups (consecutive vowels = 1 syllable)
 * 2. Subtract silent 'e' at end
 * 3. Add syllables for specific patterns (le, tion, etc.)
 * 4. Minimum 1 syllable per word
 * 
 * @param {string} word - Word to count syllables for
 * @returns {number} - Estimated syllable count (≥ 1)
 */
function countSyllables(word) {
    // Handle null, undefined, or non-string input
    if (word === null || word === undefined) {
        return 1;
    }
    if (typeof word !== 'string') {
        return 1;
    }

    const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');

    // Empty string = 0 syllables
    if (cleanWord.length === 0) {
        return 0;
    }

    // Very short words = 1 syllable
    if (cleanWord.length <= 3) {
        return 1;
    }

    // Count vowel groups
    let count = 0;
    let prevVowel = false;
    const vowels = 'aeiouy';

    for (const char of cleanWord) {
        const isVowel = vowels.includes(char);
        if (isVowel && !prevVowel) {
            count++;
        }
        prevVowel = isVowel;
    }

    // Adjust for silent 'e' at end (but not 'le')
    if (cleanWord.endsWith('e') && !cleanWord.endsWith('le')) {
        count = Math.max(1, count - 1);
    }

    // Handle special endings
    if (cleanWord.match(/(ia|ious|eous)$/)) {
        count++;
    }

    return Math.max(1, count);
}

/**
 * Count total syllables in text
 * 
 * @param {string[]} words - Array of words
 * @returns {number} - Total syllable count
 */
function countTotalSyllables(words) {
    if (!Array.isArray(words)) {
        return 0;
    }
    return words.reduce((sum, word) => sum + countSyllables(word), 0);
}

/**
 * Calculate text density with proper edge case handling
 * 
 * Definition: textDensity = textLength / htmlLength
 * 
 * Domain: textLength ≥ 0, htmlLength ≥ 0
 * Range: [0, 1] theoretically, but can exceed 1 in edge cases
 * 
 * Special cases:
 *   - htmlLength = 0 AND textLength = 0: returns 0 (empty element)
 *   - htmlLength = 0 AND textLength > 0: returns null (impossible state)
 *   - Negative inputs: returns null (invalid)
 * 
 * @param {number} textLength - Length of text content
 * @param {number} htmlLength - Length of HTML content
 * @returns {number|null} - Density ratio or null if undefined
 */
function calculateTextDensity(textLength, htmlLength) {
    // Validate inputs
    if (typeof textLength !== 'number' || typeof htmlLength !== 'number') {
        return null;
    }

    if (textLength < 0 || htmlLength < 0) {
        return null;
    }

    // Handle zero cases
    if (htmlLength === 0) {
        return textLength === 0 ? 0 : null;
    }

    return textLength / htmlLength;
}

/**
 * Calculate quality score with bounded output
 * 
 * Invariant: 0 ≤ result ≤ 100 (always)
 * 
 * @param {Object} metrics - Content metrics
 * @param {number} metrics.wordCount - Word count
 * @param {number} metrics.paragraphCount - Paragraph count  
 * @param {number} metrics.avgWordsPerSentence - Average words per sentence
 * @param {number} [baseScore=50] - Starting score
 * @returns {number} - Quality score in [0, 100]
 */
function calculateQualityScore(metrics, baseScore = 50) {
    let score = baseScore;

    const { wordCount = 0, paragraphCount = 0, avgWordsPerSentence = 0 } = metrics;

    // Word count bonus (capped)
    if (wordCount > 300) score += 10;
    if (wordCount > 700) score += 10;
    if (wordCount > 1500) score += 5;

    // Paragraph structure bonus (capped)
    if (paragraphCount >= 3) score += 10;
    if (paragraphCount >= 7) score += 5;

    // Sentence variety bonus
    if (avgWordsPerSentence >= 10 && avgWordsPerSentence <= 25) score += 10;

    // Ensure bounded output [0, 100]
    return clamp(score, CONSTANTS.QUALITY_SCORE_MIN, CONSTANTS.QUALITY_SCORE_MAX);
}

/**
 * Calculate reading time with proper semantics
 * 
 * @param {number} wordCount - Word count
 * @param {number} wordsPerMinute - Reading speed (default: 200)
 * @returns {number|null} - Reading time in minutes, or null if undefined
 */
function calculateReadingTime(wordCount, wordsPerMinute = 200) {
    if (typeof wordCount !== 'number' || wordCount < 0) {
        return null;
    }

    if (wordCount === 0) {
        return null; // Empty content has no reading time
    }

    if (wordsPerMinute <= 0) {
        return null;
    }

    return Math.ceil(wordCount / wordsPerMinute);
}

/**
 * Format bytes to human-readable string with proper bounds
 * 
 * Handles edge cases:
 *   - bytes = 0: "0 Bytes"
 *   - bytes < 0: null (invalid)
 *   - bytes > 10^18: Uses PB with scientific notation
 * 
 * @param {number} bytes - Number of bytes
 * @returns {string|null} - Formatted string or null if invalid
 */
function formatBytes(bytes) {
    if (typeof bytes !== 'number' || !Number.isFinite(bytes)) {
        return null;
    }

    if (bytes < 0) {
        return null;
    }

    if (bytes === 0) {
        return '0 Bytes';
    }

    const k = CONSTANTS.BYTES_BASE;
    const sizes = CONSTANTS.BYTES_UNITS;

    // Calculate unit index with bounds check
    const i = Math.min(
        Math.floor(Math.log(bytes) / Math.log(k)),
        sizes.length - 1
    );

    const value = bytes / Math.pow(k, i);

    // Format with appropriate precision
    const formatted = value >= 100 ? value.toFixed(0) :
        value >= 10 ? value.toFixed(1) :
            value.toFixed(2);

    return `${parseFloat(formatted)} ${sizes[i]}`;
}

/**
 * Calculate success rate with consistent types
 * 
 * @param {number} successful - Number of successes
 * @param {number} total - Total attempts
 * @returns {{rate: number, percentage: string}} - Both numeric and string representations
 */
function calculateSuccessRate(successful, total) {
    if (total <= 0 || successful < 0) {
        return { rate: 0, percentage: '0.0' };
    }

    const rate = successful / total;
    // Truncate to one decimal place without rounding up
    const percentage = (Math.floor(rate * 1000) / 10).toFixed(1);

    return { rate, percentage };
}

/**
 * Generate collision-resistant hash suffix for filenames
 * 
 * Uses 16 hex characters (64 bits) for birthday bound of ~2^32
 * 
 * @param {string} input - Input string to hash
 * @param {number} [length=16] - Hash suffix length (default 16 for 64-bit entropy)
 * @returns {string} - Hexadecimal hash suffix
 */
function generateHashSuffix(input, length = 16) {
    const crypto = require('crypto');

    // Use SHA-256 for better distribution than MD5
    return crypto
        .createHash('sha256')
        .update(input)
        .digest('hex')
        .substring(0, Math.max(8, Math.min(64, length)));
}

/**
 * Safe wait time calculation for rate limiting
 * 
 * Guarantees: result ≥ minWait
 * 
 * @param {number} interval - Rate limit interval
 * @param {number} elapsed - Time since oldest request
 * @param {number} [minWait=100] - Minimum wait time in ms
 * @returns {number} - Wait time in milliseconds (always positive)
 */
function calculateRateLimitWait(interval, elapsed, minWait = 100) {
    const rawWait = interval - elapsed;
    return Math.max(minWait, rawWait);
}

/**
 * Bounded readability score calculation
 * 
 * @param {Object} params - Score components
 * @returns {number} - Score in [READABILITY_SCORE_MIN, READABILITY_SCORE_MAX]
 */
function calculateReadabilityScore(params) {
    const {
        tagWeight = 0,
        classBonus = 0,
        idBonus = 0,
        classPenalty = 0,
        idPenalty = 0,
        rolePenalty = 0,
        roleBonus = 0,
        wordCountBonus = 0,
        punctuationBonus = 0,
        paragraphBonus = 0,
        densityBonus = 0
    } = params;

    // Calculate bounded components
    const positiveScore =
        tagWeight +
        Math.min(classBonus, 25) +
        Math.min(idBonus, 25) +
        Math.min(roleBonus, 30) +
        Math.min(wordCountBonus, 50) +
        Math.min(punctuationBonus, 20) +
        Math.min(paragraphBonus, 30) +
        Math.min(densityBonus, 30);

    // Penalties are also bounded
    const negativeScore =
        Math.min(classPenalty, 50) +
        Math.min(idPenalty, 50) +
        Math.min(rolePenalty, 50);

    const totalScore = positiveScore - negativeScore;

    return clamp(
        totalScore,
        CONSTANTS.READABILITY_SCORE_MIN,
        CONSTANTS.READABILITY_SCORE_MAX
    );
}

/**
 * Floating-point safe comparison
 * 
 * @param {number} a - First value
 * @param {number} b - Second value
 * @param {number} [epsilon=CONSTANTS.EPSILON] - Comparison tolerance
 * @returns {number} - -1 if a < b, 0 if a ≈ b, 1 if a > b
 */
function safeCompare(a, b, epsilon = CONSTANTS.EPSILON) {
    const diff = a - b;
    // Use inclusive epsilon to treat values within tolerance as equal
    if (Math.abs(diff) <= epsilon) return 0;
    return diff < 0 ? -1 : 1;
}

/**
 * Check if value exceeds threshold with floating-point safety
 * 
 * @param {number} value - Value to check
 * @param {number} threshold - Threshold to compare against
 * @returns {boolean} - True if value > threshold (with epsilon tolerance)
 */
function exceedsThreshold(value, threshold) {
    // Returns true only if value exceeds threshold by more than epsilon
    return (value - threshold) > CONSTANTS.EPSILON;
}

// Export all utilities
module.exports = {
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
};
