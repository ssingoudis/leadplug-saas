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
import { resolveAnswer } from '@/lib/resolveAnswer'

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
      <Preview>Kontaktdaten und Antworten ansehen.</Preview>
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
            {tenantConfig.contactFields
              .filter((f) => f.visible)
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((field) => {
                const value = contact[field.key] ?? '-'
                const isEmail = field.type === 'email' && contact[field.key]
                const isTel   = field.type === 'tel'   && contact[field.key]
                return (
                  <Text key={field.key} style={styles.contactRow}>
                    <span style={styles.label}>{field.label}:</span>{' '}
                    {isEmail ? (
                      <Link href={`mailto:${value}`} style={{ color: primary }}>{value}</Link>
                    ) : isTel ? (
                      <Link href={`tel:${value}`} style={{ color: primary }}>{value}</Link>
                    ) : (
                      <strong>{value}</strong>
                    )}
                  </Text>
                )
              })
            }
          </Section>

          <Heading as="h2" style={styles.subheading}>
            Antworten
          </Heading>
          {visibleQuestions.map((q) => {
            const display = resolveAnswer(q, answers)
            return (
              <Text key={q.id} style={styles.answerRow}>
                <span style={styles.label}>{q.title}</span>
                <br />
                <strong>{display ?? '-'}</strong>
              </Text>
            )
          })}

          <Hr style={styles.hr} />
          <Text style={styles.footer}>
            Übermittelt von{' '}
            <Link href="https://leadplug.de" style={{ color: '#9ca3af' }}>
              leadplug.de
            </Link>
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
  footer: {
    fontSize: '11px',
    color: '#9ca3af',
    margin: '0',
    textAlign: 'center' as const,
  },
}
