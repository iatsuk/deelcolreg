// Prose checks for the failures models repeat: quiet pseudo-literary voice, telegraphed answers, grey rhythm.
// Patterns are heuristics; a hit is a reason to reread, not a verdict.
const TICS=[
 [/делает вид|сделал[аи]? вид/gi,'жест вместо события'],
 [/на секунду|на мгновение|на миг/gi,'пауза ради паузы'],
 [/замира|застыва/gi,'пауза ради паузы'],
 [/впервые за/gi,'«впервые за…» — готовая концовка'],
 [/всё-таки|наконец(?! -то)/gi,'вздох автора'],
 [/молча\b/gi,'многозначительное молчание'],
 [/будто|словно|как будто/gi,'сравнение вместо факта'],
 [/\bхотя\b/gi,'намёк на подтекст'],
 [/не столько .{3,30} сколько/gi,'конструкция «не столько — сколько»'],
 [/(?:^|[.!?] )(?:Это|Здесь) не [^.]{3,40}, а /g,'конструкция «это не X, а Y»'],
 [/едва заметн|чуть заметн|еле заметн/gi,'едва заметное'],
 [/что-то (?:в|внутри|меняется)/gi,'неопределённое «что-то»'],
 [/тишин[аеуы]/gi,'тишина как приём'],
];
const TELL=/осторожн|безопасн|внимательн|надлежащ|благоразумн|ответственн|своевременн|заблаговременн/i;
const words=s=>(s.match(/[А-Яа-яЁё-]+/g)||[]).length;
const sentences=s=>s.split(/(?<=[.!?…])\s+/).filter(Boolean);
const collect=q=>Object.entries(q.locations).flatMap(([id,l])=>[...(l.text||[]).map(p=>({id,text:p.text})),...(l.choices||[]).filter(c=>c.say).map(c=>({id,text:c.say}))]);

export function lint(raw){
 const parts=collect(raw),text=parts.map(p=>p.text).join('\n'),issues=[];
 const total=words(text);
 const tics=new Map();
 for(const p of parts)for(const [re,why] of TICS)for(const m of p.text.matchAll(re)){
  const e=tics.get(why)||{why,count:0,where:[]};e.count++;if(e.where.length<4)e.where.push(`${p.id}: …${p.text.slice(Math.max(0,m.index-18),m.index+26)}…`);tics.set(why,e);
 }
 for(const e of tics.values()){if(e.count*1000/Math.max(total,1)>1||e.count>=4)issues.push({kind:'тик',...e});}
 const lens=parts.flatMap(p=>sentences(p.text).map(words)).filter(Boolean);
 const avg=lens.reduce((a,b)=>a+b,0)/Math.max(lens.length,1),sd=Math.sqrt(lens.reduce((a,b)=>a+(b-avg)**2,0)/Math.max(lens.length,1));
 if(lens.length>20&&sd<avg*.45)issues.push({kind:'ритм',why:`предложения одной длины: ${avg.toFixed(1)}±${sd.toFixed(1)} слова`,count:lens.length,where:[]});
 const tells=[];let longerRight=0,graded=0;
 for(const [id,l] of Object.entries(raw.locations)){
  const list=l.choices||[],good=list.filter(c=>c.tags.some(t=>t.startsWith('good'))),bad=list.filter(c=>c.tags.some(t=>t.startsWith('trap:')));
  for(const c of list)if(TELL.test(c.text))tells.push(`${id}: ${c.text.slice(0,60)}`);
  if(good.length&&bad.length){graded++;if(Math.min(...good.map(c=>c.text.length))>Math.max(...bad.map(c=>c.text.length)))longerRight++;}
 }
 if(tells.length)issues.push({kind:'подсказка',why:'оценочное слово в тексте выбора выдаёт ответ',count:tells.length,where:tells.slice(0,6)});
 if(graded&&longerRight/graded>.34)issues.push({kind:'подсказка',why:`верный вариант длиннее ловушки в ${longerRight} из ${graded} развилок`,count:longerRight,where:[]});
 const stats={words:total,avgSentence:+avg.toFixed(1),sdSentence:+sd.toFixed(1)};
 return {stats,issues};
}
