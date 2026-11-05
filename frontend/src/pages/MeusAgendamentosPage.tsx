import { useState, type ReactNode } from 'react';
import { Info } from 'lucide-react';
import type { Agendamento } from '../types';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { dataCurta, hora, moeda } from '../services/formato';
import { podeCancelar } from '../services/horarios';
import { CLIENTE_LOGADO_ID } from '../services/mockData';

interface MeusAgendamentosPageProps {
  agendamentos: Agendamento[];
  onCancelar: (id: number) => void;
  onAgendar: () => void;
}

export function MeusAgendamentosPage({ agendamentos, onCancelar, onAgendar }: MeusAgendamentosPageProps) {
  const [cancelando, setCancelando] = useState<Agendamento | null>(null);

  const meus = agendamentos.filter((a) => a.clienteId === CLIENTE_LOGADO_ID);
  const agora = new Date();
  const proximos = meus
    .filter((a) => a.status === 'AGENDADO' && new Date(a.dataHoraFim) >= agora)
    .sort((a, b) => a.dataHoraInicio.localeCompare(b.dataHoraInicio));
  const historico = meus
    .filter((a) => !proximos.includes(a))
    .sort((a, b) => b.dataHoraInicio.localeCompare(a.dataHoraInicio));

  return (
    <div className="space-y-8">
      <PageHeader
        titulo="Meus agendamentos"
        descricao="Acompanhe seus horários. Você pode cancelar até 2 horas antes do início."
        acoes={
          <button type="button" className="btn btn-primary" onClick={onAgendar}>
            Novo agendamento
          </button>
        }
      />

      <section aria-labelledby="titulo-proximos" className="space-y-3">
        <h2 id="titulo-proximos" className="text-lg font-bold">
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
          <ul className="space-y-2">
            {proximos.map((a) => (
              <Linha key={a.id} agendamento={a}>
                {podeCancelar(a, agora) ? (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCancelando(a)}>
                    Cancelar
                  </button>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-muted">
                    <Info className="size-3.5" aria-hidden />
                    Menos de 2 h para o início: não pode mais ser cancelado
                  </span>
                )}
              </Linha>
            ))}
          </ul>
        )}
      </section>

      {historico.length > 0 && (
        <section aria-labelledby="titulo-historico" className="space-y-3">
          <h2 id="titulo-historico" className="text-lg font-bold">
            Histórico
          </h2>
          <ul className="space-y-2">
            {historico.map((a) => (
              <Linha key={a.id} agendamento={a} />
            ))}
          </ul>
        </section>
      )}

      <ConfirmDialog
        aberto={cancelando !== null}
        titulo="Cancelar este agendamento?"
        rotuloConfirmar="Cancelar agendamento"
        rotuloCancelar="Manter"
        perigo
        onConfirmar={() => cancelando && onCancelar(cancelando.id)}
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

function Linha({ agendamento: a, children }: { agendamento: Agendamento; children?: ReactNode }) {
  const inicio = new Date(a.dataHoraInicio);
  return (
    <li className="painel flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5">
      <div className="tabular flex w-16 shrink-0 flex-col items-center rounded-lg bg-paper py-2 text-center">
        <span className="text-xs text-muted uppercase">
          {inicio.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
        </span>
        <span className=" text-2xl leading-tight font-bold">{inicio.getDate()}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-bold">{a.servicoNome}</h3>
          <StatusBadge status={a.status} />
        </div>
        <p className="tabular mt-0.5 text-sm text-muted">
          {inicio.toLocaleDateString('pt-BR', { weekday: 'long' })}, {hora(a.dataHoraInicio)}–{hora(a.dataHoraFim)} ·{' '}
          {a.profissionalNome}
        </p>
      </div>
      <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-1.5">
        <span className="tabular font-bold">{moeda(a.preco)}</span>
        {children}
      </div>
    </li>
  );
}
