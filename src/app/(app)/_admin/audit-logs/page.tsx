'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, Filter, Calendar, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect, useCallback } from "react";

interface AuditLog {
  logId: string;
  event: string;
  actor: string;
  tenant: string;
  lpId: string;
  requestId?: string;
  memoryId?: string;
  emailHash?: string;
  metadata?: any;
  timestamp: string;
}

const eventVariantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  'gate.accepted': 'default',
  'claim.sent': 'default',
  'claim.used': 'default',
  'claim.expired': 'destructive',
  'claim.emailChanged': 'secondary',
  'claim.resent': 'secondary',
  'default': 'outline',
};

const eventTextMap: Record<string, string> = {
  'gate.accepted': 'ゲート通過',
  'claim.sent': 'メール送信',
  'claim.used': 'クレーム使用',
  'claim.expired': '期限切れ',
  'claim.emailChanged': 'メール変更',
  'claim.resent': 'メール再送',
};

export default function AuditLogsPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    event: 'all',
    tenant: '',
    lpId: '',
    date: new Date().toISOString().split('T')[0], // 今日の日付
  });
  const { toast } = useToast();

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/audit-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filters }),
      });

      if (!response.ok) {
        throw new Error('監査ログの取得に失敗しました');
      }

      const data = await response.json();
      setAuditLogs(data.auditLogs || []);
    } catch (error) {
      console.error('監査ログ取得エラー:', error);
      toast({ 
        variant: 'destructive', 
        title: "エラー", 
        description: "監査ログの取得に失敗しました" 
      });
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  useEffect(() => {
    if (authLoading) return;
    if (isAdmin) {
      fetchAuditLogs();
    } else {
      setLoading(false);
    }
  }, [isAdmin, authLoading, fetchAuditLogs]);

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

  const filteredLogs = auditLogs.filter(log => {
    if (filters.event !== 'all' && log.event !== filters.event) return false;
    if (filters.tenant && !log.tenant.includes(filters.tenant)) return false;
    if (filters.lpId && !log.lpId.includes(filters.lpId)) return false;
    return true;
  });

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-headline">監査ログ</h1>
          <p className="text-muted-foreground">システムの操作履歴とアクティビティを監視します。</p>
        </div>
        <Button onClick={fetchAuditLogs} variant="outline">
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
              <label className="text-sm font-medium">イベント</label>
              <Select value={filters.event} onValueChange={(value) => setFilters(prev => ({ ...prev, event: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="gate.accepted">ゲート通過</SelectItem>
                  <SelectItem value="claim.sent">メール送信</SelectItem>
                  <SelectItem value="claim.used">クレーム使用</SelectItem>
                  <SelectItem value="claim.expired">期限切れ</SelectItem>
                  <SelectItem value="claim.emailChanged">メール変更</SelectItem>
                  <SelectItem value="claim.resent">メール再送</SelectItem>
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
            <div>
              <label className="text-sm font-medium">日付</label>
              <Input
                type="date"
                value={filters.date}
                onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 監査ログ一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>監査ログ一覧</CardTitle>
          <CardDescription>
            {filteredLogs.length}件のログエントリ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>タイムスタンプ</TableHead>
                <TableHead>イベント</TableHead>
                <TableHead>アクター</TableHead>
                <TableHead>テナント</TableHead>
                <TableHead>LP ID</TableHead>
                <TableHead>リクエストID</TableHead>
                <TableHead>メモリーID</TableHead>
                <TableHead>メタデータ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.logId}>
                  <TableCell className="text-sm">
                    {new Date(log.timestamp).toLocaleString('ja-JP')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={eventVariantMap[log.event] || 'outline'}>
                      {eventTextMap[log.event] || log.event}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {log.actor === 'system' ? 'システム' : log.actor}
                  </TableCell>
                  <TableCell>{log.tenant}</TableCell>
                  <TableCell>
                    <span className="font-mono text-xs">{log.lpId}</span>
                  </TableCell>
                  <TableCell>
                    {log.requestId ? (
                      <span className="font-mono text-xs">{log.requestId.slice(0, 16)}...</span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {log.memoryId ? (
                      <span className="font-mono text-xs">{log.memoryId.slice(0, 16)}...</span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {log.metadata ? (
                      <details className="text-xs">
                        <summary className="cursor-pointer hover:text-primary">
                          詳細
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </details>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center h-24">
                    監査ログがありません。
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
