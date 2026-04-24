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
import type { ContactData, TenantConfig } from '@/types'

export type TenantLeadNotificationProps = {
  contact: ContactData
  answers: Record<string, string>
  tenantConfig: TenantConfig
  submittedAt?: Date
}

const dateTimeFormat = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function TenantLeadNotification({
  contact,
  answers,
  tenantConfig,
  submittedAt = new Date(),
}: TenantLeadNotificationProps) {
  const primary = tenantConfig.theme.primaryColor
  const visibleQuestions = tenantConfig.questions.filter((q) => q.visible)

  return (
    <Html>
      <Head />
      <Preview>Neue Anfrage von {contact.name}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading as="h1" style={{ ...styles.heading, color: primary }}>
            Neue Anfrage eingegangen
          </Heading>
          <Text style={styles.text}>
            Eingegangen: {dateTimeFormat.format(submittedAt)} Uhr
          </Text>

          <Section style={styles.contactBox}>
            <Heading as="h2" style={styles.subheading}>
              Kontaktdaten
            </Heading>
            <Text style={styles.contactRow}>
              <span style={styles.label}>Anrede:</span>{' '}
              <strong>{contact.anrede || '-'}</strong>
            </Text>
            <Text style={styles.contactRow}>
              <span style={styles.label}>Name:</span>{' '}
              <strong>{contact.name}</strong>
            </Text>
            <Text style={styles.contactRow}>
              <span style={styles.label}>E-Mail:</span>{' '}
              <Link href={`mailto:${contact.email}`} style={{ color: primary }}>
                {contact.email}
              </Link>
            </Text>
            <Text style={styles.contactRow}>
              <span style={styles.label}>Telefon:</span>{' '}
              <Link href={`tel:${contact.telefon}`} style={{ color: primary }}>
                {contact.telefon}
              </Link>
            </Text>
          </Section>

          <Heading as="h2" style={styles.subheading}>
            Antworten
          </Heading>
          {visibleQuestions.map((q) => {
            const selected = q.options.find((o) => o.value === answers[q.id])
            return (
              <Text key={q.id} style={styles.answerRow}>
                <span style={styles.label}>{q.title}</span>
                <br />
                <strong>{selected?.label ?? '-'}</strong>
              </Text>
            )
          })}

          <Hr style={styles.hr} />

          <Text style={styles.hint}>
            Kontaktieren Sie den Kunden zeitnah für maximale Abschlussrate.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default TenantLeadNotification

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
    fontSize: '22px',
    fontWeight: 'bold' as const,
    margin: '0 0 8px',
  },
  subheading: {
    fontSize: '15px',
    fontWeight: 'bold' as const,
    margin: '16px 0 8px',
    color: '#1f2937',
  },
  text: {
    fontSize: '13px',
    color: '#6b7280',
    margin: '0 0 16px',
  },
  contactBox: {
    backgroundColor: '#f9fafb',
    padding: '16px',
    borderRadius: '6px',
    margin: '0 0 16px',
  },
  contactRow: {
    fontSize: '14px',
    lineHeight: '20px',
    color: '#374151',
    margin: '0 0 4px',
  },
  answerRow: {
    fontSize: '13px',
    lineHeight: '18px',
    color: '#374151',
    margin: '0 0 10px',
    paddingBottom: '8px',
    borderBottom: '1px solid #f3f4f6',
  },
  label: {
    color: '#6b7280',
  },
  hr: {
    borderColor: '#e5e7eb',
    margin: '20px 0',
  },
  hint: {
    fontSize: '12px',
    color: '#6b7280',
    fontStyle: 'italic' as const,
    margin: '12px 0 0',
  },
}
