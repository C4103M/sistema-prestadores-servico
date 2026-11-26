import { useState } from 'react';
import {
  ArrowRight,
  Clock,
  Globe,
  MapPin,
  Moon,
  SignOut,
  Sun,
} from '@phosphor-icons/react';
import { MarcaEncaixe } from '../components/MarcaEncaixe';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { moeda } from '../services/formato';
import { telaInicial } from '../services/sessao';

const OPCOES_VITRINE = [
  { id: 'barba', labelDur: '30m', nome: 'Barba terapia', dur: 30, preco: 40 },
  { id: 'corte', labelDur: '45m', nome: 'Corte degradê', dur: 45, preco: 55 },
  { id: 'combo', labelDur: '60m', nome: 'Combo completo', dur: 60, preco: 85 },
] as const;

const DIAS_CALENDARIO = Array.from({ length: 30 }, (_, idx) => {
  const dia = idx + 1;
  const slotsPorDia: Record<number, readonly string[]> = {
    26: ['09:00', '09:45', '10:30', '14:00', '15:30', '16:15'],
    27: ['09:00', '11:15', '14:45', '17:00'],
    28: ['08:30', '10:00', '11:30', '12:15'],
    30: ['09:00', '10:30', '14:00', '15:15', '16:45'],
  };
  return {
    dia,
    disponivel: Object.hasOwn(slotsPorDia, dia),
    slots: slotsPorDia[dia] ?? [],
  };
});

function formatarHorario(slot24: string, fmt: '12h' | '24h') {
  if (fmt === '24h') return slot24;
  const [hStr, mStr] = slot24.split(':');
  const hNum = Number(hStr);
  const sufixo = hNum >= 12 ? 'pm' : 'am';
  const h12 = hNum % 12 || 12;
  return `${h12}:${mStr}${sufixo}`;
}

export function InicioPage() {
  const { sessao, sair } = useAuth();
  const { escuro, alternarTema } = useTheme();

  // Estado interativo da janela de demonstração (Cal.com showcase)
  const [opcaoId, setOpcaoId] = useState<(typeof OPCOES_VITRINE)[number]['id']>('corte');
  const [diaSelecionado, setDiaSelecionado] = useState(26);
  const [slotSelecionado, setSlotSelecionado] = useState('09:45');
  const [formatoHora, setFormatoHora] = useState<'12h' | '24h'>('24h');

  const opcaoAtual = OPCOES_VITRINE.find((o) => o.id === opcaoId) ?? OPCOES_VITRINE[1];
  const diaObj = DIAS_CALENDARIO.find((d) => d.dia === diaSelecionado) ?? DIAS_CALENDARIO[25];
  const horarioAtivo = diaObj.slots.includes(slotSelecionado) ? slotSelecionado : (diaObj.slots[0] ?? '09:00');
  const destinoAcao = sessao ? `#/${telaInicial(sessao.papel)}` : '#/cadastro';

  return (
    <div className="min-h-dvh">
      {/* Navbar flutuante estilo Cal.com */}
      <div className="sticky top-4 z-30 px-4 sm:px-6">
        <header className="cal-nav mx-auto flex h-[62px] max-w-6xl items-center justify-between gap-4 rounded-2xl px-4 sm:px-5">
          <MarcaEncaixe size="md" />

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

            {sessao ? (
              <>
                <a href={`#/${telaInicial(sessao.papel)}`} className="btn btn-primary btn-sm h-9 rounded-[11px] px-4">
                  Ir para minha área
                </a>
                <button
                  type="button"
                  onClick={sair}
                  className="btn btn-ghost btn-sm h-9 rounded-[10px] px-2.5"
                  aria-label="Sair da conta"
                >
                  <SignOut className="size-4" aria-hidden />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              </>
            ) : (
              <>
                <a href="#/login" className="btn btn-ghost btn-sm h-9 rounded-[10px] px-3.5 text-ink">
                  Entrar
                </a>
                <a href="#/cadastro" className="btn btn-primary btn-sm h-9 rounded-[11px] px-4">
                  Criar conta
                </a>
              </>
            )}
          </div>
        </header>
      </div>

      <main className="mx-auto max-w-6xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16">
        {/* Hero Editorial */}
        <section className="mx-auto max-w-3xl text-center anim-in" style={{ ['--i' as string]: 0 }}>
          <div className="inline-flex items-center gap-2 rounded-lg border border-rule bg-surface px-2.5 py-1 text-xs font-medium text-ink">
            <span className="font-mono-num rounded-[4px] bg-accent-soft px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-accent">
              NOVO
            </span>
            <span>Horários reais sem conflito de agenda</span>
          </div>

          <h1 className="mt-6 text-4xl leading-[1.06] font-bold tracking-tight text-ink-heading sm:text-6xl">
            Agendamento sob medida para prestadores de serviço
          </h1>

          <p className="mx-auto mt-5 max-w-[54ch] text-base leading-relaxed text-muted sm:text-lg">
            Clientes escolhem o serviço e reservam direto nos horários livres. Profissionais gerenciam disponibilidade,
            agenda diária e faturamento em um só lugar.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {sessao ? (
              <>
                <a href={`#/${telaInicial(sessao.papel)}`} className="btn btn-primary btn-lg">
                  Continuar como {sessao.nome}
                  <ArrowRight className="size-4" aria-hidden />
                </a>
                <button type="button" className="btn btn-secondary btn-lg" onClick={sair}>
                  Trocar de conta
                </button>
              </>
            ) : (
              <>
                <a href="#/cadastro" className="btn btn-primary btn-lg">
                  Agendar um horário
                  <ArrowRight className="size-4" aria-hidden />
                </a>
                <a href="#/login" className="btn btn-secondary btn-lg">
                  Entrar na minha conta
                </a>
              </>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-faint">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden />
              Reserva em segundos
            </span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-toy" aria-hidden />
              Cancelamento gratuito
            </span>
            <span aria-hidden>·</span>
            <span>Preço garantido na reserva</span>
          </div>
        </section>

        {/* Janela interativa emoldurada estilo cal.com/pt-BR */}
        <section
          aria-label="Demonstração interativa de agendamento"
          className="cal-plate mt-12 rounded-[20px] p-3 sm:p-6 anim-in"
          style={{ ['--i' as string]: 1 }}
        >
          <div className="cal-window overflow-hidden rounded-xl border border-rule">
            {/* Barra do navegador */}
            <div className="flex items-center justify-between gap-4 border-b border-rule bg-surface-soft px-4 py-3">
              <div className="flex items-center gap-1.5" aria-hidden>
                <span className="size-2.5 rounded-full bg-rule-strong" />
                <span className="size-2.5 rounded-full bg-rule-strong" />
                <span className="size-2.5 rounded-full bg-rule-strong" />
              </div>
              <div className="font-mono-num rounded-full bg-[var(--address-bg)] px-4 py-1 text-xs font-medium text-muted">
                encaixe.app/carlos-barbearia
              </div>
              <div className="hidden items-center gap-1.5 font-mono-num text-[11px] text-faint sm:flex">
                <span className="size-1.5 rounded-full bg-toy" aria-hidden />
                ao vivo
              </div>
            </div>

            <div className="grid lg:grid-cols-[270px_1fr_220px]">
              {/* Coluna esquerda: profissional e serviço */}
              <div className="space-y-5 border-b border-rule p-5 sm:p-6 lg:border-r lg:border-b-0">
                <div className="flex items-center gap-3">
                  <img
                    src="/imagens/categorias/barbearia.webp"
                    alt="Carlos Silva"
                    className="size-10 rounded-[10px] border border-rule object-cover"
                  />
                  <div>
                    <p className="text-xs font-medium text-muted">Carlos Silva</p>
                    <p className="text-base font-bold tracking-tight text-ink-heading">{opcaoAtual.nome}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="block text-xs font-medium text-muted">Duração e serviço</span>
                  <div className="grid grid-cols-3 gap-1 rounded-[10px] bg-plate p-1">
                    {OPCOES_VITRINE.map((op) => {
                      const ativo = op.id === opcaoId;
                      return (
                        <button
                          key={op.id}
                          type="button"
                          onClick={() => setOpcaoId(op.id)}
                          className={`font-mono-num rounded-lg py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                            ativo ? 'cal-raised text-ink-heading' : 'text-muted hover:text-ink-heading'
                          }`}
                        >
                          {op.labelDur}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2.5 text-[13px] text-muted">
                  <div className="flex items-center gap-2.5">
                    <Clock className="size-4 shrink-0 text-accent" aria-hidden />
                    <span className="font-mono-num">
                      {opcaoAtual.dur} min · <strong className="text-ink-heading">{moeda(opcaoAtual.preco)}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <MapPin className="size-4 shrink-0" aria-hidden />
                    <span>Barbearia Centro</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Globe className="size-4 shrink-0" aria-hidden />
                    <span>America/Sao_Paulo</span>
                  </div>
                </div>

                <p className="border-t border-rule pt-3 text-xs text-faint">
                  O valor fica congelado na reserva mesmo se houver reajuste depois.
                </p>
              </div>

              {/* Coluna central: calendário do mês */}
              <div className="border-b border-rule p-5 sm:p-6 lg:border-r lg:border-b-0">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-semibold tracking-tight text-ink-heading">
                    Novembro <span className="font-normal text-muted">2026</span>
                  </h2>
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-toy-soft px-2 py-0.5 text-[11px] font-semibold text-toy-ink">
                    <span className="size-1.5 rounded-full bg-toy" aria-hidden />
                    Agenda livre
                  </span>
                </div>
                <div className="mb-1.5 grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium tracking-wider text-faint">
                  {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map((d) => (
                    <span key={d} className="py-1">
                      {d}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {DIAS_CALENDARIO.map((c) => {
                    const selecionado = c.dia === diaSelecionado;
                    return (
                      <button
                        key={c.dia}
                        type="button"
                        disabled={!c.disponivel}
                        onClick={() => {
                          setDiaSelecionado(c.dia);
                          setSlotSelecionado(c.slots[0] ?? '09:00');
                        }}
                        className={`font-mono-num relative flex h-10 items-center justify-center rounded-lg text-[13px] transition-all sm:h-11 ${
                          selecionado
                            ? 'bg-ink font-bold text-on-ink cursor-pointer'
                            : c.disponivel
                              ? 'bg-slot font-semibold text-ink hover:opacity-85 cursor-pointer'
                              : 'cursor-default font-medium text-muted opacity-45'
                        }`}
                      >
                        {c.dia}
                        {c.disponivel && !selecionado && (
                          <span className="absolute bottom-1.5 size-1 rounded-full bg-toy" aria-hidden />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Coluna direita: horários livres */}
              <div className="flex flex-col justify-between gap-4 p-5 sm:p-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-ink-heading">
                      Dia <span className="font-mono-num text-muted">{diaSelecionado}</span>
                    </span>
                    <div className="cal-well inline-flex gap-0.5 rounded-lg p-0.5">
                      {(['12h', '24h'] as const).map((fmt) => {
                        const ativo = formatoHora === fmt;
                        return (
                          <button
                            key={fmt}
                            type="button"
                            onClick={() => setFormatoHora(fmt)}
                            className={`font-mono-num rounded-md px-2 py-0.5 text-[11px] font-semibold cursor-pointer ${
                              ativo ? 'cal-raised text-ink-heading' : 'text-muted'
                            }`}
                          >
                            {fmt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="max-h-[248px] space-y-2 overflow-y-auto pr-0.5">
                    {diaObj.slots.map((slot) => {
                      const ativo = slot === horarioAtivo;
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSlotSelecionado(slot)}
                          className={`font-mono-num flex h-10 w-full items-center justify-center gap-2 rounded-lg px-3 text-[13px] font-medium transition-all cursor-pointer ${
                            ativo
                              ? 'bg-ink text-on-ink'
                              : 'border border-rule bg-surface text-ink-heading hover:border-rule-strong'
                          }`}
                        >
                          <span
                            className={`size-1.5 rounded-full ${ativo ? 'bg-accent' : 'bg-toy'}`}
                            aria-hidden
                          />
                          <span>{formatarHorario(slot, formatoHora)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <a href={destinoAcao} className="btn btn-primary w-full rounded-[10px]">
                  Reservar {formatarHorario(horarioAtivo, formatoHora)}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Rodapé discreto de marca */}
        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-6 text-xs text-muted">
          <span>Encaixe · Agendamento sem conflito de horários</span>
          <span className="font-mono-num text-faint">encaixe.app</span>
        </footer>
      </main>
    </div>
  );
}
