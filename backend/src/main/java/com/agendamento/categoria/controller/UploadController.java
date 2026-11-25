package com.agendamento.categoria.controller;

import com.agendamento.categoria.service.UploadService;

import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/uploads")
@RequiredArgsConstructor
public class UploadController {

    private final UploadService uploadService;

    @PostMapping(value = "/imagens", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> enviarImagem(@RequestParam("arquivo") MultipartFile arquivo) {
        String url = uploadService.salvarImagemCategoria(arquivo);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("url", url));
    }

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
