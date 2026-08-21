# PLANO

## FASE 0 — Higiene
- [x] **[T0.1]** Revisar WIP em auth.tsx, parar em S1.
- [x] **[T0.2]** Remover test_all_cols.mjs, mover outros .mjs, atualizar .gitignore e commitar.

## FASE 1 — Verdade do schema (prioridade máxima)
- [x] **[T1.1]** Parar em S3 para solicitar DATABASE_URL. Realizar dump do schema de produção e revisar.
- [ ] **[T1.2]** Recriar banco limpo, aplicar migrations e comparar com o dump (supabase db diff).
- [ ] **[T1.3]** Regenerar tipos do Supabase.
- [ ] **[T1.4]** Limpar lógicas de retry, cast e regex em data.ts, adequando aos payloads reais.

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
