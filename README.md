# Treino a Dois

App de treino e dieta para casal, sincronizado com Google Sheets.

- `index.html`: o app (publicado pelo GitHub Pages).
- `apps-script.gs`: código para colar em Extensões > Apps Script da planilha e implantar como App da Web. Ele grava cada série registrada na aba **Treinos executados** (data, pessoa, exercício, carga, repetições).

O link da planilha é informado em Ajustes, dentro do app, e fica salvo só no celular de cada um.

## Calorias pela foto (aba Dieta)

Na Dieta, fotografe o prato na hora (ou descreva o que comeu) e o app estima calorias e macros de cada alimento.

Para funcionar no link do GitHub Pages, o app precisa de uma chave gratuita do Gemini:

1. Abra https://aistudio.google.com/apikey com a conta Google e toque em **Criar chave de API**.
2. No app, vá em **Ajustes > Calorias pela foto**, cole a chave e toque em **Salvar chave**.

A chave fica só no celular (cada celular salva a sua). Alternativa: guardar a chave no Apps Script, na propriedade `CHAVE_IA`, e publicar uma nova versão; aí ela vale para os dois celulares conectados à planilha.

A foto não é salva na planilha: uma miniatura fica só no celular, junto da refeição, e é apagada sozinha depois de 12 horas. Aberto pelo link do Claude, o app usa o próprio Claude e não precisa da chave.
