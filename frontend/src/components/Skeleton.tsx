import type { Area } from '../types';

export function SkeletonAreaLogada({ area }: { area: Area }) {
  if (area === 'cliente') {
    return (
      <div role="status" aria-label="Carregando dados" className="space-y-8">
        <div className="space-y-3 border-b border-rule pb-7">
          <div className="skel h-8 w-72 rounded-xl" />
          <div className="skel h-5 w-full max-w-xl rounded-lg" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="skel h-48 rounded-2xl" />
          <div className="skel h-48 rounded-2xl" />
          <div className="skel h-48 rounded-2xl" />
          <div className="skel h-48 rounded-2xl" />
        </div>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <div className="skel h-11 w-full rounded-xl" />
            <div className="skel h-72 w-full rounded-2xl" />
          </div>
          <div className="skel h-96 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div role="status" aria-label="Carregando dados" className="space-y-8">
      <div className="space-y-3 border-b border-rule pb-7">
        <div className="skel h-8 w-56 rounded-xl" />
        <div className="skel h-5 w-full max-w-lg rounded-lg" />
      </div>
      <div className="skel h-[420px] w-full rounded-2xl" />
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div role="status" aria-label="Carregando indicadores do período" className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.45fr_1.15fr_repeat(3,0.8fr)]">
        <div className="skel h-36 rounded-2xl" />
        <div className="skel h-36 rounded-2xl" />
        <div className="skel h-36 rounded-2xl" />
        <div className="skel h-36 rounded-2xl" />
        <div className="skel h-36 rounded-2xl" />
      </div>
      <div className="skel h-24 rounded-2xl" />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="skel h-72 rounded-2xl" />
        <div className="skel h-72 rounded-2xl" />
      </div>
    </div>
  );
}

export function SkeletonPerfil() {
  return (
    <div role="status" aria-label="Carregando seus dados" className="grid gap-6 lg:grid-cols-2">
      <div className="skel h-96 rounded-2xl" />
      <div className="skel h-80 rounded-2xl" />
    </div>
  );
}

export function SkeletonHorarios() {
  return (
    <div role="status" aria-label="Buscando horários livres" className="space-y-4">
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="skel h-14 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="skel h-9 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
