import { useState, type FormEvent } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { DiaSemana, Disponibilidade } from '../types';
import { PageHeader } from '../components/PageHeader';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DIAS_SEMANA, deMinutos, faixasSobrepostas, paraMinutos } from '../services/horarios';
import { PROFISSIONAL_LOGADO_ID } from '../services/mockData';

interface DisponibilidadePageProps {
  disponibilidades: Disponibilidade[];
  onSalvar: (faixa: Disponibilidade) => void;
  onExcluir: (id: number) => void;
}

// Régua da semana: 06:00 às 22:00
const REGUA_INICIO = 6 * 60;
const REGUA_FIM = 22 * 60;
const pct = (min: number) => ((min - REGUA_INICIO) / (REGUA_FIM - REGUA_INICIO)) * 100;

const OPCOES_HORA = Array.from({ length: (REGUA_FIM - REGUA_INICIO) / 30 + 1 }, (_, i) => deMinutos(REGUA_INICIO + i * 30));

interface Edicao {
  dia: DiaSemana;
  id?: number;
  horaInicio: string;
  horaFim: string;
}

export function DisponibilidadePage({ disponibilidades, onSalvar, onExcluir }: DisponibilidadePageProps) {
  const [edicao, setEdicao] = useState<Edicao | null>(null);
  const [erro, setErro] = useState('');
  const [removendo, setRemovendo] = useState<Disponibilidade | null>(null);

  const minhas = disponibilidades.filter((d) => d.profissionalId === PROFISSIONAL_LOGADO_ID);
  const doDia = (dia: DiaSemana) =>
    minhas.filter((d) => d.diaSemana === dia).sort((a, b) => paraMinutos(a.horaInicio) - paraMinutos(b.horaInicio));

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

  const salvar = (e: FormEvent) => {
    e.preventDefault();
    if (!edicao) return;
    if (paraMinutos(edicao.horaFim) <= paraMinutos(edicao.horaInicio)) {
      setErro('O fim precisa ser depois do início.');
      return;
    }
    const nova = {
      id: edicao.id ?? Date.now(),
      profissionalId: PROFISSIONAL_LOGADO_ID,
      diaSemana: edicao.dia,
      horaInicio: edicao.horaInicio,
      horaFim: edicao.horaFim,
    };
    if (faixasSobrepostas(minhas, nova, edicao.id)) {
      setErro('Essa faixa se sobrepõe a outra do mesmo dia.');
      return;
    }
    onSalvar(nova);
    setEdicao(null);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        titulo="Disponibilidade"
        descricao="Os dias e horários em que você atende. Os clientes só veem horários livres dentro destas faixas."
      />

      <p className="tabular text-sm text-muted">
        {deMinutos(totalSemanal).replace(':', ' h ').replace(' h 00', ' h')} de atendimento por semana
      </p>

      <ol className="painel divide-y divide-rule">
        {DIAS_SEMANA.map(({ valor, nome }) => {
          const faixas = doDia(valor);
          const editandoAqui = edicao?.dia === valor;
          return (
            <li key={valor} className="p-4 sm:px-5">
              <div className="grid gap-3 md:grid-cols-[9rem_minmax(0,1fr)_auto] md:items-center md:gap-5">
                <p className=" text-lg font-bold">{nome}</p>

                <div className="min-w-0 space-y-2.5">
                  {/* Régua do dia com as faixas desenhadas */}
                  <div className="relative h-3.5 rounded-md border border-rule-strong bg-paper" aria-hidden>
                    {faixas.map((f) => (
                      <span
                        key={f.id}
                        className={`absolute inset-y-0 ${edicao?.id === f.id ? 'bg-marker' : 'bg-ink'}`}
                        style={{ left: `${pct(paraMinutos(f.horaInicio))}%`, width: `${pct(paraMinutos(f.horaFim)) - pct(paraMinutos(f.horaInicio))}%` }}
                      />
                    ))}
                  </div>
                  {faixas.length === 0 ? (
                    <p className="text-sm text-muted">Não atende</p>
                  ) : (
                    <ul className="flex flex-wrap gap-2">
                      {faixas.map((f) => (
                        <li key={f.id} className="tabular flex items-center rounded-lg border border-rule-strong bg-surface pl-2.5 text-[0.8125rem] font-bold">
                          {f.horaInicio}–{f.horaFim}
                          <button type="button" className="btn btn-ghost btn-icon ml-1 size-7" aria-label={`Editar faixa ${f.horaInicio} a ${f.horaFim} de ${nome}`} onClick={() => abrir(valor, f)}>
                            <Pencil className="size-3.5" aria-hidden />
                          </button>
                          <button type="button" className="btn btn-ghost btn-icon size-7 hover:!text-danger" aria-label={`Remover faixa ${f.horaInicio} a ${f.horaFim} de ${nome}`} onClick={() => setRemovendo(f)}>
                            <Trash2 className="size-3.5" aria-hidden />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <button type="button" className="btn btn-secondary btn-sm justify-self-start" onClick={() => abrir(valor)}>
                  <Plus className="size-4" aria-hidden />
                  Adicionar faixa
                </button>
              </div>

              {editandoAqui && edicao && (
                <form onSubmit={salvar} className="mt-4 rounded-lg bg-marker-soft p-4 md:ml-[10.25rem]">
                  <p className="mb-3 font-bold">{edicao.id ? 'Editar faixa' : 'Nova faixa'} · {nome}</p>
                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <label className="label" htmlFor="faixa-inicio">Das</label>
                      <select id="faixa-inicio" className="input tabular w-28" value={edicao.horaInicio} onChange={(e) => setEdicao({ ...edicao, horaInicio: e.target.value })}>
                        {OPCOES_HORA.map((h) => <option key={h}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label" htmlFor="faixa-fim">Até</label>
                      <select id="faixa-fim" className="input tabular w-28" value={edicao.horaFim} aria-invalid={erro ? true : undefined} aria-describedby={erro ? 'erro-faixa' : undefined} onChange={(e) => setEdicao({ ...edicao, horaFim: e.target.value })}>
                        {OPCOES_HORA.map((h) => <option key={h}>{h}</option>)}
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

      <ConfirmDialog
        aberto={removendo !== null}
        titulo="Remover esta faixa?"
        rotuloConfirmar="Remover"
        perigo
        onConfirmar={() => removendo && onExcluir(removendo.id)}
        onFechar={() => setRemovendo(null)}
      >
        {removendo && (
          <p>
            {DIAS_SEMANA.find((d) => d.valor === removendo.diaSemana)?.nome}, {removendo.horaInicio}–{removendo.horaFim}.
            Novos clientes não poderão agendar neste intervalo; os agendamentos já marcados continuam valendo.
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
