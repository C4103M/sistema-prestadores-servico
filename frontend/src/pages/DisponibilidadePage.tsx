import { useState, type FormEvent } from 'react';
import { PencilSimple, Plus, Trash } from '@phosphor-icons/react';
import type { DiaSemana, Disponibilidade } from '../types';
import { PageHeader } from '../components/PageHeader';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DIAS_SEMANA, deMinutos, faixasSobrepostas, paraMinutos } from '../services/horarios';
import { ApiError } from '../services/api';

interface DisponibilidadePageProps {
  profissionalId: number;
  disponibilidades: Disponibilidade[];
  onSalvar: (faixa: Disponibilidade) => Promise<void>;
  onExcluir: (id: number) => Promise<void>;
}

// Régua da semana: 06:00 às 22:00
const REGUA_INICIO = 6 * 60;
const REGUA_FIM = 22 * 60;
const MARCOS_REGUA = ['06h', '10h', '14h', '18h', '22h'] as const;
const pct = (min: number) => ((min - REGUA_INICIO) / (REGUA_FIM - REGUA_INICIO)) * 100;

const OPCOES_HORA = Array.from({ length: (REGUA_FIM - REGUA_INICIO) / 30 + 1 }, (_, i) =>
  deMinutos(REGUA_INICIO + i * 30)
);

interface Edicao {
  dia: DiaSemana;
  id?: number;
  horaInicio: string;
  horaFim: string;
}

export function DisponibilidadePage({ profissionalId, disponibilidades, onSalvar, onExcluir }: DisponibilidadePageProps) {
  const [edicao, setEdicao] = useState<Edicao | null>(null);
  const [erro, setErro] = useState('');
  const [removendo, setRemovendo] = useState<Disponibilidade | null>(null);

  const minhas = disponibilidades.filter((d) => d.profissionalId === profissionalId);
  const doDia = (dia: DiaSemana) =>
    minhas
      .filter((d) => d.diaSemana === dia)
      .sort((a, b) => paraMinutos(a.horaInicio) - paraMinutos(b.horaInicio));

  const totalSemanal = minhas.reduce((s, f) => s + paraMinutos(f.horaFim) - paraMinutos(f.horaInicio), 0);

  const abrir = (dia: DiaSemana, faixa?: Disponibilidade) => {
    setErro('');
    if (faixa) {
      setEdicao({ dia, id: faixa.id, horaInicio: faixa.horaInicio, horaFim: faixa.horaFim });
      return;
    }
    const ultima = doDia(dia).at(-1);
    const inicio = ultima ? Math.min(paraMinutos(ultima.horaFim) + 60, REGUA_FIM - 60) : 9 * 60;
    setEdicao({ dia, horaInicio: deMinutos(inicio), horaFim: deMinutos(Math.min(inicio + 3 * 60, REGUA_FIM)) });
  };

  const salvar = async (e: FormEvent) => {
    e.preventDefault();
    if (!edicao) return;
    if (paraMinutos(edicao.horaFim) <= paraMinutos(edicao.horaInicio)) {
      setErro('O fim precisa ser depois do início.');
      return;
    }
    const nova = {
      id: edicao.id ?? Date.now(),
      profissionalId,
      diaSemana: edicao.dia,
      horaInicio: edicao.horaInicio,
      horaFim: edicao.horaFim,
    };
    if (faixasSobrepostas(minhas, nova, edicao.id)) {
      setErro('Essa faixa se sobrepõe a outra do mesmo dia.');
      return;
    }
    try {
      await onSalvar(nova);
      setEdicao(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setErro(err.message);
      } else {
        setErro('Não foi possível salvar a faixa de disponibilidade.');
      }
    }
  };

  const excluir = async () => {
    if (!removendo) return;
    try {
      await onExcluir(removendo.id);
      setRemovendo(null);
    } catch (err) {
      // O erro geral da API é exibido no AppShell; preservar o diálogo e permitir nova tentativa.
      throw err;
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        titulo="Disponibilidade"
        descricao="Os dias e horários em que você atende. Os clientes só veem horários livres dentro destas faixas."
        acoes={
          <span className="font-mono-num rounded-lg border border-rule bg-surface px-3 py-1.5 text-xs font-semibold text-ink-heading">
            {deMinutos(totalSemanal).replace(':', ' h ').replace(' h 00', ' h')} / semana
          </span>
        }
      />

      <div className="cal-card overflow-hidden">
        {/* Cabeçalho com régua graduada 06h - 22h */}
        <div className="hidden border-b border-rule bg-surface-soft px-5 py-3 md:grid md:grid-cols-[9rem_minmax(0,1fr)_8.5rem] md:items-center md:gap-5">
          <span className="font-mono-num text-[11px] font-medium uppercase tracking-wider text-faint">Dia</span>
          <div className="font-mono-num flex justify-between text-[11px] font-medium text-faint">
            {MARCOS_REGUA.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
          <span className="font-mono-num text-right text-[11px] font-medium uppercase tracking-wider text-faint">
            Ações
          </span>
        </div>

        <ol className="divide-y divide-rule">
          {DIAS_SEMANA.map(({ valor, nome }) => {
            const faixas = doDia(valor);
            const editandoAqui = edicao?.dia === valor;
            return (
              <li key={valor} className="p-4 sm:px-5">
                <div className="grid gap-3 md:grid-cols-[9rem_minmax(0,1fr)_8.5rem] md:items-center md:gap-5">
                  <p className={`flex items-center gap-2 text-base font-bold ${faixas.length === 0 ? 'text-muted' : 'text-ink-heading'}`}>
                    <span
                      aria-hidden
                      className={`size-2 shrink-0 rounded-full ${faixas.length > 0 ? 'bg-toy' : 'bg-rule-strong'}`}
                    />
                    {nome}
                  </p>

                  <div className="min-w-0 space-y-2.5">
                    {/* Régua do dia com marcas graduadas sutis */}
                    <div className="relative h-7 rounded-lg border border-rule bg-plate" aria-hidden>
                      <div className="pointer-events-none absolute inset-0 flex justify-between px-[25%]">
                        <span className="h-full w-px bg-rule" />
                        <span className="h-full w-px bg-rule" />
                        <span className="h-full w-px bg-rule" />
                      </div>
                      {faixas.map((f) => {
                        const dur = paraMinutos(f.horaFim) - paraMinutos(f.horaInicio);
                        const emEdicao = edicao?.id === f.id;
                        return (
                          <span
                            key={f.id}
                            className={`font-mono-num absolute inset-y-0.5 flex items-center justify-center overflow-hidden rounded-md px-1 text-[11px] font-medium transition-colors ${
                              emEdicao ? 'bg-accent text-white' : 'bg-ink text-on-ink'
                            }`}
                            style={{
                              left: `${pct(paraMinutos(f.horaInicio))}%`,
                              width: `${pct(paraMinutos(f.horaFim)) - pct(paraMinutos(f.horaInicio))}%`,
                            }}
                          >
                            {dur >= 120 ? `${f.horaInicio}–${f.horaFim}` : ''}
                          </span>
                        );
                      })}
                    </div>

                    {faixas.length === 0 ? (
                      <p className="text-xs text-faint">Não atende</p>
                    ) : (
                      <ul className="flex flex-wrap gap-2">
                        {faixas.map((f) => (
                          <li
                            key={f.id}
                            className="font-mono-num flex items-center rounded-lg border border-rule bg-surface pl-2.5 text-xs font-semibold text-ink-heading"
                          >
                            {f.horaInicio}–{f.horaFim}
                            <button
                              type="button"
                              className="btn btn-ghost btn-icon ml-1 size-7"
                              aria-label={`Editar faixa ${f.horaInicio} a ${f.horaFim} de ${nome}`}
                              onClick={() => abrir(valor, f)}
                            >
                              <PencilSimple className="size-3.5" aria-hidden />
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-icon size-7 hover:!text-danger"
                              aria-label={`Remover faixa ${f.horaInicio} a ${f.horaFim} de ${nome}`}
                              onClick={() => setRemovendo(f)}
                            >
                              <Trash className="size-3.5" aria-hidden />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm justify-self-start md:justify-self-end"
                    onClick={() => abrir(valor)}
                  >
                    <Plus className="size-3.5" aria-hidden />
                    Adicionar faixa
                  </button>
                </div>

                {editandoAqui && edicao && (
                  <form
                    onSubmit={salvar}
                    className="cal-plate mt-4 rounded-xl p-4 md:ml-[10.25rem]"
                  >
                    <p className="mb-3 text-sm font-bold text-ink-heading">
                      {edicao.id ? 'Editar faixa' : 'Nova faixa'} · {nome}
                    </p>
                    <div className="flex flex-wrap items-end gap-3">
                      <div>
                        <label className="label" htmlFor="faixa-inicio">
                          Das
                        </label>
                        <select
                          id="faixa-inicio"
                          className="input font-mono-num w-28"
                          value={edicao.horaInicio}
                          onChange={(e) => setEdicao({ ...edicao, horaInicio: e.target.value })}
                        >
                          {OPCOES_HORA.map((h) => (
                            <option key={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label" htmlFor="faixa-fim">
                          Até
                        </label>
                        <select
                          id="faixa-fim"
                          className="input font-mono-num w-28"
                          value={edicao.horaFim}
                          aria-invalid={erro ? true : undefined}
                          aria-describedby={erro ? 'erro-faixa' : undefined}
                          onChange={(e) => setEdicao({ ...edicao, horaFim: e.target.value })}
                        >
                          {OPCOES_HORA.map((h) => (
                            <option key={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" className="btn btn-secondary" onClick={() => setEdicao(null)}>
                          Cancelar
                        </button>
                        <button type="submit" className="btn btn-primary">
                          Salvar
                        </button>
                      </div>
                    </div>
                    {erro && (
                      <p id="erro-faixa" className="erro-campo" role="alert">
                        {erro}
                      </p>
                    )}
                  </form>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <ConfirmDialog
        aberto={removendo !== null}
        titulo="Remover esta faixa?"
        rotuloConfirmar="Remover"
        perigo
        onConfirmar={() => void excluir()}
        onFechar={() => setRemovendo(null)}
      >
        {removendo && (
          <p>
            {DIAS_SEMANA.find((d) => d.valor === removendo.diaSemana)?.nome}, {removendo.horaInicio}–
            {removendo.horaFim}. Novos clientes não poderão agendar neste intervalo; os agendamentos já marcados
            continuam valendo.
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
