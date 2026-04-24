import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
  type DocumentProps,
} from '@react-pdf/renderer'
import { createElement, type ReactElement } from 'react'
import type { ContactData, TenantConfig } from '@/types'

type PriceEstimate = { min: number; max: number; currency: string }

type GeneratePDFParams = {
  contact: ContactData
  answers: Record<string, string>
  estimate: PriceEstimate
  tenantConfig: TenantConfig
}

const DATE_FORMATTER = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

function getAnswerLabel(
  tenantConfig: TenantConfig,
  questionId: string,
  value: string | undefined,
): string {
  const question = tenantConfig.questions.find((q) => q.id === questionId)
  if (!question || value === undefined) return '-'
  return question.options.find((o) => o.value === value)?.label ?? value
}

function buildStyles(primaryColor: string) {
  return StyleSheet.create({
    page: {
      padding: 40,
      fontSize: 11,
      fontFamily: 'Helvetica',
      color: '#1f2937',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 24,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#e5e7eb',
    },
    companyBlock: {
      flexDirection: 'column',
    },
    companyName: {
      fontSize: 14,
      fontFamily: 'Helvetica-Bold',
      marginBottom: 4,
    },
    companyLine: {
      fontSize: 9,
      color: '#6b7280',
      marginBottom: 2,
    },
    title: {
      fontSize: 18,
      fontFamily: 'Helvetica-Bold',
      marginBottom: 16,
      color: primaryColor,
    },
    sectionTitle: {
      fontSize: 12,
      fontFamily: 'Helvetica-Bold',
      marginBottom: 6,
      marginTop: 10,
    },
    infoBlock: {
      backgroundColor: '#f9fafb',
      padding: 10,
      borderRadius: 4,
      marginBottom: 12,
    },
    infoRow: {
      flexDirection: 'row',
      marginBottom: 3,
    },
    infoLabel: {
      width: 80,
      color: '#6b7280',
    },
    infoValue: {
      flex: 1,
    },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 6,
      borderBottomWidth: 0.5,
      borderBottomColor: '#e5e7eb',
    },
    tableQuestion: {
      flex: 2,
      paddingRight: 8,
      color: '#6b7280',
    },
    tableAnswer: {
      flex: 1,
      fontFamily: 'Helvetica-Bold',
    },
    priceBox: {
      marginTop: 18,
      padding: 16,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: primaryColor,
      backgroundColor: `${primaryColor}15`,
      alignItems: 'center',
    },
    priceLabel: {
      fontSize: 10,
      color: '#6b7280',
      marginBottom: 4,
    },
    priceValue: {
      fontSize: 20,
      fontFamily: 'Helvetica-Bold',
      color: primaryColor,
    },
    disclaimer: {
      marginTop: 16,
      fontSize: 9,
      color: '#6b7280',
      fontStyle: 'italic',
      lineHeight: 1.5,
    },
    footer: {
      position: 'absolute',
      bottom: 30,
      left: 40,
      right: 40,
      paddingTop: 8,
      borderTopWidth: 0.5,
      borderTopColor: '#e5e7eb',
      fontSize: 8,
      color: '#9ca3af',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
  })
}

function buildDocument(params: GeneratePDFParams): ReactElement<DocumentProps> {
  const { contact, answers, estimate, tenantConfig } = params
  const styles = buildStyles(tenantConfig.theme.primaryColor)
  const today = DATE_FORMATTER.format(new Date())

  const visibleQuestions = tenantConfig.questions.filter((q) => q.visible)

  const headerChildren: ReactElement[] = [
    createElement(
      View,
      { style: styles.companyBlock, key: 'company' },
      createElement(Text, { style: styles.companyName }, tenantConfig.companyName),
      tenantConfig.address
        ? createElement(Text, { style: styles.companyLine, key: 'addr' }, tenantConfig.address)
        : null,
      tenantConfig.phone
        ? createElement(Text, { style: styles.companyLine, key: 'phone' }, `Tel.: ${tenantConfig.phone}`)
        : null,
      createElement(Text, { style: styles.companyLine, key: 'email' }, tenantConfig.contactEmail),
    ),
    createElement(
      View,
      { key: 'date' },
      createElement(Text, { style: styles.companyLine }, `Datum: ${today}`),
    ),
  ]

  const contactRows = [
    ['Anrede', contact.anrede || '-'],
    ['Name', contact.name],
    ['E-Mail', contact.email],
    ['Telefon', contact.telefon],
  ].map(([label, value], i) =>
    createElement(
      View,
      { style: styles.infoRow, key: `c${i}` },
      createElement(Text, { style: styles.infoLabel }, label),
      createElement(Text, { style: styles.infoValue }, value),
    ),
  )

  const answerRows = visibleQuestions.map((q, i) =>
    createElement(
      View,
      { style: styles.tableRow, key: `q${i}` },
      createElement(Text, { style: styles.tableQuestion }, q.title),
      createElement(
        Text,
        { style: styles.tableAnswer },
        getAnswerLabel(tenantConfig, q.id, answers[q.id]),
      ),
    ),
  )

  const priceLine = `ca. ${formatCurrency(estimate.min, estimate.currency)} – ${formatCurrency(estimate.max, estimate.currency)}`

  const pageChildren: ReactElement[] = [
    createElement(View, { style: styles.header, key: 'header' }, ...headerChildren),
    createElement(
      Text,
      { style: styles.title, key: 'title' },
      `Vorläufige Preisschätzung – Solar-Anfrage vom ${today}`,
    ),
    createElement(
      Text,
      { style: styles.sectionTitle, key: 'ct' },
      'Ihre Kontaktdaten',
    ),
    createElement(View, { style: styles.infoBlock, key: 'cb' }, ...contactRows),
    createElement(
      Text,
      { style: styles.sectionTitle, key: 'at' },
      'Ihre Angaben',
    ),
    createElement(View, { key: 'ab' }, ...answerRows),
    createElement(
      View,
      { style: styles.priceBox, key: 'pb' },
      createElement(Text, { style: styles.priceLabel }, 'Vorläufige Preisschätzung'),
      createElement(Text, { style: styles.priceValue }, priceLine),
    ),
    createElement(
      Text,
      { style: styles.disclaimer, key: 'disc' },
      'Diese Schätzung ist unverbindlich und dient als erste Orientierung. Ein verbindliches Angebot erhalten Sie nach einer kostenlosen Beratung durch unser Team.',
    ),
    createElement(
      View,
      { style: styles.footer, key: 'footer', fixed: true },
      createElement(Text, null, tenantConfig.companyName),
      createElement(Text, null, `Erstellt am ${today}`),
    ),
  ]

  return createElement(
    Document,
    null,
    createElement(Page, { size: 'A4', style: styles.page }, ...pageChildren),
  )
}

export async function generatePDF(
  params: GeneratePDFParams,
): Promise<Buffer> {
  const doc = buildDocument(params)
  return renderToBuffer(doc)
}
