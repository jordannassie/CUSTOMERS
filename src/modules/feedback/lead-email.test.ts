import { describe, expect, it } from "vitest";
import { newLeadEmail, shouldEmailAdmins, type NewLead } from "./lead-email";

const lead: NewLead = {
  id: "lead-1",
  name: "Sarah Ortiz",
  email: "sarah@bloomsalon.com",
  company: "Bloom Salon",
  topic: "book_demo",
  source: "contact_page",
  message: "We run 2 salons in Austin and want to see if ChatGPT recommends us.",
};

describe("new lead email to admins", () => {
  it("names the person, how to reply, what it is about and links to Leads", async () => {
    const email = newLeadEmail(lead, "Admin@Example.com");
    expect(email).toMatchObject({ type: "system_alert", to: "Admin@Example.com", subject: "New lead: Sarah Ortiz (Bloom Salon)", agencyId: null });
    const html = JSON.stringify(email.template({ baseUrl: "https://customers.direct/", unsubscribeUrl: null }).props);
    expect(html).toContain("Sarah Ortiz (Bloom Salon) sent a message from the contact page. Reply to sarah@bloomsalon.com.");
    expect(html).toContain("About: Booking a demo call.");
    expect(html).toContain("https://customers.direct/internal/admin/leads");
  });

  it("is sent once per lead and admin, whatever the case of the address", () => {
    expect(newLeadEmail(lead, "Admin@Example.com").idempotencyKey).toBe("new_lead:lead-1:admin@example.com");
  });

  it("cuts a very long message; the full text is in Leads", () => {
    const long = { ...lead, message: "a".repeat(900) };
    const html = JSON.stringify(newLeadEmail(long, "a@b.co").template({ baseUrl: "https://x.co", unsubscribeUrl: null }).props);
    expect(html).toContain(`${"a".repeat(600)}…`);
    expect(html).not.toContain("a".repeat(601));
  });

  it("skips spam and security tests, which hold web code", () => {
    expect(shouldEmailAdmins(lead)).toBe(true);
    expect(shouldEmailAdmins({ ...lead, name: "QA SEC <img src=x onerror=alert(1)>" })).toBe(false);
    expect(shouldEmailAdmins({ ...lead, message: "hi </script><script>alert(1)</script>" })).toBe(false);
  });
});
