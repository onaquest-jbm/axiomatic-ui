# For agents without skill support (Codex, Cursor, others)

Before building or changing UI in a project with a `model.json`, read in order:
1. `skills/axiomatic/SKILL.md` (the axiom and the method)
2. `skills/axiomatic-screen/SKILL.md` (plan, then build with meaning-named tokens)
3. After the change: `skills/axiomatic-verify/SKILL.md` (`axiomatic lint`, `axiomatic verify`, then look at the screenshots)

If there is no `model.json`, follow `skills/axiomatic-model/SKILL.md` and get the facts from the owner first. If the UI already exists, start with `skills/axiomatic-retrofit/SKILL.md` instead.
