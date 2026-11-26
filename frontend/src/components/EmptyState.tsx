import type { ReactNode } from 'react';
import { CalendarBlank } from '@phosphor-icons/react';

interface EmptyStateProps {
  titulo: string;
  texto: string;
  acao?: ReactNode;
}

export function EmptyState({ titulo, texto, acao }: EmptyStateProps) {
  return (
    <div className="cal-card rounded-2xl border-dashed px-6 py-12 text-center">
      <div className="cal-plate mx-auto grid size-11 place-items-center rounded-xl text-muted">
        <CalendarBlank className="size-5" aria-hidden />
      </div>
      <p className="mt-4 text-lg font-bold tracking-tight text-ink-heading">{titulo}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">{texto}</p>
      {acao && <div className="mt-6 flex justify-center">{acao}</div>}
    </div>
  );
}
