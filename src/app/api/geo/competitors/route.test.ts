import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const insert = vi.fn((rows: unknown[]) => ({ select: async () => ({ data: rows, error: null }) }));

// Just enough of the query builder for the ownership check, the duplicate check and the insert.
const table = (name: string) => {
  const rows = name === "businesses" ? { data: { id: "biz-1" } } : { data: [] };
  const chain = { select: () => chain, eq: () => chain, single: async () => rows, then: (ok: (v: unknown) => void) => ok(rows), insert };
  return chain;
};

vi.mock("@/lib/geo/api-auth", () => ({
  requireUser: async () => ({ user: { id: "user-1" }, supabase: { from: table }, unauthorized: null }),
}));

const { POST } = await import("./route");

describe("POST /api/geo/competitors", () => {
  it("stores the place id and never other Google Places fields (D-73)", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/geo/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: "biz-1",
          competitors: [
            {
              name: "Bean House",
              domain: "beanhouse.example",
              source: "google_places",
              place_id: "ChIJ-bean-house",
              formatted_address: "1 Main St, Springfield, IL",
              city: "Springfield",
              region: "IL",
              country: "US",
              latitude: 39.8,
              longitude: -89.6,
              category: "Coffee shop",
              phone: "(217) 555-0100",
              enrichment_status: "enriched",
            },
          ],
        }),
      }),
    );

    expect(res.status).toBe(200);
    expect(insert).toHaveBeenCalledWith([
      {
        business_id: "biz-1",
        name: "Bean House",
        domain: "beanhouse.example",
        source: "google_places",
        confirmed: true,
        place_id: "ChIJ-bean-house",
      },
    ]);
  });
});
