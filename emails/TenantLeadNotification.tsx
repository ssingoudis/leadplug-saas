import {
  Body,
  Button,
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
  const visibleContactFields = [...tenantConfig.contactFields]
    .filter((f) => f.visible)
    .sort((a, b) => a.sort_order - b.sort_order)

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://app.leadplug.de'
  const dashboardUrl = `${baseUrl}/dashboard`

  return (
    <Html>
      <Head />
      <Preview>Neue Anfrage von {contact.name ?? 'einem Interessenten'}</Preview>
      <Body style={styles.body}>
        <Container style={styles.outerContainer}>

          {/* Header Banner */}
          <Section style={{ backgroundColor: primary, padding: '24px 28px', borderRadius: '8px 8px 0 0' }}>
            <Heading style={{ color: '#ffffff', fontSize: '18px', fontWeight: 'bold', margin: 0 }}>
              {tenantConfig.companyName}
            </Heading>
          </Section>

          {/* Content */}
          <Section style={styles.content}>
            <Heading as="h1" style={{ ...styles.heading, color: primary }}>
              Neue Anfrage eingegangen!
            </Heading>
            <Text style={styles.subtext}>
              Eingegangen: {dateTimeFormat.format(submittedAt)} Uhr
            </Text>

            {/* Kontaktdaten */}
            <Section style={{ ...styles.box, borderLeft: `4px solid ${primary}` }}>
              <Heading as="h2" style={styles.boxHeading}>Kontaktdaten:</Heading>
              {visibleContactFields.map((field) => {
                const value = contact[field.key] ?? '—'
                const isEmail = field.type === 'email' && contact[field.key]
                const isTel   = field.type === 'tel'   && contact[field.key]
                return (
                  <Text key={field.key} style={styles.row}>
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
              })}
            </Section>

            {/* Antworten */}
            <Section style={styles.box}>
              <Heading as="h2" style={styles.boxHeading}>
                {tenantConfig.funnel.answersOverviewLabel || 'Angaben im Überblick:'}
              </Heading>
              {visibleQuestions.map((q) => {
                const display = resolveAnswer(q, answers)
                return (
                  <Text key={q.id} style={styles.row}>
                    <span style={styles.label}>{q.title.replace('?', '')}:</span>{' '}
                    <strong>{display ?? '—'}</strong>
                  </Text>
                )
              })}
            </Section>

            {/* CTA */}
            <Section style={{ textAlign: 'center', margin: '20px 0 8px' }}>
              <Button
                href={dashboardUrl}
                style={{
                  backgroundColor: primary,
                  color: '#ffffff',
                  padding: '12px 28px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                Lead im Dashboard ansehen →
              </Button>
            </Section>
          </Section>

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
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  outerContainer: {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    maxWidth: '600px',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  content: {
    padding: '28px 28px 20px',
  },
  heading: {
    fontSize: '20px',
    fontWeight: 'bold' as const,
    margin: '0 0 6px',
  },
  subtext: {
    fontSize: '13px',
    color: '#6b7280',
    margin: '0 0 20px',
  },
  box: {
    backgroundColor: '#f9fafb',
    padding: '14px 18px',
    borderRadius: '6px',
    marginBottom: '16px',
  },
  boxHeading: {
    fontSize: '13px',
    fontWeight: 'bold' as const,
    margin: '0 0 10px',
    color: '#1f2937',
  },
  row: {
    fontSize: '13px',
    color: '#374151',
    margin: '0 0 4px',
    lineHeight: '20px',
  },
  label: {
    color: '#6b7280',
  },
  hr: {
    borderColor: '#e5e7eb',
    margin: '0 24px',
  },
  footer: {
    fontSize: '11px',
    color: '#9ca3af',
    margin: '12px 0',
    textAlign: 'center' as const,
  },
}
