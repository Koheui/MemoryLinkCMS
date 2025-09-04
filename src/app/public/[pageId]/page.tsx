'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, Heart, Share, Download } from 'lucide-react';

interface PublicPage {
  id: string;
  tenant: string;
  memoryId: string;
  title: string;
  about?: string;
  design: {
    theme: string;
    fontScale: number;
    colors: string[];
  };
  media: {
    images: string[];
    videos: string[];
    audio: string[];
  };
  ordering: string[];
  publish: {
    status: 'draft' | 'published';
    version: number;
    publishedAt: Date;
  };
  access: {
    mode: 'public' | 'private';
  };
  createdAt: Date;
}

export default function PublicPage() {
  const params = useParams();
  const pageId = params.pageId as string;
  
  const [page, setPage] = useState<PublicPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (pageId) {
      fetchPublicPage();
    }
  }, [pageId]);

  const fetchPublicPage = async () => {
    try {
      setLoading(true);
      const pageRef = doc(db, 'publicPages', pageId);
      const pageSnap = await getDoc(pageRef);
      
      if (!pageSnap.exists()) {
        setError('ページが見つかりません');
        return;
      }
      
      const data = pageSnap.data();
      const pageData: PublicPage = {
        id: pageSnap.id,
        tenant: data.tenant,
        memoryId: data.memoryId,
        title: data.title,
        about: data.about,
        design: data.design || {
          theme: 'default',
          fontScale: 1.0,
          colors: ['#3B82F6', '#EF4444']
        },
        media: data.media || {
          images: [],
          videos: [],
          audio: []
        },
        ordering: data.ordering || [],
        publish: {
          status: data.publish?.status || 'draft',
          version: data.publish?.version || 1,
          publishedAt: data.publish?.publishedAt?.toDate() || new Date(),
        },
        access: {
          mode: data.access?.mode || 'public',
        },
        createdAt: data.createdAt?.toDate() || new Date(),
      };
      
      // 公開状態チェック
      if (pageData.publish.status !== 'published') {
        setError('このページはまだ公開されていません');
        return;
      }
      
      if (pageData.access.mode === 'private') {
        setError('このページは非公開です');
        return;
      }
      
      setPage(pageData);
    } catch (err: any) {
      console.error('Error fetching public page:', err);
      setError('ページの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const getThemeStyles = (theme: string) => {
    const themes = {
      default: 'bg-gradient-to-br from-blue-50 to-indigo-100',
      warm: 'bg-gradient-to-br from-orange-50 to-red-100',
      cool: 'bg-gradient-to-br from-cyan-50 to-blue-100',
      vintage: 'bg-gradient-to-br from-amber-50 to-yellow-100',
    };
    return themes[theme as keyof typeof themes] || themes.default;
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: page?.title || '想い出ページ',
        url: window.location.href,
      });
    } else {
      // フォールバック: URLをクリップボードにコピー
      navigator.clipboard.writeText(window.location.href);
      alert('URLをコピーしました');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Heart className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">エラー</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            戻る
          </button>
        </div>
      </div>
    );
  }

  if (!page) {
    return null;
  }

  return (
    <div className={`min-h-screen ${getThemeStyles(page.design.theme)}`}>
      {/* ヘッダー */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Heart className="w-6 h-6 text-red-500" />
              <h1 className="text-lg font-semibold text-gray-900">{page.title}</h1>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleShare}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full"
              >
                <Share className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* タイトルと説明 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4" style={{ fontSize: `${page.design.fontScale * 1.5}rem` }}>
            {page.title}
          </h1>
          {page.about && (
            <p className="text-lg text-gray-600 max-w-2xl mx-auto" style={{ fontSize: `${page.design.fontScale}rem` }}>
              {page.about}
            </p>
          )}
        </div>

        {/* メディアコンテンツ */}
        <div className="space-y-6">
          {page.ordering.map((blockId, index) => {
            const block = page.media.images.find(img => img.includes(blockId)) ||
                         page.media.videos.find(video => video.includes(blockId)) ||
                         page.media.audio.find(audio => audio.includes(blockId));
            
            if (!block) return null;

            const isImage = page.media.images.includes(block);
            const isVideo = page.media.videos.includes(block);
            const isAudio = page.media.audio.includes(block);

            return (
              <div key={blockId} className="bg-white rounded-lg shadow-lg overflow-hidden">
                {isImage && (
                  <img
                    src={block}
                    alt={`${page.title} - ${index + 1}`}
                    className="w-full h-auto"
                    loading="lazy"
                  />
                )}
                
                {isVideo && (
                  <video
                    src={block}
                    controls
                    className="w-full h-auto"
                    preload="metadata"
                  >
                    お使いのブラウザは動画再生に対応していません。
                  </video>
                )}
                
                {isAudio && (
                  <div className="p-6">
                    <audio
                      src={block}
                      controls
                      className="w-full"
                      preload="metadata"
                    >
                      お使いのブラウザは音声再生に対応していません。
                    </audio>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* フッター */}
        <footer className="mt-12 text-center text-gray-500">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Heart className="w-4 h-4 text-red-500" />
            <span className="text-sm">想い出リンク</span>
          </div>
          <p className="text-xs">
            公開日: {page.publish.publishedAt.toLocaleDateString('ja-JP')}
          </p>
        </footer>
      </main>
    </div>
  );
}
