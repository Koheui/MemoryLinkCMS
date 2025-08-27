// src/app/layout.tsx
'use client'

import './globals.css';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { Toaster } from "@/components/ui/toaster"
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarProvider,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogOut, Library, ShieldCheck, Loader2, UserCircle, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin, handleLogout } = useAuth();
  const pathname = usePathname();
  
  const initialLoading = loading || !user;

  if (initialLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-lg text-muted-foreground">読み込み中...</span>
        </div>
      </div>
    );
  }
  
  const dashboardHref = '/dashboard';

  return (
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-2">
              <Link href={dashboardHref} className="flex items-center gap-2 font-headline" prefetch={false}>
                  <span className="text-lg font-bold">想い出クラウド</span>
              </Link>
            </div>
          </SidebarHeader>
          <SidebarMenu className="flex-1">
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard') || pathname.startsWith('/memories') && pathname.split('?')[0] === '/memories'}>
                <Link href={dashboardHref}><LayoutDashboard/> ダッシュボード</Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith('/media-library')}>
                  <Link href="/media-library"><Library /> メディアライブラリ</Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith('/account')}>
                  <Link href="/account"><UserCircle /> アカウント</Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {isAdmin && (
              <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith('/_admin')}>
                      <Link href="/_admin"><ShieldCheck/> 管理者</Link>
                  </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
          <div className="p-2 border-t">
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                          <AvatarImage src={user?.photoURL ?? ''} />
                          <AvatarFallback>{user?.email?.[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium truncate">{user?.email}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Log out">
                      <LogOut className="h-4 w-4"/>
                  </Button>
              </div>
          </div>
        </Sidebar>
        <main className="flex-1 bg-muted/30 peer-[[data-variant=inset]]:ml-[var(--sidebar-width)] peer-[[data-state=collapsed]]:peer-[[data-variant=inset]]:ml-[var(--sidebar-width-icon)]">{children}</main>
      </SidebarProvider>
  );
}


function RootLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loading } = useAuth();

  const isAppPage = ![
    '/login',
    '/signup',
    '/'
  ].includes(pathname) && !pathname.startsWith('/p');
  
  if (loading) {
     return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return isAppPage ? <AppLayout>{children}</AppLayout> : <>{children}</>;
}


// This is the root layout for the entire application.
// It sets up global providers like AuthProvider and Toaster.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  // For standalone pages (login, landing, etc.), render a simpler layout.
  return (
     <html lang="ja" suppressHydrationWarning>
        <head>
          <link rel="icon" href="/favicon.ico" sizes="any" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet" />
        </head>
        <body className={cn("min-h-screen bg-background antialiased font-sans")}>
          <AuthProvider>
            <RootLayoutContent>{children}</RootLayoutContent>
            <Toaster />
          </AuthProvider>
        </body>
      </html>
  );
}
