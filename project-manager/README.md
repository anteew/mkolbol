# Project Manager Hub

Purpose

- Central place for PM artifacts: roadmaps, sprint plans, meeting notes, decisions, and release notes.
- Complements engineering sprints tracked in `ampcode.md` and archived under `sprints/`.

Where things live

- Active sprint plan: `ampcode.md`
- Sprint archive: `sprints/`
- Engineering status vs plan: `docs/rfcs/stream-kernel/status.md`
- VEGA (agent notes, state, plans): `VEGA/README.md`

Suggested files (create as needed)

- `roadmap.md` — high-level goals and timelines
- `decision-log.md` — context and final calls (one-line index + details)
- `release-notes.md` — human-friendly summaries per release
- `onboarding.md` — quick start for new contributors
- `templates/` — reusable doc templates

Conventions

- Keep docs terse and actionable; link to code or RFCs for depth.
- Date prefix long-form notes (YYYY-MM-DD) when helpful.
- Use relative links to reference code, tests, or RFCs.

Quick checklist for PM

- Review `docs/rfcs/stream-kernel/status.md` for current alignment
- Track active sprint tasks in `ampcode.md`
- File new sprints in `sprints/` and rotate into `ampcode.md` when ready
- Add decisions to `project-manager/decision-log.md` with brief context
