// The only file other modules may import from (eslint-plugin-boundaries).
export { sendEmail, type EmailLinks, type SendEmailDeps, type SendEmailInput, type SendEmailResult } from "./send";
export { renderEmail, type RenderedEmail } from "./render";
export { createLogEmailClient, type EmailClient } from "./resend";
export { findHandledEmailKeys, getMyEmailPreferences, readUnsubscribeToken, unsubscribeAgency } from "./dal";
export { saveEmailPreferences } from "./actions";
export { EMAIL_TYPES, UNSUBSCRIBE_TOPICS, type EmailPreferences, type EmailType } from "./schema";
export { EmailLayout } from "./templates/_components/layout";
export { EmailButton, EmailHeading, EmailText } from "./templates/_components/ui";
export { default as NoticeEmail, type NoticeEmailProps } from "./templates/notice";
export { default as WelcomeEmail } from "./templates/welcome";
export { default as TrialEndingEmail } from "./templates/trial-ending";
export { default as PaymentFailedEmail } from "./templates/payment-failed";
export { default as LowCreditsEmail, LOW_CREDITS_COPY, type LowCreditsLevel } from "./templates/low-credits";
export { default as WeeklyReportEmail, type WeeklyBusiness } from "./templates/weekly-report";
