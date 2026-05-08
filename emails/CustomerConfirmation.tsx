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

export type CustomerConfirmationProps = {
  contact: ContactData
  answers: Record<string, string>
  tenantConfig: TenantConfig
}

export function CustomerConfirmation({
  contact,
  answers,
  tenantConfig,
}: CustomerConfirmationProps) {
  const primary = tenantConfig.theme.primaryColor
  const visibleQuestions = tenantConfig.questions.filter((q) => q.visible)

  return (
    <Html>
      <Head />
      <Preview>{tenantConfig.funnel.responseMessage}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>

          {/* Header Banner */}
          <Section style={{ ...styles.header, backgroundColor: primary }}>
            <Text style={styles.headerText}>{tenantConfig.companyName}</Text>
          </Section>

          {/* Content */}
          <Section style={styles.content}>
            <Heading as="h1" style={{ ...styles.heading, color: primary }}>
              Vielen Dank, {contact.name}!
            </Heading>

            <Text style={styles.text}>
              {tenantConfig.funnel.successMessage}
            </Text>

            <Text style={{ ...styles.text, color: '#6b7280' }}>
              {tenantConfig.funnel.responseMessage}
            </Text>

            {/* Antworten */}
            <Section style={{ ...styles.answersBox, borderLeftColor: primary }}>
              <Heading as="h2" style={styles.subheading}>
                Ihre Angaben im Überblick
              </Heading>
              {visibleQuestions.map((q) => {
                const display = resolveAnswer(q, answers)
                if (!display) return null
                return (
                  <Text key={q.id} style={styles.answerRow}>
                    <span style={styles.answerLabel}>
                      {q.title.replace('?', '')}:
                    </span>{' '}
                    <strong>{display}</strong>
                  </Text>
                )
              })}
            </Section>

            <Hr style={styles.hr} />

            {/* Kontakt */}
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
              <Link href={`mailto:${tenantConfig.publicEmail}`} style={{ color: primary }}>
                {tenantConfig.publicEmail}
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
          </Section>


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
    maxWidth: '600px',
    borderRadius: '8px',
    overflow: 'hidden' as const,
  },
  header: {
    padding: '28px 32px',
  },
  headerText: {
    color: '#ffffff',
    fontSize: '20px',
    fontWeight: 'bold' as const,
    margin: '0',
  },
  content: {
    padding: '32px 32px 24px',
  },
  heading: {
    fontSize: '28px',
    fontWeight: 'bold' as const,
    margin: '0 0 16px',
  },
  subheading: {
    fontSize: '15px',
    fontWeight: 'bold' as const,
    margin: '0 0 10px',
    color: '#1f2937',
  },
  text: {
    fontSize: '14px',
    lineHeight: '22px',
    color: '#374151',
    margin: '0 0 12px',
  },
  answersBox: {
    backgroundColor: '#f9fafb',
    padding: '16px 20px',
    borderRadius: '4px',
    borderLeft: '4px solid',
    margin: '16px 0',
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
  footer: {
    backgroundColor: '#f9fafb',
    padding: '16px 32px',
    borderTop: '1px solid #e5e7eb',
  },
  footerText: {
    fontSize: '12px',
    color: '#9ca3af',
    margin: '0 0 4px',
    lineHeight: '18px',
  },
  footerLink: {
    color: '#9ca3af',
  },
}
