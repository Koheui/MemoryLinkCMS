
'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/firebase/client';
import { sendEmailVerification } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Loader2, MailCheck } from 'lucide-react';
import Link from 'next/link';

function VerifyEmailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get('email');
    const { toast } = useToast();
    const [isSending, setIsSending] = useState(false);

    const handleResend = async () => {
        setIsSending(true);
        if (auth.currentUser) {
            try {
                await sendEmailVerification(auth.currentUser);
                toast({ title: '成功', description: '確認メールを再送信しました。' });
            } catch (error: any) {
                toast({ variant: 'destructive', title: 'エラー', description: 'メールの送信に失敗しました。' + error.message });
            }
        } else {
             toast({ variant: 'destructive', title: 'エラー', description: 'ユーザーが見つかりません。お手数ですが、再度ログインをお試しください。' });
        }
        setIsSending(false);
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background/50 p-4">
             <div className="absolute top-4 left-4">
                <Link href="/" className="flex items-center gap-2 font-headline text-lg font-semibold" prefetch={false}>
                <span>想い出クラウド</span>
                </Link>
            </div>
            <Card className="w-full max-w-md">
                <CardHeader className="items-center text-center">
                    <MailCheck className="h-12 w-12 text-primary mb-4" />
                    <CardTitle className="text-2xl font-headline">アカウントの確認</CardTitle>
                    <CardDescription>
                        ご登録ありがとうございます！<br/>
                        <strong className="text-primary">{email}</strong> 宛に確認メールを送信しました。
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                    <p className="text-sm text-muted-foreground">
                        メールに記載されているリンクをクリックして、アカウントの作成を完了してください。
                        メールが届かない場合は、迷惑メールフォルダもご確認ください。
                    </p>
                    <Button onClick={handleResend} disabled={isSending} variant="outline" className="w-full">
                        {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        確認メールを再送信する
                    </Button>
                     <Button asChild className="w-full">
                        <Link href="/login">ログインページへ</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}


export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <VerifyEmailContent />
        </Suspense>
    );
}

