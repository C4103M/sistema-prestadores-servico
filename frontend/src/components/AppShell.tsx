import type { ReactNode } from 'react';
import {
  CalendarBlank,
  CalendarCheck,
  ChartBar,
  Clock,
  MagnifyingGlass,
  Moon,
  Scissors,
  SignOut,
  SquaresFour,
  Sun,
  User,
  Users,
} from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { MarcaEncaixe } from './MarcaEncaixe';
import type { Area, Tela } from '../types';

interface ItemNav {
  tela: Tela;
  rotulo: string;
  Icone: typeof MagnifyingGlass;
}

// Navegação de cada ator
export const NAV: Record<Area, ItemNav[]> = {
  cliente: [
    { tela: 'cliente/buscar', rotulo: 'Encontrar serviço', Icone: MagnifyingGlass },
    { tela: 'cliente/agendamentos', rotulo: 'Meus agendamentos', Icone: CalendarCheck },
    { tela: 'cliente/perfil', rotulo: 'Meus dados', Icone: User },
  ],
  profissional: [
    { tela: 'profissional/agenda', rotulo: 'Agenda', Icone: CalendarBlank },
    { tela: 'profissional/servicos', rotulo: 'Serviços', Icone: Scissors },
    { tela: 'profissional/disponibilidade', rotulo: 'Disponibilidade', Icone: Clock },
    { tela: 'profissional/dashboard', rotulo: 'Dashboard', Icone: ChartBar },
    { tela: 'profissional/perfil', rotulo: 'Meus dados', Icone: User },
  ],
  admin: [
    { tela: 'admin/usuarios', rotulo: 'Usuários', Icone: Users },
    { tela: 'admin/categorias', rotulo: 'Categorias', Icone: SquaresFour },
    { tela: 'admin/dashboard', rotulo: 'Dashboard', Icone: ChartBar },
    { tela: 'admin/perfil', rotulo: 'Meus dados', Icone: User },
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

export function AppShell({ area, tela, onNavegar, children }: AppShellProps) {
  const { sessao, sair } = useAuth();
  const { escuro, alternarTema } = useTheme();
  const area_ = AREAS[area];
  const nome = sessao?.nome ?? area_.detalhe;
  const iniciais = iniciaisDe(nome);

  const renderItemNav = ({ tela: destino, rotulo, Icone }: ItemNav, horizontal = false) => {
    const ativo = destino === tela;
    return (
      <button
        key={destino}
        type="button"
        onClick={() => onNavegar(destino)}
        aria-current={ativo ? 'page' : undefined}
        className={`flex shrink-0 items-center gap-2.5 rounded-[10px] text-sm transition-all duration-150 cursor-pointer ${
          horizontal ? 'h-9 px-3' : 'h-10 w-full px-3'
        } ${
          ativo
            ? 'cal-raised font-semibold text-ink-heading'
            : 'font-medium text-muted hover:bg-plate hover:text-ink-heading'
        }`}
      >
        <Icone className="size-[17px] shrink-0" weight={ativo ? 'bold' : 'regular'} aria-hidden />
        <span>{rotulo}</span>
      </button>
    );
  };

  if (area === 'cliente') {
    return (
      <div className="min-h-dvh">
        <div className="sticky top-4 z-30 px-4 sm:px-6">
          <header className="cal-nav mx-auto flex h-[62px] max-w-6xl items-center justify-between gap-4 rounded-2xl px-4 sm:px-5">
            <MarcaEncaixe size="md" />

            <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
              {NAV.cliente.map((item) => renderItemNav(item, true))}
            </nav>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={alternarTema}
                aria-label={escuro ? 'Ativar modo claro' : 'Ativar modo escuro'}
                className="btn btn-secondary btn-sm h-9 rounded-[11px] px-3"
              >
                {escuro ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
                <span className="hidden sm:inline">{escuro ? 'Claro' : 'Escuro'}</span>
              </button>

              <button
                type="button"
                onClick={() => onNavegar('cliente/perfil')}
                className="hidden items-center gap-2 rounded-[10px] px-2 py-1 text-left transition-colors hover:bg-plate sm:inline-flex cursor-pointer"
                title="Meus dados"
              >
                <span className="grid size-8 place-items-center rounded-[9px] border border-rule bg-plate text-xs font-bold text-ink-heading">
                  {iniciais}
                </span>
                <span className="max-w-32 truncate text-xs font-semibold text-ink-heading">{nome}</span>
              </button>

              <button
                type="button"
                onClick={sair}
                className="btn btn-ghost btn-sm h-9 rounded-[10px] px-2.5"
                aria-label="Sair da conta"
              >
                <SignOut className="size-4" aria-hidden />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </header>

          <nav
            aria-label="Principal mobile"
            className="cal-plate mx-auto mt-2 flex max-w-6xl gap-1 overflow-x-auto rounded-xl p-1 md:hidden [scrollbar-width:none]"
          >
            {NAV.cliente.map((item) => renderItemNav(item, true))}
          </nav>
        </div>

        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-10">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[244px_1fr]">
      {/* Barra lateral slim estilo app.cal.com (desktop) */}
      <aside className="sticky top-0 hidden h-dvh flex-col justify-between border-r border-rule bg-surface-soft px-4 py-5 lg:flex">
        <div className="space-y-6">
          <div className="px-1">
            <MarcaEncaixe size="md" />
          </div>
          <div>
            <p className="mb-2 px-3 font-mono-num text-[11px] font-medium uppercase tracking-wider text-faint">
              {area_.titulo}
            </p>
            <nav aria-label="Principal" className="flex flex-col gap-1">
              {NAV[area].map((item) => renderItemNav(item))}
            </nav>
          </div>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={alternarTema}
            className="flex h-9 w-full items-center justify-between rounded-[10px] border border-rule bg-surface px-3 text-xs font-semibold text-ink transition-colors hover:bg-plate cursor-pointer"
          >
            <span className="flex items-center gap-2">
              {escuro ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
              <span>{escuro ? 'Modo claro' : 'Modo escuro'}</span>
            </span>
            <span className="font-mono-num text-[11px] text-faint">{escuro ? 'ON' : 'OFF'}</span>
          </button>

          <button
            type="button"
            onClick={() => onNavegar(`${area}/perfil` as Tela)}
            className="flex w-full items-center gap-3 rounded-xl border border-rule bg-surface p-2.5 text-left transition-colors hover:bg-plate cursor-pointer"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-plate text-xs font-bold text-ink-heading">
              {iniciais}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink-heading">{nome}</p>
              <p className="truncate text-xs text-muted">{area_.detalhe}</p>
            </div>
          </button>

          <button type="button" className="btn btn-ghost btn-sm w-full justify-start" onClick={sair}>
            <SignOut className="size-4" aria-hidden />
            Sair
          </button>
        </div>
      </aside>

      {/* Barra superior (mobile e tablet) */}
      <div className="sticky top-0 z-20 px-3 pt-3 lg:hidden">
        <header className="cal-nav rounded-2xl px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <MarcaEncaixe size="sm" />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={alternarTema}
                aria-label={escuro ? 'Ativar modo claro' : 'Ativar modo escuro'}
                className="btn btn-secondary btn-icon"
              >
                {escuro ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
              </button>
              <span className="hidden max-w-28 truncate text-xs font-semibold text-muted sm:inline">{nome}</span>
              <button type="button" className="btn btn-ghost btn-sm px-2.5" onClick={sair} aria-label="Sair da conta">
                <SignOut className="size-4" aria-hidden />
                Sair
              </button>
            </div>
          </div>
          <nav
            aria-label="Principal"
            className="cal-plate -mx-1 mt-3 flex gap-1 overflow-x-auto rounded-xl p-1 [scrollbar-width:none]"
          >
            {NAV[area].map((item) => renderItemNav(item, true))}
          </nav>
        </header>
      </div>

      <main className="mx-auto w-full max-w-[1200px] px-4 py-7 sm:px-6 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}
