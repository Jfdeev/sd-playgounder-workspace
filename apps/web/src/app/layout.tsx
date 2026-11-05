import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { DialogHost } from '@/components/ui/dialog-host';
import './globals.css';

export const metadata: Metadata = {
  title: 'System Design Playground',
  description:
    'Monte arquiteturas de sistemas distribuídos e receba métricas calculadas por um engine determinístico — não um LLM como juiz.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        {/* Ajustes gerais: confirmações (modal) e avisos (toast) no visual do app, no lugar dos nativos. */}
        <DialogHost />
        <Toaster theme="dark" position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
