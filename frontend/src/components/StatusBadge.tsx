import { CalendarBlank, CheckCircle, UserMinus, XCircle } from '@phosphor-icons/react';
import type { StatusAgendamento } from '../types';

const ESTILO: Record<StatusAgendamento, { rotulo: string; classe: string; Icone: typeof CheckCircle }> = {
  AGENDADO: { rotulo: 'Agendado', classe: 'bg-agendado-soft text-agendado', Icone: CalendarBlank },
  CONCLUIDO: { rotulo: 'Concluído', classe: 'bg-concluido-soft text-concluido', Icone: CheckCircle },
  CANCELADO: { rotulo: 'Cancelado', classe: 'bg-cancelado-soft text-cancelado', Icone: XCircle },
  FALTOU: { rotulo: 'Faltou', classe: 'bg-faltou-soft text-faltou', Icone: UserMinus },
};

// compacto: em telas estreitas mostra só o ícone (o rótulo continua para leitores de tela)
export function StatusBadge({ status, compacto = false }: { status: StatusAgendamento; compacto?: boolean }) {
  const { rotulo, classe, Icone } = ESTILO[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ${classe}`}>
      <Icone className="size-3.5 shrink-0" weight="bold" aria-hidden />
      <span className={compacto ? 'sr-only sm:not-sr-only' : ''}>{rotulo}</span>
    </span>
  );
}
