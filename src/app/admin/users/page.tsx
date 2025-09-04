'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, UserCheck, UserX, Clock } from 'lucide-react';
import { collection, query, orderBy, getDocs, doc, updateDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getTenantFromOrigin, addTenantFilter, logSecurityEvent } from '@/lib/security/tenant-validation';

interface User {
  uid: string;
  email: string;
  displayName?: string;
  status: 'pending' | 'verified' | 'processing' | 'shipped';
  tenant: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function UsersPage() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTenant, setCurrentTenant] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    
    if (!currentUser) {
      setError('認証が必要です');
      setLoading(false);
      return;
    }

    // Originベースでテナントを決定
    try {
      const origin = window.location.origin;
      const tenantInfo = getTenantFromOrigin(origin);
      setCurrentTenant(tenantInfo.tenant);
      
      logSecurityEvent('user_page_access', currentUser.uid, tenantInfo.tenant, {
        origin,
        lpId: tenantInfo.lpId
      });
      
      fetchUsers(tenantInfo.tenant);
    } catch (err: any) {
      console.error('Tenant validation error:', err);
      setError('テナント検証に失敗しました');
      setLoading(false);
    }
  }, [currentUser, authLoading]);

  const fetchUsers = async (tenant: string) => {
    try {
      setLoading(true);
      const usersRef = collection(db, 'users');
      
      // テナントフィルタを追加（セキュリティ上重要）
      const q = query(
        usersRef, 
        where('tenant', '==', tenant),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      
      const usersData: User[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        usersData.push({
          uid: doc.id,
          email: data.email,
          displayName: data.displayName,
          status: data.status || 'pending',
          tenant: data.tenant || tenant,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      });
      
      setUsers(usersData);
      
      logSecurityEvent('users_fetched', currentUser?.uid || null, tenant, {
        count: usersData.length
      });
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError('ユーザー情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (uid: string, newStatus: User['status']) => {
    if (!currentTenant) {
      setError('テナント情報が取得できません');
      return;
    }

    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        status: newStatus,
        updatedAt: new Date(),
      });
      
      // ローカル状態を更新
      setUsers(users.map(user => 
        user.uid === uid 
          ? { ...user, status: newStatus, updatedAt: new Date() }
          : user
      ));
      
      logSecurityEvent('user_status_updated', currentUser?.uid || null, currentTenant, {
        targetUserId: uid,
        newStatus
      });
    } catch (err: any) {
      console.error('Error updating user status:', err);
      setError('ステータスの更新に失敗しました');
    }
  };

  const getStatusBadge = (status: User['status']) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: '待機中' },
      verified: { color: 'bg-green-100 text-green-800', icon: UserCheck, label: '認証済み' },
      processing: { color: 'bg-blue-100 text-blue-800', icon: Loader2, label: '制作中' },
      shipped: { color: 'bg-purple-100 text-purple-800', icon: Users, label: '発送済み' },
    };
    
    const config = statusConfig[status];
    const Icon = config.icon;
    
    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <p className="text-center text-red-600">認証が必要です</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <p className="text-center text-red-600">{error}</p>
            <Button onClick={() => fetchUsers(currentTenant!)} className="w-full mt-4">
              再試行
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">ユーザー管理</h1>
            <p className="text-gray-600">認証済みユーザーの管理</p>
          </div>
          <Button onClick={() => fetchUsers(currentTenant!)} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            更新
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>ユーザー一覧 ({users.length}人)</span>
              {currentTenant && (
                <Badge variant="outline" className="ml-2">
                  テナント: {currentTenant}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              認証済みユーザーの一覧とステータス管理
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                ユーザーが見つかりません
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.uid} className="border rounded-lg p-4 bg-white">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div>
                            <h3 className="font-medium">{user.email}</h3>
                            {user.displayName && (
                              <p className="text-sm text-gray-500">{user.displayName}</p>
                            )}
                          </div>
                          {getStatusBadge(user.status)}
                        </div>
                        <div className="mt-2 text-sm text-gray-500">
                          登録日: {user.createdAt.toLocaleDateString('ja-JP')}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {user.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => updateUserStatus(user.uid, 'verified')}
                          >
                            認証
                          </Button>
                        )}
                        {user.status === 'verified' && (
                          <Button
                            size="sm"
                            onClick={() => updateUserStatus(user.uid, 'processing')}
                          >
                            制作開始
                          </Button>
                        )}
                        {user.status === 'processing' && (
                          <Button
                            size="sm"
                            onClick={() => updateUserStatus(user.uid, 'shipped')}
                          >
                            発送
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
