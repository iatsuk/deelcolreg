// Signals the rule book plays or shows: whistle and light patterns, day shapes, distress signals. Pure HTML and SVG.

// Whistle and flash timing from Rule 32 and Rule 34(b): a short blast about 1 s, a prolonged one 5 s (4 to 6 s), about 1 s between.
// Morse for SOS keeps its own beat: a dash is three dots. A space adds one more pause, as in the 2 s gap of Rule 35(b).
const BEATS={whistle:[1,5,1],morse:[.25,.75,.25]};
export function blasts(pattern,beat='whistle'){
 const [short,long,gap]=BEATS[beat],out=[];let t=0;
 for(const ch of pattern){if(ch===' '){t+=gap;continue;}const len=ch==='-'?long:short;out.push([t,len]);t+=len+gap;}
 return out;
}
const SIGNALS={
 32:[['.','Короткий звук: около 1 с','32(b)'],['-','Продолжительный звук: от 4 до 6 с','32(c)']],
 34:[['.','Изменяю курс вправо','34(a)'],['..','Изменяю курс влево','34(a)'],['...','Мои движители работают на задний ход','34(a)'],
  ['.','Один проблеск: вправо','34(b)','light'],['..','Два проблеска: влево','34(b)','light'],['...','Три проблеска: задний ход','34(b)','light'],
  ['--.','Намерен обогнать вас по правому борту','34(c)(i)'],['--..','Намерен обогнать вас по левому борту','34(c)(i)'],
  ['-.-.','Согласен на обгон','34(c)(ii)'],['.....','Не понимаю ваших намерений, не меньше пяти коротких','34(d)'],['-','Подхожу к изгибу, где меня могут не видеть','34(e)']],
 35:[['-','С механическим двигателем, имеет ход относительно воды','35(a)'],['- -','На ходу, но остановилось и хода не имеет','35(b)'],
  ['-..','Лишённое возможности управляться, ограниченное в манёвре, стеснённое осадкой, парусное, ловит рыбу, буксирует или толкает','35(c)'],
  ['-...','Буксируемое, с командой на борту','35(e)'],['.-.','На якоре, дополнительно к колоколу','35(g)'],['....','Лоцманское судно на работе, опознавательный','35(k)']],
// Annex III, 1(b): the fundamental frequency by length. Each button plays a whistle inside its band.
 'annex-3':[['-','200 м и более: 70–200 Гц','1(b)(i)','sound','whistle',110],['-','75–200 м: 130–350 Гц','1(b)(ii)','sound','whistle',220],
  ['-','Менее 75 м: 250–700 Гц','1(b)(iii)','sound','whistle',440]],
 'annex-4':[['...  ---  ...','SOS звуком','1(d)','sound','morse'],['...  ---  ...','SOS светом','1(d)','light','morse']],
};
function soundFigure(rows){
 const bars=p=>[...p].map(ch=>ch===' '?'<i class="b-gap"></i>':`<i class="b-${ch==='-'?'long':'short'}"></i>`).join('');
 const lamp=rows.some(r=>r[3]==='light')?'<span class="fig-lamp" aria-hidden="true"></span>':'';
 return `<figure class="figure fig-sound"><p class="fig-title">Нажмите сигнал, чтобы услышать${lamp?' или увидеть':''} его</p>${lamp}<ul class="signals">`+
  rows.map(([p,say,point,kind='sound',beat='whistle',hz=196])=>`<li><button class="signal" data-do="signal" data-pattern="${p}" data-kind="${kind}" data-beat="${beat}" data-hz="${hz}">`+
   `<span class="blasts ${kind} ${beat}">${bars(p)}</span><span>${say}</span><small>${point}</small></button></li>`).join('')+'</ul></figure>';
}

// Shapes in the order the mast panel numbers them: ball, cone apex up, cone apex down, diamond, cylinder, basket.
const SHAPE=['','<circle cx="12" cy="12" r="9"/>','<path d="M12 3 21 21H3z"/>','<path d="M12 21 21 3H3z"/>','<path d="M12 2 21 12 12 22 3 12z"/>',
 '<rect x="6" y="3" width="12" height="18"/>','<path d="M3 8h18l-3 13H6zM7 8c0-7 10-7 10 0" fill="none" stroke="currentColor" stroke-width="2"/>'];
export const shapeSvg=k=>k?`<svg viewBox="0 0 24 24" aria-hidden="true">${SHAPE[k]}</svg>`:'';
const [BALL,UP,DOWN,DIAMOND,CYLINDER]=[1,2,3,4,5];
// Each sign is a row of hoists, each hoist read from the top; 0 leaves a place empty.
const DAY={
 24:[[[[DIAMOND]],'Длина буксира больше 200 м: на буксирующем и на буксируемом','24(a)(v), 24(e)(iii)']],
 25:[[[[DOWN]],'Идёт под парусом и одновременно работает двигателем','25(e)']],
 26:[[[[DOWN,UP]],'Занято ловом рыбы: два конуса вершинами вместе','26(b)(i), 26(c)(i)'],[[[UP]],'Снасти уходят дальше 150 м по горизонтали: конус вершиной вверх в их сторону','26(c)(ii)']],
 27:[[[[BALL,BALL]],'Лишено возможности управляться','27(a)(ii)'],[[[BALL,DIAMOND,BALL]],'Ограничено в возможности маневрировать','27(b)(ii)'],
  [[[0,0,BALL,BALL],[BALL,DIAMOND,BALL],[0,0,DIAMOND,DIAMOND]],'Дноуглубление с препятствием: шары со стороны препятствия, ромбы со стороны прохода','27(d)'],
  ['<svg viewBox="0 0 44 34" width="44" height="34" aria-hidden="true"><path d="M6 1v33" class="halyard"/><path d="M7 3h15v18H7z" class="flag-white"/><path d="M22 3h19l-8 9 8 9H22z"/></svg>',
   'Малое судно на водолазных работах: жёсткий флаг «A» высотой не менее 1 м','27(e)(ii)'],
  [[[0,BALL],[BALL],[0,BALL]],'Устранение минной опасности: у топа фок-мачты и на ноках фока-рея','27(f)']],
 28:[[[[CYLINDER]],'Стеснено своей осадкой','28']],
 30:[[[[BALL]],'На якоре: в носовой части','30(a)(i)'],[[[BALL,BALL,BALL]],'На мели','30(d)(ii)']],
};
function hoists(cols){
 if(typeof cols==='string')return cols;
 const tall=Math.max(...cols.map(c=>c.length)),w=cols.length*30,h=tall*26+8;
 const marks=cols.map((col,i)=>`<path d="M${i*30+15} 0V${h}" class="halyard"/>`+
  col.map((k,j)=>k?`<g transform="translate(${i*30+4} ${j*26+4}) scale(.92)">${SHAPE[k]}</g>`:'').join('')).join('');
 return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">${marks}</svg>`;
}
const dayFigure=rows=>'<figure class="figure fig-day"><p class="fig-title">Знаки днём</p><ul class="day-signs">'+
 rows.map(([cols,say,point])=>`<li><span class="day-sky">${hoists(cols)}</span><span>${say}</span><small>${point}</small></li>`).join('')+'</ul></figure>';

// Annex IV, 1: the signals one can see or hear, drawn as icons; SOS plays in the signal list above them. Red stars and flares are lights.
const DISTRESS=[
 ['<path d="M4 31l17-8 2 4-17 8zM26 7l2 5M36 9l-4 4M38 19h-6M25 17l3 2"/><circle cx="9" cy="34" r="3"/>','Выстрелы или взрывы примерно раз в минуту','1(a)'],
 ['<path d="M5 16h7l13-8v24l-13-8H5zM30 13q4 7 0 14M34 9q7 11 0 22"/>','Непрерывный звук туманного сигнала','1(b)'],
 ['<path d="M8 36L22 14"/><g class="lamp-r" stroke="none"><circle cx="24" cy="10" r="2.6"/><circle cx="31" cy="6" r="2.2"/><circle cx="31" cy="15" r="2"/></g>',
  'Ракеты или гранаты с красными звёздами, по одной через короткие промежутки','1(c)'],
 ['<path d="M4 7h32v19H18l-8 7v-7H4z"/><text x="20" y="20" text-anchor="middle">MAYDAY</text>','Слово «МЭЙДЭЙ» по радиотелефону','1(e)'],
 ['<path d="M3 10h15v15H3zM22 10h15v15H22z"/>'+
  '<path d="M3 10h4v4H3zM11 10h4v4h-4zM7 14h4v4H7zM15 14h3v4h-3zM3 18h4v4H3zM11 18h4v4h-4zM7 22h4v3H7zM15 22h3v3h-3zM22 10h15v3H22zM22 16h15v3H22zM22 22h15v3H22z" class="ink"/>',
  'Флаги N и C по Международному своду сигналов','1(f)'],
 ['<path d="M8 3v35"/><circle cx="17" cy="9" r="4.5" class="ink"/><path d="M10 17h18v15H10z" class="ink"/>','Квадратный флаг с шаром над ним или под ним','1(g)'],
 ['<path d="M12 25h16v12H12zM20 4c5 6 8 10 6 16-1 3-11 3-12 0-2-5 2-8 6-16z"/>','Пламя на судне, например горящая бочка','1(h)'],
 ['<path d="M8 14q12-14 24 0zM8 14l12 12M32 14l-12 12M20 14v12"/><circle class="lamp-r" stroke="none" cx="20" cy="29" r="3.5"/>','Ракета с парашютом или фальшфейер красного огня','1(i)'],
 ['<path d="M16 37h8v-8h-8z"/><circle cx="20" cy="21" r="5"/><circle cx="26" cy="13" r="5"/><circle cx="18" cy="7" r="4"/>','Клубы оранжевого дыма','1(j)'],
 ['<circle cx="20" cy="8" r="3.5"/><path d="M20 12v13l-5 11M20 25l5 11M5 17l15-2 15 2M5 8l-2 3h4zM35 8l-2 3h4zM5 26l-2-3h4zM35 26l-2-3h4z"/>',
  'Медленно поднимать и опускать руки, вытянутые в стороны','1(k)'],
 ['<path d="M20 37V14M14 37h12M13 10q7-7 14 0M8 6q12-11 24 0"/><circle cx="20" cy="14" r="2"/>','ЦИВ, спутниковая связь, аварийные радиобуи и ответчики','1(l)–(o)'],
];
const distressFigure='<figure class="figure fig-distress"><p class="fig-title">Сигналы бедствия</p><ul class="distress">'+
 DISTRESS.map(([icon,say,point])=>`<li><svg viewBox="0 0 40 40" aria-hidden="true">${icon}</svg><span>${say}</span><small>${point}</small></li>`).join('')+'</ul></figure>';


// The signal figures of a rule, by its key in the book ('34', 'annex-4').
// Annex II: lights a fishing vessel may add beside her Rule 26 pair when fishing near others. Purse seiners flash yellow in turn.
const LAMP=(c,x,y,cls='')=>`<g class="lamp lamp-${c} ${cls}"><circle cx="${x}" cy="${y}" r="9" class="halo"/><circle cx="${x}" cy="${y}" r="3"/></g>`;
const NEAR=[[['g','w'],['w','w'],'Тралит и вымётывает снасти','2(a)(i)'],[['g','w'],['w','r'],'Тралит и выбирает снасти','2(a)(ii)'],
 [['g','w'],['r','r'],'Трал зацепился за препятствие','2(a)(iii)'],[['r','w'],['y','y'],'Кошельковый невод: жёлтые попеременно, раз в секунду','3']];
const nearFigure='<figure class="figure fig-near"><p class="fig-title">Огни Правила 26 и рядом, ниже, дополнительные</p><ul class="near">'+
 NEAR.map(([main,extra,say,point])=>`<li><svg viewBox="0 0 64 70" aria-hidden="true"><rect width="64" height="70" class="sky"/>${LAMP(main[0],18,14)}${LAMP(main[1],18,30)}`+
  `${LAMP(extra[0],46,40,extra[0]==='y'?'blink':'')}${LAMP(extra[1],46,56,extra[1]==='y'?'blink late':'')}</svg><span>${say}</span><small>${point}</small></li>`).join('')+'</ul></figure>';

export function signalFiguresFor(key){
 return [DAY[key]&&dayFigure(DAY[key]),SIGNALS[key]&&soundFigure(SIGNALS[key]),key==='annex-4'&&distressFigure,key==='annex-2'&&nearFigure].filter(Boolean).join('');
}
