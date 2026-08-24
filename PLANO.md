# PLANO

## FASE 0 — Higiene
- [x] **[T0.1]** Revisar WIP em auth.tsx, parar em S1.
- [x] **[T0.2]** Remover test_all_cols.mjs, mover outros .mjs, atualizar .gitignore e commitar.

## FASE 1 — Verdade do schema (prioridade máxima)
- [x] **[T1.1]** Parar em S3 para solicitar DATABASE_URL. Realizar dump do schema de produção e revisar.
- [x] **[T1.2]** Recriar banco limpo, aplicar migrations e comparar com o dump (supabase db diff). RESULTADO: replay funcional apenas statement-a-statement via pooler; drift de produção catalogado em _tools/final_compare.txt (colunas created_by, policies permissivas, NOT NULLs, FORCERLS). Pendente: migration de reconciliação de colunas.
- [ ] **[T1.3]** Regenerar tipos do Supabase.
- [ ] **[T1.4]** Limpar lógicas de retry, cast e regex em data.ts, adequando aos payloads reais.

## FASE 1.5 — Correções estruturais descobertas na T1.2
- [x] **[T1.5]** Aplicar 20260822000000_reconcile_to_production_schema.sql no staging e revalidar com compare_dumps. RESULTADO: paridade estrutural total (0 diffs em tabelas/colunas/constraints/indexes/triggers/FORCERLS).
- [x] **[T1.6]** Aplicar 20260823000000_restore_scoped_policies.sql no staging. RESULTADO: zero policies permissivas; isolamento por casal ativo. Residual documentado: categories.
- [x] **[T1.7]** Aplicado na PRODUÇÃO com aprovação do dono. Reconciliação: 104 stmts, 0 erros (quase tudo no-op). Segurança: 8 blankets removidos, 28+7 policies granulares criadas. Inventário final validado tabela a tabela. Residual intencional: categories.

## FASE 1.6 — Web Push (notificação com app fechado)
- [x] **[T1.8]** Pacote push criado: sw-push.js dedicado, Edge Function send-push blindada (CRON_SECRET), cron duo-push-reminders ativo na produção, par VAPID novo. Cliente assina via /sw-push.js.
- [ ] **[T1.9]** Atualizar VITE_VAPID_PUBLIC_KEY na Vercel + redeploy; teste ponta a ponta com app fechado.

## FASE 2 — Segurança entre projetos
- [ ] **[T2.1]** Adaptar e copiar migrations de segurança para couple-calendar-connect. Parar em S4 antes de aplicar. Testar isolamento.
- [ ] **[T2.2]** Revisar e commitar migrations de push modificadas + migration de notify_partner no ccc.

## FASE 3 — Quick wins
- [ ] **[T3.1]** Esconder stacktrace em produção no DefaultErrorComponent.
- [ ] **[T3.2]** Remover logs de debug em _app.dashboard.tsx.
- [ ] **[T3.3]** Substituir PRODUCTION_ORIGIN hardcoded em auth.tsx.
- [ ] **[T3.4]** Remover dotlottie-wc morto do index.html do LIfe.

## FASE 4 — Rede de proteção
- [ ] **[T4.1]** Instalar Vitest e configurar testes unitários.
- [ ] **[T4.2]** Instalar Playwright e criar cenário smoke de login/calendário.
- [ ] **[T4.3]** Criar pipeline de CI com GitHub Actions.

## FASE 5 — Realtime
- [ ] **[T5.1]** Criar migration com PUBLICATION, implementar hook useRealtimeSync(coupleId) e integrá-lo no layout principal.

## FASE 6 — Dívida estrutural (só depois da Fase 4 verde)
- [ ] **[T6.1]** Extrair componentes de calendário.
- [ ] **[T6.2]** Extrair componentes de perfil.
- [ ] **[T6.3]** Decidir destino do wrangler.jsonc.
- [ ] **[T6.4]** Deletar código morto e componentes sem uso.
- [ ] **[T6.5]** Unificar lockfiles (npm ou bun).
- [ ] **[T6.6]** Remover LAYSLLA_PROFILE_COLOR hardcoded.
