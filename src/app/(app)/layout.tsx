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
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, LayoutDashboard, LogOut, Settings, ShieldCheck, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase/client';

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

 useEffect(() => {
    // Redirect to login if loading is done and there's no user.
    if (!loading && !user) {
      router.push('/login');
    }
    
    // Check for admin role if user exists.
    if (user) {
      user.getIdTokenResult().then((idTokenResult) => {
        setIsAdmin(idTokenResult.claims.role === 'admin');
      });
    }
  }, [user, loading, router]);


  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push('/login');
    } catch (error) {
        console.error('Logout failed', error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-lg text-muted-foreground">読み込み中...</span>
        </div>
      </div>
    );
  }
  
  if (!user) {
    // Render nothing while the redirect is in flight
    return null;
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
             <Link href="/dashboard" className="flex items-center gap-2 font-headline" prefetch={false}>
                <Heart className="h-6 w-6 text-primary" />
                <span className="text-lg font-bold">想い出リンク</span>
             </Link>
          </div>
        </SidebarHeader>
        <SidebarMenu className="flex-1">
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === '/dashboard'}>
                <Link href="/dashboard"><LayoutDashboard/> ダッシュボード</Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
             <SidebarMenuButton asChild isActive={pathname.startsWith('/memories')}>
                <Link href="/dashboard"><Settings /> 想い出の管理</Link>
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
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 md:px-6">
            <SidebarTrigger className="md:hidden" />
            <div className="flex-1">
              {/* Header content can go here */}
            </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </AuthProvider>
  );
}
