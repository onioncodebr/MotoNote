package br.com.onioncode.motonote.service;

import br.com.onioncode.motonote.repository.AlteracaoSenhaPendenteRepo;
import br.com.onioncode.motonote.repository.AlteracaoTelefonePendenteRepo;
import br.com.onioncode.motonote.repository.CadastroPendenteRepo;
import br.com.onioncode.motonote.repository.CodigoRecuperacaoSenhaRepo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

// Substitui o TTL index nativo do Mongo (expireAfterSeconds=0), que não tem
// equivalente no Postgres: os 4 documentos "pendentes de confirmação"
// (cadastro, recuperação de senha, troca de telefone/senha) já validam
// expiraEm explicitamente no momento do uso, então rodar de hora em hora é
// suficiente — o único efeito de atraso é a linha ficar mais tempo ocupando
// espaço, sem nenhum risco funcional.
@Service
public class LimpezaExpiradosJob {

    private static final Logger log = LoggerFactory.getLogger(LimpezaExpiradosJob.class);

    private final CadastroPendenteRepo cadastroPendenteRepo;
    private final CodigoRecuperacaoSenhaRepo codigoRecuperacaoSenhaRepo;
    private final AlteracaoTelefonePendenteRepo alteracaoTelefonePendenteRepo;
    private final AlteracaoSenhaPendenteRepo alteracaoSenhaPendenteRepo;

    public LimpezaExpiradosJob(CadastroPendenteRepo cadastroPendenteRepo,
                                CodigoRecuperacaoSenhaRepo codigoRecuperacaoSenhaRepo,
                                AlteracaoTelefonePendenteRepo alteracaoTelefonePendenteRepo,
                                AlteracaoSenhaPendenteRepo alteracaoSenhaPendenteRepo) {
        this.cadastroPendenteRepo = cadastroPendenteRepo;
        this.codigoRecuperacaoSenhaRepo = codigoRecuperacaoSenhaRepo;
        this.alteracaoTelefonePendenteRepo = alteracaoTelefonePendenteRepo;
        this.alteracaoSenhaPendenteRepo = alteracaoSenhaPendenteRepo;
    }

    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void limparExpirados() {
        Instant agora = Instant.now();
        long cadastros = cadastroPendenteRepo.deleteByExpiraEmBefore(agora);
        long codigosRecuperacao = codigoRecuperacaoSenhaRepo.deleteByExpiraEmBefore(agora);
        long alteracoesTelefone = alteracaoTelefonePendenteRepo.deleteByExpiraEmBefore(agora);
        long alteracoesSenha = alteracaoSenhaPendenteRepo.deleteByExpiraEmBefore(agora);

        long total = cadastros + codigosRecuperacao + alteracoesTelefone + alteracoesSenha;
        if (total > 0) {
            log.info("Limpeza de expirados: {} cadastros, {} códigos de recuperação, {} trocas de telefone, {} trocas de senha removidos",
                    cadastros, codigosRecuperacao, alteracoesTelefone, alteracoesSenha);
        }
    }
}
