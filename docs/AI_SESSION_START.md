# AI_SESSION_START

Use this prompt at the start of every new Claude Code session.

```text
PROJECT CONTINUATION MODE

Read PROJECT_MEMORY.md completely.

Treat it as the source of truth.

Do not rely on previous chat context.

Then verify:

- git status
- git log --oneline -10
- git branch --show-current
- git remote -v
- npm run typecheck

Compare repository reality to PROJECT_MEMORY.md.

Report:

1. Current State
2. Differences from PROJECT_MEMORY.md
3. Risks
4. Recommended Next Sprint

Do not modify code.
Do not create commits.
Do not install packages.

Output only the sprint proposal.
```
