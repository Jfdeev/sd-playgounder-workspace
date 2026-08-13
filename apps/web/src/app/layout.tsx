import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'System Design Playground',
  description:
    'Monte arquiteturas de sistemas distribuídos e receba métricas calculadas por um engine determinístico — não um LLM como juiz.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
