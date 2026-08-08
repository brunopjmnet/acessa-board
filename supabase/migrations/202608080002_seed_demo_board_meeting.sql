-- Atualiza a reunião-exemplo do Conselho na base já existente.
-- Todo o conteúdo e todas as assinaturas abaixo são explicitamente demonstrativos.
do $$
declare
  v_demo jsonb := jsonb_build_object(
    'id', 'meeting-conselho-demo',
    'title', 'Conselho de Sócios — Reunião demonstrativa',
    'forum', 'Conselho de Sócios',
    'status', 'Realizada',
    'organizer', 'Bruno',
    'date', '2026-07-13',
    'time', '14:00',
    'duration', 180,
    'participants', 'Bruno, Adson, Rodrigo, Shisley e Felipe',
    'present', 'Bruno, Adson, Rodrigo, Shisley e Felipe',
    'absent', 'Nenhum. Todos os conselheiros participaram.',
    'objective', 'Deliberar sobre a organização da integração, a governança inicial e as prioridades executivas da Acessa.',
    'agenda', '1. Designação do patrocinador da integração; 2. Coordenação executiva; 3. Rotina de reuniões e atas; 4. Prioridades dos próximos 30 dias.',
    'materials', 'Pauta do Conselho, plano de integração e quadro de prioridades — dados demonstrativos.',
    'decisions', E'Patrocinador da integração: Bruno — aprovada por unanimidade (5 votos favoráveis).\nCoordenação executiva da integração: Adson — aprovada por unanimidade (5 votos favoráveis).\nRotina quinzenal do Conselho e adoção do modelo de ata do Acessa Board — aprovadas por unanimidade (5 votos favoráveis).\nPrioridade para organização documental e definição dos líderes de frente — aprovada por unanimidade (5 votos favoráveis).',
    'previousPendings', 'Nenhuma. Esta é uma reunião demonstrativa de abertura.',
    'deferredTopics', 'Nenhum assunto adiado.',
    'minutesStatus', 'Assinada',
    'minutesOwner', 'Bruno',
    'minutes', E'ATA DE REUNIÃO DO CONSELHO DE SÓCIOS — EXEMPLO DEMONSTRATIVO\n\nAos treze dias do mês de julho de dois mil e vinte e seis, às quatorze horas, reuniu-se o Conselho de Sócios da Acessa, com a presença de Bruno, Adson, Rodrigo, Shisley e Felipe, representando a totalidade dos participantes convocados. Verificado o quórum integral, Bruno declarou aberta a reunião.\n\nORDEM DO DIA\n1. Designação do patrocinador da integração;\n2. Definição da coordenação executiva;\n3. Aprovação da rotina de reuniões e do modelo de ata;\n4. Priorização das atividades dos próximos trinta dias.\n\nDELIBERAÇÕES E VOTAÇÃO\nApós apresentação e discussão dos temas, todos os participantes votaram favoravelmente. Foram aprovadas, por unanimidade e sem ressalvas: a designação de Bruno como patrocinador da integração; a designação de Adson como coordenador executivo; a realização quinzenal das reuniões do Conselho; a utilização do modelo de ata do Acessa Board; e a prioridade para organização documental e definição dos líderes de frente.\n\nNada mais havendo a tratar, a reunião foi encerrada às dezessete horas. A presente ata foi lida, aprovada e assinada eletronicamente por todos os participantes.\n\nASSINATURAS — DADOS FICTÍCIOS\nBruno — assinado\nAdson — assinado\nRodrigo — assinado\nShisley — assinado\nFelipe — assinado',
    'minutesSignatures', jsonb_build_array(
      jsonb_build_object('name','Bruno','status','Assinado','signedAt','2026-07-13T17:05:00-03:00'),
      jsonb_build_object('name','Adson','status','Assinado','signedAt','2026-07-13T17:06:00-03:00'),
      jsonb_build_object('name','Rodrigo','status','Assinado','signedAt','2026-07-13T17:07:00-03:00'),
      jsonb_build_object('name','Shisley','status','Assinado','signedAt','2026-07-13T17:08:00-03:00'),
      jsonb_build_object('name','Felipe','status','Assinado','signedAt','2026-07-13T17:09:00-03:00')
    ),
    'actionItems', 'Bruno: formalizar o patrocínio da integração. Adson: publicar o calendário executivo. Líderes: organizar documentos e responsáveis.',
    'nextDate', '2026-07-27',
    'minutesLink', '',
    'roomUrl', '',
    'confidentiality', 'Conselho',
    'demo', true
  );
begin
  update public.board_workspaces w
  set state = jsonb_set(
        coalesce(w.state, '{}'::jsonb),
        '{meetings}',
        case
          when exists (
            select 1 from jsonb_array_elements(coalesce(w.state -> 'meetings', '[]'::jsonb)) meeting
            where lower(coalesce(meeting ->> 'title', '')) like 'conselho de s_cios%'
          ) then (
            select jsonb_agg(
              case
                when lower(coalesce(meeting ->> 'title', '')) like 'conselho de s_cios%'
                  then meeting || (v_demo - 'id')
                else meeting
              end
            )
            from jsonb_array_elements(coalesce(w.state -> 'meetings', '[]'::jsonb)) meeting
          )
          else coalesce(w.state -> 'meetings', '[]'::jsonb) || jsonb_build_array(v_demo)
        end,
        true
      ),
      version = w.version + 1,
      updated_at = now()
  where w.slug = 'acessa';
end;
$$;
