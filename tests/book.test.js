import test from 'node:test';
import assert from 'node:assert/strict';
import {RULE_TEXT,ANNEX_TEXT} from '../src/rules-text.js';
import {bookList,ruleHtml} from '../src/freight-book.js';

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
