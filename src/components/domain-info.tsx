'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Globe, ExternalLink } from 'lucide-react';

export function DomainInfo() {
  const cmsDomain = process.env.NEXT_PUBLIC_CMS_DOMAIN || 'Not set';
  const lpDomain = process.env.NEXT_PUBLIC_LP_DOMAIN || 'Not set';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'Not set';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Globe className="w-5 h-5" />
          <span>ドメイン設定</span>
        </CardTitle>
        <CardDescription>
          カスタムドメインの設定状況
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">CMSドメイン:</span>
            <div className="flex items-center space-x-2">
              <span className="text-blue-600">{cmsDomain}</span>
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="font-medium">LPドメイン:</span>
            <div className="flex items-center space-x-2">
              <span className="text-blue-600">{lpDomain}</span>
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="font-medium">アプリURL:</span>
            <div className="flex items-center space-x-2">
              <span className="text-blue-600">{appUrl}</span>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>ドメイン設定の確認:</strong><br />
              • CMS: https://{cmsDomain}<br />
              • LP: https://{lpDomain}<br />
              • DNS設定が完了するまで数分〜数時間かかる場合があります
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
