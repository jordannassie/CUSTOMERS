// The only file other modules may import from (eslint-plugin-boundaries).
export { sendEmail, type EmailLinks, type SendEmailDeps, type SendEmailInput, type SendEmailResult } from "./send";
export { renderEmail, type RenderedEmail } from "./render";
export { createLogEmailClient, type EmailClient } from "./resend";
export { getMyEmailPreferences, readUnsubscribeToken, unsubscribeAgency } from "./dal";
export { saveEmailPreferences } from "./actions";
export { EMAIL_TYPES, UNSUBSCRIBE_TOPICS, type EmailPreferences, type EmailType } from "./schema";
export { EmailLayout } from "./templates/_components/layout";
export { EmailButton, EmailHeading, EmailText } from "./templates/_components/ui";
export { default as NoticeEmail, type NoticeEmailProps } from "./templates/notice";
