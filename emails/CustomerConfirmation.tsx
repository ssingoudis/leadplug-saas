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
      <Preview>Ihre Anfrage bei {tenantConfig.companyName}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading as="h1" style={{ ...styles.heading, color: primary }}>
            Vielen Dank, {contact.name}!
          </Heading>

          <Text style={styles.text}>
            {tenantConfig.funnel.successMessage}
          </Text>

          <Section style={styles.answersBox}>
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
          </Section>

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
    margin: '0 0 8px',
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
    padding: '16px',
    borderRadius: '6px',
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
}
