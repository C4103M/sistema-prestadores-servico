import { ArrowRight, CalendarCheck2 } from 'lucide-react';
import type { Area, Tela } from '../types';


const ENTRADAS: { area: Area; destino: Tela; titulo: string;}[] = [
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
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-4 py-12 sm:px-6">
      <div className="flex items-center gap-2.5">
        <span aria-hidden className="grid size-9 place-items-center rounded-lg bg-marker text-white">
          <CalendarCheck2 className="size-5" strokeWidth={2.25} />
        </span>
        <span className="text-lg font-bold">AgendeFácil</span>
      </div>
      <h1 className="mt-8 text-3xl leading-tight font-bold text-balance">Agendamento para prestadores de serviço</h1>
      

      <ul className="painel mt-8 divide-y divide-rule overflow-hidden">
        {ENTRADAS.map((e) => (
          <li key={e.area}>
            <a
              href={`#/${e.destino}`}
              className="group flex items-center gap-5 p-5 transition-colors duration-150 hover:bg-paper sm:p-6"
            >
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold">{e.titulo}</h2>
                <p className="mt-3 flex flex-wrap gap-1.5">
                  
                </p>
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
