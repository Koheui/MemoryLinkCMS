
// src/hooks/use-auth.tsx
"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, onAuthStateChanged, getAuth } from 'firebase/auth';
import { getFirebaseApp } from '@/lib/firebase/client';
import { usePathname, useRouter } from 'next/navigation';
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
import { Unsubscribe } from 'firebase/firestore';


interface AuthContextType {
  user: (User & { uid: string }) | null;
  loading: boolean;
  isAdmin: boolean;
  handleLogout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
    user: null, 
    loading: true,
    isAdmin: false,
    handleLogout: async () => {},
});

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
              <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard') || pathname === '/'}>
                <Link href={dashboardHref}><LayoutDashboard/> ダッシュボード</Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith('/memories')}>
                <Link href="/memories?id=none">想い出ページ</Link>
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


export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthContextType['user'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let unsubscribeAuth: Unsubscribe | undefined;

    const initAuth = async () => {
        try {
            const app = await getFirebaseApp();
            const auth = getAuth(app);
            
            unsubscribeAuth = onAuthStateChanged(auth, async (authUser) => {
              if (authUser) {
                try {
                  const tokenResult = await authUser.getIdTokenResult();
                  setIsAdmin(tokenResult.claims.role === 'admin');
                  setUser(authUser as AuthContextType['user']);
                } catch (error) {
                   console.error("Error getting token result:", error);
                   await auth.signOut(); // Log out on error
                }
              } else {
                setUser(null);
                setIsAdmin(false);
              }
              setLoading(false);
            });
        } catch(error) {
            console.error("Failed to initialize Firebase Auth listener", error);
            setLoading(false);
        }
    }

    initAuth();

    return () => {
        if (unsubscribeAuth) unsubscribeAuth();
    };
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      const app = await getFirebaseApp();
      const auth = getAuth(app);
      await auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }, [router]);

  useEffect(() => {
    // This effect handles redirection after user state changes.
    // It runs when loading is finished.
    if (!loading) {
      const isAppPage = ![
        '/login',
        '/signup',
        '/'
      ].includes(pathname) && !pathname.startsWith('/p');

      if (user) {
        // If user is logged in, and on a public page, redirect to dashboard.
        if (!isAppPage) {
          router.push('/dashboard');
        }
      } else {
        // If user is not logged in, and on an app page, redirect to login.
        if (isAppPage) {
          router.push('/login');
        }
      }
    }
  }, [user, loading, pathname, router]);


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

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, handleLogout }}>
      {isAppPage ? <AppLayout>{children}</AppLayout> : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
