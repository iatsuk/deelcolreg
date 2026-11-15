import {RULE_TEXT,ANNEX_TEXT} from './rules-text.js';

// The rule book: every rule and annex in full, searchable by number, title and text. Plain HTML, read by tests.
const esc=s=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]);
const ENTRIES=[
 ...RULE_TEXT.map(r=>({...r,key:String(r.id),label:`Правило ${r.id}`,mark:r.id,kicker:`Часть ${r.part} · ${r.section}`})),
 ...ANNEX_TEXT.map(a=>({...a,key:a.id,label:`Приложение ${a.id.slice(6)}`,mark:`П${a.id.slice(6)}`,kicker:'Приложения к МППСС'})),
];

export function bookList(query=''){
 const q=query.trim().toLocaleLowerCase('ru');
 const rows=ENTRIES.filter(e=>!q||`${e.key} ${e.title} ${e.text}`.toLocaleLowerCase('ru').includes(q));
 const row=e=>`<button class="rule-row" data-do="rule" data-rule="${e.key}"><b>${e.mark}</b>${esc(e.title)}</button>`;
 return rows.map(row).join('')||'<p class="rule-none">Ничего не найдено.</p>';
}
// Review notes name rules as "24" or "24(a)", links as "annex-1".
export function ruleHtml(id){
 const key=/^annex-[1-4]$/.test(id)?id:String(parseInt(id)),e=ENTRIES.find(x=>x.key===key);
 if(!e)return '<p>Правило не найдено.</p>';
 const note=e.editorialNote?`<p class="rule-note">${esc(e.editorialNote)}</p>`:'';
 return `<p class="eyebrow">${esc(e.kicker)}</p><h2>${e.label}. ${esc(e.title)}</h2>${note}`+
  `<div class="rule-body">${e.html.replace(/<a [^>]*>|<\/a>/g,'')}</div>`;
}
