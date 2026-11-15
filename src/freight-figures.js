import {silhouette} from './freight-sea.js';
import {signalFiguresFor} from './freight-signals.js';

// Figures beside the rule text: a vessel's lights from any bearing, situations by bearing, schemes; signals come from freight-signals.js.
// Lights come from the same Rule 21 sectors as the wheelhouse view; the sea's extra dredger pairs of Rule 27(d) are not drawn here.
const LIGHTS={13:['patrol'],14:['patrol'],21:['patrol'],23:['patrol'],24:['tug','barge'],25:['yacht'],26:['trawler','fisher'],27:['dredger','nuc'],
 28:['cbd'],29:['pilot'],30:['aground']};
const FROM={13:150,14:0};
const VESSEL={patrol:'Судно с механическим двигателем менее 50 м',tug:'Буксирующее, длина буксира более 200 м',barge:'Буксируемое судно',
 yacht:'Парусное судно',trawler:'Траулер менее 50 м, имеет ход',fisher:'Ловит рыбу не тралом, имеет ход',cbd:'Стеснённое осадкой, 50 м и более',
 dredger:'Ограниченное в возможности маневрировать, хода не имеет',nuc:'Лишённое возможности управляться, имеет ход',
 pilot:'Лоцманское судно при исполнении обязанностей, на ходу',aground:'Судно на мели, 50 м и более'};
const COLOUR={w:'белый',r:'красный',g:'зелёный',y:'жёлтый'};
const ARC={mast:'топовый',port:'бортовой красный',stbd:'бортовой зелёный',stern:'кормовой'};
// Rule 14 speaks of two power-driven vessels, so its hint is shown for them only.
const POWERED=['patrol','tug','cbd'];
const RINGS=['mastw','portr','stbdg','sternw','sterny'];
const lightName=l=>l.arc==='all'?`${COLOUR[l.c]} круговой`:l.arc==='stern'&&l.c==='y'?'жёлтый буксировочный':ARC[l.arc];
const bearing=a=>a===0?'прямо по носу':Math.abs(a)===180?'прямо по корме':`${Math.abs(a)}° ${a>0?'правого':'левого'} борта`;
const at=(r,a,c=75)=>[c+r*Math.sin(a*Math.PI/180),c-r*Math.cos(a*Math.PI/180)].map(v=>v.toFixed(1)).join(' ');

function nightView(type,aspect){
 const views=[0,90,180,-90].map(a=>silhouette(type,a));
 const half=Math.max(...views.map(v=>v.half)),top=Math.max(...views.flatMap(v=>v.lights.map(l=>l.h)),views[0].deck);
 const u=Math.min(120/half,96/top),sil=silhouette(type,aspect),w=sil.half*u,sea=126;
 const lamps=sil.lights.map(l=>{const x=(150+l.x*u).toFixed(1),y=(sea-l.h*u).toFixed(1);
  return `<g class="lamp lamp-${l.c}"><circle cx="${x}" cy="${y}" r="11" class="halo"/><circle cx="${x}" cy="${y}" r="3.2"/></g>`;}).join('');
 return `<svg class="fig-night" viewBox="0 0 300 150" role="img" aria-label="Вид на судно ночью"><rect width="300" height="150" class="sky"/>`+
  `<path d="M0 ${sea}H300" class="horizon"/><path d="M${150-w} ${sea}v${-sil.deck*u}h${2*w}v${sil.deck*u}z" class="hull"/>${lamps}</svg>`;
}
// The compass is sampled from the sectors themselves rather than drawn from the numbers in Rule 21.
function compass(type,aspect){
 const runs={};
 for(let a=-180;a<=180;a+=.5)for(const l of silhouette(type,a).lights){
  if(l.arc==='all')continue;
  const run=(runs[l.arc+l.c]||=[]),last=run[run.length-1];
  if(last&&last[1]===a-.5)last[1]=a;else run.push([a,a]);
 }
 const eye=at(70,aspect),arcs=RINGS.filter(k=>runs[k]).map((k,i)=>{const r=64-i*7;
  return runs[k].map(([a,b])=>`<path class="ring ring-${k.slice(-1)}" d="M${at(r,a)}A${r} ${r} 0 ${b-a>180?1:0} 1 ${at(r,b)}"/>`).join('');}).join('');
 return `<svg class="fig-compass" viewBox="0 0 150 150" aria-hidden="true"><circle cx="75" cy="75" r="70" class="dial"/>${arcs}`+
  `<path d="M75 52c6 6 7 14 7 22v24h-14v-24c0-8 1-16 7-22z" class="deck"/><path d="M75 75L${eye}" class="sight"/>`+
  `<circle cx="${eye.replace(' ','" cy="')}" r="4.5" class="eye"/></svg>`;
}
export function lightsView(type,aspect){
 const lights=silhouette(type,aspect).lights,count={};
 for(const l of lights)count[lightName(l)]=(count[lightName(l)]||0)+1;
 const seen=Object.entries(count).map(([n,k])=>k>1?`${n} ×${k}`:n).join(', ')||'ничего';
 const arcs=new Set(lights.map(l=>l.arc)),sides=silhouette(type,90).lights.some(l=>l.arc==='stbd');
 const hint=!sides?'':POWERED.includes(type)&&arcs.has('port')&&arcs.has('stbd')?' Видны оба бортовых: судно прямо или почти прямо по носу, как в Правиле 14(b).'
  :arcs.has('stern')&&!arcs.has('port')&&!arcs.has('stbd')?' Бортовых не видно, виден кормовой: это сектор обгона из Правила 13(b).':'';
 return `${nightView(type,aspect)}${compass(type,aspect)}<p class="fig-caption">Вы на курсовом угле <b>${bearing(aspect)}</b> этого судна. Видно: ${seen}.${hint}</p>`;
}
function lightsFigure(types,aspect){
 const options=types.map(t=>`<option value="${t}">${VESSEL[t]}</option>`).join('');
 const pick=types.length>1?`<select class="fig-vessel" aria-label="Судно">${options}</select>`:`<p class="fig-title">${VESSEL[types[0]]}</p>`;
 return `<figure class="figure fig-lights" data-vessel="${types[0]}">${pick}<div class="fig-view">${lightsView(types[0],aspect)}</div>`+
  `<input class="fig-aspect" type="range" min="-180" max="180" step="1" value="${aspect}" aria-label="Курсовой угол, под которым вы видите судно"></figure>`;
}

const TSS='<figure class="figure fig-scheme"><svg viewBox="0 0 320 190" role="img" aria-label="Схема системы разделения движения">'+
 '<defs><marker id="tss-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" class="arrow"/></marker></defs>'+
 '<rect x="0" y="66" width="320" height="22" class="zone"/><path d="M0 18H320M0 136H320" class="edge"/><path d="M0 150H320" class="edge dashed"/>'+
 '<path d="M250 42H70" class="flow" marker-end="url(#tss-arrow)"/><path d="M70 112H250" class="flow" marker-end="url(#tss-arrow)"/>'+
 '<path d="M276 178V8" class="track" marker-end="url(#tss-arrow)"/><path d="M8 132Q40 124 64 116" class="track" marker-end="url(#tss-arrow)"/>'+
 '<text x="6" y="34">полоса движения</text><text x="6" y="82">зона разделения</text><text x="6" y="104">полоса движения</text>'+
 '<text x="6" y="168">зона прибрежного плавания · 10(d)</text><text x="268" y="56" text-anchor="end">пересечение под прямым</text><text x="268" y="68" text-anchor="end">углом к потоку · 10(c)</text>'+
 '<text x="64" y="128">вход под малым углом · 10(b)</text></svg></figure>';

// Who acts, by where the other vessel is: Rule 15 and 17 for two power-driven vessels crossing, Rule 19(d) for a radar contact in fog.
// Overtaking starts more than 22.5° abaft the beam (Rule 13(b)); the beam is 90°.
const SITUATION={
 crossing:b=>Math.abs(b)>112.5?'Оно больше чем на 22,5° позади траверза: если оно вас догоняет, это обгон, и дорогу уступает оно (Правило 13).'
  :Math.abs(b)<=6?'Почти прямо по носу: если курсы встречные или почти встречные, обе стороны отворачивают вправо (Правило 14); в сомнении считайте, что это так (14(c)).'
  :b>0?'Оно у вас справа: дорогу уступаете вы и, если позволяют обстоятельства, не пересекаете его курс по носу (Правило 15).'
  :'Оно у вас слева: дорогу уступает оно, вы сохраняете курс и скорость (Правило 17(a)(i)). Если же вы его обгоняете, уступаете вы (Правило 13).',
 radar:b=>{
  const avoid='Если развивается чрезмерное сближение и вы меняете курс, по возможности избегайте поворота';
  return Math.abs(b)<90?`Цель впереди траверза. ${avoid} влево, если цель не обгоняемая (19(d)(i)). Если чрезмерного сближения не избежать, сбавьте ход до минимального (19(e)).`
   :`Цель на траверзе или позади него. ${avoid} в её сторону${Math.abs(b)===180?'':`, то есть ${b>0?'вправо':'влево'}`} (19(d)(ii)).`;
 },
};
const CROSSING='Два судна с механическим двигателем, курсы пересекаются, есть опасность столкновения';
const BEARING={15:['crossing',40,CROSSING],17:['crossing',-40,CROSSING],19:['radar',-30,'Судно обнаружено только радаром, ограниченная видимость']};
export function bearingView(key,b){
 const [kind]=BEARING[key],eye=at(64,b);
 const zones=kind==='crossing'?`<path d="M75 75L${at(70,0)}A70 70 0 0 1 ${at(70,112.5)}z" class="zone"/>`:`<path d="M75 75L${at(70,-90)}A70 70 0 0 1 ${at(70,90)}z" class="zone"/>`;
 return `<svg class="fig-compass" viewBox="0 0 150 150" aria-hidden="true"><circle cx="75" cy="75" r="70" class="dial"/>${zones}<path d="M5 75H145" class="beam"/>`+
  `<path d="M75 52c6 6 7 14 7 22v24h-14v-24c0-8 1-16 7-22z" class="deck"/><path d="M75 75L${eye}" class="sight"/>`+
  `<circle cx="${eye.replace(' ','" cy="')}" r="6" class="eye"/></svg><p class="fig-caption">Курсовой угол <b>${bearing(b)}</b>. ${SITUATION[kind](b)}</p>`;
}
const bearingFigure=key=>`<figure class="figure fig-bearing" data-rule="${key}"><p class="fig-title">${BEARING[key][2]}</p>`+
 `<div class="fig-view">${bearingView(key,BEARING[key][1])}</div><input class="fig-turn" type="range" min="-180" max="180" step="1" value="${BEARING[key][1]}"`+
 ' aria-label="Курсовой угол другого судна"></figure>';

// Rule 18 read from the top: each vessel keeps out of the way of those above it. The drafts of Rule 18(d) stand aside.
const LADDER='<figure class="figure fig-ladder"><p class="fig-title">Кто кому уступает на ходу, если Правила 9, 10 и 13 не требуют иного</p><ol class="ladder">'+
 ['Лишённое возможности управляться · ограниченное в возможности маневрировать','Занятое ловом рыбы: уступает тем, кто выше, по возможности · 18(c)',
  'Парусное: уступает всем, кто выше · 18(b)','С механическим двигателем: уступает всем, кто выше · 18(a)'].map(r=>`<li>${r}</li>`).join('')+
 '</ol><p class="fig-caption">Проход стеснённого осадкой с сигналами Правила 28 не затрудняет, если позволяют обстоятельства, любое судно,'+
 ' кроме лишённого возможности управляться и ограниченного в возможности маневрировать (18(d)(i)).</p></figure>';

// Rule 22 in miles, by length; the test reads the same numbers back from the rule text.
export const RANGES=[['50 м и более',[6,3,3,3,3]],['20–50 м',[5,2,2,2,2]],['12–20 м',[3,2,2,2,2]],['менее 12 м',[2,1,2,2,2]]];
const RANGE_LIGHTS=['топовый','бортовой','кормовой','буксировочный','круговой'];
const RANGES_FIGURE='<figure class="figure fig-ranges"><p class="fig-title">Наименьшая дальность видимости, мили</p><div class="ranges">'+
 RANGES.map(([band,miles])=>`<div class="range-band"><b>${band}</b>`+miles.map((m,i)=>`<span>${RANGE_LIGHTS[i]}</span><i style="--miles:${m}"><em>${m}</em></i>`).join('')+
 '</div>').join('')+'</div></figure>';

// Annex I in elevation: the two masthead lights of a power-driven vessel of 20 m or more; the test reads the numbers from the annex.
const MASTHEADS='<figure class="figure fig-scheme"><svg viewBox="0 0 320 170" role="img" aria-label="Топовые огни на судне 20 м и более">'+
 '<path d="M14 132h292l-14 22H30z" class="hull"/><path d="M84 132V62M222 132V34" class="edge"/>'+
 '<g class="lamp lamp-w"><circle cx="84" cy="62" r="8" class="halo"/><circle cx="84" cy="62" r="3"/><circle cx="222" cy="34" r="8" class="halo"/><circle cx="222" cy="34" r="3"/></g>'+
 '<path d="M70 132V62M240 62V34M84 14H222" class="dim"/><path d="M14 162H84" class="dim"/>'+
 '<text x="92" y="84">≥ 6 м и ≥ ширины,</text><text x="92" y="96">но не выше 12 м</text>'+
 '<text x="246" y="50">≥ 4,5 м выше</text><text x="153" y="10" text-anchor="middle">≥ половины длины, ≤ 100 м · 3(a)</text>'+
 '<text x="88" y="168">≤ ¼ длины от форштевня · 3(a)</text><text x="92" y="108">2(a)(i)</text><text x="246" y="62">2(a)(ii)</text></svg></figure>';

// One entry point for the book: the figures that belong to a rule, by its key in the book ('13', 'annex-1').
export function figuresFor(key){
 return [LIGHTS[key]&&lightsFigure(LIGHTS[key],FROM[key]??35),BEARING[key]&&bearingFigure(key),key==='18'&&LADDER,key==='22'&&RANGES_FIGURE,key==='10'&&TSS,key==='annex-1'&&MASTHEADS]
  .filter(Boolean).join('')+signalFiguresFor(key);
}
