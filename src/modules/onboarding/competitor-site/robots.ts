// Whether a site's robots.txt turns AI tools away (B-91 step 1). Pure: the file's text is passed in.

/** The crawlers ChatGPT, Claude and Perplexity use to read websites. */
export const AI_BOTS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "PerplexityBot"] as const;

type Group = { agents: string[]; disallowAll: boolean; allowAll: boolean };

function groups(text: string): Group[] {
  const out: Group[] = [];
  let current: Group | null = null;
  let lastWasAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const [, field, value] = m;
    const key = field.toLowerCase();
    if (key === "user-agent") {
      if (!current || !lastWasAgent) out.push((current = { agents: [], disallowAll: false, allowAll: false }));
      current.agents.push(value.trim().toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (key === "disallow" && value.trim() === "/") current.disallowAll = true;
    if (key === "allow" && value.trim() === "/") current.allowAll = true;
  }
  return out;
}

/** The AI crawlers the whole site is closed to. A bot's own group wins over the "*" group, as crawlers read it. */
export function aiBlocked(robotsTxt: string): string[] {
  const all = groups(robotsTxt);
  const closed = (g: Group | undefined) => !!g && g.disallowAll && !g.allowAll;
  const star = all.find((g) => g.agents.includes("*"));
  return AI_BOTS.filter((bot) => {
    const own = all.find((g) => g.agents.includes(bot.toLowerCase()));
    return own ? closed(own) : closed(star);
  });
}
