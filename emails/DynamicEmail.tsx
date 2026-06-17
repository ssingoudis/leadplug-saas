import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
} from "@react-email/components";

// =============================================================================
// Aufgabe 41 — Dynamische E-Mail-Shell
//
// Universelles Layout für alle email_subscriptions: Header-Banner mit Brand-Color,
// HTML-Body (von marked.js gerendert) als dangerouslySetInnerHTML, Footer.
//
// Optik bewusst kompatibel zu CustomerConfirmation.tsx / TenantLeadNotification.tsx,
// damit der Cutover von hartkodiert → dynamisch keine visuellen Brüche erzeugt.
// =============================================================================

export interface DynamicEmailProps {
  primaryColor: string;
  companyName: string;
  bodyHtml: string;
  preheader?: string;
}

export function DynamicEmail({
  primaryColor,
  companyName,
  bodyHtml,
  preheader,
}: DynamicEmailProps) {
  return (
    <Html>
      <Head />
      {preheader ? <Preview>{preheader}</Preview> : null}
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={{ ...styles.header, backgroundColor: primaryColor }}>
            <Heading style={styles.headerText}>{companyName}</Heading>
          </Section>
          <Section style={styles.content}>
            <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
          </Section>
          <Hr style={styles.hr} />
          <Section style={styles.footerSection}>
            <Link href="https://leadplug.de" style={styles.footerLink}>
              Übermittelt von leadplug.de
            </Link>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default DynamicEmail;

const styles = {
  body: {
    backgroundColor: "#f6f9fc",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    margin: 0,
    padding: "20px 0",
  },
  container: {
    backgroundColor: "#ffffff",
    margin: "0 auto",
    maxWidth: "600px",
    borderRadius: "8px",
    overflow: "hidden" as const,
  },
  header: {
    padding: "24px 28px",
  },
  headerText: {
    color: "#ffffff",
    fontSize: "18px",
    fontWeight: "bold" as const,
    margin: 0,
  },
  content: {
    padding: "28px 32px 24px",
    fontSize: "14px",
    lineHeight: "22px",
    color: "#374151",
  },
  hr: {
    borderColor: "#e5e7eb",
    margin: "0 24px",
  },
  footerSection: {
    padding: "14px 28px 18px",
    textAlign: "center" as const,
  },
  footerLink: {
    color: "#9ca3af",
    fontSize: "11px",
    textDecoration: "none" as const,
  },
};
