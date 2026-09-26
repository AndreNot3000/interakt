import './globals.css';
import { ReactQueryProvider } from '@/lib/query-provider';
import { AppLayout } from '@/components/layout/app-layout';

export const metadata = {
  title: 'Interakt — Digital Campus Platform',
  description: 'University student social and academic platform connecting communities, courses, and opportunities.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased text-slate-900 bg-slate-50">
        <ReactQueryProvider>
          <AppLayout>{children}</AppLayout>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
