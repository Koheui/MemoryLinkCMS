// src/hooks/use-auth.tsx
"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { 
    User, 
    onAuthStateChanged, 
    getAuth, 
    Unsubscribe,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
} from 'firebase/auth';
import { getFirebaseApp } from '@/lib/firebase/client';
import { usePathname, useRouter } from 'next/navigation';
import { getFirestore, collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';


// This function should ONLY be called right after a user signs up for the first time.
// It finds any orders/memories created for their email before they signed up
// and assigns those records to their new user UID.
const claimUnclaimedData = async (user: User) => {
    if (!user || !user.email) {
        console.log("claimUnclaimedData: No user or email, skipping.");
        return;
    }
    
    const app = await getFirebaseApp();
    const db = getFirestore(app);

    console.log(`claimUnclaimedData: Starting process for user ${user.uid} with email ${user.email}`);
    const batch = writeBatch(db);
    let claimedData = false;

    try {
        // Find unclaimed orders by email. This requires a composite index on (email, userUid).
        console.log(`claimUnclaimedData: Querying orders where email is ${user.email} and userUid is null.`);
        const ordersQuery = query(
            collection(db, 'orders'),
            where('email', '==', user.email),
            where('userUid', '==', null)
        );
        const ordersSnapshot = await getDocs(ordersQuery);
        console.log(`claimUnclaimedData: Found ${ordersSnapshot.size} unclaimed orders.`);

        if (!ordersSnapshot.empty) {
            const memoryIdsToUpdate: string[] = [];
            ordersSnapshot.forEach(orderDoc => {
                console.log(`claimUnclaimedData: Claiming order ${orderDoc.id} for user ${user.uid}`);
                const orderRef = doc(db, 'orders', orderDoc.id);
                batch.update(orderRef, { userUid: user.uid });
                const memoryId = orderDoc.data().memoryId;
                if (memoryId) {
                    memoryIdsToUpdate.push(memoryId);
                }
            });
            
            // Find associated memories and claim them
            if (memoryIdsToUpdate.length > 0) {
                console.log(`claimUnclaimedData: Found memory IDs to update:`, memoryIdsToUpdate);
                // Firestore 'in' queries are limited to 30 items. Handle chunking if necessary.
                const memoriesQuery = query(
                    collection(db, 'memories'),
                    where('__name__', 'in', memoryIdsToUpdate)
                );
                const memoriesSnapshot = await getDocs(memoriesQuery);
                console.log(`claimUnclaimedData: Found ${memoriesSnapshot.size} associated memories to claim.`);
                memoriesSnapshot.forEach(memoryDoc => {
                    if(memoryDoc.data().ownerUid === null) {
                        console.log(`claimUnclaimedData: Claiming memory ${memoryDoc.id} for user ${user.uid}`);
                        const memoryRef = doc(db, 'memories', memoryDoc.id);
                        batch.update(memoryRef, { ownerUid: user.uid });
                    } else {
                        console.log(`claimUnclaimedData: Memory ${memoryDoc.id} already has an owner.`);
                    }
                });
            }
            claimedData = true;
        }

        if (claimedData) {
            console.log("claimUnclaimedData: Committing claimed data batch...");
            await batch.commit();
            console.log("claimUnclaimedData: Batch committed successfully.");
        } else {
            console.log("claimUnclaimedData: No data to claim.");
        }
    } catch (error) {
        console.error("claimUnclaimedData: Error during data claiming process.", error);
        // We throw the error so the calling function can handle it.
        throw error;
    }
};

interface AuthContextType {
  user: (User & { uid: string }) | null;
  loading: boolean;
  isAdmin: boolean;
  handleLogout: () => Promise<void>;
  handleLogin: (email: string, pass: string) => Promise<void>;
  handleSignup: (email: string, pass: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
    user: null, 
    loading: true,
    isAdmin: false,
    handleLogout: async () => {},
    handleLogin: async () => {},
    handleSignup: async () => {},
});

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
                   await handleLogout();
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

  const handleLogin = useCallback(async (email: string, pass: string) => {
      const app = await getFirebaseApp();
      const auth = getAuth(app);
      await signInWithEmailAndPassword(auth, email, pass);
  }, []);

  const handleSignup = useCallback(async (email: string, pass: string) => {
      const app = await getFirebaseApp();
      const auth = getAuth(app);
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      await claimUnclaimedData(userCredential.user);
  }, []);

  useEffect(() => {
    if (!loading) {
      const isAppPage = ![
        '/login',
        '/signup',
        '/'
      ].includes(pathname) && !pathname.startsWith('/p');

      if (user) {
        if (!isAppPage) {
          router.push('/dashboard');
        }
      } else {
        if (isAppPage) {
          router.push('/login');
        }
      }
    }
  }, [user, loading, pathname, router]);

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, handleLogout, handleLogin, handleSignup }}>
      {children}
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
