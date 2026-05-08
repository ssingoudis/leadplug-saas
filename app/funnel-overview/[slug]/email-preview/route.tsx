import { createClient } from '@supabase/supabase-js'
import type { SliderConfig } from '@/types'

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const supabaseUrl = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !key) return new Response('Config missing', { status: 500 })

  const supabase = createClient(supabaseUrl, key)

  const { data: funnel } = await supabase
    .from('funnels')
    .select(`
      slug, success_message, response_message, primary_color,
      tenants ( company_name, public_email, public_phone, address, website ),
      funnel_questions ( sort_order, question_key, title, question_type, visible, options, config )
    `)
    .eq('slug', slug)
    .maybeSingle()

  if (!funnel) return new Response('Not found', { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenant = (funnel.tenants as Record<string, any>) ?? {}
  const primary: string = funnel.primary_color ?? '#4648d4'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const questions: any[] = ((funnel.funnel_questions as any[]) ?? [])
    .filter((q) => q.visible)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

  // Build placeholder answers with resolved display labels
  const answerRows = questions.map((q) => {
    let display = ''
    if (q.question_type === 'single_choice' || q.question_type === 'multiple_choice') {
      display = (q.options as { label: string; value: string }[])[0]?.label ?? '—'
    } else if (q.question_type === 'slider') {
      const cfg = q.config as SliderConfig
      const val = cfg.default ?? cfg.min ?? 0
      display = `${val.toLocaleString('de-DE')}${cfg.unit ? ' ' + cfg.unit : ''}`
    } else {
      display = 'Beispiel-Antwort'
    }
    return `<p style="font-size:13px;line-height:20px;color:#374151;margin:0 0 4px">
      <span style="color:#6b7280">${q.title.replace('?', '')}:</span> <strong>${display}</strong>
    </p>`
  }).join('')

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background-color:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:20px 0">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden">

    <div style="padding:28px 32px;background-color:${primary}">
      <p style="color:#fff;font-size:20px;font-weight:bold;margin:0">${tenant.company_name ?? ''}</p>
    </div>

    <div style="padding:32px 32px 24px">
      <h1 style="font-size:28px;font-weight:bold;color:${primary};margin:0 0 16px">Vielen Dank, Max Mustermann!</h1>

      <p style="font-size:14px;line-height:22px;color:#374151;margin:0 0 12px">${funnel.success_message ?? ''}</p>

      <p style="font-size:14px;line-height:22px;color:#6b7280;margin:0 0 12px">
        ${funnel.response_message ?? ''}
      </p>

      ${answerRows ? `
      <div style="background:#f9fafb;padding:16px 20px;border-radius:4px;border-left:4px solid ${primary};margin:16px 0">
        <h2 style="font-size:15px;font-weight:bold;margin:0 0 10px;color:#1f2937">Ihre Angaben im Überblick</h2>
        ${answerRows}
      </div>` : ''}

      <hr style="border-color:#e5e7eb;margin:24px 0">

      <p style="font-size:14px;line-height:22px;color:#374151;margin:0 0 12px">
        <strong>Ihr Ansprechpartner:</strong><br>
        ${tenant.company_name ?? ''}
        ${tenant.public_phone ? `<br>Tel.: ${tenant.public_phone}` : ''}
        <br><a href="mailto:${tenant.public_email ?? ''}" style="color:${primary}">${tenant.public_email ?? ''}</a>
        ${tenant.website ? `<br><a href="${tenant.website}" style="color:${primary}">${tenant.website}</a>` : ''}
      </p>
    </div>


  </div>
  <script>
    window.addEventListener('load', function() {
      window.parent.postMessage({ type: 'email-preview-height', height: document.body.scrollHeight }, '*');
    });
  </script>
</body>
</html>`

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
