export default function TenantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <style>{`html, body { overflow: hidden; }`}</style>
      {children}
    </>
  )
}
