import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

async function unlock(formData: FormData) {
  'use server'
  const input = formData.get('password') as string
  if (input === process.env.SITE_PASSWORD) {
    const cookieStore = await cookies()
    cookieStore.set('site-auth', input, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    })
    const from = formData.get('from') as string | null
    redirect(from && from.startsWith('/') ? from : '/admin')
  }
}

export default async function LockedPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>
}) {
  const { from } = await searchParams

  return (
    <div className="min-h-screen bg-indigo-50 flex items-center justify-center p-4" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div className="bg-white rounded-3xl shadow-lg w-full max-w-sm px-10 py-10">
        <form action={unlock} className="flex flex-col gap-3">
          {from && (
            <input type="hidden" name="from" value={from} />
          )}
          <input
            id="password"
            type="password"
            name="password"
            required
            autoFocus
            className="w-full rounded-2xl border border-gray-200 px-5 py-4 text-base text-gray-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder-gray-400 transition"
            placeholder="Passwort"
          />
          <button
            type="submit"
            className="w-full rounded-2xl bg-indigo-600 px-5 py-4 text-base font-semibold text-white hover:bg-indigo-700 active:bg-indigo-800 transition-colors tracking-wide cursor-pointer"
          >
            Einloggen
          </button>
        </form>
      </div>
    </div>
  )
}
