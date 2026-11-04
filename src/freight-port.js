import {PORTS,UPGRADES,edgeBetween,neighbours,forSale,owned,hirable,mate,haggle} from './freight-world.js';

// The port panel as plain HTML: orders, courses, the shop and what the boat carries. No DOM here, so tests can read it.
export const esc=s=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]);
const short=(w,price)=>w.money<price?`Не хватает ${price-w.money}. `:'';
const course=n=>`<button class="course" data-do="course" data-to="${n.to}"><strong>${esc(PORTS[n.to].name)}</strong><span>${esc(n.edge.name)} · встреч ${n.edge.legs}</span></button>`;
const row=(w,action,id,title,price,about)=>`<button class="course" data-do="${action}" data-id="${id}" ${w.money<price?'disabled':''}>`+
 `<strong>${esc(title)} · ${price}</strong><span>${esc(short(w,price)+about)}</span></button>`;

export function card(label,title,brief,meta,attrs){
 return `<button class="contract" ${attrs}><span class="eyebrow">${esc(label)}</span><strong>${esc(title)}</strong><span>${esc(brief)}</span><em>${esc(meta)}</em></button>`;
}
function contract(x,endings){
 const found=Object.keys(endings).filter(k=>k.startsWith(`${x.raw.id}:`)).length,all=Object.values(x.raw.locations).filter(l=>l.end).length;
 return card('Большой контракт',x.raw.title,x.raw.brief,found?`Финалов найдено: ${found} из ${all}`:'Около 15 минут',`data-do="quest" data-id="${x.raw.id}"`);
}
function errand(w,bundle,o,i){
 const e=bundle.errands[o.errand],pay=e.pay+haggle(w,e.pay);
 return card(`Поручение ${o.toName}`,e.title,e.brief,`${pay} монет · 3–5 минут · ${edgeBetween(o.from,o.to).name}`,`data-do="offer" data-i="${i}"`);
}
function shop(w){
 const items=forSale(w,w.port).map(u=>row(w,'buy',u.id,u.name,u.price,u.about));
 return items.length?`<section><h2>Для судна</h2><div class="courses">${items.join('')}</div></section>`:'';
}
function watch(w){
 const items=hirable(w,w.port).map(c=>row(w,'hire',c.id,c.name,c.price,c.about));
 const head='<h2>На вахту</h2><p>Вахтенный стоит в рубке вместо Вени и говорит своё. Верить ему или нет, решаете вы.</p>';
 return items.length?`<section>${head}<div class="courses">${items.join('')}</div></section>`:'';
}
function work(store,bundle,quests){
 const w=store.world,live=store.active;
 if(live){
  const go=card('Продолжить',live.title,'Судно ждёт вас там, где вы его оставили.','','data-do="resume"');
  return `<section><h2>Рейс не закончен</h2>${go}<button class="ghost wide" data-do="abandon">Бросить рейс</button></section>`;
 }
 const orders=[...quests.filter(x=>x.raw.route?.[0]===w.port).map(x=>contract(x,store.endings)),...w.offers[w.port].map((o,i)=>errand(w,bundle,o,i))];
 const courses=neighbours(w.port).map(course).join('');
 return `<section><h2>Заказы</h2>${orders.join('')}</section><section><h2>Куда идти</h2><div class="courses">${courses}</div></section>${shop(w)}${watch(w)}`;
}
function debtList(debts){
 const item=([rule,list])=>`<li><button class="rule-link" data-do="rule" data-rule="${esc(rule)}">Правило ${esc(rule)}</button><span>${esc(list[0])}</span></li>`;
 const head='<h2>Хвосты перед инспектором</h2><p>На этих правилах вы уже попались. В море они будут встречаться чаще.</p>';
 return `<section class="debts">${head}<ul>${debts.slice(0,5).map(item).join('')}</ul></section>`;
}
export function portPanel(store,bundle,quests){
 const w=store.world,port=PORTS[w.port],news=w.news[w.port]||[];
 const debts=Object.entries(store.debts).sort((a,b)=>b[1].length-a[1].length);
 const aboard=[...Object.keys(UPGRADES).filter(id=>owned(w,id)).map(id=>UPGRADES[id].name),...(mate(w)?[`на вахте ${mate(w).name}`]:[])];
 return [
  `<header class="brand"><span class="eyebrow">Ночной фрахт · прототип</span><h1>${esc(port.name)}</h1><p>${esc(port.blurb)}</p></header>`,
  `<p class="purse"><span>Касса</span><strong>${w.money}</strong></p>`,
  news.length?`<section class="news"><h2>Что говорят</h2>${news.map(t=>`<p>${esc(t)}</p>`).join('')}</section>`:'',
  work(store,bundle,quests),
  aboard.length?`<section class="fitted"><h2>На судне</h2><p>${aboard.map(esc).join(' · ')}</p></section>`:'',
  debts.length?debtList(debts):'',
  '<button class="reset" data-do="reset-ask">Начать заново</button>',
 ].join('');
}
