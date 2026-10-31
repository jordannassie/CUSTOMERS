import type { ReactElement } from "react";
import { render, toPlainText } from "react-email";

export type RenderedEmail = { html: string; text: string };

/** HTML plus the plain text version every email carries (MVP_SPEC 10). */
export async function renderEmail(element: ReactElement): Promise<RenderedEmail> {
  const html = await render(element);
  return { html, text: toPlainText(html) };
}
