package com.onioncode.entregas.service;

import com.onioncode.entregas.exception.UploadIndisponivelException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.net.URI;
import java.time.Duration;

// Encapsula o acesso ao Cloudflare R2 (S3-compatible) — mesmo papel que
// ResendGateway/TurnstileGateway têm pras integrações externas deles.
// Dois buckets com propósitos diferentes: "público" (foto de perfil, URL
// direta) e "privado" (comprovante de gasto, só acessível via link
// temporário assinado — ver gerarUrlTemporaria). Sem as chaves do R2
// configuradas, upload falha alto com UploadIndisponivelException (mesmo
// princípio do ResendGateway fora do profile dev): o resto do sistema
// continua funcionando, só os botões de foto/comprovante ficam
// indisponíveis até alguém configurar (ver R2_SETUP.md).
@Service
public class R2Gateway {

    private static final Logger log = LoggerFactory.getLogger(R2Gateway.class);
    private static final Duration VALIDADE_URL_TEMPORARIA = Duration.ofMinutes(15);

    private final S3Client s3;
    private final S3Presigner presigner;
    private final String bucketPublico;
    private final String bucketPrivado;
    private final String publicUrl;
    private final boolean configurado;

    public R2Gateway(@Value("${r2.account-id}") String accountId,
                      @Value("${r2.access-key-id}") String accessKeyId,
                      @Value("${r2.secret-access-key}") String secretAccessKey,
                      @Value("${r2.bucket-publico}") String bucketPublico,
                      @Value("${r2.bucket-privado}") String bucketPrivado,
                      @Value("${r2.public-url}") String publicUrl) {
        this.bucketPublico = bucketPublico;
        this.bucketPrivado = bucketPrivado;
        this.publicUrl = publicUrl.endsWith("/") ? publicUrl.substring(0, publicUrl.length() - 1) : publicUrl;
        this.configurado = !accountId.isBlank() && !accessKeyId.isBlank() && !secretAccessKey.isBlank()
                && !bucketPublico.isBlank() && !bucketPrivado.isBlank() && !publicUrl.isBlank();

        if (!configurado) {
            this.s3 = null;
            this.presigner = null;
            return;
        }

        URI endpoint = URI.create("https://" + accountId + ".r2.cloudflarestorage.com");
        var credenciais = StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKeyId, secretAccessKey));
        // forcePathStyle: recomendação oficial da Cloudflare pro cliente S3
        // da AWS contra o endpoint do R2 (o endereçamento virtual-hosted-style
        // padrão do SDK, "bucket.endpoint", não é o esperado aqui).
        this.s3 = S3Client.builder()
                .endpointOverride(endpoint)
                .region(Region.of("auto"))
                .credentialsProvider(credenciais)
                .forcePathStyle(true)
                .build();
        this.presigner = S3Presigner.builder()
                .endpointOverride(endpoint)
                .region(Region.of("auto"))
                .credentialsProvider(credenciais)
                .build();
    }

    public String uploadPublico(String key, byte[] bytes, String contentType) {
        exigirConfigurado();
        putObject(bucketPublico, key, bytes, contentType);
        return publicUrl + "/" + key;
    }

    public String uploadPrivado(String key, byte[] bytes, String contentType) {
        exigirConfigurado();
        putObject(bucketPrivado, key, bytes, contentType);
        return key;
    }

    // Recebe a própria URL pública salva no documento (Usuario.fotoUrl) e
    // recupera a key a partir dela, em vez de guardar os dois campos —
    // simplifica o domínio, já que a key é sempre um sufixo previsível
    // (publicUrl + "/" + key).
    public void excluirPublicoPorUrl(String url) {
        if (!configurado || url == null || !url.startsWith(publicUrl + "/")) {
            return;
        }
        String key = url.substring((publicUrl + "/").length());
        try {
            s3.deleteObject(DeleteObjectRequest.builder().bucket(bucketPublico).key(key).build());
        } catch (SdkException e) {
            log.error("Falha ao excluir objeto público do R2. Key: {}", key, e);
        }
    }

    public void excluirPrivado(String key) {
        if (!configurado || key == null) {
            return;
        }
        try {
            s3.deleteObject(DeleteObjectRequest.builder().bucket(bucketPrivado).key(key).build());
        } catch (SdkException e) {
            log.error("Falha ao excluir objeto privado do R2. Key: {}", key, e);
        }
    }

    // Link temporário de leitura pro bucket privado (comprovantes) — nunca
    // lança: se o R2 não estiver configurado ou o gasto não tiver
    // comprovante, simplesmente não há link pra mostrar (comprovanteUrl
    // fica null na resposta), sem quebrar a listagem de gastos por causa
    // disso.
    public String gerarUrlTemporaria(String key) {
        if (!configurado || key == null) {
            return null;
        }
        try {
            GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                    .signatureDuration(VALIDADE_URL_TEMPORARIA)
                    .getObjectRequest(GetObjectRequest.builder().bucket(bucketPrivado).key(key).build())
                    .build();
            return presigner.presignGetObject(presignRequest).url().toString();
        } catch (SdkException e) {
            log.error("Falha ao gerar URL temporária do R2. Key: {}", key, e);
            return null;
        }
    }

    private void putObject(String bucket, String key, byte[] bytes, String contentType) {
        try {
            s3.putObject(
                    PutObjectRequest.builder().bucket(bucket).key(key).contentType(contentType).build(),
                    RequestBody.fromBytes(bytes));
        } catch (SdkException e) {
            log.error("Falha ao enviar objeto pro R2. Bucket: {}, key: {}", bucket, key, e);
            throw new UploadIndisponivelException("tente novamente em instantes.");
        }
    }

    private void exigirConfigurado() {
        if (!configurado) {
            throw new UploadIndisponivelException("envio de imagem não configurado.");
        }
    }
}
