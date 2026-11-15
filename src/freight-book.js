import {RULE_TEXT,ANNEX_TEXT} from './rules-text.js';

// The rule book: every rule and annex, searchable, typeset for reading and linked to itself. Plain HTML, read by tests.
const esc=s=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]);
const ENTRIES=[
 ...RULE_TEXT.map(r=>({...r,key:String(r.id),label:`Правило ${r.id}`,mark:r.id,kicker:`Часть ${r.part} · ${r.section}`})),
 ...ANNEX_TEXT.map(a=>({...a,key:a.id,label:`Приложение ${a.id.slice(6)}`,mark:`П${a.id.slice(6)}`,kicker:'Приложения к МППСС'})),
];
const POINTS='abcdefghijklmnop',ANNEX={I:1,II:2,III:3,IV:4};
const plain=html=>html.replace(/<[^>]*>/g,'');
// Words compare by their first three letters, so «судов, занятых ловом рыбы» finds the term «судно, занятое ловом рыбы».
const stems=s=>(s.toLocaleLowerCase('ru').replace(/ё/g,'е').match(/[а-яa-z]+/g)||[]).map(w=>w.slice(0,3)).join(' ');
// The top-level points of a rule, as html, in order: (a), (b), …
function points(html){
 const out=[];let depth=0;
 for(const part of html.split(/(<[^>]*>)/)){
  if(/^<(ol|ul)\b/.test(part))depth++;else if(/^<\/(ol|ul)>/.test(part))depth--;
  else if(depth===1&&/^<li\b/.test(part)){out.push('');continue;}
  if(out.length&&depth)out[out.length-1]+=part;
 }
 return out;
}
// Rule 3 names each term in quotes; a span outside quotes there is a word used in passing, not the term defined.
const TERMS=new Map(points(RULE_TEXT[2].html).flatMap((li,i)=>{
 const term=li.match(/"<span>([^<]+)<\/span>"/);
 return term?[[stems(term[1]),{point:POINTS[i],def:plain(li).replace(/\s+/g,' ').trim()}]]:[];
}));
// Point letters in the source are sometimes Cyrillic look-alikes: «пунктом (а)».
const LATIN={а:'a',в:'b',с:'c',е:'e'};

export function bookList(query=''){
 const q=query.trim().toLocaleLowerCase('ru');
 const rows=ENTRIES.filter(e=>!q||`${e.key} ${e.title} ${e.text}`.toLocaleLowerCase('ru').includes(q));
 const row=(e,i)=>(e.kicker===rows[i-1]?.kicker?'':`<p class="rule-group">${esc(e.kicker)}</p>`)+
  `<button class="rule-row" data-do="rule" data-rule="${e.key}"><b>${e.mark}</b>${esc(e.title)}</button>`;
 return rows.map(row).join('')||'<p class="rule-none">Ничего не найдено.</p>';
}

function span(text,key){
 const term=key!=='3'&&TERMS.get(stems(text)),annex=text.match(/Приложени\S*\s+(IV|III|II|I)(?![A-Z])/);
 if(term)return `<button class="term" data-do="rule" data-rule="3" data-point="${term.point}" title="${esc(term.def)}">${text}</button>`;
 if(annex)return `<button class="xref" data-do="rule" data-rule="annex-${ANNEX[annex[1]]}">${text}</button>`;
 const own=text.match(/^пункт\S*\s+\(([a-zа-я])\).*(этого|настоящего) Правила/);
 if(own&&key!=='3')return `<button class="xref" data-do="rule" data-rule="${key}" data-point="${LATIN[own[1]]||own[1]}">${text}</button>`;
 return text;
}
// Numbers with their units stand out: they are what a watch officer has to remember.
const UNITS=/\d+(?:,\d+)?(?:\s(?:и|или|до)\s\d+(?:,\d+)?)?\s?(?:°|м(?![а-яё])|мил[а-яё]*|миль|с(?![а-яё])|мин[а-яё]*|кабельтов[а-яё]*)/g;
function typeset(html,key){
 const linked=html.replace(/<a href="#rule-(\d+)">([^<]*)<\/a>/g,'<button class="xref" data-do="rule" data-rule="$1">$2</button>')
  .replace(/<a [^>]*>|<\/a>/g,'').replace(/<span>([^<]*)<\/span>/g,(m,t)=>span(t,key));
 let depth=0,point=0;
 return linked.split(/(<[^>]*>)/).map(part=>{
  if(/^<(ol|ul)\b/.test(part)){if(!depth++)point=0;return part;}
  if(/^<\/(ol|ul)>/.test(part)){depth--;return part;}
  if(depth===1&&/^<li\b/.test(part))return `<li data-point="${POINTS[point++]}"${part.slice(3)}`;
  if(part.startsWith('<'))return part;
  return part.replace(UNITS,'<b class="num">$&</b>').replace(/«[^«»<]{1,90}»/g,'<q>$&</q>');
 }).join('');
}

// Review notes name rules as "24" or "24(a)", links as "annex-1". With pages behind it the rule offers a way back.
// Figures come from the caller by the rule's key, so the book stays plain text and imports no drawing.
export function ruleHtml(id,canGoBack=false,figures=()=>''){
 const key=/^annex-[1-4]$/.test(id)?id:String(parseInt(id)),at=ENTRIES.findIndex(x=>x.key===key),e=ENTRIES[at];
 if(!e)return '<p>Правило не найдено.</p>';
 const note=e.editorialNote?`<p class="rule-note">${esc(e.editorialNote)}</p>`:'';
 const nav=`<nav class="book-nav">${canGoBack?'<button data-do="book-back">← Назад</button>':''}<button data-do="book-index">Содержание</button></nav>`;
 const step=(n,arrow)=>n?`<button class="pager-${arrow}" data-do="rule" data-rule="${n.key}">${arrow==='prev'?'← ':''}${n.label}${arrow==='next'?' →':''}</button>`:'';
 return `${nav}<p class="eyebrow">${esc(e.kicker)}</p><h2>${e.label}. ${esc(e.title)}</h2>${note}${figures(key)}`+
  `<div class="rule-body">${typeset(e.html,key)}</div><nav class="rule-pager">${step(ENTRIES[at-1],'prev')}${step(ENTRIES[at+1],'next')}</nav>`;
}
