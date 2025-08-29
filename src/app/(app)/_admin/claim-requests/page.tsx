'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, Mail, Copy, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect, useCallback } from "react";

interface ClaimRequest {
  requestId: string;
  email: string;
  tenant: string;
  lpId: string;
  productType: string;
  status: 'pending' | 'sent' | 'claimed' | 'expired' | 'canceled';
  source: 'stripe' | 'storefront' | 'lp-form';
  createdAt: string;
  sentAt?: string;
  claimedAt?: string;
  claimedByUid?: string;
  memoryId?: string;
}

const statusVariantMap: Record<ClaimRequest['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  sent: 'default',
  claimed: 'default',
  expired: 'destructive',
  canceled: 'outline',
};

const statusTextMap: Record<ClaimRequest['status'], string> = {
  pending: '処理中',
  sent: '送信済',
  claimed: 'クレーム済',
  expired: '期限切れ',
  canceled: 'キャンセル',
};

const sourceTextMap: Record<ClaimRequest['source'], string> = {
  stripe: 'Stripe',
  storefront: '店舗',
  'lp-form': 'LPフォーム',
};

export default function ClaimRequestsPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [claimRequests, setClaimRequests] = useState<ClaimRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: 'all',
    source: 'all',
    tenant: '',
    lpId: '',
  });
  const { toast } = useToast();

  const fetchClaimRequests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/claim-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filters }),
      });

      if (!response.ok) {
        throw new Error('クレーム要求の取得に失敗しました');
      }

      const data = await response.json();
      setClaimRequests(data.claimRequests || []);
    } catch (error) {
      console.error('クレーム要求取得エラー:', error);
      toast({ 
        variant: 'destructive', 
        title: "エラー", 
        description: "クレーム要求の取得に失敗しました" 
      });
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  const handleResend = async (requestId: string) => {
    setResending(requestId);
    try {
      const response = await fetch('/api/admin/claim-requests/resend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requestId }),
      });

      if (!response.ok) {
        throw new Error('再送に失敗しました');
      }

      toast({ 
        title: "成功", 
        description: "メールリンクを再送しました" 
      });

      // リストを更新
      fetchClaimRequests();
    } catch (error) {
      console.error('再送エラー:', error);
      toast({ 
        variant: 'destructive', 
        title: "エラー", 
        description: "メールリンクの再送に失敗しました" 
      });
    } finally {
      setResending(null);
    }
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "コピーしました", description: text });
  };

  useEffect(() => {
    if (authLoading) return;
    if (isAdmin) {
      fetchClaimRequests();
    } else {
      setLoading(false);
    }
  }, [isAdmin, authLoading, fetchClaimRequests]);

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
    );
  }

  const filteredRequests = claimRequests.filter(request => {
    if (filters.status !== 'all' && request.status !== filters.status) return false;
    if (filters.source !== 'all' && request.source !== filters.source) return false;
    if (filters.tenant && !request.tenant.includes(filters.tenant)) return false;
    if (filters.lpId && !request.lpId.includes(filters.lpId)) return false;
    return true;
  });

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-headline">クレーム要求管理</h1>
          <p className="text-muted-foreground">クレーム要求の状況とメール再送を管理します。</p>
        </div>
        <Button onClick={fetchClaimRequests} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          更新
        </Button>
      </div>

      {/* フィルター */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            フィルター
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">ステータス</label>
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="pending">処理中</SelectItem>
                  <SelectItem value="sent">送信済</SelectItem>
                  <SelectItem value="claimed">クレーム済</SelectItem>
                  <SelectItem value="expired">期限切れ</SelectItem>
                  <SelectItem value="canceled">キャンセル</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">ソース</label>
              <Select value={filters.source} onValueChange={(value) => setFilters(prev => ({ ...prev, source: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="storefront">店舗</SelectItem>
                  <SelectItem value="lp-form">LPフォーム</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">テナント</label>
              <Input
                placeholder="テナント名"
                value={filters.tenant}
                onChange={(e) => setFilters(prev => ({ ...prev, tenant: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">LP ID</label>
              <Input
                placeholder="LP ID"
                value={filters.lpId}
                onChange={(e) => setFilters(prev => ({ ...prev, lpId: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* クレーム要求一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>クレーム要求一覧</CardTitle>
          <CardDescription>
            {filteredRequests.length}件のクレーム要求
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>作成日時</TableHead>
                <TableHead>メールアドレス</TableHead>
                <TableHead>テナント</TableHead>
                <TableHead>LP ID</TableHead>
                <TableHead>製品タイプ</TableHead>
                <TableHead>ソース</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((request) => (
                <TableRow key={request.requestId}>
                  <TableCell className="text-sm">
                    {new Date(request.createdAt).toLocaleString('ja-JP')}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {request.email}
                  </TableCell>
                  <TableCell>{request.tenant}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{request.lpId}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6" 
                        onClick={() => handleCopyToClipboard(request.lpId)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {request.productType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {sourceTextMap[request.source]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariantMap[request.status]}>
                      {statusTextMap[request.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {request.status === 'sent' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResend(request.requestId)}
                        disabled={resending === request.requestId}
                      >
                        {resending === request.requestId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Mail className="h-4 w-4" />
                        )}
                        再送
                      </Button>
                    )}
                    {request.status === 'claimed' && request.memoryId && (
                      <div className="text-xs text-muted-foreground">
                        メモリーID: {request.memoryId}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredRequests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center h-24">
                    クレーム要求がありません。
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


