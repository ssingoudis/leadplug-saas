import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { ContactData } from '@/types'

type PlatformTrackingProps = {
  tenantSlug: string
  companyName: string
  contact: ContactData
  submittedAt?: Date
  monthlyCount: number
  amountPerSubmission?: number
}

const currencyFormat = (value: number) =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

const dateTimeFormat = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function PlatformTracking({
  tenantSlug,
  companyName,
  contact,
  submittedAt = new Date(),
  monthlyCount,
  amountPerSubmission = 0.1,
}: PlatformTrackingProps) {
  const totalAmount = monthlyCount * amountPerSubmission

  return (
    <Html>
      <Head />
      <Preview>
        [TRACKING] Submission – {tenantSlug} – {dateTimeFormat.format(submittedAt)}
      </Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading as="h1" style={styles.heading}>
            📊 Submission Tracking
          </Heading>

          <Section style={styles.box}>
            <Text style={styles.row}>
              <span style={styles.label}>Tenant:</span>{' '}
              <strong>{tenantSlug}</strong> ({companyName})
            </Text>
            <Text style={styles.row}>
              <span style={styles.label}>Zeitstempel:</span>{' '}
              <strong>{dateTimeFormat.format(submittedAt)}</strong>
            </Text>
          </Section>

          <Heading as="h2" style={styles.subheading}>
            Kontaktdaten (Audit)
          </Heading>
          <Section style={styles.box}>
            <Text style={styles.row}>
              <span style={styles.label}>Name:</span>{' '}
              <strong>{contact.name}</strong>
            </Text>
            <Text style={styles.row}>
              <span style={styles.label}>E-Mail:</span>{' '}
              <strong>{contact.email}</strong>
            </Text>
            <Text style={styles.row}>
              <span style={styles.label}>Telefon:</span>{' '}
              <strong>{contact.telefon}</strong>
            </Text>
          </Section>

          <Hr style={styles.hr} />

          <Heading as="h2" style={styles.subheading}>
            Monatszähler
          </Heading>
          <Section style={styles.billingBox}>
            <Text style={styles.row}>
              <span style={styles.label}>Submissions diesen Monat:</span>{' '}
              <strong>{monthlyCount}</strong>
            </Text>
            <Text style={styles.row}>
              <span style={styles.label}>Gebühr pro Submission:</span>{' '}
              <strong>{currencyFormat(amountPerSubmission)}</strong>
            </Text>
            <Text style={styles.totalRow}>
              <span style={styles.label}>Betrag aktuell:</span>{' '}
              <strong>
                {monthlyCount} × {currencyFormat(amountPerSubmission)} ={' '}
                {currencyFormat(totalAmount)}
              </strong>
            </Text>
          </Section>

          <Text style={styles.hint}>
            Diese Mail ist ein menschlich lesbares Audit-Log. Primäre
            Abrechnungsquelle ist Supabase.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default PlatformTracking

const styles = {
  body: {
    backgroundColor: '#f6f9fc',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace',
  },
  container: {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '32px 24px',
    maxWidth: '600px',
    borderRadius: '8px',
  },
  heading: {
    fontSize: '20px',
    fontWeight: 'bold' as const,
    margin: '0 0 16px',
    color: '#1f2937',
  },
  subheading: {
    fontSize: '14px',
    fontWeight: 'bold' as const,
    margin: '16px 0 8px',
    color: '#1f2937',
  },
  box: {
    backgroundColor: '#f9fafb',
    padding: '12px 16px',
    borderRadius: '6px',
    margin: '0 0 12px',
  },
  billingBox: {
    backgroundColor: '#fef3c7',
    padding: '16px',
    borderRadius: '6px',
    border: '1px solid #fcd34d',
    margin: '0 0 12px',
  },
  row: {
    fontSize: '13px',
    lineHeight: '20px',
    color: '#374151',
    margin: '0 0 4px',
  },
  totalRow: {
    fontSize: '14px',
    lineHeight: '22px',
    color: '#92400e',
    margin: '8px 0 0',
    paddingTop: '8px',
    borderTop: '1px solid #fcd34d',
  },
  label: {
    color: '#6b7280',
  },
  hr: {
    borderColor: '#e5e7eb',
    margin: '20px 0',
  },
  hint: {
    fontSize: '11px',
    color: '#9ca3af',
    fontStyle: 'italic' as const,
    margin: '12px 0 0',
  },
}
