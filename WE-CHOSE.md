# WE CHOSE — Three Perspective Planning Map

## Perspective Framework
Every implementation decision was validated through three perspectives:

1. **CEO Perspective (Business Risk & Clarity)**
   - Prioritized proof of functionality and traceable documentation.
   - Emphasized deterministic tests over mocks to ensure repeatable outcomes.

2. **Junior Developer Perspective (Maintainability & Learnability)**
   - Shared utilities for test servers to minimize repetition.
   - Straightforward, readable assertions that match real product behaviors.

3. **End Customer Perspective (Reliability & Value)**
   - Confirmed that extraction outcomes match real web usage (images, video, audio, documents).
   - Ensured desktop GUI entry points are verifiable and available.

## Mapping to Logic Chains

### Logic Chain 1 — Realized Test Fixtures
- **CEO:** Real fixtures reduce risk of false positives from mocks.
- **Junior Dev:** A single reusable test server reduces cognitive overhead.
- **End Customer:** Actual extraction paths ensure the product behaves on real sites.

### Logic Chain 2 — Mathematical Rigor
- **CEO:** Ensures accuracy claims are defensible.
- **Junior Dev:** Explicit edge window tests prevent regressions in numeric utilities.
- **End Customer:** Predictable, bounded outputs reduce surprises in analysis output.

### Logic Chain 3 — Desktop GUI Proof
- **CEO:** Guarantees the GUI launch path is verifiably present.
- **Junior Dev:** Clear file checks and IPC validations make GUI maintenance safe.
- **End Customer:** Confirms the GUI can be executed without missing components.

## Decision Summary
We combined CEO-level risk reduction with developer clarity and customer reliability by using deterministic fixtures, edge-window mathematical validation, and direct GUI file validation. This yields provable, repeatable proofs across crawling, extraction, and interface layers.
