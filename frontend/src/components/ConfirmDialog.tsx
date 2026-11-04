import { useEffect, useRef, type ReactNode } from 'react';

interface ConfirmDialogProps {
  aberto: boolean;
  titulo: string;
  children: ReactNode;
  rotuloConfirmar: string;
  rotuloCancelar?: string;
  perigo?: boolean;
  onConfirmar: () => void;
  onFechar: () => void;
}

// Diálogo nativo (<dialog>) para ações destrutivas: foco preso e Esc para fechar sem código extra
export function ConfirmDialog({
  aberto,
  titulo,
  children,
  rotuloConfirmar,
  rotuloCancelar = 'Voltar',
  perigo = false,
  onConfirmar,
  onFechar,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (aberto && !dialog.open) dialog.showModal();
    if (!aberto && dialog.open) dialog.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      onClose={onFechar}
      aria-labelledby="confirm-titulo"
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-rule bg-surface p-0 text-ink shadow-[0_12px_40px_rgb(19_35_61/0.22)]"
    >
      <div className="p-6">
        <h2 id="confirm-titulo" className="text-lg font-bold">
          {titulo}
        </h2>
        <div className="mt-2 text-sm text-muted">{children}</div>
      </div>
      <div className="flex justify-end gap-2 border-t border-rule bg-paper px-6 py-4">
        <button type="button" className="btn btn-secondary" onClick={onFechar}>
          {rotuloCancelar}
        </button>
        <button
          type="button"
          className={`btn ${perigo ? 'btn-danger' : 'btn-primary'}`}
          onClick={() => {
            onConfirmar();
            onFechar();
          }}
        >
          {rotuloConfirmar}
        </button>
      </div>
    </dialog>
  );
}
