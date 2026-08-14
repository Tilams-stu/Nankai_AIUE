# Legacy Baseline

This folder stores non-secret baseline evidence for staged refactoring.

- `baseline-manifest.json` records file paths, sizes, and SHA-256 hashes from the pre-refactor project state.
- Secret-bearing source files are not copied here. Exposed credentials must be rotated outside the codebase.
- Old runtime files remain in their original locations until a later migration phase validates replacements.
