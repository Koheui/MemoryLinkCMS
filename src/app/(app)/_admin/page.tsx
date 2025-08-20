
// src/app/(app)/_admin/page.tsx
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Order } from '@/lib/types';
import { db } from '@/lib/firebase/client';
import { collection, doc, getDoc, getDocs, orderBy, query } from 'firebase/firestore';
import { format } from 'date-fns';
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

const statusVariantMap: Record<Order['status'], 'default' | 'secondary' | 'destructive'> = {
    draft: 'secondary',
    assets_uploaded: 'secondary',
    model_ready: 'default',
    selected: 'default',
    paid: 'default',
    delivered: 'default', // Consider a 'success' variant if you add one
};

const statusTextMap: Record<Order['status'], string> = {
    draft: '下書き',
    assets_uploaded: '素材アップロード済',
    model_ready: 'モデル準備完了',
    selected: 'モデル選択済',
    paid: '支払い済',
    delivered: '発送済',
};

const productTypeTextMap: Record<string, string> = {
    'memory_link_card': 'カード',
    'memory_link_keychain': 'キーホルダー',
};


export default function AdminDashboardPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const fetchOrders = async () => {
      setLoading(true);
      try {
        const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
        const ordersSnapshot = await getDocs(ordersQuery);
        
        if (ordersSnapshot.empty) {
            setOrders([]);
            setLoading(false);
            return;
        }

        const ordersData = await Promise.all(ordersSnapshot.docs.map(async (orderDoc) => {
            const data = orderDoc.data();
            let userEmail = 'N/A';
            let memoryTitle = 'N/A';

            if (data.userUid) {
                try {
                    const userDoc = await getDoc(doc(db, 'users', data.userUid));
                    if(userDoc.exists()) userEmail = userDoc.data()?.email;
                } catch (e) {
                    console.error(`Failed to fetch user ${data.userUid}`, e);
                }
            }
            if (data.memoryId) {
                try {
                    const memoryDoc = await getDoc(doc(db, 'memories', data.memoryId));
                    if(memoryDoc.exists()) memoryTitle = memoryDoc.data()?.title;
                } catch (e) {
                    console.error(`Failed to fetch memory ${data.memoryId}`, e);
                }
            }
            
            return {
                id: orderDoc.id,
                userUid: data.userUid,
                memoryId: data.memoryId,
                productType: data.productType || 'memory_link_card', // Default value
                status: data.status,
                createdAt: format(data.createdAt.toDate(), 'yyyy/MM/dd HH:mm'),
                updatedAt: format(data.updatedAt.toDate(), 'yyyy/MM/dd HH:mm'),
                userEmail,
                memoryTitle,
            } as Order;
        }));
        
        setOrders(ordersData);
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchOrders();

  }, [user, isAdmin, authLoading])

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
       <div>
            <h1 className="text-2xl font-bold tracking-tight font-headline">管理者ダッシュボード</h1>
            <p className="text-muted-foreground">ようこそ、管理者。注文と進捗を管理します。</p>
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
                            <TableHead>ユーザー</TableHead>
                            <TableHead>ページタイトル</TableHead>
                            <TableHead>製品タイプ</TableHead>
                            <TableHead>ステータス</TableHead>
                            <TableHead>最終更新</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orders.map((order) => (
                            <TableRow key={order.id}>
                                <TableCell>{order.createdAt.toString()}</TableCell>
                                <TableCell>{order.userEmail}</TableCell>
                                <TableCell>{order.memoryTitle}</TableCell>
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
                                <TableCell>{order.updatedAt.toString()}</TableCell>
                            </TableRow>
                        ))}
                         {orders.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24">
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
