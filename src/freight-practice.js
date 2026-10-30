// Between contracts: read a vessel from its lights alone. Each card names the mistake it corrects,
// and rules the player has already tripped on are dealt more often.
const CARDS=[
 {rule:'26',answer:'Судно, занятое ловом, но не тралением',see:{type:'fisher',brg:4,dist:.5,aspect:30},lesson:'Красный над белым: лов не тралом. Судно ограничено снастями, механическое судно ему уступает.'},
 {rule:'26',answer:'Траулер за работой',see:{type:'trawler',brg:-6,dist:.5,aspect:-40},lesson:'Зелёный над белым: судно занято тралением. Бортовой показывает, каким боком оно к вам.'},
 {rule:'24',answer:'Буксир, длина буксира больше 200 м',see:{type:'tug',brg:6,dist:.46,aspect:60},lesson:'Три топовых в линию: за ним длинный буксир и трос. Обходить за кормой последнего буксируемого.'},
 {rule:'28',answer:'Судно, стеснённое осадкой',see:{type:'cbd',brg:2,dist:.52,aspect:5},lesson:'Три красных столбиком над обычными ходовыми огнями: не мешать ему проходить обязаны почти все.'},
 {rule:'30',answer:'Судно на мели',see:{type:'aground',brg:-4,dist:.5,aspect:55},lesson:'Два красных вместе с якорными огнями: судно на мели. Рядом мелко.'},
 {rule:'27',answer:'Земснаряд за работой',see:{type:'dredger',brg:0,dist:.5,aspect:90,clear:1},lesson:'Красный, белый, красный: ограничен в манёвре. Два зелёных отмечают сторону прохода, два красных препятствие.'},
 {rule:'13',answer:'Судно, которое вы догоняете',see:{type:'yacht',brg:2,dist:.56,aspect:178},lesson:'Один кормовой огонь и ни одного бортового: вы у него за кормой. Обгоняющий уступает всегда.'},
 {rule:'23',answer:'Судно с механическим двигателем, идёт на вас слева',see:{type:'patrol',brg:-16,dist:.44,aspect:50},lesson:'Топовый и зелёный бортовой: вы видите его правый борт. Он слева от вас, уступать ему не вам.'},
 {rule:'15',answer:'Судно с механическим двигателем, идёт на вас справа',see:{type:'patrol',brg:18,dist:.44,aspect:-50},lesson:'Топовый и красный бортовой: вы видите его левый борт. Он справа от вас, уступаете вы.'},
];
const NAMES=[...new Set(CARDS.map(c=>c.answer))];
const shuffled=(list,rand)=>list.map(x=>[rand(),x]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);

export function practiceRound(debts={},rand=Math.random,size=5){
 const pool=shuffled(CARDS,rand).map(c=>({c,w:(debts[c.rule]?3:1)*rand()})).sort((a,b)=>b.w-a.w).slice(0,size).map(x=>x.c);
 const items=pool.map(card=>{
  const options=shuffled([card.answer,...shuffled(NAMES.filter(n=>n!==card.answer),rand).slice(0,3)],rand);
  return {...card,prompt:'Что это за судно?',options,answer:options.indexOf(card.answer)};
 });
 return {items,at:0,score:0};
}
export const practiceCheck=(item,i)=>i===item.answer;
