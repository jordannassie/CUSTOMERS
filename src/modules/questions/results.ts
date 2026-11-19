// What the question writes give back to the actions. Pure values, no database.

export type ChangeFailure = { ok: false; status: 400 | 403 | 404; error: string };
export type ChangeResult = { ok: true } | ChangeFailure;

export const notFound: ChangeFailure = { ok: false, status: 404, error: "We could not find that question. Refresh the page and try again." };
export const duplicate: ChangeFailure = { ok: false, status: 400, error: "You already track this question." };
