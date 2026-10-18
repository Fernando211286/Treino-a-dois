/**
 * Treino a Dois — sincronização com Google Sheets
 * Cole este código em Extensões > Apps Script da planilha e implante como "App da Web".
 */
const ABA = 'dados';

function aba_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName(ABA);
  if (!s) {
    s = ss.insertSheet(ABA);
    s.appendRow(['caminho', 'dados', 'atualizado em']);
    s.setFrozenRows(1);
  }
  return s;
}

function saida_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// O app lê todos os registros
function doGet() {
  const v = aba_().getDataRange().getValues();
  const docs = {};
  for (let i = 1; i < v.length; i++) {
    if (!v[i][0]) continue;
    try { docs[v[i][0]] = JSON.parse(v[i][1]); } catch (e) {}
  }
  return saida_({ ok: true, docs: docs });
}

// O app grava um registro (um exercício, a dieta de um dia ou os ajustes)
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const d = JSON.parse(e.postData.contents);
    if (!d.path || !/^(logs\/[\w.-]+|config\/app)$/.test(d.path)) return saida_({ ok: false, erro: 'caminho' });
    const json = JSON.stringify(d.body);
    if (json.length > 49000) return saida_({ ok: false, erro: 'grande demais' });
    const s = aba_();
    const ultima = s.getLastRow();
    const col = ultima > 1 ? s.getRange(2, 1, ultima - 1, 1).getValues() : [];
    const linha = [d.path, json, new Date()];
    let r = -1;
    for (let i = 0; i < col.length; i++) if (col[i][0] === d.path) { r = i + 2; break; }
    if (r > 0) s.getRange(r, 1, 1, 3).setValues([linha]);
    else s.appendRow(linha);
    return saida_({ ok: true });
  } catch (err) {
    return saida_({ ok: false, erro: String(err) });
  } finally {
    lock.releaseLock();
  }
}
