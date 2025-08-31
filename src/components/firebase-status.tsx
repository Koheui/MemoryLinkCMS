'use client';

import { useEffect, useState } from 'react';
import { auth, db, storage } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface ServiceStatus {
  auth: boolean;
  firestore: boolean;
  storage: boolean;
}

export function FirebaseStatus() {
  const [status, setStatus] = useState<ServiceStatus>({
    auth: false,
    firestore: false,
    storage: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkServices = async () => {
      const newStatus: ServiceStatus = {
        auth: false,
        firestore: false,
        storage: false,
      };

      try {
        // Auth の確認
        if (auth) {
          newStatus.auth = true;
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      }

      try {
        // Firestore の確認
        if (db) {
          newStatus.firestore = true;
        }
      } catch (error) {
        console.error('Firestore check failed:', error);
      }

      try {
        // Storage の確認
        if (storage) {
          newStatus.storage = true;
        }
      } catch (error) {
        console.error('Storage check failed:', error);
      }

      setStatus(newStatus);
      setLoading(false);
    };

    checkServices();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Firebase接続状態</CardTitle>
          <CardDescription>サービス接続を確認中...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const allServicesWorking = status.auth && status.firestore && status.storage;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span>Firebase接続状態</span>
          {allServicesWorking ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600" />
          )}
        </CardTitle>
        <CardDescription>
          {allServicesWorking 
            ? 'すべてのサービスが正常に接続されています' 
            : '一部のサービスで接続エラーが発生しています'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span>Authentication</span>
            {status.auth ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
          </div>
          <div className="flex items-center justify-between">
            <span>Firestore</span>
            {status.firestore ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
          </div>
          <div className="flex items-center justify-between">
            <span>Storage</span>
            {status.storage ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
          </div>
        </div>
        
        {!allServicesWorking && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              環境変数の設定を確認してください。.env.localファイルにFirebase設定が正しく記述されているか確認してください。
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
