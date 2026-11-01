import { BlockList, isIP } from "node:net";

// Anything that is not the public internet: private, loopback, link-local, CGNAT, documentation,
// benchmarking, multicast and reserved ranges.
const V4_BLOCKED = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  V4_BLOCKED.addSubnet(net, prefix, "ipv4");
}

// Only 2000::/3 is global unicast; inside it, these ranges are not reachable public hosts.
const V6_GLOBAL = new BlockList();
V6_GLOBAL.addSubnet("2000::", 3, "ipv6");
const V6_BLOCKED = new BlockList();
for (const [net, prefix] of [
  ["2001::", 23],
  ["2001:db8::", 32],
  ["3fff::", 20],
] as const) {
  V6_BLOCKED.addSubnet(net, prefix, "ipv6");
}

/** Expands an IPv6 address (with or without a dotted IPv4 tail) into 8 16-bit groups. */
function v6Groups(address: string): number[] | null {
  let text = address.toLowerCase();
  const dotted = text.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) {
    const [a, b, c, d] = dotted[1].split(".").map(Number);
    text = text.slice(0, -dotted[1].length) + `${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const [head, tail] = text.split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const fill = text.includes("::") ? 8 - left.length - right.length : 0;
  const groups = [...left, ...Array(fill).fill("0"), ...right].map((g) => parseInt(g, 16));
  return groups.length === 8 && groups.every((g) => g >= 0 && g <= 0xffff) ? groups : null;
}

function v4From(high: number, low: number): string {
  return [high >> 8, high & 0xff, low >> 8, low & 0xff].join(".");
}

/** The IPv4 address hidden inside a mapped, NAT64 or 6to4 IPv6 address, if any. */
function embeddedV4(g: number[]): string | null {
  const zeros = (from: number, to: number) => g.slice(from, to).every((x) => x === 0);
  if (zeros(0, 5) && g[5] === 0xffff) return v4From(g[6], g[7]);
  if (g[0] === 0x64 && g[1] === 0xff9b && zeros(2, 6)) return v4From(g[6], g[7]);
  if (g[0] === 0x2002) return v4From(g[1], g[2]);
  return null;
}

/** True only for addresses on the public internet. Anything unparseable counts as not public. */
export function isPublicAddress(raw: string): boolean {
  const address = raw.replace(/^\[|\]$/g, "");
  const version = isIP(address);
  if (version === 4) return !V4_BLOCKED.check(address, "ipv4");
  if (version !== 6 || address.includes("%")) return false;
  const groups = v6Groups(address);
  if (!groups) return false;
  const v4 = embeddedV4(groups);
  if (v4) return !V4_BLOCKED.check(v4, "ipv4");
  return V6_GLOBAL.check(address, "ipv6") && !V6_BLOCKED.check(address, "ipv6");
}
