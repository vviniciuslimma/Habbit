# Habbit
Aplicativo pessoal em português para hábitos, agenda, treinos, finanças, cronômetro e desafios.

## Executar
Servir a pasta `dist` por HTTP. Não há instalação ou compilação.

## Dados
Os registros são salvos no localStorage (`habbit-v1`) deste navegador. Exportação e importação JSON pela barra lateral. Não há sincronização ou banco remoto nesta versão.

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
