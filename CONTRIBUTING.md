# Contributing to HireLens

Bug reports, documentation improvements, and focused code contributions are welcome.
Start with the [README](README.md#quick-start) to run the application locally.

## Report a bug or propose a feature

Use the repository's issue templates. Include reproduction steps and the expected
result for bugs, or the user problem and proposed behavior for features.
Use fictional candidate data in reports and screenshots; remove API keys and tokens.

## Make a change

1. Fork the repository and create a branch from `main`.
2. Keep the change focused on one problem.
3. Follow the existing Python and TypeScript conventions.
4. Add or update tests when changing application behavior.
5. Update documentation when setup, configuration, or user behavior changes.
6. Open a pull request describing the problem, solution, and validation.

For schema changes, include an Alembic migration. If backend runtime dependencies
change, keep `backend/requirements.txt` and `backend/pyproject.toml` aligned.

## Validation

From `backend/`, with development dependencies installed:

```bash
ruff check .
pytest -q
```

From `frontend/`, after `npm ci`:

```bash
npm run lint
npm run typecheck
npm run build
```

For documentation-only changes, check links, commands, and rendered Markdown.
Include screenshots for visible interface changes and describe any checks you could not run.
