package br.com.onioncode.motonote.util;

import br.com.onioncode.motonote.exception.ArquivoInvalidoException;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

// Validação server-side de imagem enviada (foto de perfil, comprovante de
// gasto) — nunca confia só na compressão/validação feita no frontend, já
// que os endpoints multipart também são alcançáveis chamando a API direto.
public final class ImagemUtils {

    private static final long TAMANHO_MAXIMO_BYTES = 6L * 1024 * 1024;
    private static final Map<String, String> EXTENSAO_POR_CONTENT_TYPE = Map.of(
            "image/jpeg", ".jpg",
            "image/png", ".png",
            "image/webp", ".webp"
    );

    private ImagemUtils() {
    }

    public static void validar(MultipartFile arquivo) {
        if (arquivo == null || arquivo.isEmpty()) {
            throw new ArquivoInvalidoException("nenhum arquivo enviado.");
        }
        if (arquivo.getSize() > TAMANHO_MAXIMO_BYTES) {
            throw new ArquivoInvalidoException("o arquivo excede o tamanho máximo permitido (6MB).");
        }
        if (!EXTENSAO_POR_CONTENT_TYPE.containsKey(arquivo.getContentType())) {
            throw new ArquivoInvalidoException("tipo de arquivo não suportado. Envie uma imagem JPEG, PNG ou WEBP.");
        }
    }

    // Extensão derivada do content-type real do multipart, nunca do nome
    // original do arquivo (evita path traversal ou extensão inconsistente
    // com o conteúdo de fato enviado).
    public static String extensaoPara(MultipartFile arquivo) {
        return EXTENSAO_POR_CONTENT_TYPE.get(arquivo.getContentType());
    }
}
