'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, Send } from 'lucide-react';
import { ClaimRequest } from '@/lib/types';

export default function ClaimRequestsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [claimRequests, setClaimRequests] = useState<ClaimRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [resendingIds, setResendingIds] = useState<Set<string>>(new Set());

  const fetchClaimRequests = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const idToken = await user.getIdToken();
      
      const response = await fetch('/api/admin/claim-requests', {
        headers: {
          'Authorization': `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch claim requests');
      }

      const data = await response.json();
      setClaimRequests(data.claimRequests || []);
    } catch (error) {
      console.error('Error fetching claim requests:', error);
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: 'クレーム要求の読み込みに失敗しました',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (requestId: string) => {
    if (!user) return;

    try {
      setResendingIds(prev => new Set(prev).add(requestId));
      const idToken = await user.getIdToken();

      const response = await fetch('/api/admin/claim-requests/resend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ requestId }),
      });

      if (!response.ok) {
        throw new Error('Failed to resend claim');
      }

      toast({
        title: '再送完了',
        description: 'クレームリンクを再送しました',
      });

      // データを再取得
      await fetchClaimRequests();
    } catch (error) {
      console.error('Error resending claim:', error);
      toast({
        variant: 'destructive',
        title: 'エラー',
        description: 'クレームリンクの再送に失敗しました',
      });
    } finally {
      setResendingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  useEffect(() => {
    fetchClaimRequests();
  }, [user]);

  const filteredRequests = claimRequests.filter(request => {
    if (statusFilter === 'all') return true;
    return request.status === statusFilter;
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'sent': return 'default';
      case 'claimed': return 'default';
      case 'expired': return 'secondary';
      case 'canceled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '保留中';
      case 'sent': return '送信済み';
      case 'claimed': return 'クレーム済み';
      case 'expired': return '期限切れ';
      case 'canceled': return 'キャンセル';
      default: return status;
    }
  };

  const getSourceText = (source: string) => {
    switch (source) {
      case 'lp-form': return 'LPフォーム';
      case 'storefront': return '店舗';
      case 'stripe': return 'Stripe';
      default: return source;
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">クレーム要求管理</h1>
          <p className="text-muted-foreground">メモリークレーム要求の一覧と管理</p>
        </div>
        <Button onClick={fetchClaimRequests} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          更新
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>クレーム要求一覧</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="ステータスでフィルタ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="pending">保留中</SelectItem>
                <SelectItem value="sent">送信済み</SelectItem>
                <SelectItem value="claimed">クレーム済み</SelectItem>
                <SelectItem value="expired">期限切れ</SelectItem>
                <SelectItem value="canceled">キャンセル</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>要求ID</TableHead>
                <TableHead>メールアドレス</TableHead>
                <TableHead>ソース</TableHead>
                <TableHead>プロダクト</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>作成日時</TableHead>
                <TableHead>送信日時</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((request) => (
                <TableRow key={request.requestId}>
                  <TableCell className="font-mono text-sm">
                    {request.requestId.slice(0, 16)}...
                  </TableCell>
                  <TableCell>{request.email}</TableCell>
                  <TableCell>{getSourceText(request.source)}</TableCell>
                  <TableCell>{request.productType}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(request.status)}>
                      {getStatusText(request.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(request.createdAt).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </TableCell>
                  <TableCell>
                    {request.sentAt ? new Date(request.sentAt).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    }) : '-'}
                  </TableCell>
                  <TableCell>
                    {(request.status === 'sent' || request.status === 'expired') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResend(request.requestId)}
                        disabled={resendingIds.has(request.requestId)}
                      >
                        {resendingIds.has(request.requestId) ? (
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        ) : (
                          <Send className="mr-2 h-3 w-3" />
                        )}
                        再送
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredRequests.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {statusFilter === 'all' ? 'クレーム要求がありません' : `${getStatusText(statusFilter)}のクレーム要求がありません`}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


