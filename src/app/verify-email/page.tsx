// This page is currently not used, but is kept for future implementation
// of the email verification flow.
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MailCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-md text-center shadow-lg">
                <CardHeader>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <MailCheck className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="mt-4">ご登録ありがとうございます！</CardTitle>
                    <CardDescription>
                        本人確認のため、ご登録いただいたメールアドレスに確認用のリンクを送信しました。
                        メールボックスをご確認いただき、リンクをクリックして登録を完了してください。
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        メールが届かない場合は、迷惑メールフォルダもご確認ください。
                    </p>
                     <Button asChild variant="outline">
                        <Link href="/login">ログインページに戻る</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
