# Dashboard redesign (B-94 to B-102)

Brief: `docs/customers-direct-redesign-brief.md`. Decisions: D-86. Branch: `mvp-bugs-fixes` (the user's choice, 2026-10-27; changes left uncommitted for review).

| Task | What the user sees |
|---|---|
| B-94 Status and charts | One ahead or behind rule everywhere (`compareStatus`). Charts show each scan's own rate with a dashed 30-day line and a Y axis that fits the data. |
| B-95 Sidebar and routes | Grouped sidebar: Overview; Compete (Competitors, Compare); Improve (Actions, Reports); Visibility (Questions, Sources); Account (order set by the user). `/opportunities` goes to `/actions`, `/competitors/<id>` to Compare. |
| B-96 Competitors | No side panel. KPI strip (rank, leader, gap, next to pass), visibility over time, leaderboard table with top reason, sparkline, change, per-AI scores, status and Compare. Share of AI picks, By AI model and Google kept. Also recommended as cards. |
| B-97 Compare | Picker chips with scores and "Any business AI named", scorecard with gap and margin, per-AI dumbbell, per-scan trend, tabs: why ahead or behind (reason cards with fact, answer count, fix, where, impact, Add to Actions), Questions, Where AI looked, Website, Google with Retry. |
| B-98 Actions | Board with Suggested, To do, In progress, Done, Dismissed and a list view; filters for impact and where (the assignee filter is off for now); Accept and Dismiss; Add action; done date with "we will measure the effect". Migration 078. |
| B-99 Questions | KPI strip, filters and topics, per-AI pips, top pick, sites that skipped you, trend, inline answers with source chips, `?q=`, `?site=`, `?named=` links, CSV export. |
| B-100 Sources | Tool filter, own-site alert, KPI strip, Get listed here first with Add to Actions, finer kinds, competitor sites, all websites table. |
| B-101 Overview | Range control, KPI strip, visibility at each scan with the leader, score by AI tool with context, where you stand, top actions, questions that moved, where AI gets its answers. View report and Share go to Reports. |
| B-102 Reports | Live report and snapshots, share link per report, section toggles, PDF of the same 7 sections. |

Not built, by design: the Schedule button (needs a per-client email and cron), "Check now" for one question (no single-question check exists), a new logo upload (Settings already has one).
