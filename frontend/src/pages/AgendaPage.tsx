import { useEffect, useState } from 'react';
import { CalendarBlank, CaretLeft, CaretRight, ListBullets } from '@phosphor-icons/react';
import type { Agendamento, Disponibilidade, StatusAgendamento } from '../types';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { dataLonga, hora, mesmoDia, moeda } from '../services/formato';
import { deMinutos, faixasDoDia, paraMinutos } from '../services/horarios';

interface AgendaPageProps {
  profissionalId: number;
  agendamentos: Agendamento[];
  disponibilidades: Disponibilidade[];
  onAtualizarStatus: (id: number, status: Exclude<StatusAgendamento, 'AGENDADO'>) => void | Promise<void>;
}

const PX_POR_HORA = 76;

const BORDA_STATUS: Record<StatusAgendamento, string> = {
  AGENDADO: 'border-l-accent bg-surface-soft',
  CONCLUIDO: 'border-l-toy bg-surface-soft',
  CANCELADO: 'border-l-faint bg-plate opacity-70',
  FALTOU: 'border-l-faltou bg-surface-soft',
};

export function AgendaPage({ profissionalId, agendamentos, disponibilidades, onAtualizarStatus }: AgendaPageProps) {
  const [dia, setDia] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [agora, setAgora] = useState(() => new Date());
  const [cancelando, setCancelando] = useState<Agendamento | null>(null);
  const [visualizacao, setVisualizacao] = useState<'timeline' | 'lista'>('timeline');

  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const mudarDia = (delta: number) => {
    const d = new Date(dia);
    d.setDate(d.getDate() + delta);
    setDia(d);
  };

  const doDia = agendamentos
    .filter((a) => a.profissionalId === profissionalId && mesmoDia(new Date(a.dataHoraInicio), dia))
    .sort((a, b) => a.dataHoraInicio.localeCompare(b.dataHoraInicio));
  const faixas = faixasDoDia(disponibilidades, profissionalId, dia);

  const minutosDe = (iso: string) => {
    const d = new Date(iso);
    return d.getHours() * 60 + d.getMinutes();
  };

  // Janela visível: da primeira faixa/atendimento até a última, arredondada para horas cheias
  const pontos = [
    ...faixas.flatMap((f) => [paraMinutos(f.horaInicio), paraMinutos(f.horaFim)]),
    ...doDia.flatMap((a) => [minutosDe(a.dataHoraInicio), minutosDe(a.dataHoraFim)]),
  ];
  const inicioJanela = pontos.length ? Math.floor(Math.min(...pontos) / 60) * 60 : 8 * 60;
  const fimJanela = pontos.length ? Math.ceil(Math.max(...pontos) / 60) * 60 : 18 * 60;
  const horas = Array.from({ length: (fimJanela - inicioJanela) / 60 }, (_, i) => inicioJanela + i * 60);
  const y = (min: number) => ((min - inicioJanela) / 60) * PX_POR_HORA;

  const ehHoje = mesmoDia(dia, agora);
  const minAgora = agora.getHours() * 60 + agora.getMinutes();
  const ativos = doDia.filter((a) => a.status !== 'CANCELADO');
  const previsto = ativos.reduce((s, a) => s + a.preco, 0);

  const renderAcoes = (a: Agendamento, compacto: boolean) => {
    const jaComecou = new Date(a.dataHoraInicio) <= agora;
    if (a.status !== 'AGENDADO') {
      return <StatusBadge status={a.status} compacto={compacto} />;
    }
    return (
      <>
        <button
          type="button"
          className="btn btn-primary btn-sm h-7 rounded-lg"
          onClick={() => void onAtualizarStatus(a.id, 'CONCLUIDO')}
        >
          Concluir
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm h-7 rounded-lg"
          disabled={!jaComecou}
          title={jaComecou ? undefined : 'Disponível depois do horário de início'}
          onClick={() => void onAtualizarStatus(a.id, 'FALTOU')}
        >
          Faltou
        </button>
        {!jaComecou && (
          <button
            type="button"
            className={`btn btn-ghost btn-sm h-7 rounded-lg ${compacto ? 'hidden sm:inline-flex' : ''}`}
            onClick={() => setCancelando(a)}
          >
            Cancelar
          </button>
        )}
      </>
    );
  };

  return (
    <div className="space-y-8">
      <PageHeader
        titulo="Agenda"
        descricao="Atendimentos do dia em ordem de horário. Conclua ou registre a falta ao fim de cada um."
        acoes={
          <div className="flex flex-wrap items-center gap-3">
            <div role="radiogroup" aria-label="Formato da agenda" className="cal-well inline-grid grid-cols-2 rounded-xl p-1">
              {([
                ['timeline', 'Timeline', CalendarBlank],
                ['lista', 'Lista', ListBullets],
              ] as const).map(([valor, rotulo, Icone]) => {
                const ativo = visualizacao === valor;
                return (
                  <button
                    key={valor}
                    type="button"
                    role="radio"
                    aria-checked={ativo}
                    onClick={() => setVisualizacao(valor)}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-all cursor-pointer ${
                      ativo ? 'cal-raised text-ink-heading' : 'text-muted hover:text-ink-heading'
                    }`}
                  >
                    <Icone className="size-3.5" aria-hidden />
                    {rotulo}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="btn btn-secondary btn-icon"
                onClick={() => mudarDia(-1)}
                aria-label="Dia anterior"
              >
                <CaretLeft className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm h-8 px-3.5"
                disabled={ehHoje}
                onClick={() => {
                  const d = new Date();
                  d.setHours(0, 0, 0, 0);
                  setDia(d);
                }}
              >
                Hoje
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-icon"
                onClick={() => mudarDia(1)}
                aria-label="Próximo dia"
              >
                <CaretRight className="size-4" aria-hidden />
              </button>
            </div>
          </div>
        }
      />

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold tracking-tight text-ink-heading first-letter:uppercase">{dataLonga(dia)}</h2>
        <p className="font-mono-num text-xs text-muted sm:text-sm">
          {ativos.length === 1 ? '1 atendimento' : `${ativos.length} atendimentos`} · {moeda(previsto)} previstos
          {faixas.length > 0 && ` · atende ${faixas.map((f) => `${f.horaInicio}–${f.horaFim}`).join(' e ')}`}
        </p>
      </div>

      {faixas.length === 0 && doDia.length === 0 ? (
        <div className="cal-card p-10 text-center">
          <p className="text-lg font-bold text-ink-heading">Dia sem atendimento</p>
          <p className="mt-1 text-sm text-muted">Você não tem disponibilidade cadastrada para este dia da semana.</p>
        </div>
      ) : visualizacao === 'lista' ? (
        doDia.length === 0 ? (
          <div className="cal-card p-10 text-center">
            <p className="text-base font-bold text-ink-heading">Nenhum atendimento marcado neste dia</p>
            <p className="mt-1 text-sm text-muted">
              Suas faixas de atendimento estão abertas para reservas de clientes.
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {doDia.map((a) => (
              <li
                key={a.id}
                className={`cal-card flex flex-col gap-3 border-l-[3px] p-4 sm:flex-row sm:items-center sm:justify-between ${BORDA_STATUS[a.status]}`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-mono-num text-xs font-bold text-ink-heading">
                      {hora(a.dataHoraInicio)}–{hora(a.dataHoraFim)}
                    </span>
                    <span className="font-semibold text-ink-heading">{a.clienteNome}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {a.servicoNome} · <span className="font-mono-num font-semibold text-ink">{moeda(a.preco)}</span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">{renderAcoes(a, false)}</div>
              </li>
            ))}
          </ul>
        )
      ) : (
        <div className="cal-card overflow-hidden">
          <div className="relative" style={{ height: y(fimJanela) }}>
            {/* Faixas de disponibilidade: fora da faixa fica no tom plate */}
            <div className="absolute inset-y-0 right-0 left-16 bg-plate" aria-hidden />
            {faixas.map((f) => (
              <div
                key={f.id}
                aria-hidden
                className="absolute right-0 left-16 bg-surface"
                style={{
                  top: y(paraMinutos(f.horaInicio)),
                  height: y(paraMinutos(f.horaFim)) - y(paraMinutos(f.horaInicio)),
                }}
              />
            ))}

            {/* Linhas de hora */}
            {horas.map((h) => (
              <div key={h} className="absolute right-0 left-0 flex" style={{ top: y(h) }} aria-hidden>
                <span className="font-mono-num w-16 -translate-y-1/2 pr-3 text-right text-[11px] text-faint">
                  {h > inicioJanela && deMinutos(h)}
                </span>
                <span className="flex-1 border-t border-rule" />
              </div>
            ))}

            {/* Atendimentos */}
            <ol className="absolute inset-y-0 right-3 left-[4.75rem]">
              {doDia.map((a) => {
                const topo = y(minutosDe(a.dataHoraInicio));
                const altura = y(minutosDe(a.dataHoraFim)) - topo;
                const compacto = altura < 82;
                return (
                  <li
                    key={a.id}
                    className={`absolute inset-x-0 overflow-hidden rounded-xl border border-rule border-l-[3px] px-3.5 transition-colors ${
                      BORDA_STATUS[a.status]
                    } ${compacto ? 'flex items-center justify-between gap-3 py-1' : 'flex flex-col justify-between py-2'}`}
                    style={{ top: topo + 2, height: Math.max(42, altura - 4) }}
                  >
                    <div className={`min-w-0 ${compacto ? 'flex flex-1 items-baseline gap-2.5' : ''}`}>
                      <p className="font-mono-num min-w-0 truncate text-xs font-bold text-ink-heading">
                        {hora(a.dataHoraInicio)}–{hora(a.dataHoraFim)}{' '}
                        <span className="font-sans text-sm font-semibold">· {a.clienteNome}</span>
                      </p>
                      <p className={`truncate text-xs text-muted ${compacto ? 'hidden shrink sm:block' : 'mt-0.5'}`}>
                        {a.servicoNome} · <span className="font-mono-num">{moeda(a.preco)}</span>
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">{renderAcoes(a, compacto)}</div>
                  </li>
                );
              })}
            </ol>

            {/* Agora: indicador Cal.com em #CC4510 */}
            {ehHoje && minAgora >= inicioJanela && minAgora <= fimJanela && (
              <div
                className="pointer-events-none absolute right-0 left-3 flex items-center"
                style={{ top: y(minAgora) }}
              >
                <span className="font-mono-num -translate-y-1/2 rounded-md bg-accent px-1.5 py-0.5 text-[11px] font-bold text-white">
                  {hora(agora)}
                </span>
                <span className="pulse-dot -ml-0.5 size-2 -translate-y-1/2 rounded-full bg-accent" />
                <span className="h-0.5 flex-1 -translate-y-1/2 bg-accent" />
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        aberto={cancelando !== null}
        titulo="Cancelar este atendimento?"
        rotuloConfirmar="Cancelar atendimento"
        rotuloCancelar="Manter"
        perigo
        onConfirmar={() => (cancelando ? onAtualizarStatus(cancelando.id, 'CANCELADO') : undefined)}
        onFechar={() => setCancelando(null)}
      >
        {cancelando && (
          <p>
            {cancelando.servicoNome} de {cancelando.clienteNome}, às {hora(cancelando.dataHoraInicio)}. O horário volta a
            ficar livre na agenda.
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
