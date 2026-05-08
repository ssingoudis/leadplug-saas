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
      slug, primary_color,
      funnel_questions ( sort_order, question_key, title, question_type, visible, options, config )
    `)
    .eq('slug', slug)
    .maybeSingle()

  if (!funnel) return new Response('Not found', { status: 404 })

  const primary: string = funnel.primary_color ?? '#4648d4'
  const now = new Date().toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const questions: any[] = ((funnel.funnel_questions as any[]) ?? [])
    .filter((q) => q.visible)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

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
    return `<p style="font-size:13px;line-height:18px;color:#374151;margin:0 0 10px;padding-bottom:8px;border-bottom:1px solid #f3f4f6">
      <span style="color:#6b7280">${q.title}</span><br>
      <strong>${display}</strong>
    </p>`
  }).join('')

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background-color:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:20px 0">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;padding:32px 24px">

    <h1 style="font-size:22px;font-weight:bold;color:${primary};margin:0 0 8px">Neue Anfrage eingegangen</h1>
    <p style="font-size:13px;color:#6b7280;margin:0 0 16px">Eingegangen: ${now} Uhr</p>

    <div style="background:#f9fafb;padding:16px;border-radius:6px;margin:0 0 16px">
      <h2 style="font-size:15px;font-weight:bold;margin:0 0 8px;color:#1f2937">Kontaktdaten</h2>
      <p style="font-size:14px;line-height:20px;color:#374151;margin:0 0 4px"><span style="color:#6b7280">Anrede:</span> <strong>Herr</strong></p>
      <p style="font-size:14px;line-height:20px;color:#374151;margin:0 0 4px"><span style="color:#6b7280">Name:</span> <strong>Max Mustermann</strong></p>
      <p style="font-size:14px;line-height:20px;color:#374151;margin:0 0 4px"><span style="color:#6b7280">E-Mail:</span> <a href="mailto:max@beispiel.de" style="color:${primary}">max@beispiel.de</a></p>
      <p style="font-size:14px;line-height:20px;color:#374151;margin:0 0 4px"><span style="color:#6b7280">Telefon:</span> <a href="tel:01234567890" style="color:${primary}">0123 456789</a></p>
    </div>

    <h2 style="font-size:15px;font-weight:bold;margin:16px 0 8px;color:#1f2937">Antworten</h2>
    ${answerRows}

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
