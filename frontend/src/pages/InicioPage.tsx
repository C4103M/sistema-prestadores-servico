import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, CalendarCheck2, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import type { Area, HealthStatus, Tela } from '../types';

const ENTRADAS: { area: Area; destino: Tela; titulo: string }[] = [
  {
    area: 'cliente',
    destino: 'cliente/buscar',
    titulo: 'Área do cliente',
  },
  {
    area: 'profissional',
    destino: 'profissional/agenda',
    titulo: 'Área do profissional',
  },
  {
    area: 'admin',
    destino: 'admin/servicos',
    titulo: 'Administração',
  },
];

export function InicioPage() {
  const [saude, setSaude] = useState<HealthStatus | null>(null);
  const [erro, setErro] = useState(false);
  const [carregando, setCarregando] = useState(true);

  const verificarSaude = useCallback(async () => {
    setCarregando(true);
    setErro(false);
    try {
      const dados = await api.health();
      setSaude(dados);
    } catch {
      setSaude(null);
      setErro(true);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void verificarSaude();
  }, [verificarSaude]);

  const online = saude?.status === 'UP' && saude.database === 'UP';

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-4 py-12 sm:px-6">
      <div className="flex items-center gap-2.5">
        <span aria-hidden className="grid size-9 place-items-center rounded-lg bg-marker text-white">
          <CalendarCheck2 className="size-5" strokeWidth={2.25} />
        </span>
        <span className="text-lg font-bold">AgendeFácil</span>
      </div>
      <h1 className="mt-8 text-3xl leading-tight font-bold text-balance">Agendamento para prestadores de serviço</h1>

      <div
        role="status"
        aria-live="polite"
        className={`mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-xs font-semibold ${
          carregando
            ? 'border-rule bg-surface text-muted'
            : online
              ? 'border-concluido/25 bg-concluido-soft text-concluido'
              : 'border-danger/25 bg-faltou-soft text-danger'
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className={`size-2 rounded-full ${
              carregando ? 'bg-muted' : online ? 'bg-concluido' : 'bg-danger'
            }`}
          />
          {carregando && <span>Verificando conexão com a API e PostgreSQL…</span>}
          {!carregando && online && (
            <span>
              API conectada · PostgreSQL online
              {saude.resumo
                ? ` (${saude.resumo.servicos} serviços, ${saude.resumo.agendamentos} agendamentos)`
                : ''}
            </span>
          )}
          {!carregando && (erro || !online) && (
            <span>API offline · Verifique se o backend Spring Boot e o PostgreSQL estão em execução.</span>
          )}
        </div>
        {!carregando && (erro || !online) && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void verificarSaude()}>
            <RefreshCw className="size-3.5" aria-hidden />
            Tentar novamente
          </button>
        )}
      </div>

      <ul className="painel mt-6 divide-y divide-rule overflow-hidden">
        {ENTRADAS.map((e) => (
          <li key={e.area}>
            <a
              href={`#/${e.destino}`}
              className="group flex items-center gap-5 p-5 transition-colors duration-150 hover:bg-paper sm:p-6"
            >
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold">{e.titulo}</h2>
              </div>
              <ArrowRight
                className="size-5 shrink-0 text-faint transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-marker"
                aria-hidden
              />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
