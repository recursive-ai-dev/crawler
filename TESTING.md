# TESTING — Proof-Grade Coverage Plan

## Test Philosophy
All tests use real HTML/media fixtures served from an in-process HTTP server. No mock data is used. Each extractor, crawler, and math utility is exercised against deterministic fixtures and edge windows.

## Execution Commands
These scripts are designed to run with the existing Node.js runtime:

```bash
node test-implementation.js
node --test tests/browser.test.js
node --test tests/crawler.test.js
```

## Edge Window Matrix (-1..12)
For any numerical utility with at least 10 meaningful outcomes, the coverage window is expanded to:

```
-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12
```

This enforces:
- Negative domain handling (`-1`)
- Zero handling (`0`)
- Low/typical ranges (`1`–`9`)
- High/upper ranges (`10`–`12`)

### Implemented Numeric Proofs
| Utility | Test Window | Invariants Verified |
| --- | --- | --- |
| `clamp` | -1..12 | Output always within bounds |
| `calculateReadingTime` | -1..12 | Null for non-positive inputs; positive minutes for valid inputs |
| `calculateRateLimitWait` | -1..12 | Always ≥ min wait |
| `calculateSuccessRate` | -1..12 | Stable `{ rate, percentage }` typing |

## Functional Proof Coverage

### Browser Interface
**Script:** `test-implementation.js`, `tests/browser.test.js`  
**Proofs:**
- Scroll interaction extracts pagination link.
- Next-page interaction loads additional link data.
- Request counter increments after interactions.

### LPS Crawler
**Script:** `test-implementation.js`, `tests/crawler.test.js`  
**Proofs:**
- Crawler phases run with real page interactions.
- Discovery set grows from real link extraction.
- Report fields (linksFound, phases) are non-zero.

### Extractors
**Script:** `test-implementation.js`, `tests/crawler.test.js`  
**Proofs:**
- **TextExtractor:** word count and metadata summary present.
- **MFTExtractor:** hero image detection from DOM and metadata.
- **TBRExtractor:** detects HLS stream and MP4 source.
- **AudioExtractor:** MP3 detection and grouping.
- **PDFExtractor:** PDF detection from direct links and embeds.

### DataSynthesizer
**Script:** `test-implementation.js`, `tests/crawler.test.js`  
**Proofs:**
- JSONL lines align with crawl log length.
- Markdown summary sections present.
- CSV header validated.
- Raw output includes interaction markers.

## Notes on Environment
Tests use a deterministic local HTTP server (`tests/test-utils.js`) with fixed HTML and media bytes to guarantee reproducibility. The server ensures the crawler and extractors run against stable, controlled inputs that reflect real-world use.
