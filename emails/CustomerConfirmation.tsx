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
  Text,
} from '@react-email/components'
import type { ContactData, PriceEstimate, TenantConfig } from '@/types'

type CustomerConfirmationProps = {
  contact: ContactData
  answers: Record<string, string>
  estimate: PriceEstimate
  tenantConfig: TenantConfig
}

const currencyFormat = (value: number, currency: string) =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)

export function CustomerConfirmation({
  contact,
  answers,
  estimate,
  tenantConfig,
}: CustomerConfirmationProps) {
  const primary = tenantConfig.theme.primaryColor
  const visibleQuestions = tenantConfig.questions.filter((q) => q.visible)
  const priceLine = `ca. ${currencyFormat(estimate.min, estimate.currency)} – ${currencyFormat(estimate.max, estimate.currency)}`

  return (
    <Html>
      <Head />
      <Preview>Ihre Solar-Preisschätzung von {tenantConfig.companyName}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading as="h1" style={{ ...styles.heading, color: primary }}>
            Vielen Dank für Ihre Anfrage, {contact.name}!
          </Heading>

          <Text style={styles.text}>
            wir freuen uns über Ihr Interesse an einer Solaranlage. Im Anhang
            finden Sie Ihre unverbindliche Preisschätzung als PDF.
          </Text>

          <Section
            style={{
              ...styles.priceBox,
              borderColor: primary,
              backgroundColor: `${primary}15`,
            }}
          >
            <Text style={styles.priceLabel}>Ihre vorläufige Preisschätzung</Text>
            <Text style={{ ...styles.priceValue, color: primary }}>
              {priceLine}
            </Text>
          </Section>

          <Heading as="h2" style={styles.subheading}>
            Ihre Angaben im Überblick
          </Heading>
          {visibleQuestions.map((q) => {
            const selected = q.options.find((o) => o.value === answers[q.id])
            return (
              <Text key={q.id} style={styles.answerRow}>
                <span style={styles.answerLabel}>
                  {q.title.replace('?', '')}:
                </span>{' '}
                <strong>{selected?.label ?? '-'}</strong>
              </Text>
            )
          })}

          <Hr style={styles.hr} />

          <Text style={styles.text}>
            <strong>Ihr Ansprechpartner:</strong>
            <br />
            {tenantConfig.companyName}
            {tenantConfig.phone && (
              <>
                <br />
                Tel.: {tenantConfig.phone}
              </>
            )}
            <br />
            <Link href={`mailto:${tenantConfig.contactEmail}`} style={{ color: primary }}>
              {tenantConfig.contactEmail}
            </Link>
            {tenantConfig.website && (
              <>
                <br />
                <Link href={tenantConfig.website} style={{ color: primary }}>
                  {tenantConfig.website}
                </Link>
              </>
            )}
          </Text>

          <Text style={styles.disclaimer}>
            Diese Schätzung ist unverbindlich und dient als erste Orientierung.
            Wir melden uns in Kürze bei Ihnen mit einem individuellen Angebot.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default CustomerConfirmation

const styles = {
  body: {
    backgroundColor: '#f6f9fc',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  container: {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '32px 24px',
    maxWidth: '600px',
    borderRadius: '8px',
  },
  heading: {
    fontSize: '24px',
    fontWeight: 'bold' as const,
    margin: '0 0 16px',
  },
  subheading: {
    fontSize: '16px',
    fontWeight: 'bold' as const,
    margin: '24px 0 8px',
    color: '#1f2937',
  },
  text: {
    fontSize: '14px',
    lineHeight: '22px',
    color: '#374151',
    margin: '0 0 12px',
  },
  priceBox: {
    padding: '20px',
    borderRadius: '8px',
    borderWidth: '2px',
    borderStyle: 'solid',
    textAlign: 'center' as const,
    margin: '20px 0',
  },
  priceLabel: {
    fontSize: '12px',
    color: '#6b7280',
    margin: '0 0 4px',
  },
  priceValue: {
    fontSize: '22px',
    fontWeight: 'bold' as const,
    margin: 0,
  },
  answerRow: {
    fontSize: '13px',
    lineHeight: '20px',
    color: '#374151',
    margin: '0 0 4px',
  },
  answerLabel: {
    color: '#6b7280',
  },
  hr: {
    borderColor: '#e5e7eb',
    margin: '24px 0',
  },
  disclaimer: {
    fontSize: '11px',
    color: '#9ca3af',
    fontStyle: 'italic' as const,
    lineHeight: '16px',
    marginTop: '16px',
  },
}
