package com.agendamento.categoria.controller;

import com.agendamento.categoria.service.UploadService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.concurrent.TimeUnit;

@Tag(name = "Uploads", description = "Envio e entrega de imagens de categorias")
@RestController
@RequestMapping("/api/uploads")
@RequiredArgsConstructor
public class UploadController {

    private final UploadService uploadService;

    @Operation(summary = "Enviar imagem de categoria", description = "Recebe imagem JPG, PNG ou WEBP (até 5 MB) de Admin ou Profissional e devolve a URL pública.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Imagem salva no servidor"),
            @ApiResponse(responseCode = "400", description = "Arquivo vazio, formato inválido ou maior que 5 MB", content = @Content(mediaType = "application/problem+json", schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "401", description = "Não autenticado"),
            @ApiResponse(responseCode = "403", description = "Acesso restrito a Admin ou Profissional")
    })
    @PostMapping(value = "/imagens", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> enviarImagem(@RequestParam("arquivo") MultipartFile arquivo) {
        String url = uploadService.salvarImagemCategoria(arquivo);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("url", url));
    }

    @Operation(summary = "Obter imagem de categoria salva no servidor")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Bytes da imagem"),
            @ApiResponse(responseCode = "404", description = "Imagem não encontrada")
    })
    @SecurityRequirements
    @GetMapping("/categorias/{arquivo}")
    public ResponseEntity<byte[]> buscarImagem(@PathVariable String arquivo) {
        UploadService.ImagemCarregada img = uploadService.carregarImagemCategoria(arquivo);
        if (img == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok()
                .contentType(img.mediaType())
                .cacheControl(CacheControl.maxAge(365, TimeUnit.DAYS).cachePublic())
                .body(img.bytes());
    }
}
