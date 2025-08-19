
'use server';
// This layout can be used to protect admin routes in the future
// using server-side checks. For now, client-side check in AppLayout is primary.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
