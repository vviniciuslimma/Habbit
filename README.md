# Habbit
Aplicativo pessoal em português para hábitos, agenda, treinos, finanças, cronômetro e desafios.

## Executar
A interface usa HTML, CSS e JavaScript sem dependências. Para produção, execute `node scripts/build.mjs` para gerar o Worker em `dist/server/index.js`, que serve os arquivos e a API autenticada. Servir apenas `dist` permite visualizar a interface, mas não oferece sincronização.

## Dados
Os registros são sincronizados com Supabase pelo backend autenticado. O localStorage (`habbit-v1`) mantém uma cópia e alterações pendentes. Exportação e importação JSON pela barra lateral.

## Regras
- Semana de segunda a domingo; planos versionados por semana.
- Musculação seg/qua/sex; corrida ter/qui/sex/dom.
- Leitura, estudo e programação com meta flexível de cinco dias.
- Mínimo diário configurável; sessões do mesmo dia se somam.
- Diário representa escrita no caderno; aceita marcação simples.
- Conclusões contam dias únicos na frequência semanal.
- Laranja claro: previsto; verde claro: concluído; cinza claro: não realizado; sem preenchimento: não previsto.
- Treinos e corridas entram no gráfico como Treinos. Pace em min/km.
- Contas aparecem na agenda. Confirmar pagamento/recebimento atualiza o registro original, sem duplicação.
- Cronômetro baseado em timestamp, preservado entre navegações e recargas. Sessões encerradas são atribuídas à data do encerramento; sessões que cruzam meia-noite não são divididas automaticamente nesta versão.
- Desafio semanal: leitura >= redes sociais * (1 + porcentagem/100); uso de redes sociais informado manualmente.

## Validação
Sintaxe JavaScript; teste das regras de mínimo diário, soma de sessões, frequência por dias distintos, cálculo de pace e preservação de planos futuros; conferência no navegador de conclusão, registro de tempo, gráfico, ficha de treino e integração de vencimentos à agenda.

## Sincronização com Supabase
O projeto Supabase original Treinago hospeda um schema `habbit` independente, sem alterar as tabelas antigas. O Worker do site recebe a identidade autenticada pelo ChatGPT e chama a Edge Function `habbit-sync`. A função valida uma credencial de servidor e executa RPCs com permissão restrita ao backend. O navegador não recebe chaves privilegiadas do Supabase.

A tabela guarda um documento JSON por identidade, com revisão incremental. Escritas usam comparação de revisão; duas versões concorrentes exigem conciliação explícita. Registros locais pendentes são preservados enquanto o banco está indisponível. O primeiro acesso importa automaticamente o armazenamento local quando ainda não existe documento remoto. O cronômetro em andamento fica no aparelho; sessões encerradas são sincronizadas.

### Build e testes
```sh
node --check dist/app.js
node --check dist/sync.js
node scripts/test-server.mjs
node scripts/test-sync.mjs
node scripts/build.mjs
```

Variáveis privadas da hospedagem: `HABBIT_SYNC_SECRET`, `HABBIT_SYNC_URL`. Nunca colocar o valor do segredo em Git. O hash de verificação é público na Edge Function; para rotacionar, atualizar o segredo na hospedagem e o hash na função.

O plano Supabase Free pode pausar após inatividade. Não há contratação de plano pago. Backups JSON continuam disponíveis. Ao mover a hospedagem para outro domínio, exporte e importe o backup de registros ainda locais. O backend depende dos cabeçalhos de identidade autenticados da hospedagem Sites; não se deve hospedá-lo em um servidor que aceite esses cabeçalhos diretamente de visitantes sem validação.
