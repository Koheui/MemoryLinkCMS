
'use server';
// This layout is now implicitly protected by the middleware.
// The middleware checks for a valid session cookie AND the admin role.
// If either fails, it will redirect/rewrite, so this layout will only
// be rendered for authenticated admins.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
