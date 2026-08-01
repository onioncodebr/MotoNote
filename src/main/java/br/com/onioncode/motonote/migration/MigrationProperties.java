package br.com.onioncode.motonote.migration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

// Só existe (e só é vinculada pelo Spring) com o profile "migration" ativo —
// ver MigrationRunner. Fora desse pacote, nada no resto da aplicação lê
// essas propriedades.
@Component
@Profile("migration")
@ConfigurationProperties(prefix = "migration")
public class MigrationProperties {

    // Caminho do arquivo de backup (mongodump --archive --gzip), relativo à
    // raiz do projeto se não for absoluto.
    private String backupPath = "mongodump.gz";

    // Nome do banco Mongo dentro do backup (não é o nome do container/banco
    // de destino, é o nome gravado no próprio dump — mongorestore restaura
    // com o nome original, independente de como o Mongo temporário foi
    // configurado).
    private String databaseName = "entregas";

    public String getBackupPath() {
        return backupPath;
    }

    public void setBackupPath(String backupPath) {
        this.backupPath = backupPath;
    }

    public String getDatabaseName() {
        return databaseName;
    }

    public void setDatabaseName(String databaseName) {
        this.databaseName = databaseName;
    }
}
