package br.com.onioncode.motonote.migration;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoDatabase;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.testcontainers.containers.Container;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.utility.DockerImageName;
import org.testcontainers.utility.MountableFile;

import java.io.File;
import java.io.IOException;

// Restaura um backup mongodump (--archive --gzip) num MongoDB temporário e
// descartável (Testcontainers), pra depois ler os documentos com o driver
// nativo do Mongo — NUNCA MongoRepository/Spring Data Mongo. Não conecta em
// nenhum Mongo real/de produção: o container é efêmero, criado e destruído
// só pra essa leitura pontual. Requer Docker disponível na máquina que
// rodar a migração.
class MongoBackupImporter implements AutoCloseable {

    private static final Logger log = LoggerFactory.getLogger(MongoBackupImporter.class);
    private static final String BACKUP_CONTAINER_PATH = "/tmp/motonote-backup.gz";

    private final MongoDBContainer container;
    private final MongoClient mongoClient;
    private final MongoDatabase database;

    MongoBackupImporter(String backupPath, String databaseName) {
        File backupFile = new File(backupPath);
        if (!backupFile.isFile()) {
            throw new IllegalStateException("Arquivo de backup não encontrado: " + backupFile.getAbsolutePath());
        }

        log.info("Subindo MongoDB temporário (Testcontainers) para restaurar o backup '{}'...", backupFile.getName());
        this.container = new MongoDBContainer(DockerImageName.parse("mongo:8"));
        container.start();

        try {
            container.copyFileToContainer(MountableFile.forHostPath(backupFile.getAbsolutePath()), BACKUP_CONTAINER_PATH);

            log.info("Restaurando backup com mongorestore...");
            Container.ExecResult resultado = container.execInContainer(
                    "mongorestore", "--archive=" + BACKUP_CONTAINER_PATH, "--gzip");

            if (resultado.getExitCode() != 0) {
                throw new IllegalStateException(
                        "mongorestore falhou (exit=" + resultado.getExitCode() + "): " + resultado.getStderr());
            }
            log.info("Backup restaurado com sucesso no MongoDB temporário.");
        } catch (IOException | InterruptedException e) {
            container.stop();
            throw new IllegalStateException("Falha ao restaurar o backup no MongoDB temporário", e);
        }

        this.mongoClient = MongoClients.create(container.getConnectionString());
        this.database = mongoClient.getDatabase(databaseName);
    }

    MongoDatabase getDatabase() {
        return database;
    }

    @Override
    public void close() {
        mongoClient.close();
        container.stop();
    }
}
