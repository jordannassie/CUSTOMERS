// Development only. React's Server Components timing track (react-server-dom, used by Next 16.3 to 16.4) records a
// server component that stopped with redirect() as "errored", using times from Next's dev prerender. Those can be
// earlier than the page's own start, and React clamps the start time to 0 but not the end, so
// performance.measure() throws "'<Name> [Prerender]' cannot have a negative time stamp" and the dev overlay shows
// it for every redirecting page. This clamps both times to 0 before the browser sees them. Production builds have
// no such timing calls, so the root layout adds this script only in development.
export const DEV_MEASURE_GUARD = `(() => {
  const measure = performance.measure.bind(performance);
  performance.measure = (name, options, end) => {
    if (options && typeof options === "object") {
      const fixed = { ...options };
      if (typeof fixed.start === "number" && fixed.start < 0) fixed.start = 0;
      if (typeof fixed.end === "number" && fixed.end < 0) fixed.end = 0;
      return measure(name, fixed);
    }
    return measure(name, options, end);
  };
})();`;
