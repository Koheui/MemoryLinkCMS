'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Building, Save, ArrowLeft, Palette, Mail, Package } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface TenantSettings {
  id: string;
  name: string;
  description?: string;
  allowedLpIds: string[];
  enabledProductTypes: string[];
  settings: {
    maxClaimRequestsPerHour: number;
    emailTemplate: string;
    branding: {
      logo?: string;
      colors: string[];
      theme: string;
    };
    fulfillmentMode: 'tenantDirect' | 'vendorDirect';
  };
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

export default function TenantSettingsPage() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const tenantId = params.id as string;
  
  const [tenant, setTenant] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<TenantSettings>>({});

  useEffect(() => {
    if (authLoading) return;
    
    if (!currentUser) {
      setError('認証が必要です');
      setLoading(false);
      return;
    }

    if (tenantId) {
      fetchTenant();
    }
  }, [currentUser, authLoading, tenantId]);

  const fetchTenant = async () => {
    try {
      setLoading(true);
      const tenantRef = doc(db, 'tenants', tenantId);
      const tenantSnap = await getDoc(tenantRef);
      
      if (!tenantSnap.exists()) {
        setError('テナントが見つかりません');
        return;
      }

      const data = tenantSnap.data();
      const tenantData: TenantSettings = {
        id: tenantSnap.id,
        name: data.name,
        description: data.description,
        allowedLpIds: data.allowedLpIds || ['direct'],
        enabledProductTypes: data.enabledProductTypes || ['acrylic'],
        settings: data.settings || {
          maxClaimRequestsPerHour: 10,
          emailTemplate: '',
          branding: {
            colors: ['#3B82F6', '#EF4444'],
            theme: 'default'
          },
          fulfillmentMode: 'tenantDirect'
        },
        status: data.status || 'active',
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      };
      
      setTenant(tenantData);
      setFormData(tenantData);
    } catch (err: any) {
      console.error('Error fetching tenant:', err);
      setError('テナント情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!tenant) return;

    try {
      setSaving(true);
      setError(null);

      const tenantRef = doc(db, 'tenants', tenant.id);
      await updateDoc(tenantRef, {
        ...formData,
        updatedAt: new Date(),
      });

      setTenant({ ...tenant, ...formData, updatedAt: new Date() });
      console.log('Tenant settings updated');
    } catch (err: any) {
      console.error('Error updating tenant:', err);
      setError('設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: TenantSettings['status']) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', label: 'アクティブ' },
      inactive: { color: 'bg-gray-100 text-gray-800', label: '非アクティブ' },
      suspended: { color: 'bg-red-100 text-red-800', label: '停止中' },
    };
    
    const config = statusConfig[status];
    
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  if (authLoading || loading) {
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

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <p className="text-center text-red-600">{error || 'テナントが見つかりません'}</p>
            <Button onClick={() => router.push('/admin/tenants')} className="w-full mt-4">
              テナント一覧に戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => router.push('/admin/tenants')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              戻る
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{tenant.name}</h1>
              <p className="text-gray-600">テナント設定</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusBadge(tenant.status)}
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              保存
            </Button>
          </div>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 基本設定 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="w-5 h-5" />
                <span>基本設定</span>
              </CardTitle>
              <CardDescription>
                テナントの基本情報を設定
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">テナント名 *</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="description">説明</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="status">ステータス</Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as TenantSettings['status'] })}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="active">アクティブ</option>
                  <option value="inactive">非アクティブ</option>
                  <option value="suspended">停止中</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* ブランディング設定 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="w-5 h-5" />
                <span>ブランディング</span>
              </CardTitle>
              <CardDescription>
                テナントのブランド設定
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>ブランドカラー</Label>
                <Input
                  value={formData.settings?.branding?.colors?.join(', ') || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    settings: {
                      maxClaimRequestsPerHour: formData.settings?.maxClaimRequestsPerHour || 10,
                      emailTemplate: formData.settings?.emailTemplate || '',
                      fulfillmentMode: formData.settings?.fulfillmentMode || 'tenantDirect',
                      branding: {
                        ...formData.settings?.branding,
                        colors: e.target.value.split(',').map(s => s.trim()),
                        theme: formData.settings?.branding?.theme || 'default'
                      }
                    }
                  })}
                  placeholder="#3B82F6, #EF4444"
                />
              </div>

              <div>
                <Label htmlFor="theme">テーマ</Label>
                <select
                  id="theme"
                  value={formData.settings?.branding?.theme}
                  onChange={(e) => setFormData({
                    ...formData,
                    settings: {
                      maxClaimRequestsPerHour: formData.settings?.maxClaimRequestsPerHour || 10,
                      emailTemplate: formData.settings?.emailTemplate || '',
                      fulfillmentMode: formData.settings?.fulfillmentMode || 'tenantDirect',
                      branding: {
                        ...formData.settings?.branding,
                        theme: e.target.value,
                        colors: formData.settings?.branding?.colors || ['#3B82F6', '#EF4444']
                      }
                    }
                  })}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="default">デフォルト</option>
                  <option value="warm">暖かい</option>
                  <option value="cool">涼しい</option>
                  <option value="vintage">レトロ</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* 機能設定 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="w-5 h-5" />
                <span>機能設定</span>
              </CardTitle>
              <CardDescription>
                利用可能な機能の設定
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>許可LP ID</Label>
                <Input
                  value={formData.allowedLpIds?.join(', ') || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    allowedLpIds: e.target.value.split(',').map(s => s.trim())
                  })}
                  placeholder="direct, partner1, partner2"
                />
              </div>

              <div>
                <Label>有効商品タイプ</Label>
                <Input
                  value={formData.enabledProductTypes?.join(', ') || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    enabledProductTypes: e.target.value.split(',').map(s => s.trim())
                  })}
                  placeholder="acrylic, digital, premium"
                />
              </div>

              <div>
                <Label>最大リクエスト数/時</Label>
                <Input
                  type="number"
                  value={formData.settings?.maxClaimRequestsPerHour}
                  onChange={(e) => setFormData({
                    ...formData,
                    settings: {
                      maxClaimRequestsPerHour: parseInt(e.target.value) || 10,
                      emailTemplate: formData.settings?.emailTemplate || '',
                      fulfillmentMode: formData.settings?.fulfillmentMode || 'tenantDirect',
                      branding: {
                        ...formData.settings?.branding,
                        colors: formData.settings?.branding?.colors || ['#3B82F6', '#EF4444'],
                        theme: formData.settings?.branding?.theme || 'default'
                      }
                    }
                  })}
                />
              </div>
            </CardContent>
          </Card>

          {/* メール設定 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mail className="w-5 h-5" />
                <span>メール設定</span>
              </CardTitle>
              <CardDescription>
                メールテンプレートの設定
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>メールテンプレート</Label>
                <Textarea
                  value={formData.settings?.emailTemplate || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    settings: {
                      maxClaimRequestsPerHour: formData.settings?.maxClaimRequestsPerHour || 10,
                      emailTemplate: e.target.value,
                      fulfillmentMode: formData.settings?.fulfillmentMode || 'tenantDirect',
                      branding: {
                        ...formData.settings?.branding,
                        colors: formData.settings?.branding?.colors || ['#3B82F6', '#EF4444'],
                        theme: formData.settings?.branding?.theme || 'default'
                      }
                    }
                  })}
                  rows={6}
                  placeholder="メールテンプレートを入力..."
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
