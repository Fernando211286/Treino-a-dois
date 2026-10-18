/**
 * Treino a Dois — sincronização com Google Sheets
 * Cole este código em Extensões > Apps Script da planilha e implante como "App da Web"
 * (Executar como: Eu · Quem pode acessar: Qualquer pessoa).
 *
 * Abas que o script cria e mantém:
 *  - "Treinos executados": uma linha por série registrada (data, pessoa, exercício, carga, reps).
 *  - "dados": cópia completa usada pelo app para sincronizar os dois celulares. Não edite.
 */
const ABA = 'dados';
const PIN = 'TROQUE-AQUI'; // coloque aqui o PIN de vocês (não publique o PIN real no GitHub)
const ABA_TREINOS = 'Treinos executados';
const NOMES_PADRAO = { a: 'Marido', b: 'Esposa' };

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
function doGet(e) {
  if (!e || !e.parameter || e.parameter.pin !== PIN) return saida_({ ok: false, erro: 'pin' });
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
    if (d.pin !== PIN) return saida_({ ok: false, erro: 'pin' });
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
    if (d.path.indexOf('logs/') === 0) {
      try { atualizarTreinos(); } catch (err) {} // a aba legível nunca impede o salvamento
    }
    return saida_({ ok: true });
  } catch (err) {
    return saida_({ ok: false, erro: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Remonta a aba "Treinos executados" a partir dos registros do app.
 * Também pode ser executada à mão no editor do Apps Script.
 */
function atualizarTreinos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const v = aba_().getDataRange().getValues();

  let nomes = Object.assign({}, NOMES_PADRAO);
  for (let i = 1; i < v.length; i++) {
    if (v[i][0] !== 'config/app') continue;
    try { const c = JSON.parse(v[i][1]); if (c && c.names) nomes = Object.assign(nomes, c.names); } catch (e) {}
  }

  const linhas = [];
  for (let i = 1; i < v.length; i++) {
    const caminho = String(v[i][0] || '');
    if (caminho.indexOf('logs/') !== 0) continue;
    let doc;
    try { doc = JSON.parse(v[i][1]); } catch (e) { continue; }
    if (!doc || !doc.sessions) continue;
    const pessoa = doc.pn || nomes[doc.p] || doc.p || '';
    const exercicio = doc.n || String(doc.ex || '').replace(/_/g, ' ');
    doc.sessions.forEach(function (sess) {
      const p = String(sess.d || '').split('-');
      if (p.length !== 3) return;
      const data = new Date(+p[0], +p[1] - 1, +p[2]);
      (sess.sets || []).forEach(function (set, k) {
        if (!set || !(set.ok || set.kg != null || set.r != null)) return;
        linhas.push([data, pessoa, exercicio, k + 1,
          set.kg == null ? '' : set.kg, set.r == null ? '' : set.r, set.ok ? 'Sim' : 'Não']);
      });
    });
  }

  // Mais recentes primeiro; dentro do dia, por pessoa, exercício e série
  linhas.sort(function (a, b) {
    return (b[0] - a[0]) || String(a[1]).localeCompare(b[1]) || String(a[2]).localeCompare(b[2]) || (a[3] - b[3]);
  });

  let t = ss.getSheetByName(ABA_TREINOS);
  if (!t) { t = ss.insertSheet(ABA_TREINOS, 0); }
  t.clearContents();
  const cab = ['Data', 'Pessoa', 'Exercício', 'Série', 'Carga (kg)', 'Repetições', 'Concluída'];
  t.getRange(1, 1, 1, cab.length).setValues([cab]).setFontWeight('bold');
  t.setFrozenRows(1);
  if (linhas.length) {
    t.getRange(2, 1, linhas.length, cab.length).setValues(linhas);
    t.getRange(2, 1, linhas.length, 1).setNumberFormat('dd/MM/yyyy');
  }
}
