import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Home className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">CMS</span>
          </div>
          <div className="text-gray-600 font-medium mb-2">
            管理システム
          </div>
        </div>

        {/* 404エラーカード */}
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto mb-4 w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-gray-600">404</span>
            </div>
            <CardTitle className="text-xl">ページが見つかりません</CardTitle>
            <CardDescription>
              お探しのページは存在しないか、移動された可能性があります
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">
              このシステムは管理者専用の内部システムです。<br />
              一般ユーザーの方は、外部のランディングページからアクセスしてください。
            </p>
            
            <div className="space-y-2">
              <Button asChild className="w-full">
                <Link href="/">
                  <Home className="w-4 h-4 mr-2" />
                  管理者ログイン
                </Link>
              </Button>
              
              <Button variant="outline" asChild className="w-full">
                <Link href="/dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  ダッシュボード
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* フッター */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>© 2024 CMS. All rights reserved.</p>
          <p className="mt-1">Internal Management System</p>
        </div>
      </div>
    </div>
  );
}
