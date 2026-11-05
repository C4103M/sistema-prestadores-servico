import type { ReactNode } from 'react';

interface PageHeaderProps {
  titulo: ReactNode;
  descricao?: string;
  acoes?: ReactNode;
}

export function PageHeader({ titulo, descricao, acoes }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-5 border-b border-rule-strong pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <h1 className="text-[1.625rem] leading-tight font-bold text-ink sm:text-[1.875rem]">{titulo}</h1>
        {descricao && <p className="mt-3 max-w-[60ch] text-base text-muted">{descricao}</p>}
      </div>
      {acoes && <div className="flex shrink-0 flex-wrap gap-2.5">{acoes}</div>}
    </header>
  );
}
