'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Heart, 
  Camera, 
  Video, 
  Music, 
  Smartphone, 
  ArrowRight, 
  CheckCircle
} from 'lucide-react';

export default function LandingPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    
    // ダミーサインアップ処理（開発用）
    setTimeout(() => {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setEmail('');
        setIsLoading(false);
      }, 3000);
    }, 1000);
  };

  const handleLogin = () => {
    router.push('/claim?mode=login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* ヘッダー */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Heart className="w-8 h-8 text-red-500" />
              <span className="text-xl font-bold text-gray-900">想い出リンク</span>
            </div>
            <Button variant="outline" onClick={handleLogin}>
              ログイン
            </Button>
          </div>
        </div>
      </header>

      {/* ヒーローセクション */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 mb-6">
            大切な想い出を
            <span className="text-red-500">永遠に</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            NFC・QRコードで簡単アクセス。写真、動画、音声を組み合わせて、
            あなただけの特別な想い出ページを作成しましょう。
          </p>
          
          {/* サインアップフォーム */}
          <Card className="max-w-md mx-auto mb-12">
            <CardHeader>
              <CardTitle>無料で始める</CardTitle>
              <CardDescription>
                メールアドレスを入力して、想い出ページを作成しましょう
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showSuccess ? (
                <form onSubmit={handleSignUp} className="space-y-4">
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="text-center"
                  />
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                  >
                    {isLoading ? '送信中...' : '想い出ページを作成'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </form>
              ) : (
                <div className="text-center space-y-4">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                  <p className="text-green-600 font-medium">
                    開発中です！
                  </p>
                  <p className="text-sm text-gray-500">
                    現在は開発中のため、実際のサインアップはできません。
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 統計 */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto mb-16">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-500 mb-2">10,000+</div>
              <div className="text-gray-600">作成された想い出</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-500 mb-2">99.9%</div>
              <div className="text-gray-600">満足度</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-500 mb-2">24/7</div>
              <div className="text-gray-600">サポート</div>
            </div>
          </div>
        </div>
      </section>

      {/* 機能紹介 */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              豊富な機能で想い出を彩る
            </h2>
            <p className="text-xl text-gray-600">
              写真、動画、音声、テキストを自由に組み合わせて
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">写真管理</h3>
              <p className="text-gray-600">美しい写真を簡単にアップロード・整理</p>
            </div>

            <div className="text-center">
              <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Video className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">動画共有</h3>
              <p className="text-gray-600">大切な瞬間を動画で記録・共有</p>
            </div>

            <div className="text-center">
              <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Music className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">音声メッセージ</h3>
              <p className="text-gray-600">声の想い出も大切に保存</p>
            </div>

            <div className="text-center">
              <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Smartphone className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">簡単アクセス</h3>
              <p className="text-gray-600">NFC・QRコードでワンタップ</p>
            </div>
          </div>
        </div>
      </section>

      {/* 使い方 */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              3ステップで完成
            </h2>
            <p className="text-xl text-gray-600">
              簡単3ステップで想い出ページが完成します
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-red-500 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h3 className="text-lg font-semibold mb-2">サインアップ</h3>
              <p className="text-gray-600">メールアドレスを入力して登録</p>
            </div>

            <div className="text-center">
              <div className="bg-red-500 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h3 className="text-lg font-semibold mb-2">コンテンツ作成</h3>
              <p className="text-gray-600">写真・動画・音声をアップロード</p>
            </div>

            <div className="text-center">
              <div className="bg-red-500 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h3 className="text-lg font-semibold mb-2">共有・アクセス</h3>
              <p className="text-gray-600">NFC・QRコードで簡単アクセス</p>
            </div>
          </div>
        </div>
      </section>

      {/* フッター */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Heart className="w-6 h-6 text-red-500" />
              <span className="text-xl font-bold">想い出リンク</span>
            </div>
            <p className="text-gray-400 mb-4">
              大切な想い出を永遠に残すためのプラットフォーム
            </p>
            <div className="flex justify-center space-x-6 text-sm text-gray-400">
              <span>プライバシーポリシー</span>
              <span>利用規約</span>
              <span>お問い合わせ</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
