// src/app/layout.tsx
import './globals.css';
import { AuthProvider } from '@/hooks/use-auth';
import { Toaster } from "@/components/ui/toaster"
import { cn } from '@/lib/utils';


// This is the root layout for the entire application.
// It sets up global providers like AuthProvider and Toaster.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  // For standalone pages (login, landing, etc.), render a simpler layout.
  return (
     <html lang="ja" suppressHydrationWarning>
        <head>
          <link rel="icon" href="/favicon.ico" sizes="any" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet" />
        </head>
        <body className={cn("min-h-screen bg-background antialiased font-sans")}>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </body>
      </html>
  );
}
