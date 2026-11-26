import { useState } from 'react';
import { MagnifyingGlass, ShieldCheck, UserCheck, UserMinus } from '@phosphor-icons/react';
import type { PapelUsuario, UsuarioAdmin } from '../types';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface AdminUsuariosPageProps {
  usuarios: UsuarioAdmin[];
  onAlternarStatus: (id: number) => Promise<void>;
}

const ROTULO_PAPEL: Record<PapelUsuario, string> = {
  ADMIN: 'Administrador',
  PROFISSIONAL: 'Profissional',
  CLIENTE: 'Cliente',
};

const iniciaisDe = (nome: string) =>
  nome
    .split(' ')
    .filter(Boolean)
    .map((parte) => parte[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export function AdminUsuariosPage({ usuarios, onAlternarStatus }: AdminUsuariosPageProps) {
  const [busca, setBusca] = useState('');
  const [papel, setPapel] = useState<'TODOS' | PapelUsuario>('TODOS');
  const [situacao, setSituacao] = useState<'TODOS' | 'ATIVOS' | 'INATIVOS'>('TODOS');
  const [confirmando, setConfirmando] = useState<UsuarioAdmin | null>(null);

  const termo = busca.trim().toLowerCase();
  const filtrados = usuarios.filter((u) => {
    if (papel !== 'TODOS' && u.papel !== papel) return false;
    if (situacao === 'ATIVOS' && !u.ativo) return false;
    if (situacao === 'INATIVOS' && u.ativo) return false;
    if (termo && !u.nome.toLowerCase().includes(termo) && !u.email.toLowerCase().includes(termo)) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-8">
      <PageHeader
        titulo="Usuários"
        descricao="Ative ou desative contas de clientes e prestadores de serviço. Contas desativadas perdem acesso imediatamente."
        acoes={
          <span className="font-mono-num rounded-lg border border-rule bg-surface px-3 py-1.5 text-xs font-semibold text-ink-heading">
            {filtrados.length === 1 ? '1 usuário' : `${filtrados.length} usuários`}
          </span>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-64 flex-1">
          <MagnifyingGlass
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint"
            aria-hidden
          />
          <input
            type="search"
            className="input pl-10"
            placeholder="Buscar por nome ou e-mail"
            aria-label="Buscar usuários"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <select
          aria-label="Filtrar por perfil"
          className="input w-auto min-w-40"
          value={papel}
          onChange={(e) => setPapel(e.target.value as typeof papel)}
        >
          <option value="TODOS">Todos os perfis</option>
          <option value="CLIENTE">Clientes</option>
          <option value="PROFISSIONAL">Profissionais</option>
          <option value="ADMIN">Administradores</option>
        </select>
        <select
          aria-label="Filtrar por situação"
          className="input w-auto min-w-36"
          value={situacao}
          onChange={(e) => setSituacao(e.target.value as typeof situacao)}
        >
          <option value="TODOS">Todas as situações</option>
          <option value="ATIVOS">Ativos</option>
          <option value="INATIVOS">Inativos</option>
        </select>
      </div>

      {filtrados.length === 0 ? (
        <EmptyState
          titulo="Nenhum usuário encontrado"
          texto="Ajuste os filtros ou o termo de busca para visualizar os usuários cadastrados."
          acao={
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setBusca('');
                setPapel('TODOS');
                setSituacao('TODOS');
              }}
            >
              Limpar filtros
            </button>
          }
        />
      ) : (
        <div className="cal-card overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="border-b border-rule font-mono-num text-[11px] uppercase tracking-wider text-faint">
                <th scope="col" className="px-5 py-3.5 font-medium">
                  Usuário
                </th>
                <th scope="col" className="px-3 py-3.5 font-medium">
                  Contato
                </th>
                <th scope="col" className="px-3 py-3.5 font-medium">
                  Perfil
                </th>
                <th scope="col" className="px-3 py-3.5 font-medium">
                  Situação
                </th>
                <th scope="col" className="px-5 py-3.5 text-right font-medium">
                  Ação
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {filtrados.map((u) => (
                <tr key={u.id} className="transition-colors duration-150 hover:bg-surface-soft/70">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-plate text-xs font-bold text-ink-heading">
                        {iniciaisDe(u.nome)}
                      </span>
                      <div className="min-w-0">
                        <p className={`truncate font-semibold ${u.ativo ? 'text-ink-heading' : 'text-muted'}`}>
                          {u.nome}
                        </p>
                        <p className="font-mono-num truncate text-xs text-muted">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-xs text-muted">
                    <p className="font-mono-num">{u.telefone || '—'}</p>
                    {u.especialidade && <p className="text-faint">{u.especialidade}</p>}
                  </td>
                  <td className="px-3 py-3.5">
                    <span className="rounded-md bg-plate px-2.5 py-1 text-xs font-semibold text-ink-heading">
                      {ROTULO_PAPEL[u.papel]}
                    </span>
                  </td>
                  <td className="px-3 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold ${
                        u.ativo ? 'bg-concluido-soft text-concluido' : 'bg-danger-soft text-danger'
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${u.ativo ? 'bg-live' : 'bg-danger'}`}
                        aria-hidden
                      />
                      {u.ativo ? 'Ativo' : 'Desativado'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {u.papel === 'ADMIN' ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted">
                        <ShieldCheck className="size-3.5" aria-hidden />
                        Protegido
                      </span>
                    ) : (
                      <button
                        type="button"
                        className={`btn btn-sm ${u.ativo ? 'btn-secondary hover:!text-danger' : 'btn-primary'}`}
                        onClick={() => setConfirmando(u)}
                      >
                        {u.ativo ? (
                          <UserMinus className="size-3.5" aria-hidden />
                        ) : (
                          <UserCheck className="size-3.5" aria-hidden />
                        )}
                        {u.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        aberto={confirmando !== null}
        titulo={confirmando?.ativo ? 'Desativar esta conta?' : 'Reativar esta conta?'}
        rotuloConfirmar={confirmando?.ativo ? 'Desativar' : 'Ativar'}
        perigo={confirmando?.ativo}
        onConfirmar={() => (confirmando ? onAlternarStatus(confirmando.id) : undefined)}
        onFechar={() => setConfirmando(null)}
      >
        {confirmando && (
          <p>
            {confirmando.ativo
              ? `${confirmando.nome} (${confirmando.email}) perderá acesso ao sistema e, se for profissional, seus serviços sairão da busca dos clientes.`
              : `${confirmando.nome} (${confirmando.email}) voltará a acessar o sistema normalmente.`}
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
