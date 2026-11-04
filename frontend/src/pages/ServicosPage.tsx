import { useState, type FormEvent } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import type { Agendamento, Servico } from '../types';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { duracao, moeda } from '../services/formato';
import { PROFISSIONAL_LOGADO_ID, mockProfissionais } from '../services/mockData';

interface ServicosPageProps {
  servicos: Servico[];
  agendamentos: Agendamento[];
  onSalvar: (servico: Servico) => void;
  onExcluir: (id: number) => void;
  onAlternarAtivo: (id: number) => void;
}

const CATEGORIAS = ['Barbearia', 'Estética', 'Elétrica', 'Outros'];

interface Formulario {
  nome: string;
  categoria: string;
  descricao: string;
  duracaoMinutos: string;
  preco: string;
}

const VAZIO: Formulario = { nome: '', categoria: 'Barbearia', descricao: '', duracaoMinutos: '45', preco: '' };

type Erros = Partial<Record<keyof Formulario, string>>;

function validar(f: Formulario): Erros {
  const erros: Erros = {};
  if (!f.nome.trim()) erros.nome = 'Informe o nome do serviço.';
  const dur = Number(f.duracaoMinutos);
  if (!Number.isInteger(dur) || dur < 5) erros.duracaoMinutos = 'A duração mínima é 5 minutos.';
  const preco = Number(f.preco.replace(',', '.'));
  if (f.preco.trim() === '' || Number.isNaN(preco) || preco < 0) erros.preco = 'Informe um preço igual ou maior que zero.';
  return erros;
}

export function ServicosPage({ servicos, agendamentos, onSalvar, onExcluir, onAlternarAtivo }: ServicosPageProps) {
  // null = formulário fechado; 'novo' = cadastro; número = edição
  const [editando, setEditando] = useState<'novo' | number | null>(null);
  const [form, setForm] = useState<Formulario>(VAZIO);
  const [erros, setErros] = useState<Erros>({});
  const [excluindo, setExcluindo] = useState<Servico | null>(null);
  const [aviso, setAviso] = useState('');

  const meus = servicos.filter((s) => s.profissionalId === PROFISSIONAL_LOGADO_ID);
  const profissional = mockProfissionais.find((p) => p.id === PROFISSIONAL_LOGADO_ID)!;

  const abrirNovo = () => {
    setEditando('novo');
    setForm(VAZIO);
    setErros({});
  };

  const abrirEdicao = (s: Servico) => {
    setEditando(s.id);
    setForm({
      nome: s.nome,
      categoria: s.categoria,
      descricao: s.descricao,
      duracaoMinutos: String(s.duracaoMinutos),
      preco: s.preco.toFixed(2).replace('.', ','),
    });
    setErros({});
  };

  const salvar = (e: FormEvent) => {
    e.preventDefault();
    const encontrados = validar(form);
    setErros(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    const existente = typeof editando === 'number' ? meus.find((s) => s.id === editando) : undefined;
    onSalvar({
      id: existente?.id ?? Date.now(),
      nome: form.nome.trim(),
      categoria: form.categoria,
      descricao: form.descricao.trim(),
      duracaoMinutos: Number(form.duracaoMinutos),
      preco: Number(form.preco.replace(',', '.')),
      ativo: existente?.ativo ?? true,
      profissionalId: profissional.id,
      profissionalNome: profissional.nome,
    });
    setAviso(existente ? `“${form.nome.trim()}” foi atualizado.` : `“${form.nome.trim()}” foi cadastrado.`);
    setEditando(null);
  };

  const temAgendamentos = (id: number) => agendamentos.some((a) => a.servicoId === id);

  const campo = (chave: keyof Formulario) => ({
    id: `servico-${chave}`,
    value: form[chave],
    'aria-invalid': erros[chave] ? true : undefined,
    'aria-describedby': erros[chave] ? `erro-${chave}` : undefined,
    onChange: (e: { target: { value: string } }) => setForm({ ...form, [chave]: e.target.value }),
  });

  const erro = (chave: keyof Formulario) =>
    erros[chave] && (
      <p id={`erro-${chave}`} className="erro-campo">
        {erros[chave]}
      </p>
    );

  return (
    <div className="space-y-8">
      <PageHeader
        titulo="Serviços"
        descricao="O que você oferece, quanto tempo leva e quanto custa. Serviços inativos não aparecem para os clientes."
        acoes={
          <button type="button" className="btn btn-primary" onClick={abrirNovo}>
            <Plus className="size-4" aria-hidden />
            Novo serviço
          </button>
        }
      />

      {aviso && (
        <p role="status" className="flex items-center justify-between rounded-lg bg-concluido-soft px-4 py-3 text-sm font-medium text-concluido">
          {aviso}
          <button type="button" className="btn btn-ghost btn-icon -my-1 -mr-2" aria-label="Fechar aviso" onClick={() => setAviso('')}>
            <X className="size-4" aria-hidden />
          </button>
        </p>
      )}

      <div className={`grid gap-6 ${editando !== null ? 'xl:grid-cols-[minmax(0,1fr)_360px]' : ''} xl:items-start`}>
        <section aria-label="Lista de serviços" className="min-w-0">
          {meus.length === 0 ? (
            <EmptyState
              titulo="Nenhum serviço cadastrado"
              texto="Cadastre o primeiro serviço para que os clientes possam agendar com você."
              acao={
                <button type="button" className="btn btn-primary" onClick={abrirNovo}>
                  Cadastrar serviço
                </button>
              }
            />
          ) : (
            <div className="painel overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-rule text-xs text-muted">
                    <th scope="col" className="px-5 py-3 font-semibold">Serviço</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Duração</th>
                    <th scope="col" className="px-3 py-3 text-right font-semibold">Preço</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Situação</th>
                    <th scope="col" className="px-5 py-3"><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule">
                  {meus.map((s) => (
                    <tr key={s.id} className={editando === s.id ? 'bg-marker-soft' : 'hover:bg-paper'}>
                      <td className="px-5 py-3.5">
                        <p className={`font-semibold ${s.ativo ? '' : 'text-muted'}`}>{s.nome}</p>
                        <p className="text-xs text-muted">{s.categoria}</p>
                      </td>
                      <td className="tabular px-3 py-3.5 text-muted">{duracao(s.duracaoMinutos)}</td>
                      <td className="tabular px-3 py-3.5 text-right font-semibold">{moeda(s.preco)}</td>
                      <td className="px-3 py-3.5">
                        <label className="inline-flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            role="switch"
                            checked={s.ativo}
                            onChange={() => onAlternarAtivo(s.id)}
                            className="peer sr-only"
                          />
                          <span
                            aria-hidden
                            className="relative h-5 w-9 rounded-full bg-rule-strong transition-colors duration-150 peer-checked:bg-concluido peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-agendado after:absolute after:top-0.5 after:left-0.5 after:size-4 after:rounded-full after:bg-white after:transition-transform after:duration-150 peer-checked:after:translate-x-4"
                          />
                          <span className="text-xs font-medium text-muted">{s.ativo ? 'Ativo' : 'Inativo'}</span>
                        </label>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1">
                          <button type="button" className="btn btn-ghost btn-icon" aria-label={`Editar ${s.nome}`} onClick={() => abrirEdicao(s)}>
                            <Pencil className="size-4" aria-hidden />
                          </button>
                          <button type="button" className="btn btn-ghost btn-icon hover:!text-danger" aria-label={`Excluir ${s.nome}`} onClick={() => setExcluindo(s)}>
                            <Trash2 className="size-4" aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {editando !== null && (
          <form onSubmit={salvar} noValidate className="painel xl:sticky xl:top-10" aria-labelledby="titulo-form-servico">
            <div className="flex items-center justify-between border-b border-rule px-5 py-4">
              <h2 id="titulo-form-servico" className="font-bold">
                {editando === 'novo' ? 'Novo serviço' : 'Editar serviço'}
              </h2>
              <button type="button" className="btn btn-ghost btn-icon -mr-2" aria-label="Fechar formulário" onClick={() => setEditando(null)}>
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label className="label" htmlFor="servico-nome">Nome</label>
                <input className="input" placeholder="Ex.: Corte degradê" autoFocus {...campo('nome')} />
                {erro('nome')}
              </div>
              <div>
                <label className="label" htmlFor="servico-categoria">Categoria</label>
                <select className="input" {...campo('categoria')}>
                  {CATEGORIAS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="servico-descricao">Descrição <span className="font-normal text-muted">(opcional)</span></label>
                <textarea className="input" rows={3} placeholder="O que está incluso no atendimento" {...campo('descricao')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="servico-duracaoMinutos">Duração (min)</label>
                  <input className="input tabular" type="number" min={5} step={5} inputMode="numeric" {...campo('duracaoMinutos')} />
                  {erro('duracaoMinutos')}
                </div>
                <div>
                  <label className="label" htmlFor="servico-preco">Preço (R$)</label>
                  <input className="input tabular" inputMode="decimal" placeholder="0,00" {...campo('preco')} />
                  {erro('preco')}
                </div>
              </div>
              {typeof editando === 'number' && (
                <p className="text-xs text-muted">Agendamentos já marcados mantêm o preço antigo.</p>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-rule bg-paper px-5 py-4">
              <button type="button" className="btn btn-secondary" onClick={() => setEditando(null)}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                {editando === 'novo' ? 'Cadastrar' : 'Salvar alterações'}
              </button>
            </div>
          </form>
        )}
      </div>

      {excluindo && temAgendamentos(excluindo.id) ? (
        <ConfirmDialog
          aberto
          titulo="Este serviço tem agendamentos"
          rotuloConfirmar={excluindo.ativo ? 'Desativar serviço' : 'Entendi'}
          onConfirmar={() => excluindo.ativo && onAlternarAtivo(excluindo.id)}
          onFechar={() => setExcluindo(null)}
        >
          <p>
            “{excluindo.nome}” aparece no histórico de atendimentos e não pode ser excluído. Desative-o para que deixe de
            aparecer para os clientes, mantendo o histórico.
          </p>
        </ConfirmDialog>
      ) : (
        <ConfirmDialog
          aberto={excluindo !== null}
          titulo="Excluir este serviço?"
          rotuloConfirmar="Excluir"
          perigo
          onConfirmar={() => {
            if (!excluindo) return;
            onExcluir(excluindo.id);
            if (editando === excluindo.id) setEditando(null);
            setAviso(`“${excluindo.nome}” foi excluído.`);
          }}
          onFechar={() => setExcluindo(null)}
        >
          {excluindo && <p>“{excluindo.nome}” será removido do seu catálogo. Esta ação não pode ser desfeita.</p>}
        </ConfirmDialog>
      )}
    </div>
  );
}
