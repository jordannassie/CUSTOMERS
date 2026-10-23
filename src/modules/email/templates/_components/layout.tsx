import type { ReactNode } from "react";
import { Body, Container, Head, Hr, Html, Img, Link, Preview, Section, Text } from "react-email";
import { colors, fontFamily, radius } from "./theme";

export type EmailLayoutProps = {
  /** The line mail apps show next to the subject. */
  preview: string;
  /** The app's address, for the logo and the settings link. */
  baseUrl: string;
  /** Set for emails a user can turn off (the weekly report). */
  unsubscribeUrl?: string | null;
  children: ReactNode;
};

export function EmailLayout({ preview, baseUrl, unsubscribeUrl, children }: EmailLayoutProps) {
  const base = baseUrl.replace(/\/$/, "");
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: colors.background, fontFamily, margin: 0, padding: "32px 12px" }}>
        <Container style={{ maxWidth: "560px", margin: "0 auto" }}>
          <Section style={{ padding: "0 4px 20px" }}>
            {/* Exported at 2x its display size (UI-034); the full-size logo is 2172px wide. */}
            <Img src={`${base}/images/logos/logo-email.png`} width="144" height="48" alt="Customers.Direct" />
          </Section>
          <Section
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: radius,
              padding: "32px",
            }}
          >
            {children}
          </Section>
          <Section style={{ padding: "20px 4px 0" }}>
            <Text style={footerText}>
              Customers.Direct shows whether AI assistants recommend your business, and how to get recommended.
            </Text>
            <Text style={footerText}>
              <Link href={`${base}/settings`} style={footerLink}>
                Email settings
              </Link>
              {unsubscribeUrl ? (
                <>
                  {"  |  "}
                  <Link href={unsubscribeUrl} style={footerLink}>
                    Unsubscribe from weekly reports
                  </Link>
                </>
              ) : null}
            </Text>
            <Hr style={{ borderColor: colors.border, margin: "16px 0 0" }} />
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const footerText = { color: colors.textHint, fontSize: "12px", lineHeight: "18px", margin: "0 0 8px" };
const footerLink = { color: colors.textSecondary, textDecoration: "underline" };
