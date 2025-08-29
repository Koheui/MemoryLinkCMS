
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, Users, BarChart3, Mail } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navigationItems = [
    {
      href: '/admin',
      label: '概要',
      icon: BarChart3,
      exact: true,
    },
    {
      href: '/admin/claim-requests',
      label: 'クレーム要求',
      icon: Mail,
      exact: false,
    },
    {
      href: '/admin/users',
      label: 'ユーザー管理',
      icon: Users,
      exact: false,
    },
    {
      href: '/admin/audit-logs',
      label: '監査ログ',
      icon: FileText,
      exact: false,
    },
  ];

  return (
    <div className="flex h-screen">
      {/* サイドバー */}
      <div className="w-64 bg-muted/50 border-r">
        <div className="p-6">
          <h2 className="text-lg font-semibold">管理画面</h2>
        </div>
        <nav className="px-4 space-y-2">
          {navigationItems.map((item) => {
            const isActive = item.exact 
              ? pathname === item.href 
              : pathname.startsWith(item.href);
            
            return (
              <Button
                key={item.href}
                asChild
                variant={isActive ? 'default' : 'ghost'}
                className="w-full justify-start"
              >
                <Link href={item.href}>
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </nav>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
