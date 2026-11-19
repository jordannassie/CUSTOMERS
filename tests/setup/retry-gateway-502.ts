// CI flake BUG-017: right after a db reset the local Supabase gateway (Kong) can answer 502 "An invalid
// response was received from the upstream server" while PostgREST or auth reconnect. Retry only that response,
// once, and only for the local Supabase URL; every other failure still fails the test.
const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const realFetch = globalThis.fetch;
const RETRY_DELAY_MS = 500;

globalThis.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  // A Request body can be read only once, so keep a copy for the retry.
  const retryInput = input instanceof Request ? input.clone() : input;
  const res = await realFetch(input, init);
  if (!base || res.status !== 502 || !url.startsWith(base)) return res;
  if (!(await res.clone().text()).includes("invalid response was received from the upstream server")) return res;
  await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  return realFetch(retryInput, init);
};
