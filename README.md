# Treino a Dois

App de treino e dieta para casal, sincronizado com Google Sheets.

- `index.html`: o app (publicado pelo GitHub Pages).
- `apps-script.gs`: código para colar em Extensões > Apps Script da planilha e implantar como App da Web. Ele grava cada série registrada na aba **Treinos executados** (data, pessoa, exercício, carga, repetições).

O link da planilha é informado em Ajustes, dentro do app, e fica salvo só no celular de cada um.

## Calorias pela foto (aba Dieta)

Na Dieta, fotografe o prato na hora (ou descreva o que comeu) e o app estima calorias e macros de cada alimento.

Para funcionar no link do GitHub Pages, o Apps Script precisa de uma chave de IA:

1. Gere uma chave gratuita do Gemini em https://aistudio.google.com/apikey (ou use uma chave da Anthropic, que começa com `sk-ant-`).
2. No Apps Script da planilha: **Configurações do projeto > Propriedades do script > Adicionar**, nome `CHAVE_IA`, valor = a chave.
3. Cole a versão nova do `apps-script.gs` e faça **Implantar > Gerenciar implantações > Editar > Nova versão** (o link /exec continua o mesmo).

A chave fica só no Apps Script; nunca vai para o app nem para o GitHub. A foto não é salva na planilha: uma miniatura fica só no celular, junto da refeição, e é apagada sozinha depois de 12 horas. Aberto pelo link do Claude, o app usa o próprio Claude e não precisa da chave.
