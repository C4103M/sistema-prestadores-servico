import type { ReactNode } from 'react';

interface EmptyStateProps {
  titulo: string;
  texto: string;
  acao?: ReactNode;
}

export function EmptyState({ titulo, texto, acao }: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-rule-strong px-6 py-10 text-center">
      <p className=" text-lg font-bold text-ink">{titulo}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{texto}</p>
      {acao && <div className="mt-5 flex justify-center">{acao}</div>}
    </div>
  );
}
