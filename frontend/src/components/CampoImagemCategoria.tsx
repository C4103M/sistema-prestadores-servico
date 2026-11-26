import { useState, type ChangeEvent } from 'react';
import { CircleNotch, ImageSquare } from '@phosphor-icons/react';
import { ApiError, api } from '../services/api';

interface CampoImagemCategoriaProps {
  idPrefixo: string;
  valor: string;
  erro?: string;
  onChange: (novaUrl: string) => void;
  rotulo?: string;
  placeholder?: string;
  textoAlt?: string;
  permitirRemover?: boolean;
}

export function CampoImagemCategoria({
  idPrefixo,
  valor,
  erro,
  onChange,
  rotulo = 'Imagem da categoria',
  placeholder = 'Ou informe a URL da imagem (ex.: /imagens/categorias/outros.jpg)',
  textoAlt = 'Pré-visualização da categoria',
  permitirRemover = false,
}: CampoImagemCategoriaProps) {
  const [enviando, setEnviando] = useState(false);
  const [erroUpload, setErroUpload] = useState('');

  const aoSelecionarArquivo = async (e: ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    setErroUpload('');
    setEnviando(true);
    try {
      const { url } = await api.uploads.enviarImagem(arquivo);
      onChange(url);
    } catch (err) {
      setErroUpload(err instanceof ApiError || err instanceof Error ? err.message : 'Não foi possível enviar a imagem.');
    } finally {
      setEnviando(false);
    }
  };

  const mensagemErro = erroUpload || erro;

  return (
    <div className="space-y-2.5">
      <label className="label" htmlFor={`${idPrefixo}-imagem-url`}>
        {rotulo}
      </label>

      <div className="flex flex-wrap items-center gap-2.5">
        <label
          htmlFor={`${idPrefixo}-imagem-arquivo`}
          className={`btn btn-secondary btn-sm cursor-pointer ${enviando ? 'pointer-events-none opacity-60' : ''}`}
        >
          {enviando ? (
            <CircleNotch className="size-4 animate-spin" aria-hidden />
          ) : (
            <ImageSquare className="size-4" aria-hidden />
          )}
          {enviando ? 'Enviando…' : 'Enviar imagem do computador'}
        </label>
        <input
          id={`${idPrefixo}-imagem-arquivo`}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={enviando}
          onChange={(e) => void aoSelecionarArquivo(e)}
        />
        <span className="text-xs text-muted">JPG, PNG ou WEBP até 5 MB</span>
        {permitirRemover && valor.trim() && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setErroUpload('');
              onChange('');
            }}
          >
            Remover imagem
          </button>
        )}
      </div>

      <input
        id={`${idPrefixo}-imagem-url`}
        className="input"
        placeholder={placeholder}
        value={valor}
        aria-invalid={mensagemErro ? true : undefined}
        aria-describedby={mensagemErro ? `${idPrefixo}-erro-imagem` : undefined}
        onChange={(e) => {
          setErroUpload('');
          onChange(e.target.value);
        }}
      />

      {valor.trim() && (
        <div className="overflow-hidden rounded-xl border border-rule bg-plate">
          <img src={valor.trim()} alt={textoAlt} className="h-28 w-full object-cover" />
        </div>
      )}

      {mensagemErro && (
        <p id={`${idPrefixo}-erro-imagem`} className="erro-campo" role="alert">
          {mensagemErro}
        </p>
      )}
    </div>
  );
}
