import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
       <div>
            <h1 className="text-2xl font-bold tracking-tight font-headline">管理者ダッシュボード</h1>
            <p className="text-muted-foreground">ようこそ、管理者</p>
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">システム統計</CardTitle>
                <CardDescription>
                    現在のシステムの概要です。
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p>ここに統計情報を表示します。</p>
            </CardContent>
        </Card>
    </div>
  );
}
