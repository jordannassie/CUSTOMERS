import { describe, expect, it } from "vitest";
import { contactInput, featureRequestInput, featureStatusInput, leadsQuery, leadUpdateInput } from "./schema";
import { contactProblem, contactTopic, hashIp } from "./service";

describe("contact messages", () => {
  it("trims and cuts the fields as the form always did, and says what is missing", () => {
    const input = contactInput.parse({ name: "  Sam ", email: " SAM@Example.com ", message: "Hi", company: "", phone: 12, source: "fax" });
    expect(input).toMatchObject({ name: "Sam", email: "sam@example.com", company: null, phone: null, source: "other" });
    expect(contactProblem(input)).toBeNull();
    expect(contactProblem({ ...input, name: "" })).toBe("Enter your name.");
    expect(contactProblem({ ...input, email: "sam" })).toBe("Enter an email address like you@business.com.");
    expect(contactProblem({ ...input, message: "" })).toBe("Write a short message so we know how to help.");
  });

  it("reads the topic from the new or the old field, else other, and keeps only a hash of the address", () => {
    expect(contactTopic("book_demo", undefined)).toBe("book_demo");
    expect(contactTopic(undefined, "support")).toBe("support");
    expect(contactTopic("hack", undefined)).toBe("other");
    expect(hashIp("198.51.100.7")).toMatch(/^[0-9a-f]{64}$/);
    expect(hashIp("unknown")).toBeNull();
  });
});

describe("feature requests", () => {
  it("drops a business id that is not one, and cuts the page context", () => {
    expect(featureRequestInput.parse({ title: " Idea ", description: "More", businessId: "nope", pageContext: "x".repeat(300) })).toMatchObject({
      title: "Idea",
      businessId: undefined,
      pageContext: "x".repeat(200),
    });
    expect(featureStatusInput.safeParse({ id: "not-a-uuid", status: "new" }).success).toBe(false);
    expect(featureStatusInput.safeParse({ id: crypto.randomUUID(), status: "done" }).success).toBe(false);
  });
});

describe("admin leads", () => {
  it("reads the filters with safe defaults", () => {
    expect(leadsQuery.parse({ page: "0", unread: "1" })).toMatchObject({ page: 1, search: "", unread: "1" });
    expect(leadUpdateInput.safeParse({ id: "x" }).success).toBe(false);
    expect(leadUpdateInput.parse({ id: crypto.randomUUID(), status: "bogus", mark_read: true })).toMatchObject({ status: undefined, mark_read: true });
  });

  it("reads the follow-up filters and a lead id, dropping anything else", () => {
    const id = crypto.randomUUID();
    expect(leadsQuery.parse({ replied: "yes", handler: "Ann@Example.com", id })).toMatchObject({ replied: "yes", handler: "Ann@Example.com", id });
    expect(leadsQuery.parse({ handler: "none" })).toMatchObject({ handler: "none" });
    expect(leadsQuery.parse({ replied: "maybe", handler: "bob", id: "x" })).toMatchObject({ replied: undefined, handler: undefined, id: undefined });
  });
});
