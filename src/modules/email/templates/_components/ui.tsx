import type { ReactNode } from "react";
import { Button, Heading, Text } from "react-email";
import { colors, radius } from "./theme";

export function EmailHeading({ children }: { children: ReactNode }) {
  return (
    <Heading
      as="h1"
      style={{ color: colors.text, fontSize: "20px", fontWeight: 600, letterSpacing: "-0.02em", lineHeight: "28px", margin: "0 0 16px" }}
    >
      {children}
    </Heading>
  );
}

export function EmailText({ children }: { children: ReactNode }) {
  return <Text style={{ color: colors.text, fontSize: "15px", lineHeight: "24px", margin: "0 0 16px" }}>{children}</Text>;
}

export function EmailButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button
      href={href}
      style={{
        backgroundColor: colors.primary,
        borderRadius: radius,
        color: colors.surface,
        display: "inline-block",
        fontSize: "14px",
        fontWeight: 600,
        lineHeight: "20px",
        padding: "10px 16px",
        textDecoration: "none",
      }}
    >
      {children}
    </Button>
  );
}
