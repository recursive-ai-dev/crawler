# LOGIC MAP — Production Proof Chains

## Scope
This document explains how the codebase now proves functionality with real logic instead of mock data, and how mathematical rigor is enforced in testing and documentation.

## Logic Chain 1 — Replace Mock Inputs with Realized Test Fixtures (Steps 1–3)
**Why:** Mocks only assert assumptions; real fixtures validate actual parsing, extraction, and navigation semantics.

**How it was implemented:**
1. **Deterministic Test Server**  
   A local HTTP server now serves structured HTML, media, and document assets for all extractors and crawler paths.  
   *Implementation:* `tests/test-utils.js` provides `createTestServer()` and returns a base URL for tests.
2. **Real Browser + Extractor Integration**  
   Test flows run the actual crawler/extractors against the HTTP server so every extraction path executes on concrete HTML, media, and document resources.  
   *Implementation:* `test-implementation.js`, `tests/crawler.test.js`, `tests/browser.test.js`.
3. **Proof-Driven Output Validation**  
   Each test validates not only the existence of output but verifies correct categorization/grouping (e.g., HLS vs MP4, PDF detection, word-count validity).  
   *Implementation:* extractor integration checks in `test-implementation.js` and `tests/crawler.test.js`.

## Logic Chain 2 — Mathematical Rigor and Edge-Window Proofs (Steps 1–3)
**Why:** Production claims require mathematical correctness across edge inputs, not only nominal scenarios.

**How it was implemented:**
1. **Edge Window Sampling -1..12**  
   Numerical utilities are tested across the full extended range (-1 through 12) to exercise negative values, zero, and positive ranges.  
   *Implementation:* `test-implementation.js` `testMathUtils()`.
2. **Invariant Validation**  
   Tests explicitly verify invariants: clamp bounds, minimum wait time, non-null reading time for valid values, and stable output typing.  
   *Implementation:* `test-implementation.js`.
3. **Rationale and Output Inspection**  
   Outputs are recorded and validated for explicit ranges and formats.  
   *Implementation:* `test-implementation.js` logging and `TESTING.md` matrix.

## Logic Chain 3 — Desktop GUI Proof Chain (Steps 1–3)
**Why:** A desktop GUI is only real if its runtime files and launch hooks are verified.

**How it was implemented:**
1. **File Presence Proof**  
   The launcher, Electron main process, preload script, and GUI entry point are verified to exist.  
   *Implementation:* `test-implementation.js` `testFileStructure()`.
2. **Executable Feature Inspection**  
   The Electron main process is scanned for IPC handlers, BrowserWindow usage, and shutdown logic.  
   *Implementation:* `test-implementation.js` `testDesktopAppStructure()`.
3. **GUI Integrity Checks**  
   The GUI is validated for production classes and interactive features.  
   *Implementation:* `test-implementation.js` `testGUIImplementation()`.

## Mathematical Proof Notes
All math-related tests are run with deterministic input sets and are explicitly bounded by the invariants defined in `src/utils/mathUtils.js`. The edge-window sampling (-1..12) confirms that each method remains within its documented domain/range.
