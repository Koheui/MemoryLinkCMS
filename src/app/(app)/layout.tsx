
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
import { Heart, LogOut, Library, ShieldCheck, Loader2, UserCircle, Edit } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/client';
import { collection, query, where, getDocs, limit, doc, updateDoc, serverTimestamp } from 'firebase/firestore';


function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin, handleLogout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [memoryId, setMemoryId] = useState<string | null>(null);
  const [isFetchingMemoryId, setIsFetchingMemoryId] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      // Allow access to login/signup pages without redirecting in a loop
      if (!pathname.startsWith('/login') && !pathname.startsWith('/signup')) {
         router.push('/login');
      }
    }
  }, [user, loading, router, pathname]);

  useEffect(() => {
    const fetchMemoryId = async () => {
        if (user) {
            setIsFetchingMemoryId(true);
            try {
                const memoriesQuery = query(
                    collection(db, 'memories'), 
                    where('ownerUid', '==', user.uid), 
                    limit(1)
                );
                const querySnapshot = await getDocs(memoriesQuery);
                if (!querySnapshot.empty) {
                    const memoryDoc = querySnapshot.docs[0];
                    const fetchedMemoryId = memoryDoc.id;
                    const memoryData = memoryDoc.data();
                    
                    setMemoryId(fetchedMemoryId);

                    // For existing users, if publicPageId is missing, create it.
                    if (!memoryData.publicPageId) {
                        const memoryDocRef = doc(db, 'memories', fetchedMemoryId);
                        await updateDoc(memoryDocRef, {
                            publicPageId: fetchedMemoryId,
                            updatedAt: serverTimestamp()
                        });
                    }

                     // If user is on a generic authenticated page, redirect to their specific memory page.
                    if(pathname === '/account' || pathname === '/dashboard') {
                        router.replace(`/memories/${fetchedMemoryId}`);
                    }
                } else {
                    console.warn("No memory found for user:", user.uid);
                    // If no memory, maybe they should be on the account page, or a "create one" page.
                    if (pathname !== '/account') {
                        router.replace('/account');
                    }
                }
            } catch (error) {
                console.error("Error fetching/updating memoryId for sidebar:", error);
            } finally {
                setIsFetchingMemoryId(false);
            }
        } else {
            setIsFetchingMemoryId(false);
        }
    };
    if (!loading && user) {
      fetchMemoryId();
    }
  }, [user, loading, pathname, router]);


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

  // This will be null if user is not logged in, preventing render of protected layout
  if (!user) {
    return <>{children}</>;
  }
  
  const editPageHref = memoryId ? `/memories/${memoryId}` : '/account';

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
             <Link href={editPageHref} className="flex items-center gap-2 font-headline" prefetch={false}>
                <Heart className="h-6 w-6 text-primary" />
                <span className="text-lg font-bold">想い出リンク</span>
             </Link>
          </div>
        </SidebarHeader>
        <SidebarMenu className="flex-1">
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname.startsWith('/memories')} disabled={isFetchingMemoryId}>
              <Link href={editPageHref}><Edit/> ページ編集</Link>
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
      <SidebarInset>
        <main className="flex-1 bg-muted/30">{children}</main>
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
