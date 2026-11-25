import { useState, type ChangeEvent } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { ApiError, api } from '../services/api';

interface CampoImagemCategoriaProps {
  idPrefixo: string;
  valor: string;
  erro?: string;
  onChange: (novaUrl: string) => void;
}

export function CampoImagemCategoria({ idPrefixo, valor, erro, onChange }: CampoImagemCategoriaProps) {
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
      <label className="label" htmlFor={`${idPrefixo}-imagem-url`}>Imagem da categoria</label>

      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor={`${idPrefixo}-imagem-arquivo`}
          className={`btn btn-secondary btn-sm cursor-pointer ${enviando ? 'pointer-events-none opacity-60' : ''}`}
        >
          {enviando ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ImagePlus className="size-4" aria-hidden />}
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
      </div>

      <input
        id={`${idPrefixo}-imagem-url`}
        className="input"
        placeholder="Ou informe a URL da imagem (ex.: /imagens/categorias/outros.jpg)"
        value={valor}
        aria-invalid={mensagemErro ? true : undefined}
        aria-describedby={mensagemErro ? `${idPrefixo}-erro-imagem` : undefined}
        onChange={(e) => {
          setErroUpload('');
          onChange(e.target.value);
        }}
      />

      {valor.trim() && (
        <div className="overflow-hidden rounded-lg border border-rule bg-paper">
          <img
            src={valor.trim()}
            alt="Pré-visualização da categoria"
            className="h-28 w-full object-cover"
          />
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
