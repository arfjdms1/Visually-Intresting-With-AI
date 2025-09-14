import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; // This imports your global styles

const inter = Inter({ subsets: ['latin'] });

// This sets the default title and description for your application
export const metadata: Metadata = {
  title: 'AI Model Showcase',
  description: 'A showcase of AI models and their creations.',
};

// This is the main layout component
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* The `children` prop here will be your `page.tsx` or other nested pages */}
        {children}
      </body>
    </html>
  );
}
