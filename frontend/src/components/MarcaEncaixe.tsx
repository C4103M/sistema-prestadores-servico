interface MarcaEncaixeProps {
  href?: string;
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  className?: string;
}

const TAMANHOS = {
  sm: { box: 'size-7 rounded-[7px]', texto: 'text-base' },
  md: { box: 'size-8 rounded-[9px]', texto: 'text-[1.0625rem]' },
  lg: { box: 'size-10 rounded-[11px]', texto: 'text-xl' },
} as const;

export function MarcaEncaixe({
  href = '#/',
  size = 'md',
  showWordmark = true,
  className = '',
}: MarcaEncaixeProps) {
  const { box, texto } = TAMANHOS[size];
  const conteudo = (
    <>
      <span
        aria-hidden
        className={`grid shrink-0 place-items-center bg-ink text-on-ink shadow-[var(--btn-primary-shadow)] ${box}`}
      >
        <svg viewBox="0 0 24 24" className="size-[64%]" fill="none">
          <rect x="3" y="5.5" width="7.5" height="7.5" rx="2" fill="currentColor" fillOpacity="0.92" />
          <rect x="3" y="14.5" width="7.5" height="7.5" rx="2" fill="currentColor" />
          <rect x="12" y="14.5" width="7.5" height="7.5" rx="2" fill="var(--color-toy)" />
          <rect x="14.2" y="2.8" width="7.5" height="7.5" rx="2" fill="var(--color-accent)" />
        </svg>
      </span>
      {showWordmark && (
        <span className={`font-bold tracking-[-0.03em] text-ink-heading ${texto}`}>Encaixe</span>
      )}
    </>
  );

  if (!href) {
    return <span className={`inline-flex items-center gap-2.5 ${className}`}>{conteudo}</span>;
  }

  return (
    <a
      href={href}
      className={`inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-offset-4 ${className}`}
      aria-label="Encaixe — início"
    >
      {conteudo}
    </a>
  );
}
