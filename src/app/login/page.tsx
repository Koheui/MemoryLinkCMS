import { AuthForm } from '@/components/auth-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Heart } from 'lucide-react';

export default function LoginPage() {
  return (
     <div className="flex min-h-screen flex-col items-center justify-center bg-background/50 p-4">
      <div className="absolute top-4 left-4">
        <Link href="/" className="flex items-center gap-2 font-headline text-lg font-semibold" prefetch={false}>
          <Heart className="h-6 w-6 text-primary" />
          <span>想い出リンク CMS</span>
        </Link>
      </div>
      <AuthForm type="login" />;
    </div>
  )
}
