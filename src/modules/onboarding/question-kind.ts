// The kind of business the question writer is given, without the business's own name (2026-10-14). For an industry
// outside the list, the user's own words go to the model ("Cheezious pizza place"), and a name in them came back in
// the questions ("Which Cheezious pizza place in Islamabad..."), which only this business can win. Pure.
/** The business as question writing sees it (questions.ts QuestionBusiness). */
type Named = { name?: string; aliases?: string[]; domain?: string | null; city: string };

// "Woman's" is "woman": a possessive name is still the name.
const key = (word: string) =>
  word
    .replace(/['’]s$/i, "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/** "cheezious" from "www.cheezious.com": the name a website spells. */
export function domainLabel(domain: string | null | undefined): string | null {
  const host = (domain ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/:?#]/)[0];
  const label = host.split(".")[0];
  return label && label.length >= 3 ? label : null;
}

/**
 * The kind with every one of `names` taken out, written as words ("Book Woman") or as one ("BookWoman"); "" when
 * nothing but the name was left. "Cheezious pizza place" with the name Cheezious is "pizza place".
 */
export function withoutNames(kind: string, names: (string | null | undefined)[]): string {
  const words = kind.split(/\s+/).filter(Boolean);
  const keys = words.map(key);
  const drop = new Set<number>();
  for (const name of names) {
    const parts = (name ?? "").split(/[\s\-_./]+/).map(key).filter(Boolean);
    if (parts.length === 0) continue;
    const squashed = parts.join("");
    for (let i = 0; i < keys.length; i++) {
      if (parts.every((p, j) => keys[i + j] === p)) for (let j = 0; j < parts.length; j++) drop.add(i + j);
      if (squashed.length >= 4 && keys[i] === squashed) drop.add(i);
    }
  }
  return words
    .filter((_, i) => !drop.has(i))
    .join(" ")
    .replace(/^[\s,&'’-]+|[\s,&'’-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** The business's own name, other names and the name its website spells. */
export function ownNames(b: Named): string[] {
  return [b.name, ...(b.aliases ?? []), domainLabel(b.domain)].filter((n): n is string => !!n?.trim());
}

/**
 * A question that names the business itself (its name, an other name or its website's name as whole words): only it
 * can win that one. Pure, so evals run it too; a false match only drops one of the writer's 20 drafts.
 */
export function namesOwnBusiness(text: string, b: Named): boolean {
  const words = text.replace(/[?.!,;:]/g, " ");
  return withoutNames(words, ownNames(b)) !== withoutNames(words, []);
}
