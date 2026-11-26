import { useState, type ReactNode } from 'react';
import { Info } from '@phosphor-icons/react';
import type { Agendamento } from '../types';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { dataCurta, hora, moeda } from '../services/formato';
import { podeCancelar } from '../services/horarios';

interface MeusAgendamentosPageProps {
  clienteId: number;
  agendamentos: Agendamento[];
  onCancelar: (id: number) => Promise<void>;
  onAgendar: () => void;
}

export function MeusAgendamentosPage({ clienteId, agendamentos, onCancelar, onAgendar }: MeusAgendamentosPageProps) {
  const [cancelando, setCancelando] = useState<Agendamento | null>(null);

  const meus = agendamentos.filter((a) => a.clienteId === clienteId);
  const agora = new Date();
  const proximos = meus
    .filter((a) => a.status === 'AGENDADO' && new Date(a.dataHoraFim) >= agora)
    .sort((a, b) => a.dataHoraInicio.localeCompare(b.dataHoraInicio));
  const historico = meus
    .filter((a) => !proximos.includes(a))
    .sort((a, b) => b.dataHoraInicio.localeCompare(a.dataHoraInicio));

  const destaque = proximos[0];
  const demaisProximos = proximos.slice(1);

  const renderAcoesCancelamento = (a: Agendamento) =>
    podeCancelar(a, agora) ? (
      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCancelando(a)}>
        Cancelar
      </button>
    ) : (
      <span className="flex items-center gap-1.5 text-xs text-muted">
        <Info className="size-3.5 shrink-0" aria-hidden />
        Menos de 2 h para o início: não pode mais ser cancelado
      </span>
    );

  return (
    <div className="space-y-8">
      <PageHeader
        titulo="Meus agendamentos"
        descricao="Acompanhe seus horários. Cancelamento gratuito pelo sistema até 2 horas antes do início."
        acoes={
          <button type="button" className="btn btn-primary" onClick={onAgendar}>
            Novo agendamento
          </button>
        }
      />

      <section aria-labelledby="titulo-proximos" className="space-y-4">
        <h2 id="titulo-proximos" className="text-base font-bold text-ink-heading">
          Próximos
        </h2>
        {proximos.length === 0 ? (
          <EmptyState
            titulo="Nenhum horário marcado"
            texto="Quando você agendar um serviço, ele aparece aqui com data, horário e valor."
            acao={
              <button type="button" className="btn btn-secondary" onClick={onAgendar}>
                Encontrar um serviço
              </button>
            }
          />
        ) : (
          <div className="space-y-3">
            {destaque && (
              <div className="cal-card border-l-[3px] border-l-accent p-5 sm:p-6 anim-in">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">
                    <span className="size-1.5 rounded-full bg-accent" aria-hidden />
                    Próximo atendimento
                  </span>
                  <StatusBadge status={destaque.status} />
                </div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="font-mono-num flex w-16 shrink-0 flex-col items-center rounded-xl bg-plate py-2.5 text-center">
                      <span className="text-[11px] font-medium uppercase text-muted">
                        {new Date(destaque.dataHoraInicio)
                          .toLocaleDateString('pt-BR', { month: 'short' })
                          .replace('.', '')}
                      </span>
                      <span className="text-2xl leading-tight font-bold text-ink-heading">
                        {new Date(destaque.dataHoraInicio).getDate()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold text-ink-heading">{destaque.servicoNome}</h3>
                      <p className="font-mono-num mt-0.5 text-sm text-muted">
                        {new Date(destaque.dataHoraInicio).toLocaleDateString('pt-BR', { weekday: 'long' })},{' '}
                        {hora(destaque.dataHoraInicio)}–{hora(destaque.dataHoraFim)} · {destaque.profissionalNome}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-2">
                    <span className="font-mono-num text-base font-bold text-ink-heading">{moeda(destaque.preco)}</span>
                    {renderAcoesCancelamento(destaque)}
                  </div>
                </div>
              </div>
            )}

            {demaisProximos.length > 0 && (
              <ul className="space-y-2.5">
                {demaisProximos.map((a) => (
                  <Linha key={a.id} agendamento={a}>
                    {renderAcoesCancelamento(a)}
                  </Linha>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {historico.length > 0 && (
        <section aria-labelledby="titulo-historico" className="space-y-3">
          <h2 id="titulo-historico" className="text-base font-bold text-ink-heading">
            Histórico
          </h2>
          <ul className="space-y-2">
            {historico.map((a) => (
              <Linha key={a.id} agendamento={a} discreto />
            ))}
          </ul>
        </section>
      )}

      <ConfirmDialog
        aberto={cancelando !== null}
        titulo="Cancelar este agendamento?"
        rotuloConfirmar="Cancelar atendimento"
        rotuloCancelar="Manter"
        perigo
        onConfirmar={() => (cancelando ? onCancelar(cancelando.id) : undefined)}
        onFechar={() => setCancelando(null)}
      >
        {cancelando && (
          <p>
            {cancelando.servicoNome} com {cancelando.profissionalNome}, {dataCurta(cancelando.dataHoraInicio)} às{' '}
            {hora(cancelando.dataHoraInicio)}. O horário volta a ficar livre para outros clientes.
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}

function Linha({
  agendamento: a,
  discreto = false,
  children,
}: {
  agendamento: Agendamento;
  discreto?: boolean;
  children?: ReactNode;
}) {
  const inicio = new Date(a.dataHoraInicio);
  return (
    <li
      className={`cal-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5 ${
        discreto ? 'opacity-85' : ''
      }`}
    >
      <div className="font-mono-num flex w-14 shrink-0 flex-col items-center rounded-xl bg-plate py-2 text-center">
        <span className="text-[11px] uppercase text-muted">
          {inicio.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
        </span>
        <span className="text-xl leading-tight font-bold text-ink-heading">{inicio.getDate()}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-bold text-ink-heading">{a.servicoNome}</h3>
          <StatusBadge status={a.status} />
        </div>
        <p className="font-mono-num mt-0.5 text-xs text-muted sm:text-sm">
          {inicio.toLocaleDateString('pt-BR', { weekday: 'long' })}, {hora(a.dataHoraInicio)}–{hora(a.dataHoraFim)} ·{' '}
          {a.profissionalNome}
        </p>
      </div>
      <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-1.5">
        <span className="font-mono-num font-bold text-ink-heading">{moeda(a.preco)}</span>
        {children}
      </div>
    </li>
  );
}
