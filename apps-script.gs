/**
 * Treino a Dois — sincronização com Google Sheets
 * Cole este código em Extensões > Apps Script da planilha e implante como "App da Web"
 * (Executar como: Eu · Quem pode acessar: Qualquer pessoa).
 *
 * Abas que o script cria e mantém:
 *  - "Treinos executados": uma linha por série registrada (data, pessoa, exercício, carga, reps).
 *  - "dados": cópia completa usada pelo app para sincronizar os dois celulares. Não edite.
 *
 * Calorias pela foto (aba Dieta): em Configurações do projeto > Propriedades do script,
 * crie a propriedade CHAVE_IA com uma chave de API:
 *  - do Gemini (gratuita, em aistudio.google.com/apikey), ou
 *  - da Anthropic (começa com "sk-ant-", paga por uso, em console.anthropic.com).
 * Opcional: MODELO_IA para trocar o modelo usado. A chave nunca vai para o app nem para o GitHub.
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
  let pedido = null;
  try { pedido = JSON.parse(e.postData.contents); } catch (err) {}
  if (pedido && pedido.acao === 'calorias') return calorias_(pedido);
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

/* ---------- calorias pela foto ---------- */
function calorias_(d) {
  if (d.pin !== PIN) return saida_({ ok: false, erro: 'pin' });
  const props = PropertiesService.getScriptProperties();
  const chave = (props.getProperty('CHAVE_IA') || '').trim();
  if (!chave) return saida_({ ok: false, erro: 'sem chave' });
  const prompt = String(d.prompt || '').slice(0, 4000);
  const img = d.img ? String(d.img) : '';
  const mime = /^image\/(jpeg|png|webp|gif)$/.test(d.mime || '') ? d.mime : 'image/jpeg';
  if (!prompt) return saida_({ ok: false, erro: 'vazio' });
  if (img.length > 7000000) return saida_({ ok: false, erro: 'foto grande demais' });
  try {
    const texto = chave.indexOf('sk-ant-') === 0
      ? claude_(chave, props.getProperty('MODELO_IA') || 'claude-haiku-5-5', prompt, img, mime)
      : gemini_(chave, props.getProperty('MODELO_IA') || 'gemini-flash-latest', prompt, img, mime);
    return saida_({ ok: true, texto: texto });
  } catch (err) {
    return saida_({ ok: false, erro: String(err && err.message || err).slice(0, 300) });
  }
}

function claude_(chave, modelo, prompt, img, mime) {
  const conteudo = [];
  if (img) conteudo.push({ type: 'image', source: { type: 'base64', media_type: mime, data: img } });
  conteudo.push({ type: 'text', text: prompt });
  const r = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { 'x-api-key': chave, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({ model: modelo, max_tokens: 1500, messages: [{ role: 'user', content: conteudo }] })
  });
  const j = JSON.parse(r.getContentText());
  if (r.getResponseCode() !== 200) throw new Error((j.error && j.error.message) || ('HTTP ' + r.getResponseCode()));
  return (j.content || []).filter(function (c) { return c.type === 'text'; }).map(function (c) { return c.text; }).join('');
}

function gemini_(chave, modelo, prompt, img, mime) {
  const partes = [];
  if (img) partes.push({ inline_data: { mime_type: mime, data: img } });
  partes.push({ text: prompt });
  const r = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(modelo) + ':generateContent', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { 'x-goog-api-key': chave },
    payload: JSON.stringify({ contents: [{ role: 'user', parts: partes }], generationConfig: { responseMimeType: 'application/json', temperature: 0.2 } })
  });
  const j = JSON.parse(r.getContentText());
  if (r.getResponseCode() !== 200) throw new Error((j.error && j.error.message) || ('HTTP ' + r.getResponseCode()));
  const c = j.candidates && j.candidates[0];
  return ((c && c.content && c.content.parts) || []).map(function (p) { return p.text || ''; }).join('');
}
