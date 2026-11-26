'use strict';
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch]);
const icons = {
  wallet:'M20 8H5a2 2 0 0 1 0-4h12v4M3 6v12a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1m1 4h-5a2 2 0 0 0 0 4h5',
  dashboard:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  activity:'M3 12h4l3-8 4 16 3-8h4',
  bank:'M3 9h18L12 3 3 9zm2 3v5m5-5v5m4-5v5m5-5v5M3 21h18',
  tag:'M3 12V4h8l10 10-7 7L3 12zm4-4h.01',
  lock:'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4m-4 4v2',
  upload:'M12 16V3m-5 5 5-5 5 5M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5',
  plus:'M12 5v14M5 12h14',
  down:'M6 6l12 12M8 18h10V8',
  up:'M6 18 18 6M8 6h10v10',
  edit:'m4 15-1 6 6-1L21 8l-5-5L4 15zm9-9 5 5',
  history:'M3 12a9 9 0 1 1 2.6 6.4M3 12V6m0 6h6m3-4v5l3 2',
  calendar:'M4 6h16v15H4zM8 3v6m8-6v6M4 11h16'
};
const icon = name => `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${icons[name]}"/></svg>`;
const mark = (name, tone = '') => `<span class="mark ${tone}">${icon(name)}</span>`;
const format = new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'});
const money = cents => format.format(cents / 100);
const axisFormat = new Intl.NumberFormat('pt-BR', {notation:'compact',maximumFractionDigits:1});
const displayDate = iso => iso.split('-').reverse().join('/');
const today = () => new Intl.DateTimeFormat('sv-SE', {timeZone:'America/Sao_Paulo'}).format(new Date());
const id = () => globalThis.crypto?.randomUUID?.() ?? String(Date.now()) + '-' + Math.random().toString(36).slice(2);
const blank = Caixa.emptyData;
const storage = 'fluxo-de-caixa-local.v1';
const publicDemo = document.body.hasAttribute('data-public-demo');
let demo, real, demoData, toastTimer, loadedStorage;
function loadData(snapshot) {
  const saved = JSON.parse(snapshot);
  real = Caixa.upgrade(saved?.real);
  demoData = Caixa.upgrade(saved?.demoData ?? example());
  demo = saved?.demo ?? true;
  loadedStorage = snapshot;
}
try {
  loadData(publicDemo ? null : localStorage.getItem(storage));
} catch {
  real = blank();
  demoData = Caixa.upgrade(example());
  demo = true;
}

function example() {
  const month = today().slice(0, 7);
  const day = Number(today().slice(-2));
  const tags = ['Venda chip', 'Fornecedor BM', 'Operação'];
  const accounts = [
    {id:'principal', name:'Conta principal', bank:'Inter', opening:860000, baseDate:''},
    {id:'recebimentos', name:'Recebimentos', bank:'Nubank', opening:368000, baseDate:''}
  ];
  const entries = [
    [1,'Venda de chips',225000,'principal',0,'Loja Centro'],
    [3,'Compra de estoque',-115000,'principal',1,'Fornecedor BM'],
    [7,'Venda de chips',172500,'recebimentos',0,'Quiosque Sul'],
    [9,'Aluguel',-96000,'principal',2,'Imobiliária'],
    [13,'Venda de chips',312000,'principal',0,'Loja Centro'],
    [16,'Material de escritório',-38500,'principal',2,'Papelaria'],
    [19,'Venda de chips',248000,'recebimentos',0,'Quiosque Sul'],
    [22,'Transferência Pix',-165000,'principal',1,'Fornecedor BM'],
    [25,'Venda chip',2500,'recebimentos',0,'Cliente balcão']
  ];
  const rows = entries.map(([d,description,amount,accountId,tag,person], index) => ({
    id:'ex-'+index, date:month+'-'+String(Math.min(d, day)).padStart(2,'0'),
    description, amount, accountId, tags:[tags[tag]], person, reason:'', internal:false
  }));
  const keywords = publicDemo ? [{id:'demo-bm',term:'Fornecedor BM',tag:'Fornecedor BM'}] : [];
  return {...blank(),accounts,tags,rows,keywords};
}

const data = () => demo ? demoData : real;
function commit(next, mode = demo) {
  saveStorage({demo:mode, demoData:demo ? next : demoData, real:demo ? real : next});
}

function saveStorage(saved) {
  const snapshot = JSON.stringify(saved);
  if (publicDemo) {
    loadData(snapshot);
    return;
  }
  const latest = localStorage.getItem(storage);
  if (latest !== loadedStorage) {
    try { loadData(latest); } catch { loadedStorage = latest; }
    throw new Error('Os dados mudaram em outra aba. Feche esta janela e abra novamente antes de salvar.');
  }
  try { localStorage.setItem(storage,snapshot); }
  catch { throw new Error('O navegador não conseguiu salvar. Confira o espaço e a permissão de armazenamento.'); }
  loadData(snapshot);
}
const accountName = id => data().accounts.find(account => account.id === id)?.name ?? '—';
const accountBalance = account => Caixa.balance(account, data().rows, today());
const pages = {
  painel:['Visão geral','Fluxo de caixa','Acompanhe suas movimentações e a saúde do seu caixa.'],
  movimentos:['Lançamentos','Lançamentos','Consulte, filtre e organize entradas e pagamentos.'],
  contas:['Contas bancárias','Contas bancárias','Cadastre contas e acompanhe o saldo de cada uma.'],
  etiquetas:['Etiquetas','Etiquetas','Identifique movimentações e sugira etiquetas por palavra-chave.'],
  importacoes:['Importações','Histórico de importações','Confira saldos de fechamento e gerencie os extratos importados.'],
  backup:['Backup','Backup do caixa','Guarde uma cópia ou restaure os dados neste computador.']
};
const filter = {search:'', account:'', type:'', tag:'', month:today().slice(0,7)};
const untaggedFilter = '__sem_etiqueta__';
const page = () => Object.hasOwn(pages, location.hash.slice(1)) ? location.hash.slice(1) : 'painel';
const ordered = () => [...data().rows].reverse().sort((a,b) => b.date.localeCompare(a.date));
const action = (type, label, iconName, extra = '') => `<button type="button" class="button ${extra}" data-action="${type}">${iconName ? icon(iconName) : ''}${label}</button>`;
const option = (value, label, selected) => `<option value="${esc(value)}"${value === selected ? ' selected' : ''}>${esc(label)}</option>`;
const accountOptions = (selected, placeholder) => option('', placeholder, selected) +
  data().accounts.map(account => option(account.id, account.name, selected)).join('');
const empty = message => `<p class="empty">${message}</p>`;
const pill = label => `<span class="pill">${esc(label)}</span>`;
const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;

function notice(message) {
  $('#toast').textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('#toast').textContent = ''; }, 6000);
}

function metric(label, value, note, iconName, tone = '') {
  return `<article class="metric"><div class="metric-label"><i class="${tone}">${icon(iconName)}</i> ${label}</div>
    <div class="metric-value">${value}</div><div class="note">${note}</div></article>`;
}

function table(rows) {
  if (!rows.length) return empty('Nenhum lançamento encontrado.');
  return `<div class="table-scroll"><table role="table">
    <thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">Descrição</th><th scope="col" role="columnheader">Data</th><th scope="col" role="columnheader">Conta</th><th scope="col" role="columnheader">Etiquetas</th><th scope="col" role="columnheader">Valor</th><th scope="col" role="columnheader">Ações</th></tr></thead>
    <tbody role="rowgroup">${rows.map(row => `<tr role="row">
      <td role="cell" class="entry-description"><strong>${esc(row.description)}</strong>${row.person || row.reason ? `<div class="note">${[row.person,row.reason].filter(Boolean).map(esc).join(' · ')}</div>` : ''}</td>
      <td role="cell" class="entry-date">${displayDate(row.date)}</td><td role="cell" class="entry-account">${esc(accountName(row.accountId))}</td>
      <td role="cell" class="entry-tags">${row.internal ? pill('Transferência interna') : ''}${row.tags.map(pill).join('') || (!row.internal ? '<span class="note">Sem etiqueta</span>' : '')}
        ${!row.tags.length ? Caixa.suggestions(data().keywords,row).map(tag => `<div class="note">Sugestão · ${esc(tag)}</div>`).join('') : ''}</td>
      <td role="cell" class="entry-amount amount ${row.amount > 0 ? 'pos' : 'neg'}">${row.amount > 0 ? '+' : '−'}${money(Math.abs(row.amount))}</td>
      <td role="cell" class="entry-action"><button class="compact" data-action="edit" data-id="${esc(row.id)}" aria-label="Editar ${esc(row.description)}">${icon('edit')}</button></td>
      </tr>`).join('')}</tbody></table></div>`;
}

function chart(rows, month) {
  if (!rows.some(row => !row.internal)) return empty('Adicione ou importe lançamentos para ver o gráfico.');
  const groups = Array.from({length:5}, (_, i) => Caixa.totals(rows.filter(row => Math.min(4, Math.floor((Number(row.date.slice(-2))-1)/7)) === i)));
  const lastDay = new Date(Date.UTC(Number(month.slice(0,4)), Number(month.slice(5)), 0)).getUTCDate();
  const max = Math.max(1,...groups.flatMap(group => [group.income,group.expense]));
  const ticks = [max,max/2,0].map(value => `<span>${axisFormat.format(value/100)}</span>`).join('');
  return `<div class="chart" role="group" aria-label="Entradas e saídas em reais por faixa de dias"><div class="chart-scale" aria-hidden="true">${ticks}</div>${groups.map(({income,expense},i) => {
    const label = `${i*7+1}–${Math.min(i*7+7,lastDay)}`;
    if (i*7+1 > lastDay) return '';
    const values = `Dias ${label}, entradas ${money(income)}, saídas ${money(expense)}`;
    return `<div><div class="bars" role="img" aria-label="${values}" title="${values}"><span style="height:${income/max*100}%"></span><span style="height:${expense/max*100}%"></span></div><span class="tick">${label}</span></div>`;
  }).join('')}</div>`;
}

function dashboard() {
  const rows = ordered().filter(row => row.date.startsWith(filter.month));
  const {income,expense} = Caixa.totals(rows);
  const consolidated = data().accounts.reduce((sum, account) => sum + accountBalance(account), 0);
  const health = !data().accounts.length ? ['Sem contas','Cadastre uma conta',''] :
    consolidated < 0 ? ['Saldo negativo','Saldo atual abaixo de zero','red'] :
    !income && !expense ? ['Sem movimento','Nenhuma entrada ou saída no mês',''] :
    expense > income ? ['Atenção','Saídas superiores às entradas no mês','red'] :
    expense === income ? ['Equilibrado','Entradas e saídas iguais no mês',''] :
    ['Positivo','Entradas superiores às saídas no mês','green'];
  const spending = new Map();
  for (const row of rows.filter(row => row.amount < 0 && !row.internal)) {
    const label = row.tags[0] || 'Sem etiqueta';
    spending.set(label, (spending.get(label) ?? 0) - row.amount);
  }
  const spendRows = [...spending].sort((a,b) => b[1]-a[1]);
  return `<div class="period"><label for="month">Movimentações do mês</label><input id="month" type="month" value="${esc(filter.month)}"></div>
    <section class="metrics" aria-label="Indicadores do caixa">
      ${metric('Saldo consolidado',money(consolidated),'Saldo atual das contas','wallet')}
      ${metric('Entradas',money(income),'Total no mês selecionado','down','green')}
      ${metric('Saídas',money(expense),'Total no mês selecionado','up','red')}
      ${metric('Saúde do caixa',health[0],health[1],'activity',health[2])}
    </section>
    <div class="middle">
      <section class="panel"><div class="section-head"><div><h2>Entradas e saídas</h2><p class="note">Resultado do mês <strong>${money(income-expense)}</strong></p></div><div class="legend"><span><b></b>Entradas</span><span><b></b>Saídas</span></div></div>${chart(rows,filter.month)}</section>
      <div class="stack">
      <section class="panel"><div class="section-head"><h2>Saldos por conta</h2><a class="link" href="#contas">Ver contas</a></div>
      ${data().accounts.length ? data().accounts.map(account => {
        const latest = lastClosing(account.id);
        return `<div class="account-row">${mark('bank')}<div class="grow"><strong>${esc(account.name)}</strong><div class="note">${esc(account.bank)}${latest ? ' · ' + closingStatus(account,latest.closing).label : ''}</div></div><span class="amount">${money(accountBalance(account))}</span></div>`;
      }).join('') : empty('Nenhuma conta cadastrada.')}</section>
      <section class="panel"><div class="section-head"><div><h2>Para onde foi o dinheiro</h2><p class="note">Saídas pela primeira etiqueta do lançamento</p></div></div>
      ${spendRows.length ? spendRows.map(([label,value]) => `<div class="account-row"><span class="grow">${pill(label)}</span><span class="amount">${money(value)}</span></div>`).join('') : empty('Sem saídas no período.')}</section>
      </div>
    </div>
    <section class="panel table-panel"><div class="section-head"><h2>Lançamentos do período</h2><a class="link" href="#movimentos">Ver todos</a></div>${table(rows.slice(0,5))}</section>`;
}

function drawList() {
  const needle = Caixa.key(filter.search);
  const rows = ordered().filter(row =>
    (!filter.account || row.accountId === filter.account) &&
    (!filter.tag || (filter.tag === untaggedFilter ? !row.tags.length : row.tags.includes(filter.tag.slice(4)))) &&
    (!filter.type || (row.internal ? 'internal' : row.amount > 0 ? 'income' : 'expense') === filter.type) &&
    (!needle || Caixa.key([row.description,row.person,row.reason,...row.tags].join(' ')).includes(needle)));
  $('#results').innerHTML = table(rows);
}

function lastClosing(accountId) {
  return [...data().imports].reverse().filter(batch => batch.accountId === accountId && batch.closing && !batch.undoneAt)
    .sort((a,b) => b.closing.date.localeCompare(a.closing.date))[0];
}

function closingStatus(account, closing, rows = data().rows) {
  const result = Caixa.reconcile(account,rows,closing);
  if (!result) return {label:'Sem base para comparar',tone:'',result};
  if (!result.difference) return {label:'Saldo confere',tone:'green',result};
  return {label:'Saldo divergente',tone:'red',result};
}

function closingBlock(account, closing, rows) {
  const {label,tone,result} = closingStatus(account,closing,rows);
  return `<div class="closing"><div class="closing-head"><strong>Fechamento de ${displayDate(closing.date)}</strong><span class="pill ${tone}">${label}</span></div>
    <dl><div><dt>Saldo do extrato</dt><dd>${money(closing.amount)}</dd></div>${result ?
      `<div><dt>Saldo calculado</dt><dd>${money(result.calculated)}</dd></div><div><dt>Diferença</dt><dd>${money(result.difference)}</dd></div>` : ''}
    </dl>${result ? '' : '<p class="note">O fechamento é anterior à data do saldo inicial da conta.</p>'}</div>`;
}

function renderImports() {
  const history = [...data().imports].reverse();
  if (!history.length) return `<section class="panel">${empty('Ainda não há extratos no histórico.')}</section>`;
  const timestamp = new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'});
  return `<div class="stack">${history.map(batch => {
    const account = data().accounts.find(item => item.id === batch.accountId);
    return `<article class="panel">
      <div class="section-head"><div class="break"><h2>${esc(batch.file)}</h2>
        <p class="note">${esc(account.name)} · ${timestamp.format(new Date(batch.at))} · ${plural(batch.count,'lançamento importado','lançamentos importados')}</p></div>
        ${batch.undoneAt ? pill('Desfeita') : `<button class="button" data-action="undo-import" data-id="${esc(batch.id)}">Desfazer importação</button>`}</div>
      ${batch.undoneAt ? `<p class="note">Desfeita em ${timestamp.format(new Date(batch.undoneAt))}.</p>` : batch.closing ?
        closingBlock(account,batch.closing) : '<p class="note">Sem saldo de fechamento informado.</p>'}
    </article>`;
  }).join('')}</div>`;
}

function renderBackup() {
  if (publicDemo) return `<section class="panel task-panel"><h2>Backup de exemplo</h2>
    <p>Você pode baixar uma cópia dos dados da demonstração. Para voltar aos dados iniciais, clique em <strong>Reiniciar demo</strong>.</p>
    ${action('download-backup','Baixar backup de exemplo','down')}</section>`;
  return `<div class="accounts">
    <section class="panel task-panel"><h2>Baixar cópia do caixa</h2><p>O backup inclui contas, lançamentos, etiquetas, regras e histórico de importações.</p>
      <p class="note">${demo ? 'Saia da demonstração para baixar seus dados.' : 'Guarde o arquivo JSON em local seguro. Ele contém os dados financeiros registrados no painel.'}</p>
      <button type="button" class="button primary" data-action="download-backup"${demo ? ' disabled' : ''}>${icon('down')} Baixar backup</button></section>
    <section class="panel task-panel"><h2>Restaurar backup</h2><p>Abra um arquivo JSON exportado pelo painel para recuperar ou transferir seu caixa.</p>
      <p class="note">A restauração substitui os dados atuais após sua confirmação.</p>
      ${action('restore-backup','Selecionar backup','upload')}</section>
  </div>`;
}

function render() {
  const current = page();
  const [name,title,subtitle] = pages[current];
  $('#crumb').textContent = name;
  $('#title').textContent = title;
  $('#subtitle').textContent = publicDemo && current === 'painel' ? 'Explore os saldos ou importe um extrato fictício para testar a atualização do caixa.' : subtitle;
  $('#switch').textContent = publicDemo ? 'Reiniciar demo' : demo ? 'Sair da demonstração' : 'Ver demonstração';
  $('#mode').textContent = demo ? 'Dados fictícios' : 'Meu caixa';
  document.querySelectorAll('[data-page]').forEach(link => {
    if (link.dataset.page === current) link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
  });
  if (current === 'painel') $('#page').innerHTML = dashboard();
  if (current === 'movimentos') {
    $('#page').innerHTML = `<section class="panel table-panel"><div class="filters">
      <input aria-label="Buscar lançamentos por descrição, pessoa ou motivo" id="search" type="search" placeholder="Buscar lançamentos" value="${esc(filter.search)}">
      <select aria-label="Filtrar por conta" id="filter-account">${accountOptions(filter.account,'Todas as contas')}</select>
      <select aria-label="Filtrar por tipo" id="filter-type">${[['','Todos os tipos'],['income','Entradas'],['expense','Saídas'],['internal','Transferências internas']].map(([value,label]) => option(value,label,filter.type)).join('')}</select>
      <select aria-label="Filtrar por etiqueta" id="filter-tag">${option('','Todas as etiquetas',filter.tag)}${option(untaggedFilter,'Sem etiqueta',filter.tag)}${data().tags.map(tag => option('tag:'+tag,tag,filter.tag)).join('')}</select>
      </div><div id="results"></div></section>`;
    drawList();
  }
  if (current === 'contas') $('#page').innerHTML = `<div class="section-head"><h2>Minhas contas</h2>${action('account','Nova conta','plus','primary')}</div>
    ${data().accounts.length ? `<div class="accounts">${data().accounts.map(account => {
      const latest = lastClosing(account.id);
      return `<article class="card"><div class="account-row">${mark('bank')}<div class="grow"><h2>${esc(account.name)}</h2><p class="note">${esc(account.bank)}</p></div><button class="compact" data-action="account" data-id="${esc(account.id)}" aria-label="Editar ${esc(account.name)}">${icon('edit')}</button></div>
      <div class="metric-value">${money(accountBalance(account))}</div><p class="note">Saldo atual</p>
      <p class="note">Saldo inicial ${money(account.opening)}${account.baseDate ? ' em '+displayDate(account.baseDate) : ''}</p>
      ${latest ? closingBlock(account,latest.closing) : '<p class="note">Nenhum saldo de fechamento registrado.</p>'}</article>`;
    }).join('')}</div>` : `<div class="panel">${empty('Cadastre sua primeira conta para começar.')}</div>`}`;
  if (current === 'etiquetas') $('#page').innerHTML = renderTags();
  if (current === 'importacoes') $('#page').innerHTML = renderImports();
  if (current === 'backup') $('#page').innerHTML = renderBackup();
}

function renderTags() {
  const pending = data().rows.filter(row => !row.tags.length).length;
  return `<div class="stack"><section class="panel"><div class="section-head"><div><h2>Minhas etiquetas</h2>
    <p class="note">${plural(pending,'lançamento sem etiqueta','lançamentos sem etiqueta')}</p></div>
    <div class="action">${pending ? action('review-tags','Revisar sem etiqueta') : ''}${action('tag','Nova etiqueta','plus','primary')}</div></div>
    ${data().tags.length ? data().tags.map(tag => `<div class="account-row"><div class="grow">${pill(tag)}</div><span class="note">${plural(data().rows.filter(row => row.tags.includes(tag)).length,'lançamento','lançamentos')}</span><button class="compact" data-action="tag" data-id="${esc(tag)}" aria-label="Renomear ${esc(tag)}">${icon('edit')}</button></div>`).join('') : empty('Crie etiquetas para organizar suas entradas e pagamentos.')}</section>
    <section class="panel"><div class="section-head"><div><h2>Regras de sugestão</h2><p class="note">Sugira etiquetas quando uma palavra ou frase aparecer na descrição ou na pessoa.</p></div>
      <button type="button" class="button" data-action="keyword"${data().tags.length ? '' : ' disabled'}>${icon('plus')} Nova regra</button></div>
    ${data().keywords.length ? data().keywords.map(rule => `<div class="account-row"><strong class="grow">${esc(rule.term)}</strong>${pill(rule.tag)}<button class="compact" data-action="keyword" data-id="${esc(rule.id)}" aria-label="Editar a regra ${esc(rule.term)}">${icon('edit')}</button></div>`).join('') : empty('Ainda não há regras. Exemplo de palavra-chave: Fornecedor BM.')}</section></div>`;
}

const modal = $('#modal');
const form = $('#form');
function dialog(title, fields, label, onSave) {
  form.onchange = null;
  form.oninput = null;
  form.innerHTML = `<div class="section-head"><h2 id="modal-title">${title}</h2></div>
    <div class="fields">${fields}</div><p class="error" id="form-error" role="alert"></p>
    <div class="form-actions"><button class="button" type="button" data-action="close">Cancelar</button><button class="button primary" id="save" type="submit">${label}</button></div>`;
  form.onsubmit = event => {
    event.preventDefault();
    try {
      const message = onSave(new FormData(form));
      modal.close();
      render();
      notice(message);
    } catch (error) { $('#form-error').textContent = error.message; }
  };
  modal.showModal();
}

function input(label, name, value = '', attributes = '') {
  return `<label>${label}<input name="${name}" value="${esc(value)}" ${attributes}></label>`;
}
const amountText = amount => amount === undefined ? '' : (amount / 100).toFixed(2).replace('.', ',');
const valueOf = (fields, key) => String(fields.get(key) ?? '').trim();

function openAccount(account, next) {
  dialog(account ? 'Editar conta' : 'Nova conta bancária', `
    ${input('Nome da conta','name',account?.name,'required maxlength="80" placeholder="Ex. Conta principal"')}
    ${input('Banco','bank',account?.bank,'required maxlength="80" placeholder="Ex. Inter"')}
    ${input('Saldo inicial (R$)','opening',amountText(account?.opening),'required inputmode="decimal" placeholder="0,00"')}
    ${input('Data do saldo inicial (opcional)','baseDate',account?.baseDate,'type="date" max="'+today()+'"')}
    <p class="note full">Se informar a data, use o saldo de fechamento desse dia. O painel somará apenas movimentos de dias posteriores ao calcular o saldo. Deixe a data em branco para somar todos os lançamentos ao saldo inicial.</p>
    `, 'Salvar conta', fields => {
    const name = valueOf(fields,'name');
    const bank = valueOf(fields,'bank');
    const opening = Caixa.cents(valueOf(fields,'opening'));
    if (!name || !bank || !Number.isSafeInteger(opening)) throw new Error('Confira o nome, o banco e o saldo inicial.');
    const accountId = account?.id ?? id();
    const updated = {id:accountId, name, bank, opening, baseDate:valueOf(fields,'baseDate')};
    const accounts = account ? data().accounts.map(item => item.id === accountId ? updated : item) : [...data().accounts,updated];
    commit({...data(), accounts});
    if (next) setTimeout(() => next(accountId),0);
    return 'Conta salva.';
  });
}

function openTag(original) {
  dialog(original ? 'Renomear etiqueta' : 'Nova etiqueta',
    `<label class="full">Nome da etiqueta<input name="name" value="${esc(original)}" required maxlength="60" placeholder="Ex. Fornecedor BM"></label>`,
    'Salvar etiqueta', fields => {
      const tag = valueOf(fields,'name');
      if (!tag || tag.includes(';') || data().tags.some(item => item !== original && Caixa.key(item) === Caixa.key(tag))) throw new Error('Informe um nome novo, sem ponto e vírgula.');
      const update = item => ({...item,tags:item.tags.map(label => label === original ? tag : label)});
      const tags = original ? data().tags.map(item => item === original ? tag : item) : [...data().tags,tag];
      const keywords = data().keywords.map(rule => rule.tag === original ? {...rule,tag} : rule);
      commit({...data(),tags,rows:data().rows.map(update),rules:data().rules.map(update),keywords});
      if (filter.tag === 'tag:'+original) filter.tag = 'tag:'+tag;
      return 'Etiqueta salva.';
    });
}

function openKeyword(rule) {
  dialog(rule ? 'Editar regra de sugestão' : 'Nova regra de sugestão', `
    ${input('Palavra ou frase','term',rule?.term,'required maxlength="100" placeholder="Ex. Fornecedor BM"')}
    <label>Etiqueta sugerida<select name="tag" required>${option('','Selecione uma etiqueta',rule?.tag)}${data().tags.map(tag => option(tag,tag,rule?.tag)).join('')}</select></label>
    <p class="note full">O painel sugere a etiqueta quando encontra a frase inteira, mesmo com diferenças de acento, pontuação ou maiúsculas. Você decide se quer aplicar.</p>
    ${rule ? `<div class="full"><button type="button" data-action="remove-keyword" data-id="${esc(rule.id)}" class="link neg">Remover regra</button></div>` : ''}
  `, 'Salvar regra', fields => {
    const keywords = data().keywords.filter(item => item.id !== rule?.id);
    const term = valueOf(fields,'term');
    const tag = valueOf(fields,'tag');
    if (!Caixa.keyword(term) || !data().tags.includes(tag)) throw new Error('Informe uma palavra ou frase e selecione uma etiqueta.');
    if (keywords.some(item => item.tag === tag && Caixa.keyword(item.term) === Caixa.keyword(term))) {
      throw new Error('Essa expressão já sugere a etiqueta selecionada.');
    }
    commit({...data(),keywords:[...keywords,{id:rule?.id ?? id(),term,tag}]});
    return 'Regra salva.';
  });
}

function openRow(row, preselected) {
  if (!data().accounts.length) { openAccount(null, account => openRow(null,account)); return; }
  dialog(row ? 'Editar lançamento' : 'Novo lançamento', `
    <label>Conta bancária<select name="account" required ${row?.original ? 'disabled' : ''}>${accountOptions(row?.accountId ?? preselected ?? data().accounts[0].id,'Selecione uma conta')}</select></label>
    ${input('Data','date',row?.date ?? today(),'required type="date" max="'+today()+'"')}
    <label>Tipo<select name="type">${option('income','Entrada',row?.amount > 0 ? 'income' : 'expense')}${option('expense','Saída',row?.amount > 0 ? 'income' : 'expense')}</select></label>
    ${input('Valor (R$)','amount',amountText(row ? Math.abs(row.amount) : undefined),'required inputmode="decimal" placeholder="25,00"')}
    <label class="full">Descrição<input name="description" required maxlength="500" value="${esc(row?.description)}" placeholder="Ex. Venda chip"></label>
    ${input('Pessoa ou empresa','person',row?.person,'maxlength="180" placeholder="Ex. Fornecedor BM"')}
    ${input('Motivo','reason',row?.reason,'maxlength="240" placeholder="Ex. Compra de estoque"')}
    <label class="full"><span id="tag-label">Etiquetas</span>
      <input name="tags" value="${esc(row?.tags.join('; '))}" list="tag-list" maxlength="300" placeholder="Ex. Venda chip; Loja Centro" aria-labelledby="tag-label" aria-describedby="tag-help">
      <datalist id="tag-list">${data().tags.map(tag => option(tag,tag)).join('')}</datalist>
      <span class="note" id="tag-help">Separe por ponto e vírgula. Etiquetas novas são criadas ao salvar.</span>
    </label>
    <div id="row-suggestions" class="full suggestions"></div>
    <label class="check full"><input type="checkbox" name="internal"${row?.internal ? ' checked' : ''}> Transferência entre minhas contas</label>
    <p class="note full">Marque a saída e a entrada nas respectivas contas. Cada lado afeta o saldo da conta e fica fora do resultado do mês.</p>
    <label class="check full"><input type="checkbox" name="remember"> Reaplicar pessoa, motivo e etiquetas a descrições iguais nesta conta</label>
    ${row ? `<div class="full"><button type="button" class="link neg" data-action="remove" data-id="${esc(row.id)}">Excluir lançamento</button></div>` : ''}
    `, 'Salvar lançamento', fields => {
    const amount = Caixa.cents(valueOf(fields,'amount'));
    const description = valueOf(fields,'description');
    const date = Caixa.date(valueOf(fields,'date'));
    if (!Number.isSafeInteger(amount) || amount <= 0 || !description || !date) throw new Error('Informe uma descrição, uma data e um valor maior que zero.');
    const tags = [...data().tags];
    const labels = [];
    for (const name of valueOf(fields,'tags').split(';').map(item => item.trim()).filter(Boolean)) {
      if (name.length > 60) throw new Error('Cada etiqueta pode ter até 60 caracteres.');
      const existing = tags.find(tag => Caixa.key(tag) === Caixa.key(name));
      if (!existing) tags.push(name);
      if (!labels.includes(existing ?? name)) labels.push(existing ?? name);
    }
    const accountId = row?.original ? row.accountId : valueOf(fields,'account');
    const updated = {...row,id:row?.id ?? id(),accountId,date,description,
      amount:fields.get('type') === 'income' ? amount : -amount,
      person:valueOf(fields,'person'),reason:valueOf(fields,'reason'),tags:labels,internal:fields.has('internal')};
    const rows = row ? data().rows.map(item => item.id === row.id ? updated : item) : [...data().rows,updated];
    let rules = data().rules;
    if (fields.has('remember')) {
      const match = Caixa.key(row?.original?.description ?? description);
      if (!match) throw new Error('Use uma descrição que possa ser reconhecida nos próximos extratos.');
      rules = [...rules.filter(rule => rule.accountId !== accountId || rule.match !== match),
        {accountId,match,tags:labels,person:updated.person,reason:updated.reason,internal:updated.internal}];
    }
    commit({...data(),tags,rows,rules});
    return 'Lançamento salvo.';
  });
  const suggestionBox = $('#row-suggestions');
  const tagsField = form.elements.tags;
  const drawSuggestions = () => {
    const selected = new Set(tagsField.value.split(';').map(Caixa.key));
    const suggestions = Caixa.suggestions(data().keywords,{description:form.elements.description.value,
      person:form.elements.person.value,original:row?.original}).filter(tag => !selected.has(Caixa.key(tag)));
    suggestionBox.innerHTML = suggestions.length ? `<span class="note">Etiquetas sugeridas</span>
      <div class="action">${suggestions.map(tag => `<button type="button" class="compact" value="${esc(tag)}" aria-label="Aplicar etiqueta ${esc(tag)}">${icon('plus')} ${esc(tag)}</button>`).join('')}</div>` : '';
  };
  suggestionBox.onclick = event => {
    const button = event.target.closest('button');
    if (!button) return;
    tagsField.value = [tagsField.value.trim().replace(/;+$/, '').trim(),button.value].filter(Boolean).join('; ');
    tagsField.focus();
    drawSuggestions();
  };
  form.oninput = drawSuggestions;
  drawSuggestions();
}

function openImport(preselected) {
  if (!data().accounts.length) { openAccount(null, openImport); return; }
  let parsed, filename;
  const selected = publicDemo ? 'principal' : preselected ?? (data().accounts.length === 1 ? data().accounts[0].id : '');
  dialog(publicDemo ? 'Importar extrato de exemplo' : 'Importar extrato', `
    <label class="full">Conta do extrato<select name="account" required ${publicDemo ? 'disabled' : ''}>${accountOptions(selected,'Selecione uma conta')}</select></label>
    ${publicDemo ? '<p class="note full">Este extrato fictício inclui uma venda e um pagamento a fornecedor.</p>' : `
    <label class="full">Arquivo OFX ou CSV<input name="file" required type="file" accept=".ofx,.csv"></label>
    <p class="note full">No CSV, use Data, Descrição e Valor. Use valores negativos para saídas. Você também pode usar colunas Entrada e Saída.
    <a class="link" download="modelo-extrato.csv" href="data:text/csv;charset=utf-8,%EF%BB%BFData%3BDescri%C3%A7%C3%A3o%3BValor%3BPessoa%0A30%2F10%2F2026%3BVenda%20chip%3B25%2C00%3BCliente%20balc%C3%A3o%0A30%2F10%2F2026%3BCompra%20de%20estoque%3B-120%2C00%3BFornecedor%20BM">Baixar modelo</a></p>
    <div class="full"><h3>Conferir com o banco</h3><p class="note">O saldo de fechamento vem do OFX quando disponível. Se o arquivo não trouxer saldo, informe o valor e a data que constam no extrato.</p></div>`}
    ${publicDemo ? '<input type="hidden" name="closingAmount"><input type="hidden" name="closingDate">' : `
      ${input('Saldo de fechamento (opcional)','closingAmount','','inputmode="decimal" placeholder="0,00"')}
      ${input('Data do fechamento','closingDate','','type="date"')}`}
    <div class="full" id="preview" role="status"></div>
    `, 'Confirmar importação', () => {
      const plan = prepare();
      if (!plan || (!plan.fresh.length && !plan.newClosing)) throw new Error('Não há lançamentos novos ou novo saldo de fechamento para registrar.');
      const {account,closing,fresh} = plan;
      const batch = {id:id(),accountId:account.id,file:filename,at:new Date().toISOString(),count:fresh.length,closing,undoneAt:null};
      const rows = fresh.map(item => {
        const rule = data().rules.find(entry => entry.accountId === account.id && entry.match === Caixa.key(item.description));
        return {id:id(),accountId:account.id,importId:batch.id,date:item.date,description:item.description,amount:item.amount,external:item.external,
          person:rule?.person || item.person, reason:rule?.reason ?? '', tags:rule?.tags ?? [],internal:rule?.internal ?? false,
          original:{date:item.date,description:item.description,amount:item.amount}};
      });
      commit({...data(),rows:[...data().rows,...rows],imports:[...data().imports,batch]});
      return rows.length ? `${plural(rows.length,'lançamento importado','lançamentos importados')}. Saldos atualizados.` : 'Saldo de fechamento registrado.';
  });
  const save = $('#save');
  const errorBox = $('#form-error');
  const preview = $('#preview');
  save.disabled = true;

  function prepare() {
    const account = data().accounts.find(item => item.id === form.elements.account.value);
    if (!parsed || !account) return null;
    const rawAmount = form.elements.closingAmount.value.trim();
    const date = Caixa.date(form.elements.closingDate.value);
    const amount = Caixa.cents(rawAmount);
    if (rawAmount && (!date || !Number.isSafeInteger(amount))) throw new Error('Confira o valor e a data do saldo de fechamento.');
    const closing = rawAmount ? {date,amount} : null;
    if (!parsed.rows.length && !closing) throw new Error('Informe o saldo de fechamento para registrar este extrato sem movimentações.');
    const fresh = Caixa.newRows(parsed.rows,data().rows,account.id);
    const recorded = data().imports.some(batch => batch.accountId === account.id && !batch.undoneAt &&
      batch.closing?.date === closing?.date && batch.closing?.amount === closing?.amount);
    return {account,closing,fresh,newClosing:Boolean(closing && !recorded)};
  }

  function refresh() {
    if (!parsed) return;
    save.disabled = true;
    errorBox.textContent = '';
    try {
      const plan = prepare();
      if (!plan) {
        preview.textContent = 'Selecione a conta para conferir as movimentações.';
        return;
      }
      const {account,closing,fresh,newClosing} = plan;
      save.disabled = !fresh.length && !newClosing;
      const duplicates = parsed.rows.length - fresh.length;
      preview.innerHTML = `<strong>${plural(fresh.length,'lançamento novo','lançamentos novos')} · ${plural(duplicates,'provável duplicidade','prováveis duplicidades')}</strong>
        ${fresh.length ? `<div class="import-preview">${fresh.slice(0,8).map(row => `<div class="account-row"><span class="grow">${displayDate(row.date)} · ${esc(row.description)}</span><strong class="amount">${money(row.amount)}</strong></div>`).join('')}</div>${fresh.length > 8 ? '<p class="note">Prévia dos primeiros 8 lançamentos novos.</p>' : ''}` : ''}
        ${closing ? closingBlock(account,closing,[...data().rows,...fresh.map(row => ({...row,accountId:account.id}))]) : ''}
        ${save.disabled ? '<p class="note">Este extrato já foi registrado para a conta selecionada.</p>' : ''}`;
    } catch (error) {
      preview.textContent = '';
      errorBox.textContent = error.message;
    }
  }

  function loadStatement(source, name) {
    parsed = Caixa.readStatement(source);
    filename = name;
    form.elements.closingAmount.value = amountText(parsed.closing?.amount);
    form.elements.closingDate.value = parsed.closing?.date ||
      parsed.rows.reduce((last,row) => row.date > last ? row.date : last,'');
    refresh();
  }

  if (publicDemo) {
    const date = today();
    const sample = example();
    const closing = (Caixa.balance(sample.accounts[0],sample.rows,date) / 100 + 125 - 45).toFixed(2);
    const ofxDate = date.replace(/-/g,'');
    loadStatement(`<OFX><CURDEF>BRL<BANKTRANLIST>
      <STMTTRN><DTPOSTED>${ofxDate}<TRNAMT>125.00<FITID>DEMO-IN-01<NAME>Venda de chips no balcão</STMTTRN>
      <STMTTRN><DTPOSTED>${ofxDate}<TRNAMT>-45.00<FITID>DEMO-OUT-01<NAME>Pix Fornecedor BM</STMTTRN>
      </BANKTRANLIST><LEDGERBAL><BALAMT>${closing}<DTASOF>${ofxDate}</LEDGERBAL></OFX>`,'extrato-de-exemplo.ofx');
    return;
  }

  let version = 0;
  form.oninput = event => { if (['closingAmount','closingDate'].includes(event.target.name)) refresh(); };
  form.onchange = async event => {
    if (event.target.name !== 'file') { refresh(); return; }
    const current = ++version;
    const file = form.elements.file.files[0];
    parsed = null;
    save.disabled = true;
    form.elements.closingAmount.value = '';
    form.elements.closingDate.value = '';
    errorBox.textContent = '';
    preview.textContent = file ? 'Lendo o extrato…' : '';
    if (!file) return;
    try {
      const source = await readLocalFile(file);
      if (current !== version || !modal.open || !preview.isConnected) return;
      loadStatement(source,file.name);
    } catch (error) {
      if (current === version && preview.isConnected) {
        preview.textContent = '';
        errorBox.textContent = error.message;
      }
    }
  };
}

async function readLocalFile(file) {
  if (file.size > 10 * 1024 * 1024) throw new Error('Escolha um arquivo de até 10 MB.');
  const buffer = await file.arrayBuffer();
  try { return new TextDecoder('utf-8',{fatal:true}).decode(buffer); }
  catch { return new TextDecoder('windows-1252').decode(buffer); }
}

function openUndo(batch) {
  if (!batch || batch.undoneAt) return;
  const count = data().rows.filter(row => row.importId === batch.id).length;
  dialog('Desfazer importação', `<p class="full">${esc(batch.file)}</p><p class="full">O painel removerá ${plural(count,'lançamento deste arquivo','lançamentos deste arquivo')} do caixa e retirará este fechamento da conferência. O histórico registrará que a importação foi desfeita.</p>`,
    'Confirmar reversão', () => {
      commit(Caixa.undoImport(data(),batch.id,new Date().toISOString()));
      return 'Importação desfeita. Saldos recalculados.';
    });
}

function downloadBackup() {
  if (demo && !publicDemo) return;
  const blob = new Blob([JSON.stringify(Caixa.backup(data()),null,2)],{type:'application/json'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `fluxo-de-caixa-local-backup-${today()}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url),1000);
  notice('Backup gerado. Confira a pasta de downloads.');
}

function openRestore() {
  let restoredData;
  dialog('Restaurar backup', `
    <label class="full">Arquivo JSON do backup<input name="file" type="file" accept=".json,application/json" required></label>
    <div id="restore-preview" class="full" role="status"></div>
    <label class="check full"><input type="checkbox" name="replace" required> Confirmo que este backup deve substituir meu caixa atual.</label>
    `, 'Restaurar e substituir dados', fields => {
      if (!restoredData || !fields.has('replace')) throw new Error('Selecione um backup válido e confirme a substituição.');
      saveStorage({demo:false,demoData,real:restoredData});
      Object.assign(filter,{account:'',type:'',tag:'',search:''});
      return 'Backup restaurado. Seu caixa está pronto.';
    });
  const save = $('#save');
  const preview = $('#restore-preview');
  const errorBox = $('#form-error');
  save.disabled = true;
  let version = 0;
  form.onchange = async event => {
    if (event.target.name !== 'file') { save.disabled = !restoredData || !form.elements.replace.checked; return; }
    const current = ++version;
    const file = form.elements.file.files[0];
    restoredData = undefined;
    form.elements.replace.checked = false;
    save.disabled = true;
    errorBox.textContent = '';
    preview.textContent = file ? 'Verificando o backup…' : '';
    if (!file) return;
    try {
      const source = await readLocalFile(file);
      if (current !== version || !modal.open || !preview.isConnected) return;
      restoredData = Caixa.restore(source);
      save.disabled = !form.elements.replace.checked;
      preview.textContent = `Backup válido com ${plural(restoredData.accounts.length,'conta','contas')}, ${plural(restoredData.rows.length,'lançamento','lançamentos')}, ${plural(restoredData.tags.length,'etiqueta','etiquetas')} e ${plural(restoredData.imports.length,'importação','importações')} no histórico.`;
    } catch (error) {
      if (current !== version || !modal.open || !preview.isConnected) return;
      preview.textContent = '';
      errorBox.textContent = error.message;
    }
  };
}

document.querySelectorAll('[data-icon]').forEach(node => { node.innerHTML = icon(node.dataset.icon); });
modal.addEventListener('close', () => {
  if (!modal.open) { form.onchange = null; form.oninput = null; }
});
document.addEventListener('click', event => {
  const control = event.target.closest('[data-action]');
  if (!control) return;
  const value = control.dataset.id;
  const row = () => data().rows.find(item => item.id === value);
  switch (control.dataset.action) {
    case 'add': openRow(); break;
    case 'edit': openRow(row()); break;
    case 'import': openImport(); break;
    case 'account': openAccount(data().accounts.find(item => item.id === value)); break;
    case 'tag': openTag(value); break;
    case 'keyword': openKeyword(data().keywords.find(item => item.id === value)); break;
    case 'remove-keyword':
      try {
        commit({...data(),keywords:data().keywords.filter(item => item.id !== value)});
        modal.close();
        render();
        notice('Regra removida.');
      } catch (error) { $('#form-error').textContent = error.message; }
      break;
    case 'review-tags':
      Object.assign(filter,{account:'',type:'',tag:untaggedFilter,search:''});
      location.hash = 'movimentos';
      break;
    case 'undo-import': openUndo(data().imports.find(item => item.id === value)); break;
    case 'download-backup': downloadBackup(); break;
    case 'restore-backup': openRestore(); break;
    case 'close': modal.close(); break;
    case 'remove':
      if (row() && window.confirm('Excluir este lançamento e atualizar o saldo da conta?')) {
        try {
          commit({...data(),rows:data().rows.filter(item => item.id !== value)});
          modal.close();
          render();
          notice('Lançamento excluído.');
        } catch (error) { $('#form-error').textContent = error.message; }
      }
      break;
  }
});
$('#switch').addEventListener('click', () => {
  try {
    if (publicDemo) {
      commit(example());
      location.hash = 'painel';
    } else commit(data(), !demo);
    Object.assign(filter,{account:'',type:'',tag:'',search:'',month:today().slice(0,7)});
    render();
    notice(publicDemo ? 'Dados de exemplo restaurados.' : demo ? 'Demonstração com dados fictícios.' : 'Você está no seu caixa.');
  } catch (error) { notice(error.message); }
});
$('#page').addEventListener('input', event => {
  if (event.target.id === 'search') {
    filter.search = event.target.value;
    drawList();
  }
});
$('#page').addEventListener('change', event => {
  const target = event.target;
  if (target.id === 'month') {
    filter.month = target.value || today().slice(0,7);
    render();
    $('#month').focus();
  } else if (target.id.startsWith('filter-')) {
    filter[target.id.slice(7)] = target.value;
    drawList();
  }
});
window.addEventListener('hashchange', render);
window.addEventListener('storage', event => {
  if (publicDemo || event.key !== storage) return;
  try {
    loadData(event.newValue);
    if (modal.open) {
      modal.close();
      notice('Os dados mudaram em outra aba. Abra o formulário novamente.');
    }
    render();
  } catch { notice('Não foi possível ler a atualização da outra aba.'); }
});
if (publicDemo) {
  $('[data-action="import"]').innerHTML = `${icon('upload')} Importar extrato de exemplo`;
  $('.side-bottom span').textContent = 'Alterações válidas nesta aba';
}
render();
