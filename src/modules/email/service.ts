import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { UNSUBSCRIBE_TOPICS, type UnsubscribeTopic } from "./schema";

const TOKEN_VERSION = "v1";
const uuid = z.uuid();

function signature(agencyId: string, topic: UnsubscribeTopic, secret: string): string {
  return createHmac("sha256", secret).update(`unsubscribe:${TOKEN_VERSION}:${agencyId}:${topic}`).digest("base64url");
}

/** A token for the unsubscribe link. It never expires, so an old email's link keeps working. */
export function signUnsubscribeToken(agencyId: string, topic: UnsubscribeTopic, secret: string): string {
  return `${TOKEN_VERSION}.${agencyId}.${topic}.${signature(agencyId, topic, secret)}`;
}

/** The agency and topic a token was made for, or null when it is malformed or the signature does not match. */
export function verifyUnsubscribeToken(
  token: string,
  secret: string,
): { agencyId: string; topic: UnsubscribeTopic } | null {
  const [version, agencyId, topic, sig, ...rest] = token.split(".");
  if (rest.length || version !== TOKEN_VERSION || !sig) return null;
  if (!uuid.safeParse(agencyId).success) return null;
  if (!(UNSUBSCRIBE_TOPICS as readonly string[]).includes(topic)) return null;

  const expected = Buffer.from(signature(agencyId, topic as UnsubscribeTopic, secret));
  const given = Buffer.from(sig);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return { agencyId, topic: topic as UnsubscribeTopic };
}

export function unsubscribeUrl(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/$/, "")}/email/unsubscribe?token=${encodeURIComponent(token)}`;
}
