# Flags for review

Things the build could not settle on its own: checks that could not be run, decisions that need a person, and follow-ups. The leader session adds a row and keeps building; the team reviews this list together. Bugs go in [BUGS.md](../BUGS.md). Security items stay in the private notes while the repo is public and are listed here by ID only. [Back to index](./README.md)

| ID | Raised | Task | What needs a person | Status |
|---|---|---|---|---|
| F-01 | 2026-09-26 | B-09 (PR #21) | `/design-preview` has not been opened while logged in as an admin. The same component was checked from a temporary logged-out route at 1440 and 390, and logged-out visitors are redirected to login. Merged into `mvp` on that basis. Open it once with an admin account. | Open |
| F-02 | 2026-09-26 | B-08 (PR #23) | Hosting test (D-41): logged-in dashboard and admin were not checked on the Netlify preview, because it uses the live database and needs a live test login. Everything else passed there. | Open |
| F-03 | 2026-09-26 | B-06 (PR #22) | Security item S-1 (private notes) needs a decision; it affects the live site. | Open |
| F-04 | 2026-09-26 | B-24 | Mention detection eval needs answers labelled by people before it can start (eval rule: labels are never generated). | Open |
