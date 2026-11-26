import type { ReactNode } from 'react';

interface PageHeaderProps {
  titulo: ReactNode;
  descricao?: string;
  acoes?: ReactNode;
}

export function PageHeader({ titulo, descricao, acoes }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-5 border-b border-rule pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <h1 className="text-2xl leading-tight font-bold tracking-tight text-ink-heading sm:text-[1.875rem]">
          {titulo}
        </h1>
        {descricao && <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-muted sm:text-base">{descricao}</p>}
      </div>
      {acoes && <div className="flex shrink-0 flex-wrap items-center gap-2.5">{acoes}</div>}
    </header>
  );
}
