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
import { getFirestore, collection, query, where, onSnapshot, Unsubscribe } from 'firebase/firestore';
import type { Memory, Asset } from '@/lib/types';


interface AuthContextType {
  user: (User & { uid: string }) | null;
  loading: boolean;
  isAdmin: boolean;
  handleLogout: () => Promise<void>;
  memories: Memory[];
  assets: Asset[];
}

const AuthContext = createContext<AuthContextType>({ 
    user: null, 
    loading: true,
    isAdmin: false,
    handleLogout: async () => {},
    memories: [],
    assets: [],
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
  const [memories, setMemories] = useState<Memory[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let unsubscribeAuth: Unsubscribe | undefined;
    let unsubscribeMemories: Unsubscribe | undefined;
    let unsubscribeAssets: Unsubscribe | undefined;

    const initAuth = async () => {
        try {
            const app = await getFirebaseApp();
            const auth = getAuth(app);
            const db = getFirestore(app);
            
            unsubscribeAuth = onAuthStateChanged(auth, async (authUser) => {
              if (authUser) {
                try {
                  const tokenResult = await authUser.getIdTokenResult();
                  setIsAdmin(tokenResult.claims.role === 'admin');
                  setUser(authUser as AuthContextType['user']);
                  
                  // Kill existing listeners before starting new ones
                  if (unsubscribeMemories) unsubscribeMemories();
                  if (unsubscribeAssets) unsubscribeAssets();

                  // --- Realtime Data Fetching ---
                  const memoriesQuery = query(collection(db, 'memories'), where('ownerUid', '==', authUser.uid));
                  unsubscribeMemories = onSnapshot(memoriesQuery, (snapshot) => {
                      const userMemories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Memory));
                      setMemories(userMemories);
                  });
                  
                  const assetsQuery = query(collection(db, 'assets'), where('ownerUid', '==', authUser.uid));
                  unsubscribeAssets = onSnapshot(assetsQuery, (snapshot) => {
                       const userAssets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
                       setAssets(userAssets);
                  });

                } catch (error) {
                   console.error("Error during auth state processing:", error);
                   await auth.signOut(); // Log out on error
                }
              } else {
                setUser(null);
                setIsAdmin(false);
                setMemories([]);
                setAssets([]);
                if (unsubscribeMemories) unsubscribeMemories();
                if (unsubscribeAssets) unsubscribeAssets();
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
        if (unsubscribeMemories) unsubscribeMemories();
        if (unsubscribeAssets) unsubscribeAssets();
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

  // If on an app page and not logged in, redirect to login
  if (isAppPage && !user) {
    if(typeof window !== 'undefined') {
        router.push('/login');
    }
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, handleLogout, memories, assets }}>
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
