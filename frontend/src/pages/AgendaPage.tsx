import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Agendamento, Disponibilidade, StatusAgendamento } from '../types';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { dataLonga, hora, mesmoDia, moeda } from '../services/formato';
import { deMinutos, faixasDoDia, paraMinutos } from '../services/horarios';
import { PROFISSIONAL_LOGADO_ID } from '../services/mockData';

interface AgendaPageProps {
  agendamentos: Agendamento[];
  disponibilidades: Disponibilidade[];
  onAtualizarStatus: (id: number, status: Exclude<StatusAgendamento, 'AGENDADO'>) => void;
}

const PX_POR_HORA = 72;

const COR_BLOCO: Record<StatusAgendamento, string> = {
  AGENDADO: 'border-agendado/25 bg-agendado-soft',
  CONCLUIDO: 'border-concluido/25 bg-concluido-soft',
  CANCELADO: 'border-dashed border-rule-strong bg-cancelado-soft opacity-75',
  FALTOU: 'border-faltou/25 bg-faltou-soft',
};

export function AgendaPage({ agendamentos, disponibilidades, onAtualizarStatus }: AgendaPageProps) {
  const [dia, setDia] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [agora, setAgora] = useState(() => new Date());
  const [cancelando, setCancelando] = useState<Agendamento | null>(null);

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
    .filter((a) => a.profissionalId === PROFISSIONAL_LOGADO_ID && mesmoDia(new Date(a.dataHoraInicio), dia))
    .sort((a, b) => a.dataHoraInicio.localeCompare(b.dataHoraInicio));
  const faixas = faixasDoDia(disponibilidades, PROFISSIONAL_LOGADO_ID, dia);

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

  return (
    <div className="space-y-8">
      <PageHeader
        titulo="Agenda"
        descricao="Atendimentos do dia em ordem de horário. Conclua ou registre a falta ao fim de cada um."
        acoes={
          <div className="flex items-center gap-2.5">
            <button type="button" className="btn btn-secondary btn-icon" onClick={() => mudarDia(-1)} aria-label="Dia anterior">
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={ehHoje}
              onClick={() => {
                const d = new Date();
                d.setHours(0, 0, 0, 0);
                setDia(d);
              }}
            >
              Hoje
            </button>
            <button type="button" className="btn btn-secondary btn-icon" onClick={() => mudarDia(1)} aria-label="Próximo dia">
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>
        }
      />

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold first-letter:uppercase">{dataLonga(dia)}</h2>
        <p className="tabular text-sm text-muted">
          {ativos.length === 1 ? '1 atendimento' : `${ativos.length} atendimentos`} · {moeda(previsto)} previstos
          {faixas.length > 0 && ` · atende ${faixas.map((f) => `${f.horaInicio}–${f.horaFim}`).join(' e ')}`}
        </p>
      </div>

      {faixas.length === 0 && doDia.length === 0 ? (
        <div className="painel p-8 text-center">
          <p className=" text-lg font-bold">Dia sem atendimento</p>
          <p className="mt-1 text-sm text-muted">Você não tem disponibilidade cadastrada para este dia da semana.</p>
        </div>
      ) : (
        <div className="painel overflow-hidden">
          <div className="relative" style={{ height: y(fimJanela) }}>
            {/* Faixas de disponibilidade: o restante do dia fica no tom do papel */}
            <div className="absolute inset-y-0 right-0 left-16 bg-paper" aria-hidden />
            {faixas.map((f) => (
              <div
                key={f.id}
                aria-hidden
                className="absolute right-0 left-16 bg-surface"
                style={{ top: y(paraMinutos(f.horaInicio)), height: y(paraMinutos(f.horaFim)) - y(paraMinutos(f.horaInicio)) }}
              />
            ))}

            {/* Linhas de hora */}
            {horas.map((h) => (
              <div key={h} className="absolute right-0 left-0 flex" style={{ top: y(h) }} aria-hidden>
                <span className="tabular w-16 -translate-y-1/2 pr-3 text-right text-xs text-muted">
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
                const compacto = altura < 80;
                const jaComecou = new Date(a.dataHoraInicio) <= agora;
                return (
                  <li
                    key={a.id}
                    className={`absolute inset-x-0 overflow-hidden rounded-xl border px-3 ${COR_BLOCO[a.status]} ${
                      compacto ? 'flex items-center gap-3 py-1' : 'py-2'
                    }`}
                    style={{ top: topo + 2, height: altura - 4 }}
                  >
                    <div className={`min-w-0 ${compacto ? 'flex flex-1 items-center gap-3' : ''}`}>
                      <p className="tabular min-w-0 truncate text-sm font-bold">
                        <span className=" text-[0.8125rem]">{hora(a.dataHoraInicio)}–{hora(a.dataHoraFim)}</span> · {a.clienteNome}
                      </p>
                      <p className={`truncate text-xs text-muted ${compacto ? 'hidden shrink sm:block' : ''}`}>
                        {a.servicoNome} · {moeda(a.preco)}
                      </p>
                    </div>
                    <div className={`flex items-center gap-1.5 ${compacto ? '' : 'mt-1.5'}`}>
                      {a.status === 'AGENDADO' ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm h-7"
                            onClick={() => onAtualizarStatus(a.id, 'CONCLUIDO')}
                          >
                            Concluir
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm h-7"
                            disabled={!jaComecou}
                            title={jaComecou ? undefined : 'Disponível depois do horário de início'}
                            onClick={() => onAtualizarStatus(a.id, 'FALTOU')}
                          >
                            Faltou
                          </button>
                          {!jaComecou && (
                            <button
                              type="button"
                              className={`btn btn-ghost btn-sm h-7 ${compacto ? 'hidden sm:inline-flex' : ''}`}
                              onClick={() => setCancelando(a)}
                            >
                              Cancelar
                            </button>
                          )}
                        </>
                      ) : (
                        <StatusBadge status={a.status} compacto={compacto} />
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>

            {/* Agora: o marca-texto do dia */}
            {ehHoje && minAgora >= inicioJanela && minAgora <= fimJanela && (
              <div className="pointer-events-none absolute right-0 left-12 flex items-center" style={{ top: y(minAgora) }}>
                <span className="tabular -translate-y-1/2 rounded bg-marker px-1.5 py-0.5 text-[0.6875rem] font-bold text-white">
                  {hora(agora)}
                </span>
                <span className="h-0.5 flex-1 -translate-y-1/2 bg-marker" />
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
        onConfirmar={() => cancelando && onAtualizarStatus(cancelando.id, 'CANCELADO')}
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
