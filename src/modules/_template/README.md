# Module template

Copy this folder to `src/modules/<feature>/` and rename. Layout from MVP_SPEC 18 (D-59).

| File | Holds |
|---|---|
| `dal.ts` | `server-only`. The only file that reads the database or secrets. Checks access itself and returns only the fields the screen needs. |
| `actions.ts` | `"use server"` mutations. Call `requireUser()`, `requireAgency()` or `requireAdmin()` first, validate with the schema, then call the DAL. |
| `service.ts` | Pure business rules. No framework, database or env imports. |
| `schema.ts` | zod input and output shapes. |
| `index.ts` | The public surface. Other modules import only from here. |
| `server.ts` | Optional. The same, for server-only callers such as the scan worker: dal and service functions only, never Server Actions, `next/cache` or UI, so the worker bundle stays free of them. |
| `*.test.ts` | Vitest tests next to the code. |

Pages use the guards with `{ next: "/the/page" }` so logged-out visitors go to login and come back. Actions and route handlers call them without options and turn the `AuthError` into a 401 or 403 with `authFailure()` or `authErrorResponse()`.
