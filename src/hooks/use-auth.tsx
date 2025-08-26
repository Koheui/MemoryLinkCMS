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
  const router = useRouter();

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


export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthContextType['user'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    const initAuth = async () => {
        try {
            const app = await getFirebaseApp();
            const auth = getAuth(app);
            
            console.log("AuthProvider: Setting up onAuthStateChanged listener.");
            unsubscribe = onAuthStateChanged(auth, async (authUser) => {
              console.log("onAuthStateChanged: Auth state changed. User:", authUser ? authUser.uid : 'null');
              if (authUser) {
                try {
                  console.log(`onAuthStateChanged: Getting ID token result for user ${authUser.uid}.`);
                  const tokenResult = await authUser.getIdTokenResult();
                  const claims = tokenResult.claims;
                  console.log("onAuthStateChanged: User claims:", claims);
                  
                  setIsAdmin(claims.role === 'admin');
                  setUser(authUser as AuthContextType['user']);
                  console.log("onAuthStateChanged: Successfully set user and admin state.");
                } catch (error) {
                   console.error("Error during auth state processing:", error);
                   await auth.signOut();
                   setUser(null);
                   setIsAdmin(false);
                   console.log("onAuthStateChanged: Signed out user due to error.");
                }
              } else {
                console.log("onAuthStateChanged: User is not authenticated.");
                setUser(null);
                setIsAdmin(false);
              }
              console.log("onAuthStateChanged: Finished processing. Setting loading to false.");
              setLoading(false);
            });
        } catch(error) {
            console.error("Failed to initialize Firebase Auth listener", error);
            setLoading(false);
        }
    }

    initAuth();

    return () => {
        if(unsubscribe) {
            console.log("AuthProvider: Cleanup useEffect. Unsubscribing from onAuthStateChanged.");
            unsubscribe();
        }
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

  const isAppPage = [
    '/dashboard',
    '/account',
    '/media-library',
    '/memories',
    '/_admin'
  ].some(path => pathname.startsWith(path));

  // If auth is still loading, show a global loader to prevent layout flashes
  if (loading) {
     return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If it's an app page and there's no user, show the loader until redirection happens
  if (isAppPage && !user) {
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
