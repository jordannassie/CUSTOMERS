import { z } from "zod";

/**
 * A website's address as the icon route takes it: a bare host name ("yelp.com"), any case, with or without
 * "https://", "www." or a path. Normalized to the lower-case host without "www.", so one site is one cached icon.
 */
export function iconHost(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, "")
    .split(/[/?#:]/)[0]
    .replace(/^www\./, "");
}

const HOST = /^(?=.{3,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export const iconQuery = z.object({
  domain: z
    .string()
    .max(300)
    .transform(iconHost)
    .refine((host) => HOST.test(host), "Not a website address"),
});
