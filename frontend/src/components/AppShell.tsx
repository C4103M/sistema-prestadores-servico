import type { ReactNode } from 'react';
import {
  CalendarCheck2,
  CalendarDays,
  ChartColumn,
  Clock4,
  RotateCcw,
  Search,
  Scissors,
} from 'lucide-react';
import type { PapelUsuario, Tela } from '../types';

interface ItemNav {
  tela: Tela;
  rotulo: string;
  Icone: typeof Search;
}

export const NAV: Record<PapelUsuario, ItemNav[]> = {
  CLIENTE: [
    { tela: 'inicio', rotulo: 'Encontrar serviço', Icone: Search },
    { tela: 'meus-agendamentos', rotulo: 'Meus agendamentos', Icone: CalendarCheck2 },
  ],
  PROFISSIONAL: [
    { tela: 'agenda', rotulo: 'Agenda', Icone: CalendarDays },
    { tela: 'servicos', rotulo: 'Serviços', Icone: Scissors },
    { tela: 'disponibilidade', rotulo: 'Disponibilidade', Icone: Clock4 },
    { tela: 'dashboard', rotulo: 'Dashboard', Icone: ChartColumn },
  ],
};

const USUARIO: Record<PapelUsuario, { nome: string; detalhe: string; iniciais: string }> = {
  CLIENTE: { nome: 'Lucas Pereira', detalhe: 'Cliente', iniciais: 'LP' },
  PROFISSIONAL: { nome: 'Carlos Silva', detalhe: 'Profissional · Barbearia', iniciais: 'CS' },
};

interface AppShellProps {
  papel: PapelUsuario;
  tela: Tela;
  onNavegar: (tela: Tela) => void;
  onRestaurar: () => void;
  children: ReactNode;
}

function Marca() {
  return (
    <div className="flex items-center gap-2.5">
      <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-marker text-ink">
        <CalendarCheck2 className="size-[18px]" strokeWidth={2.25} />
      </span>
      <span className="text-[1.0625rem] font-bold tracking-tight text-white">AgendeFácil</span>
    </div>
  );
}

function TrocaPerfil({ papel, onNavegar }: Pick<AppShellProps, 'papel' | 'onNavegar'>) {
  const opcoes: { valor: PapelUsuario; rotulo: string; destino: Tela }[] = [
    { valor: 'CLIENTE', rotulo: 'Cliente', destino: 'inicio' },
    { valor: 'PROFISSIONAL', rotulo: 'Profissional', destino: 'agenda' },
  ];
  return (
    <div role="radiogroup" aria-label="Ver o sistema como" className="grid grid-cols-2 rounded-lg bg-white/8 p-1">
      {opcoes.map((o) => (
        <button
          key={o.valor}
          type="button"
          role="radio"
          aria-checked={papel === o.valor}
          onClick={() => papel !== o.valor && onNavegar(o.destino)}
          className={`h-8 rounded-md text-[0.8125rem] font-semibold transition-colors duration-150 ${
            papel === o.valor ? 'bg-white text-ink' : 'text-white/70 hover:text-white'
          }`}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}

export function AppShell({ papel, tela, onNavegar, onRestaurar, children }: AppShellProps) {
  const usuario = USUARIO[papel];

  const itens = NAV[papel].map(({ tela: destino, rotulo, Icone }) => {
    const ativo = destino === tela;
    return (
      <button
        key={destino}
        type="button"
        onClick={() => onNavegar(destino)}
        aria-current={ativo ? 'page' : undefined}
        className={`flex h-10 shrink-0 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-150 ${
          ativo ? 'bg-white/12 text-white' : 'text-white/70 hover:bg-white/6 hover:text-white'
        }`}
      >
        <Icone className={`size-[18px] ${ativo ? 'text-marker' : ''}`} aria-hidden />
        {rotulo}
      </button>
    );
  });

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[256px_1fr]">
      {/* Barra lateral (desktop) */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 bg-ink px-4 py-5 lg:flex">
        <Marca />
        <div>
          <p className="mb-2 px-1 text-xs font-medium text-white/60">Ver o sistema como</p>
          <TrocaPerfil papel={papel} onNavegar={onNavegar} />
        </div>
        <nav aria-label="Principal" className="flex flex-col gap-1">
          {itens}
        </nav>
        <div className="mt-auto space-y-3">
          <button
            type="button"
            onClick={onRestaurar}
            className="flex items-center gap-2 px-1 text-xs text-white/60 transition-colors hover:text-white"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            Restaurar dados de demonstração
          </button>
          <div className="flex items-center gap-3 rounded-lg bg-white/6 p-3">
            <span className="grid size-9 place-items-center rounded-full bg-ink-soft text-xs font-bold text-ink">
              {usuario.iniciais}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{usuario.nome}</p>
              <p className="truncate text-xs text-white/60">{usuario.detalhe}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Barra superior (mobile e tablet) */}
      <header className="sticky top-0 z-20 bg-ink px-4 pt-3 pb-2 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <Marca />
          <div className="w-52">
            <TrocaPerfil papel={papel} onNavegar={onNavegar} />
          </div>
        </div>
        <nav aria-label="Principal" className="-mx-4 mt-2 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none]">
          {itens}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}
