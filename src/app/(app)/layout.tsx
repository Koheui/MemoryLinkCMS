// src/app/(app)/layout.tsx
"use client";

import { AuthProvider, useAuth } from '@/hooks/use-auth';
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
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';


function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin, handleLogout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  
  useEffect(() => {
    if (!loading && !user) {
        // Redirect to login if not authenticated and not on a public-in-app page.
        // The root ('/') is public, so we don't redirect from there.
        if (!['/login', '/signup', '/'].some(p => pathname.startsWith(p))) {
            router.push('/login');
        }
    }
  }, [user, loading, router, pathname]);

  if (loading || !user) {
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
            <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard')}>
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

export default function AppLayout({ children }: { children: React.Node }) {
  return (
    <AuthProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </AuthProvider>
  );
}
