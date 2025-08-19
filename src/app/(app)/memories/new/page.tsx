// src/app/(app)/memories/new/page.tsx
// This file is no longer needed as page creation is handled from the dashboard.
// It will be deleted in a future step if confirmed.
// For now, we render a placeholder.
'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function DeprecatedNewMemoryPage() {
    return (
        <div className="space-y-6">
             <Card>
                <CardHeader>
                    <CardTitle>このページは移動しました</CardTitle>
                    <CardDescription>
                        新しいページの作成は、ダッシュボードから直接行うように変更されました。
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link href="/dashboard">ダッシュボードに戻る</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
