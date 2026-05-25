# Feature Folders

Feature folders are the migration target for code currently concentrated in `src/main.jsx`.

Rules:

- Product behavior belongs in a feature folder first.
- Shared logic belongs in `src/shared` or `src/core`, not copied between features.
- UI shells can stay in `src/main.jsx` temporarily, but each extraction should move one complete workflow behind a feature index.
- Every feature should expose a small public surface through `index.js`.
