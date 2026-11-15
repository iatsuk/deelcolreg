import test from 'node:test';
import assert from 'node:assert/strict';
import {RULE_TEXT,ANNEX_TEXT} from '../src/rules-text.js';
import {bookList,ruleHtml} from '../src/freight-book.js';
import {figuresFor,lightsView,bearingView,RANGES} from '../src/freight-figures.js';
import {blasts} from '../src/freight-signals.js';

// The rule text goes into innerHTML and is quoted as the norm, so its shape and the recorded corrections are guarded here.
test('library complete and inert',()=>{
 assert.deepEqual(RULE_TEXT.map(r=>r.id),Array.from({length:41},(_,i)=>i+1));
 assert.equal(ANNEX_TEXT.length,4);
 assert.match(ANNEX_TEXT[0].title,/Расположение/);
 assert.match(ANNEX_TEXT[3].title,/бедствия/);
 for(const rule of [...RULE_TEXT,...ANNEX_TEXT]){
  assert.ok(rule.title&&rule.text.length>60&&rule.html.length>60);
  assert.doesNotMatch(rule.html,/<(?:script|iframe|img|style)|\bon\w+=|href=["']https?:|rulecomm/);
 }
 assert.match(ANNEX_TEXT[0].html,/a \+ 17ψ/);
 assert.match(ANNEX_TEXT[0].html,/<table/);
 assert.doesNotMatch(RULE_TEXT[15].text,/Последовательность небольших/,'комментарий источника не должен попасть в правило 16');
});
test('verified corrections survive imports',()=>{
 assert.match(RULE_TEXT.find(r=>r.id===31).text,/экраноплан/);
 assert.match(RULE_TEXT.find(r=>r.id===33).text,/20 м и более — колоколом/);
 assert.doesNotMatch(RULE_TEXT.find(r=>r.id===35).text,/другой эффективный звуковой сигнал через промежутки не менее/);
 assert.match(ANNEX_TEXT[0].text,/был не менее 27°/);
 assert.doesNotMatch(ANNEX_TEXT[2].text,/200 мм для судов длиной 12/);
 assert.match(ANNEX_TEXT[3].text,/SOS/);
 assert.doesNotMatch(RULE_TEXT.find(r=>r.id===26).html,/корзин|может выставлять:|может выставлять дополнительные/);
 assert.doesNotMatch(RULE_TEXT.find(r=>r.id===27).text,/Допускается использовать два красных/);
 assert.match(RULE_TEXT.find(r=>r.id===22).html,/объектах: <ul> <li>белый круговой огонь - 3 мили/);
 assert.doesNotMatch(ANNEX_TEXT[3].text,/Yes|Charly|EPIRB \(/);
});
test('rule boundaries stay separate',()=>{
 const responsibility=RULE_TEXT.find(r=>r.id===2),definitions=RULE_TEXT.find(r=>r.id===3);
 assert.match(responsibility.text,/ни капитана, ни экипаж/);
 assert.doesNotMatch(responsibility.html,/<h3>Общие определения/);
 assert.doesNotMatch(responsibility.text,/Термин "парусное судно"/);
 assert.match(definitions.text,/парусное судно/);
 assert.doesNotMatch(RULE_TEXT.find(r=>r.id===39).html,/<\.li>/);
});
test('book search finds text',()=>{
 const keys=html=>[...html.matchAll(/data-rule="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(keys(bookList()).length,45);
 assert.ok(keys(bookList('бедстви')).includes('annex-4'));
 assert.ok(keys(bookList('Обгон')).includes('13'));
 assert.match(bookList('нет такого слова'),/Ничего не найдено/);
});
test('rule shows section, note',()=>{
 assert.match(ruleHtml('31'),/Часть C · Огни и знаки.*Правило 31\..*class="rule-note"/s);
 assert.match(ruleHtml('24(a)'),/Правило 24\./);
 assert.match(ruleHtml('annex-1'),/Приложение 1\..*class="rule-note"/s);
 assert.doesNotMatch(ruleHtml('12'),/rule-note/);
 assert.match(ruleHtml('99'),/не найдено/);
});
test('book links rules together',()=>{
 const rule=ruleHtml('34',true);
 assert.match(rule,/data-do="book-back".*data-do="book-index"/s);
 assert.match(rule,/class="xref" data-do="rule" data-rule="9">Правилом 9/);
 assert.match(rule,/class="pager-prev" data-do="rule" data-rule="33".*class="pager-next" data-do="rule" data-rule="35"/s);
 assert.doesNotMatch(ruleHtml('34'),/book-back/);
 assert.match(ruleHtml('23'),/class="term" data-do="rule" data-rule="3" data-point="b" title="[^"]*механической установкой/);
 assert.match(ruleHtml('22'),/<b class="num">6 миль<\/b>/);
 assert.match(ruleHtml('22'),/data-rule="annex-1">пункте 8 Приложения I/);
 assert.match(ruleHtml('3'),/<li data-point="m">/);
 assert.match(bookList(),/class="rule-group">Часть A · Общие положения/);
});
test('typesetting keeps every word',()=>{
 const words=html=>html.replace(/<[^>]*>|\s/g,'');
 for(const e of [...RULE_TEXT.map(r=>[String(r.id),r]),...ANNEX_TEXT.map(a=>[a.id,a])]){
  const page=ruleHtml(e[0]),body=page.slice(page.indexOf('<div class="rule-body">')+23,page.lastIndexOf('</div><nav class="rule-pager">'));
  assert.equal(words(body),words(e[1].html.replace(/<a [^>]*>|<\/a>/g,'')),e[0]);
 }
});
test('figures follow light sectors',()=>{
 assert.match(lightsView('patrol',180),/кормовой.*13\(b\)/s);
 assert.match(lightsView('patrol',0),/бортовой красный, бортовой зелёный.*14\(b\)/s);
 assert.match(lightsView('tug',-150),/жёлтый буксировочный/);
 assert.doesNotMatch(lightsView('yacht',0),/14\(b\)/);
 assert.deepEqual(blasts('- -.'),[[0,5],[7,5],[13,1]]);
 assert.match(ruleHtml('21',false,figuresFor),/class="figure fig-lights".*class="rule-body"/s);
 assert.equal(figuresFor('12'),'');
 assert.deepEqual(blasts('.  -','morse'),[[0,.25],[1,.75]]);
 assert.match(figuresFor('27'),/fig-lights.*fig-day.*27\(d\).*27\(f\)/s);
 assert.match(figuresFor('annex-4'),/data-beat="morse".*fig-distress.*1\(k\)/s);
});
test('situation figures follow rules',()=>{
 assert.match(bearingView('15',40),/уступаете вы.*Правило 15/);
 assert.match(bearingView('17',-40),/17\(a\)\(i\)/);
 assert.match(bearingView('15',150),/Правило 13/);
 assert.match(bearingView('19',30),/поворота влево, если цель не обгоняемая \(19\(d\)\(i\)\)/);
 assert.doesNotMatch(bearingView('19',180),/вправо|влево \(/);
 assert.match(bearingView('17',-3),/Правило 14/);
 assert.match(bearingView('19',-120),/влево \(19\(d\)\(ii\)\)/);
 assert.match(lightsView('nuc',30),/красный круговой ×2, бортовой зелёный/);
 assert.match(lightsView('pilot',-30),/белый круговой, красный круговой, бортовой красный/);
 assert.match(figuresFor('27'),/27\(e\)\(ii\)/);
 assert.match(figuresFor('annex-2'),/2\(a\)\(iii\)/);
 assert.match(figuresFor('annex-3'),/data-hz="110"/);
 assert.doesNotMatch(figuresFor('annex-3'),/fig-lamp/);
 assert.match(figuresFor('annex-1'),/2\(a\)\(ii\)/);
});
test('visibility figure matches Rule 22',()=>{
 const text=RULE_TEXT.find(r=>r.id===22).text,mile=n=>n===1?'1 мили':n<5?`${n} мили`:`${n} миль`;
 const say=['топовый огонь','бортовой огонь','кормовой огонь','буксировочный огонь','белый, красный, зелёный или жёлтый круговой огонь'];
 for(const [i,band] of [[0,0],[1,1],[3,2]]){
  const point=text.split(/На судах длиной|На малозаметных/)[band+1];
  RANGES[i][1].forEach((m,k)=>assert.ok(point.includes(`${say[k]} - ${mile(m)}`),`${RANGES[i][0]}: ${say[k]}`));
 }
 assert.match(text,/если длина судна менее 20 м - 3 мили/);
 assert.deepEqual(RANGES[2][1].slice(1),RANGES[1][1].slice(1));
 const annex=ANNEX_TEXT[0].text;
 for(const fact of ['не менее 6 м над корпусом','более 12 м над корпусом','на 4.5 м выше','не менее половины длины судна','превышало 100 м','четверти длины судна'])assert.ok(annex.includes(fact),fact);
 assert.equal(RANGES[2][1][0],3);
});
