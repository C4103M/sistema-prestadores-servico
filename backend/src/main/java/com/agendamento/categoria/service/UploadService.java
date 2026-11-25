package com.agendamento.categoria.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class UploadService {

    private static final long TAMANHO_MAXIMO_BYTES = 5L * 1024 * 1024;
    private static final Pattern NOME_ARQUIVO_SEGURO = Pattern.compile("^[a-f0-9-]+\\.(jpg|png|webp)$");
    private static final Map<String, String> EXTENSOES_POR_TIPO = Map.of(
            "image/jpeg", "jpg",
            "image/jpg", "jpg",
            "image/png", "png",
            "image/webp", "webp"
    );

    private final Path pastaCategorias;

    public UploadService(@Value("${app.upload.dir:./uploads}") String uploadDir) {
        this.pastaCategorias = Path.of(uploadDir).toAbsolutePath().normalize().resolve("categorias");
    }

    public String salvarImagemCategoria(MultipartFile arquivo) {
        if (arquivo == null || arquivo.isEmpty()) {
            throw new IllegalArgumentException("Selecione uma imagem para enviar.");
        }
        if (arquivo.getSize() > TAMANHO_MAXIMO_BYTES) {
            throw new IllegalArgumentException("A imagem deve ter no máximo 5 MB.");
        }

        String tipo = arquivo.getContentType() != null ? arquivo.getContentType().toLowerCase() : "";
        String extensaoDeclarada = EXTENSOES_POR_TIPO.get(tipo);
        if (extensaoDeclarada == null) {
            throw new IllegalArgumentException("Formato inválido. Envie uma imagem JPG, PNG ou WEBP.");
        }

        byte[] bytes;
        try {
            bytes = arquivo.getBytes();
        } catch (IOException ex) {
            throw new IllegalStateException("Não foi possível ler o arquivo enviado.");
        }

        String extensaoReal = detectarExtensaoPorCabecalho(bytes);
        if (extensaoReal == null || !extensaoReal.equals(extensaoDeclarada)) {
            throw new IllegalArgumentException("O conteúdo do arquivo não corresponde a uma imagem JPG, PNG ou WEBP válida.");
        }

        String nomeArquivo = UUID.randomUUID() + "." + extensaoReal;
        try {
            Files.createDirectories(pastaCategorias);
            Path destino = pastaCategorias.resolve(nomeArquivo).normalize();
            if (!destino.startsWith(pastaCategorias)) {
                throw new IllegalArgumentException("Caminho de arquivo inválido.");
            }
            Files.write(destino, bytes);
        } catch (IOException ex) {
            throw new IllegalStateException("Não foi possível salvar a imagem no servidor.");
        }

        return "/api/uploads/categorias/" + nomeArquivo;
    }

    public ImagemCarregada carregarImagemCategoria(String nomeArquivo) {
        if (nomeArquivo == null || !NOME_ARQUIVO_SEGURO.matcher(nomeArquivo).matches()) {
            return null;
        }
        Path caminho = pastaCategorias.resolve(nomeArquivo).normalize();
        if (!caminho.startsWith(pastaCategorias) || !Files.isRegularFile(caminho)) {
            return null;
        }
        try {
            byte[] bytes = Files.readAllBytes(caminho);
            MediaType mediaType = nomeArquivo.endsWith(".png")
                    ? MediaType.IMAGE_PNG
                    : nomeArquivo.endsWith(".webp")
                            ? MediaType.parseMediaType("image/webp")
                            : MediaType.IMAGE_JPEG;
            return new ImagemCarregada(bytes, mediaType);
        } catch (IOException ex) {
            return null;
        }
    }

    private String detectarExtensaoPorCabecalho(byte[] b) {
        if (b.length >= 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) {
            return "jpg";
        }
        if (b.length >= 8 && (b[0] & 0xFF) == 0x89 && b[1] == 0x50 && b[2] == 0x4E && b[3] == 0x47
                && b[4] == 0x0D && b[5] == 0x0A && b[6] == 0x1A && b[7] == 0x0A) {
            return "png";
        }
        if (b.length >= 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') {
            return "webp";
        }
        return null;
    }

    public record ImagemCarregada(byte[] bytes, MediaType mediaType) {
    }
}
