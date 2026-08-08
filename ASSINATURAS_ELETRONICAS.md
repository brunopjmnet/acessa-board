# Assinaturas eletrônicas no Acessa Board

## O que foi implementado

O fluxo interno registra, no servidor:

- usuário autenticado e ativo;
- nova confirmação de senha no momento da assinatura;
- nome e e-mail do signatário;
- manifestação de vontade expressa;
- data e hora do servidor;
- hash SHA-256 e versão do arquivo;
- método e nível de autenticação da sessão;
- evento de auditoria;
- bloqueio de alteração do arquivo após a primeira assinatura.

Uma nova versão do documento deve ser publicada quando o conteúdo mudar.

## Classificação

- **Sem assinatura:** atas informativas, anexos e evidências que não exigem aceite.
- **Eletrônica interna com evidências:** destinada a documentos privados quando as partes aceitam esse meio e a política jurídica da Acessa o considera adequado. A implementação foi desenhada para fornecer elementos de autoria, integridade e manifestação de vontade; a classificação final do ato deve ser aprovada pelo jurídico.
- **Qualificada ICP-Brasil:** necessária quando lei, registro, contraparte ou política exigir certificado ICP-Brasil. O Acessa Board não simula essa assinatura: o arquivo deve ser enviado a um provedor qualificado e o envelope/certificado deve retornar ao dossiê.

## Antes de produção

1. Aplicar a migration `202608080001_legal_documents_and_meeting_artifacts.sql`.
2. Habilitar MFA para signatários e, após a implantação, exigir sessão AAL2 para documentos de maior risco.
3. Revisar com o jurídico quais atos aceitam assinatura interna e quais exigem ICP-Brasil, reconhecimento ou registro.
4. Aprovar o texto de consentimento e a política de privacidade/LGPD.
5. Definir prazo de retenção da evidência e rotina de exportação do dossiê probatório.
6. Contratar e integrar um provedor de assinatura qualificada para os atos marcados como ICP-Brasil.
7. Fazer teste de restauração do arquivo, hash, solicitações e eventos de auditoria.

## Observação jurídica

A MP nº 2.200-2/2001 admite outros meios de comprovação de autoria e integridade além da ICP-Brasil quando aceitos pelas partes. A Lei nº 14.063/2020 define os níveis simples, avançado e qualificado e reserva a assinatura qualificada a certificado ICP-Brasil. Isso não torna qualquer clique automaticamente válido para qualquer ato: natureza do documento, identidade, integridade, consentimento, forma exigida e prova disponível precisam ser avaliados em conjunto.

