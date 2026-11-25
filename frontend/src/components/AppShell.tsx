import type { ReactNode } from 'react';
import {
  CalendarCheck2,
  CalendarDays,
  ChartColumn,
  Clock4,
  LayoutGrid,
  LogOut,
  Search,
  Scissors,
  UserRound,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { Area, Tela } from '../types';

interface ItemNav {
  tela: Tela;
  rotulo: string;
  Icone: typeof Search;
}

// Navegação de cada ator
export const NAV: Record<Area, ItemNav[]> = {
  cliente: [
    { tela: 'cliente/buscar', rotulo: 'Encontrar serviço', Icone: Search },
    { tela: 'cliente/agendamentos', rotulo: 'Meus agendamentos', Icone: CalendarCheck2 },
    { tela: 'cliente/perfil', rotulo: 'Meus dados', Icone: UserRound },
  ],
  profissional: [
    { tela: 'profissional/agenda', rotulo: 'Agenda', Icone: CalendarDays },
    { tela: 'profissional/servicos', rotulo: 'Serviços', Icone: Scissors },
    { tela: 'profissional/disponibilidade', rotulo: 'Disponibilidade', Icone: Clock4 },
    { tela: 'profissional/dashboard', rotulo: 'Dashboard', Icone: ChartColumn },
    { tela: 'profissional/perfil', rotulo: 'Meus dados', Icone: UserRound },
  ],
  admin: [
    { tela: 'admin/usuarios', rotulo: 'Usuários', Icone: Users },
    { tela: 'admin/categorias', rotulo: 'Categorias', Icone: LayoutGrid },
    { tela: 'admin/dashboard', rotulo: 'Dashboard', Icone: ChartColumn },
    { tela: 'admin/perfil', rotulo: 'Meus dados', Icone: UserRound },
  ],
};

// Título e perfil de cada área; nome e iniciais vêm da sessão
export const AREAS: Record<Area, { titulo: string; detalhe: string }> = {
  cliente: { titulo: 'Área do cliente', detalhe: 'Cliente' },
  profissional: { titulo: 'Área do profissional', detalhe: 'Profissional' },
  admin: { titulo: 'Administração', detalhe: 'Admin da plataforma' },
};

const iniciaisDe = (nome: string) =>
  nome
    .split(' ')
    .filter(Boolean)
    .map((parte) => parte[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

interface AppShellProps {
  area: Area;
  tela: Tela;
  onNavegar: (tela: Tela) => void;
  children: ReactNode;
}

function Marca() {
  return (
    <a href="#/" className="flex items-center gap-2.5 rounded-md" aria-label="AgendeFácil — início">
      <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-marker text-white">
        <CalendarCheck2 className="size-[18px]" strokeWidth={2.25} />
      </span>
      <span className="text-[1.0625rem] font-bold text-ink">AgendeFácil</span>
    </a>
  );
}

export function AppShell({ area, tela, onNavegar, children }: AppShellProps) {
  const { sessao, sair } = useAuth();
  const area_ = AREAS[area];
  const nome = sessao?.nome ?? area_.detalhe;

  const itens = NAV[area].map(({ tela: destino, rotulo, Icone }) => {
    const ativo = destino === tela;
    return (
      <button
        key={destino}
        type="button"
        onClick={() => onNavegar(destino)}
        aria-current={ativo ? 'page' : undefined}
        className={`flex h-10 shrink-0 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors duration-150 ${
          ativo ? 'bg-marker-soft text-marker-2' : 'text-muted hover:bg-ink-soft hover:text-ink'
        }`}
      >
        <Icone className="size-[18px]" aria-hidden />
        {rotulo}
      </button>
    );
  });

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_1fr]">
      {/* Barra lateral (desktop) */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-7 border-r border-rule bg-surface px-4 py-5 lg:flex">
        <Marca />
        <div>
          <p className="mb-2 px-3 text-xs font-semibold text-muted">{area_.titulo}</p>
          <nav aria-label="Principal" className="flex flex-col gap-1">
            {itens}
          </nav>
        </div>
        <div className="mt-auto space-y-2">
          <button
            type="button"
            onClick={() => onNavegar(`${area}/perfil` as Tela)}
            className="flex w-full items-center gap-3 rounded-lg bg-paper p-3 text-left transition-colors duration-150 hover:bg-ink-soft"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink-soft text-xs font-bold text-ink">
              {iniciaisDe(nome)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{nome}</p>
              <p className="truncate text-xs text-muted">{area_.detalhe}</p>
            </div>
          </button>
          <button type="button" className="btn btn-ghost btn-sm w-full justify-start" onClick={sair}>
            <LogOut className="size-4" aria-hidden />
            Sair
          </button>
        </div>
      </aside>

      {/* Barra superior (mobile e tablet) */}
      <header className="sticky top-0 z-20 border-b border-rule bg-surface px-4 pt-3 pb-3 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <Marca />
          <div className="flex items-center gap-2">
            <span className="max-w-32 truncate text-xs font-semibold text-muted">{nome}</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={sair} aria-label="Sair da conta">
              <LogOut className="size-4" aria-hidden />
              Sair
            </button>
          </div>
        </div>
        <nav aria-label="Principal" className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {itens}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[1200px] px-4 py-7 sm:px-6 lg:px-12 lg:py-12">{children}</main>
    </div>
  );
}
