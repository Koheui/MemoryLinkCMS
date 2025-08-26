// src/app/(app)/_admin/page.tsx
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Order } from '@/lib/types';
import { getFirebaseApp } from '@/lib/firebase/client';
import { getFirestore, collection, doc, getDoc, getDocs, orderBy, query, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, PlusCircle, Save, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from 'uuid';

const statusVariantMap: Record<Order['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
    draft: 'secondary',
    paid: 'default',
    shipped: 'default',
    delivered: 'default',
};

const statusTextMap: Record<Order['status'], string> = {
    draft: '下書き',
    paid: '支払い済',
    shipped: '発送済',
    delivered: '発送済',
};

const productTypeTextMap: Record<string, string> = {
    'memory_link_card': 'カード',
    'memory_link_keychain': 'キーホルダー',
};


function CreateOrderModal({ onOrderCreated }: { onOrderCreated: () => void }) {
    const [open, setOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [email, setEmail] = useState('');
    const [productType, setProductType] = useState('memory_link_card');
    const { toast } = useToast();
    const { user } = useAuth();

    const handleSave = async () => {
        if (!email) {
            toast({ variant: 'destructive', title: "エラー", description: "メールアドレスを入力してください。" });
            return;
        }
        if (!user) {
             toast({ variant: 'destructive', title: "エラー", description: "認証情報が見つかりません。" });
            return;
        }
        setIsSaving(true);
        try {
            const app = await getFirebaseApp();
            const db = getFirestore(app);

            // Create a new memory page for the order
            const memoryId = uuidv4();
            const memoryRef = doc(db, 'memories', memoryId);
            const newMemory = {
                ownerUid: null, // Unclaimed initially
                title: '新しい想い出',
                type: 'other',
                status: 'draft',
                publicPageId: null,
                coverAssetId: null,
                profileAssetId: null,
                description: '',
                design: {
                    theme: 'light',
                    fontScale: 1,
                    bgColor: '#F9FAFB',
                    textColor: '#111827',
                    cardBgColor: '#FFFFFF',
                    cardTextColor: '#111827',
                },
                blocks: [],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };
            await setDoc(memoryRef, newMemory);

            // Create the order associated with the new memory page
            const ordersCollection = collection(db, 'orders');
            await addDoc(ordersCollection, {
                email,
                productType,
                memoryId: memoryId,
                status: 'draft',
                userUid: null, // Unclaimed initially
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            
            toast({ title: "成功", description: "新しい注文を作成しました。" });
            onOrderCreated(); // Refresh the list
            setOpen(false); // Close modal on success
            setEmail('');
            setProductType('memory_link_card');
        } catch (error: any) {
            console.error("Failed to create order", error);
            toast({ variant: 'destructive', title: "エラー", description: error.message });
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    新規注文を作成
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>新規注文 (招待) を作成</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">顧客メール</Label>
                        <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="col-span-3" placeholder="customer@example.com" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="productType" className="text-right">製品タイプ</Label>
                        <Select onValueChange={setProductType} defaultValue={productType}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="タイプを選択" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="memory_link_card">カード</SelectItem>
                                <SelectItem value="memory_link_keychain">キーホルダー</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">キャンセル</Button></DialogClose>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        保存
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


export default function AdminDashboardPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const app = await getFirebaseApp();
      const db = getFirestore(app);
      const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      const ordersSnapshot = await getDocs(ordersQuery);
      
      if (ordersSnapshot.empty) {
          setOrders([]);
          setLoading(false);
          return;
      }

      const ordersData = await Promise.all(ordersSnapshot.docs.map(async (orderDoc) => {
          const data = orderDoc.data();
          let userEmail = data.email || 'N/A'; // Use stored email first
          let memoryTitle = 'N/A';
          
          if (data.memoryId) {
              try {
                  const memoryDoc = await getDoc(doc(db, 'memories', data.memoryId));
                  if(memoryDoc.exists()) memoryTitle = memoryDoc.data()?.title;
              } catch (e) {
                  console.error(`Failed to fetch memory ${data.memoryId}`, e);
              }
          }
          
          const createdAtDate = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
          const updatedAtDate = data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date();

          return {
              id: orderDoc.id,
              userUid: data.userUid,
              memoryId: data.memoryId,
              productType: data.productType || 'memory_link_card', // Default value
              status: data.status,
              createdAt: format(createdAtDate, 'yyyy/MM/dd HH:mm'),
              updatedAt: format(updatedAtDate, 'yyyy/MM/dd HH:mm'),
              email: userEmail,
              memoryTitle,
          } as Order;
      }));
      
      setOrders(ordersData);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return; // Wait until auth is resolved
    if (isAdmin) {
      fetchOrders();
    } else {
      // Not an admin, or no user. Don't fetch and stop loading.
      setLoading(false);
    }
  }, [isAdmin, authLoading, fetchOrders]);

  const handleCopyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      toast({ title: "コピーしました", description: text });
  }

  if (loading || authLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold">アクセス権がありません</h1>
        <p className="text-muted-foreground">このページは管理者のみがアクセスできます。</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
       <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
                <h1 className="text-2xl font-bold tracking-tight font-headline">管理者ダッシュボード</h1>
                <p className="text-muted-foreground">ようこそ、管理者。注文と進捗を管理します。</p>
            </div>
            <CreateOrderModal onOrderCreated={fetchOrders} />
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">注文一覧</CardTitle>
                <CardDescription>
                    すべての顧客の注文と現在のステータスです。
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>注文日時</TableHead>
                            <TableHead>顧客メール</TableHead>
                            <TableHead>ページID (公開URL)</TableHead>
                            <TableHead>製品タイプ</TableHead>
                            <TableHead>ステータス</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orders.map((order) => (
                            <TableRow key={order.id}>
                                <TableCell>{order.createdAt.toString()}</TableCell>
                                <TableCell>{order.email}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs">{order.memoryId}</span>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => order.memoryId && handleCopyToClipboard(order.memoryId)}>
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </TableCell>
                                 <TableCell>
                                    <Badge variant="outline">
                                        {productTypeTextMap[order.productType] || order.productType}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={statusVariantMap[order.status] || 'secondary'}>
                                        {statusTextMap[order.status] || order.status}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                         {orders.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24">
                                    まだ注文がありません。
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}
