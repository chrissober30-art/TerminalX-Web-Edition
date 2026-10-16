<!-- Describe the change and why it is needed -->

This pull request fixes URL matching logic in matchesPattern.js and keeps background.js in sync. It adds a small test runner and README instructions to validate the matcher.

---

Changes made:
- Fix wildcards in scheme, host and path handling
- Support file://, chrome://, and leading * patterns like https://*.example.com/*
- Added tests/tests/matchesPattern.test.js and README instructions

---

Testing:
Run: node tests/matchesPattern.test.js

---

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
