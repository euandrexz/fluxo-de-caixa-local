'use strict';
const Caixa = (() => {
  function cents(value) {
    let raw = String(value).trim().replace(/R\$|\s/g, '').replace(/^\((.+)\)$/, '-$1');
    if (/^[+-]?\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(raw)) raw = raw.replace(/\./g, '').replace(',', '.');
    else if (/^[+-]?\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(raw)) raw = raw.replace(/,/g, '');
    else raw = raw.replace(',', '.');
    if (!/^[+-]?\d+(\.\d{1,2})?$/.test(raw)) return NaN;
    const [whole, decimal = ''] = raw.replace(/^[+-]/, '').split('.');
    const amount = Number(whole) * 100 + Number(decimal.padEnd(2, '0'));
    return Number.isSafeInteger(amount) ? amount * (raw.startsWith('-') ? -1 : 1) : NaN;
  }

  function date(value) {
    const raw = String(value).trim();
    const br = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    const ofx = raw.match(/^(\d{4})(\d{2})(\d{2})(?:\d{6}(?:\.\d+)?(?:\[[^\]]+\])?)?$/);
    const iso = br ? [br[3], br[2].padStart(2, '0'), br[1].padStart(2, '0')].join('-')
      : ofx ? ofx.slice(1).join('-') : raw;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
    const instant = new Date(iso);
    return Number.isFinite(+instant) && instant.toISOString().slice(0, 10) === iso ? iso : '';
  }

  const key = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
  const clean = value => String(value ?? '').trim();

  function csvRows(source, separator) {
    const rows = [];
    let row = [], cell = '', quoted = false;
    for (let i = 0; i < source.length; i++) {
      const ch = source[i];
      if (ch === '"') {
        if (quoted && source[i + 1] === '"') { cell += '"'; i++; }
        else quoted = !quoted;
      } else if (!quoted && (ch === separator || ch === '\n' || ch === '\r')) {
        row.push(clean(cell));
        cell = '';
        if (ch === separator) continue;
        if (ch === '\r' && source[i + 1] === '\n') i++;
        if (row.some(Boolean)) rows.push(row);
        row = [];
      } else cell += ch;
    }
    if (quoted) throw new Error('O CSV contém aspas sem fechamento.');
    row.push(clean(cell));
    if (row.some(Boolean)) rows.push(row);
    return rows;
  }

  function parseCSV(source) {
    const first = source.trimStart().split(/\r?\n/, 1)[0];
    const separator = first.includes(';') ? ';' : first.includes('\t') ? '\t' : ',';
    const [headers = [], ...rows] = csvRows(source, separator);
    const cols = headers.map(key);
    const find = (...names) => cols.findIndex(col => names.includes(col));
    const indices = {
      date:find('data','date','data movimento','data lancamento','data do lancamento'),
      desc:find('descricao','description','historico','lancamento','movimentacao','memo','titulo','title'),
      amount:find('valor','value','amount','valor (r$)','valor (brl)'),
      credit:find('credito','entrada','credit'),
      debit:find('debito','saida','debit'),
      id:find('id','identificador','fitid','transaction id'),
      person:find('pessoa','favorecido','beneficiario','contraparte'),
      type:find('tipo','type','natureza')
    };
    if (indices.date < 0 || indices.desc < 0 || (indices.amount < 0 && indices.credit < 0 && indices.debit < 0)) {
      throw new Error('Use um CSV com Data, Descrição e Valor, ou com colunas Entrada e Saída.');
    }
    return rows.map((row, index) => {
      const credit = row[indices.credit] ? Math.abs(cents(row[indices.credit])) : 0;
      const debit = row[indices.debit] ? Math.abs(cents(row[indices.debit])) : 0;
      const type = key(row[indices.type] ?? '');
      let amount = indices.amount >= 0 ? cents(row[indices.amount] ?? '') : credit && debit ? NaN : credit - debit;
      if (['debito','saida','debit','d'].includes(type)) amount = -Math.abs(amount);
      if (row.length !== headers.length) amount = NaN;
      return {date:date(row[indices.date] ?? ''), description:clean(row[indices.desc]), amount,
        external:clean(row[indices.id]), person:clean(row[indices.person]), line:index + 2};
    });
  }

  function ofxField(source, tag) {
    return clean(source.match(new RegExp('<' + tag + '\\b[^>]*>\\s*([^<\\r\\n]+)', 'i'))?.[1])
      .replace(/&(amp|lt|gt|quot|apos);/g, (_, name) => ({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"})[name]);
  }

  function readStatement(source) {
    const ofx = /<OFX\b/i.test(source);
    const blocks = ofx ? source.match(/<(?:CC)?STMTRS\b[^>]*>/gi) ?? [] : [];
    if (blocks.length > 1) throw new Error('O OFX contém mais de um extrato. Exporte um arquivo por conta.');
    const currency = ofx ? ofxField(source, 'CURDEF').toUpperCase() : '';
    if (currency && currency !== 'BRL') throw new Error('Importe um extrato em reais (BRL).');
    const rows = ofx ? Array.from(source.matchAll(/<STMTTRN\b[^>]*>([\s\S]*?)(?=<\/STMTTRN\s*>|<STMTTRN\b|<\/BANKTRANLIST\s*>)/gi), ([, block], index) => {
      const name = ofxField(block, 'NAME');
      const memo = ofxField(block, 'MEMO');
      return {date:date(ofxField(block, 'DTPOSTED')), description:[name, memo === name ? '' : memo].filter(Boolean).join(' · '),
        amount:cents(ofxField(block, 'TRNAMT')), external:ofxField(block, 'FITID'), person:name, line:index + 1};
    }) : parseCSV(source.replace(/^\uFEFF/, ''));
    const invalid = rows.find(row => !row.date || !row.description || !Number.isSafeInteger(row.amount) || !row.amount);
    if (invalid) throw new Error(`Registro ${invalid.line} inválido. Confira a data, a descrição e o valor diferente de zero.`);
    const ledger = ofx ? source.match(/<LEDGERBAL\b[^>]*>([\s\S]*?)<\/LEDGERBAL\s*>/i)?.[1] : '';
    const ledgerAmount = ledger ? cents(ofxField(ledger, 'BALAMT')) : NaN;
    const ledgerDate = ledger ? date(ofxField(ledger, 'DTASOF')) : '';
    const closing = Number.isSafeInteger(ledgerAmount) && ledgerDate ? {date:ledgerDate, amount:ledgerAmount} : null;
    if (!rows.length && !closing) throw new Error('O extrato não contém movimentações nem saldo de fechamento.');
    return {rows, closing};
  }

  function newRows(rows, existing, accountId) {
    const fingerprint = row => JSON.stringify([row.date, row.amount, key(row.description)]);
    const ids = new Set();
    const counts = new Map();
    for (const item of existing.filter(item => item.accountId === accountId)) {
      if (item.external) ids.add(item.external);
      const token = fingerprint(item.original ?? item);
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
    const seen = new Map();
    return rows.filter(row => {
      const token = fingerprint(row);
      seen.set(token, (seen.get(token) ?? 0) + 1);
      if (!row.external) return seen.get(token) > (counts.get(token) ?? 0);
      if (ids.has(row.external)) return false;
      ids.add(row.external);
      return true;
    });
  }

  function balance(account, transactions, until) {
    return transactions.reduce((total, row) => row.accountId === account.id &&
      (!account.baseDate || row.date > account.baseDate) && row.date <= until ? total + row.amount : total, account.opening);
  }

  function reconcile(account, transactions, closing) {
    if (!closing || (account.baseDate && closing.date < account.baseDate)) return null;
    const calculated = balance(account, transactions, closing.date);
    return {calculated, difference:calculated - closing.amount};
  }

  function suggestions(keywords, transaction) {
    const text = ' ' + key([transaction.description, transaction.person, transaction.original?.description].filter(Boolean).join(' '))
      .replace(/[^\p{L}\p{N}]+/gu, ' ').trim() + ' ';
    return Array.from(new Set(keywords.filter(rule => text.includes(' ' + keyword(rule.term) + ' ')).map(rule => rule.tag)));
  }

  function keyword(term) {
    return key(term).replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  }

  function undoImport(data, importId, timestamp) {
    const batch = data.imports.find(item => item.id === importId);
    if (!batch || batch.undoneAt) throw new Error('Esta importação já foi desfeita ou não existe.');
    return {
      ...data,
      rows:data.rows.filter(row => row.importId !== importId),
      imports:data.imports.map(item => item.id === importId ? {...item,undoneAt:timestamp} : item)
    };
  }

  const emptyData = () => ({accounts:[], tags:[], rows:[], rules:[], keywords:[], imports:[]});
  const upgrade = data => ({...emptyData(),...data});
  const backup = data => ({app:'fluxo-de-caixa-local',version:1,data});

  function restore(source) {
    let payload;
    try { payload = JSON.parse(source); }
    catch { throw new Error('O arquivo não é um JSON válido. Selecione um backup exportado pelo painel.'); }
    if (!['fluxo-de-caixa-local','quem-levou-meu-saldo'].includes(payload?.app) || payload.version !== 1) {
      throw new Error('Escolha um backup compatível exportado pelo painel.');
    }
    const d = payload.data;
    const nonempty = value => typeof value === 'string' && Boolean(value.trim());
    const iso = value => nonempty(value) && date(value) === value;
    const amount = Number.isSafeInteger;
    const timestamp = value => nonempty(value) && Number.isFinite(Date.parse(value));
    const validOriginal = value => value && iso(value.date) && nonempty(value.description) && amount(value.amount);
    const fields = Object.keys(emptyData());
    const invalid = () => new Error('O backup contém dados inválidos ou incompletos. Selecione outra cópia.');
    if (!d || fields.some(field => !Array.isArray(d[field]))) throw invalid();
    const accounts = new Set(d.accounts.map(account => account?.id));
    const imports = new Map(d.imports.map(item => [item?.id,item]));
    const tags = new Set(d.tags);
    const validTags = values => Array.isArray(values) && values.every(tag => tags.has(tag));
    const validDetails = value => validTags(value.tags) && typeof value.person === 'string' &&
      typeof value.reason === 'string' && typeof value.internal === 'boolean';
    if (accounts.size !== d.accounts.length || imports.size !== d.imports.length || tags.size !== d.tags.length ||
      !d.tags.every(nonempty) ||
      !d.accounts.every(a => a && nonempty(a.id) && nonempty(a.name) && nonempty(a.bank) && amount(a.opening) && (a.baseDate === '' || iso(a.baseDate))) ||
      !d.imports.every(b => b && nonempty(b.id) && accounts.has(b.accountId) && nonempty(b.file) && timestamp(b.at) &&
        Number.isSafeInteger(b.count) && b.count >= 0 && (b.undoneAt === null || timestamp(b.undoneAt)) &&
        (b.closing === null || (b.closing && iso(b.closing.date) && amount(b.closing.amount)))) ||
      new Set(d.rows.map(r => r?.id)).size !== d.rows.length ||
      !d.rows.every(r => {
        if (!r || !nonempty(r.id) || !accounts.has(r.accountId) || !iso(r.date) || !nonempty(r.description) ||
          !amount(r.amount) || !r.amount || !validDetails(r) || (r.original !== undefined && !validOriginal(r.original))) return false;
        if (r.external !== undefined && typeof r.external !== 'string') return false;
        if (r.importId === undefined) return true;
        const batch = imports.get(r.importId);
        return batch && !batch.undoneAt && batch.accountId === r.accountId && validOriginal(r.original);
      }) ||
      !d.rules.every(r => r && accounts.has(r.accountId) && nonempty(r.match) && validDetails(r)) ||
      !d.keywords.every(r => r && nonempty(r.id) && nonempty(r.term) && keyword(r.term) && tags.has(r.tag))) throw invalid();
    return Object.fromEntries(fields.map(field => [field,d[field]]));
  }

  function totals(rows) {
    return rows.reduce((sum, row) => {
      if (!row.internal) {
        if (row.amount > 0) sum.income += row.amount;
        else sum.expense -= row.amount;
      }
      return sum;
    }, {income:0, expense:0});
  }

  return {cents, date, key, readStatement, statement:source => readStatement(source).rows, newRows, balance, totals,
    reconcile, keyword, suggestions, undoImport, emptyData, upgrade, backup, restore};
})();
if (typeof module !== 'undefined') module.exports = Caixa;
