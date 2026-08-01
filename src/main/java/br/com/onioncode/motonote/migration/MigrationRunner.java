package br.com.onioncode.motonote.migration;

import br.com.onioncode.motonote.migration.mapping.AlteracaoSenhaPendenteMapper;
import br.com.onioncode.motonote.migration.mapping.AlteracaoTelefonePendenteMapper;
import br.com.onioncode.motonote.migration.mapping.AssinaturaMapper;
import br.com.onioncode.motonote.migration.mapping.AuditLogMapper;
import br.com.onioncode.motonote.migration.mapping.CadastroPendenteMapper;
import br.com.onioncode.motonote.migration.mapping.ClienteMapper;
import br.com.onioncode.motonote.migration.mapping.CodigoRecuperacaoSenhaMapper;
import br.com.onioncode.motonote.migration.mapping.ConfiguracaoSistemaMapper;
import br.com.onioncode.motonote.migration.mapping.EntregaMapper;
import br.com.onioncode.motonote.migration.mapping.GastoMapper;
import br.com.onioncode.motonote.migration.mapping.MotoboyMapper;
import br.com.onioncode.motonote.migration.mapping.UsuarioMapper;
import br.com.onioncode.motonote.migration.mapping.ValeMapper;
import br.com.onioncode.motonote.migration.mapping.VisitaPaginaMapper;
import br.com.onioncode.motonote.repository.AlteracaoSenhaPendenteRepo;
import br.com.onioncode.motonote.repository.AlteracaoTelefonePendenteRepo;
import br.com.onioncode.motonote.repository.AssinaturaRepo;
import br.com.onioncode.motonote.repository.AuditLogRepo;
import br.com.onioncode.motonote.repository.CadastroPendenteRepo;
import br.com.onioncode.motonote.repository.ClienteRepo;
import br.com.onioncode.motonote.repository.CodigoRecuperacaoSenhaRepo;
import br.com.onioncode.motonote.repository.ConfiguracaoSistemaRepo;
import br.com.onioncode.motonote.repository.EntregaRepo;
import br.com.onioncode.motonote.repository.GastoRepo;
import br.com.onioncode.motonote.repository.MotoboyRepo;
import br.com.onioncode.motonote.repository.UsuarioRepo;
import br.com.onioncode.motonote.repository.ValeRepo;
import br.com.onioncode.motonote.repository.VisitaPaginaRepo;
import com.mongodb.client.MongoDatabase;
import org.bson.Document;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.function.Predicate;

// Ponto de entrada da rotina isolada de migração — só roda com
// --spring.profiles.active=migration (trava explícita contra execução
// acidental em produção). Reaproveita o DataSource/JpaRepositories já
// configurados pela app normal; a única peça extra é o MongoBackupImporter,
// que sobe um Mongo temporário só pra esta leitura pontual.
//
// Ordem de importação respeita as FOREIGN KEY do schema (ver
// db/migration/V1..V14): Usuario primeiro, depois tudo que referencia
// usuario_id, depois Entrega (referencia motoboy_id e cliente_id), por
// último as coleções sem nenhuma FK apontando pra elas.
@Component
@Profile("migration")
public class MigrationRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(MigrationRunner.class);

    private final MigrationProperties properties;
    private final UsuarioRepo usuarioRepo;
    private final MotoboyRepo motoboyRepo;
    private final ClienteRepo clienteRepo;
    private final AssinaturaRepo assinaturaRepo;
    private final EntregaRepo entregaRepo;
    private final ValeRepo valeRepo;
    private final GastoRepo gastoRepo;
    private final AuditLogRepo auditLogRepo;
    private final ConfiguracaoSistemaRepo configuracaoSistemaRepo;
    private final VisitaPaginaRepo visitaPaginaRepo;
    private final CadastroPendenteRepo cadastroPendenteRepo;
    private final CodigoRecuperacaoSenhaRepo codigoRecuperacaoSenhaRepo;
    private final AlteracaoTelefonePendenteRepo alteracaoTelefonePendenteRepo;
    private final AlteracaoSenhaPendenteRepo alteracaoSenhaPendenteRepo;
    private final ConfigurableApplicationContext applicationContext;

    public MigrationRunner(MigrationProperties properties, UsuarioRepo usuarioRepo, MotoboyRepo motoboyRepo,
                            ClienteRepo clienteRepo, AssinaturaRepo assinaturaRepo, EntregaRepo entregaRepo,
                            ValeRepo valeRepo, GastoRepo gastoRepo, AuditLogRepo auditLogRepo,
                            ConfiguracaoSistemaRepo configuracaoSistemaRepo, VisitaPaginaRepo visitaPaginaRepo,
                            CadastroPendenteRepo cadastroPendenteRepo, CodigoRecuperacaoSenhaRepo codigoRecuperacaoSenhaRepo,
                            AlteracaoTelefonePendenteRepo alteracaoTelefonePendenteRepo,
                            AlteracaoSenhaPendenteRepo alteracaoSenhaPendenteRepo,
                            ConfigurableApplicationContext applicationContext) {
        this.properties = properties;
        this.usuarioRepo = usuarioRepo;
        this.motoboyRepo = motoboyRepo;
        this.clienteRepo = clienteRepo;
        this.assinaturaRepo = assinaturaRepo;
        this.entregaRepo = entregaRepo;
        this.valeRepo = valeRepo;
        this.gastoRepo = gastoRepo;
        this.auditLogRepo = auditLogRepo;
        this.configuracaoSistemaRepo = configuracaoSistemaRepo;
        this.visitaPaginaRepo = visitaPaginaRepo;
        this.cadastroPendenteRepo = cadastroPendenteRepo;
        this.codigoRecuperacaoSenhaRepo = codigoRecuperacaoSenhaRepo;
        this.alteracaoTelefonePendenteRepo = alteracaoTelefonePendenteRepo;
        this.alteracaoSenhaPendenteRepo = alteracaoSenhaPendenteRepo;
        this.applicationContext = applicationContext;
    }

    @Override
    public void run(String... args) {
        log.info("=== Iniciando importação do backup MongoDB ({}) ===", properties.getBackupPath());

        Map<String, int[]> resumo = new LinkedHashMap<>();

        try (MongoBackupImporter importer = new MongoBackupImporter(properties.getBackupPath(), properties.getDatabaseName())) {
            MongoDatabase db = importer.getDatabase();

            UsuarioMapper usuarioMapper = new UsuarioMapper();
            importarColecao(db, resumo, "usuario", usuarioMapper::map, usuarioRepo::existsById, usuarioRepo::save);

            MotoboyMapper motoboyMapper = new MotoboyMapper();
            importarColecao(db, resumo, "motoboy", motoboyMapper::map, motoboyRepo::existsById, motoboyRepo::save);

            ClienteMapper clienteMapper = new ClienteMapper();
            importarColecao(db, resumo, "cliente", clienteMapper::map, clienteRepo::existsById, clienteRepo::save);

            AssinaturaMapper assinaturaMapper = new AssinaturaMapper();
            importarColecao(db, resumo, "assinatura", assinaturaMapper::map, assinaturaRepo::existsById, assinaturaRepo::save);

            EntregaMapper entregaMapper = new EntregaMapper();
            importarColecao(db, resumo, "entrega", entregaMapper::map, entregaRepo::existsById, entregaRepo::save);

            ValeMapper valeMapper = new ValeMapper();
            importarColecao(db, resumo, "vale", valeMapper::map, valeRepo::existsById, valeRepo::save);

            GastoMapper gastoMapper = new GastoMapper();
            importarColecao(db, resumo, "gasto", gastoMapper::map, gastoRepo::existsById, gastoRepo::save);

            AuditLogMapper auditLogMapper = new AuditLogMapper();
            importarColecao(db, resumo, "auditoria_log", auditLogMapper::map, auditLogRepo::existsById, auditLogRepo::save);

            ConfiguracaoSistemaMapper configuracaoSistemaMapper = new ConfiguracaoSistemaMapper();
            importarColecao(db, resumo, "configuracao_sistema", configuracaoSistemaMapper::map,
                    configuracaoSistemaRepo::existsById, configuracaoSistemaRepo::save);

            VisitaPaginaMapper visitaPaginaMapper = new VisitaPaginaMapper();
            importarColecao(db, resumo, "visita_pagina", visitaPaginaMapper::map, visitaPaginaRepo::existsById, visitaPaginaRepo::save);

            CadastroPendenteMapper cadastroPendenteMapper = new CadastroPendenteMapper();
            importarColecaoComExpiracao(db, resumo, "cadastros_pendentes", cadastroPendenteMapper::map,
                    cadastroPendenteRepo::existsById, cadastroPendenteRepo::save);

            CodigoRecuperacaoSenhaMapper codigoRecuperacaoSenhaMapper = new CodigoRecuperacaoSenhaMapper();
            importarColecaoComExpiracao(db, resumo, "codigos_recuperacao_senha", codigoRecuperacaoSenhaMapper::map,
                    codigoRecuperacaoSenhaRepo::existsById, codigoRecuperacaoSenhaRepo::save);

            AlteracaoTelefonePendenteMapper alteracaoTelefonePendenteMapper = new AlteracaoTelefonePendenteMapper();
            importarColecaoComExpiracao(db, resumo, "alteracoes_telefone_pendentes", alteracaoTelefonePendenteMapper::map,
                    alteracaoTelefonePendenteRepo::existsById, alteracaoTelefonePendenteRepo::save);

            AlteracaoSenhaPendenteMapper alteracaoSenhaPendenteMapper = new AlteracaoSenhaPendenteMapper();
            importarColecaoComExpiracao(db, resumo, "alteracoes_senha_pendentes", alteracaoSenhaPendenteMapper::map,
                    alteracaoSenhaPendenteRepo::existsById, alteracaoSenhaPendenteRepo::save);
        }

        logResumoFinal(resumo);
        log.info("=== Importação concluída ===");

        // Rotina de execução única — encerra o processo sozinho ao final em
        // vez de deixar o servidor web da aplicação rodando indefinidamente
        // (o profile "migration" nunca é usado pra servir tráfego).
        System.exit(SpringApplication.exit(applicationContext, () -> 0));
    }

    // Insere se o id (o próprio ObjectId hex reaproveitado do Mongo) ainda
    // não existir — idempotente por construção: rodar a importação duas
    // vezes contra o mesmo backup só reporta "pulados" na segunda vez.
    // repo.save() funciona aqui como INSERT puro porque as entidades
    // estendem EntidadeComIdAssinalavel (Persistable.isNew() explícito) —
    // sem isso, o Spring Data JPA tentaria um UPDATE (merge) numa linha
    // que ainda não existe, já que o id não é null (foi setado pelo mapper).
    private <T> void importarColecao(MongoDatabase db, Map<String, int[]> resumo, String nomeColecao,
                                      Function<Document, T> mapper, Predicate<String> existsById, Consumer<T> salvar) {
        int migrados = 0, pulados = 0, erros = 0;
        for (Document doc : db.getCollection(nomeColecao).find()) {
            String id = idHex(doc);
            try {
                if (existsById.test(id)) {
                    pulados++;
                    continue;
                }
                salvar.accept(mapper.apply(doc));
                migrados++;
            } catch (Exception e) {
                erros++;
                log.error("Erro ao importar documento de '{}' (_id={}): {}", nomeColecao, id, e.getMessage(), e);
            }
        }
        resumo.put(nomeColecao, new int[]{migrados, pulados, erros});
        log.info("{}: {} migrados, {} pulados, {} erros", nomeColecao, migrados, pulados, erros);
    }

    // Mesma lógica acima, mas pula (sem contar como erro) documentos cujo
    // expiraEm já passou — são efêmeros por natureza, não faz sentido
    // trazer pro Postgres um código de confirmação que já venceu no Mongo.
    private <T> void importarColecaoComExpiracao(MongoDatabase db, Map<String, int[]> resumo, String nomeColecao,
                                                  Function<Document, T> mapper, Predicate<String> existsById, Consumer<T> salvar) {
        int migrados = 0, pulados = 0, erros = 0;
        Instant agora = Instant.now();
        for (Document doc : db.getCollection(nomeColecao).find()) {
            String id = idHex(doc);
            try {
                if (existsById.test(id)) {
                    pulados++;
                    continue;
                }
                java.util.Date expiraEm = doc.getDate("expiraEm");
                if (expiraEm != null && expiraEm.toInstant().isBefore(agora)) {
                    pulados++;
                    continue;
                }
                salvar.accept(mapper.apply(doc));
                migrados++;
            } catch (Exception e) {
                erros++;
                log.error("Erro ao importar documento de '{}' (_id={}): {}", nomeColecao, id, e.getMessage(), e);
            }
        }
        resumo.put(nomeColecao, new int[]{migrados, pulados, erros});
        log.info("{}: {} migrados, {} pulados, {} erros", nomeColecao, migrados, pulados, erros);
    }

    private String idHex(Document doc) {
        Object valor = doc.get("_id");
        if (valor == null) return null;
        return valor instanceof org.bson.types.ObjectId oid ? oid.toHexString() : valor.toString();
    }

    private void logResumoFinal(Map<String, int[]> resumo) {
        log.info("=== Resumo da importação ===");
        int totalMigrados = 0, totalPulados = 0, totalErros = 0;
        for (Map.Entry<String, int[]> entry : resumo.entrySet()) {
            int[] contadores = entry.getValue();
            log.info("{}: {} migrados, {} pulados, {} erros", entry.getKey(), contadores[0], contadores[1], contadores[2]);
            totalMigrados += contadores[0];
            totalPulados += contadores[1];
            totalErros += contadores[2];
        }
        log.info("TOTAL: {} migrados, {} pulados, {} erros", totalMigrados, totalPulados, totalErros);
    }
}
