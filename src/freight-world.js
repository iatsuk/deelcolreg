// The archipelago between quests: ports, passages and what each port offers. Pure data and rules,
// so the same logic runs in the game and in tools/questlab when it checks every possible trip.
export const PORTS={
 old:{name:'Старый порт',to:'в Старый порт',blurb:'Контора, лавка Кузьмича и Третий причал. Здесь заказы берут вечером, а отвечают за них утром.',x:204,y:480},
 fish:{name:'Рыбачья слобода',to:'в Рыбачью слободу',blurb:'Сорок дворов, два причала и староста, который помнит всё. Рыбой пахнет даже почта.',x:204,y:190},
 light:{name:'Северный маяк',to:'на Северный маяк',blurb:'Маяк, смотритель и лучший на Архипелаге вид на чужие ошибки. Суда заходят редко и каждый раз по делу.',x:560,y:132},
 far:{name:'Остров Дальний',to:'на остров Дальний',blurb:'Кафе «Девятый вал», причал для рыбаков и госпожа Тарасюк. Здесь всё узнают к обеду.',x:566,y:506},
};
export const EDGES=[
 {a:'old',b:'fish',name:'Прибрежный фарватер',legs:2,deck:['nets','yacht','cross'],via:[[220,434],[214,370],[230,300],[224,232]]},
 {a:'old',b:'far',name:'Сквозной пролив',legs:3,deck:['tow','tanker','cross'],via:[[258,498],[314,544],[372,562],[432,550],[466,500],[522,482]],scene:'strait'},
 {a:'fish',b:'far',name:'Банка Сорок Чертей',legs:2,deck:['aground','dredge','cross'],via:[[248,236],[292,304],[332,370],[410,382],[496,424]]},
 {a:'fish',b:'light',name:'Внешний рейд',legs:2,deck:['nets','yacht','cross'],via:[[250,160],[340,112],[450,98],[520,114]]},
 {a:'light',b:'far',name:'Восточный рейд',legs:2,deck:['yacht','nets','cross'],via:[[584,196],[640,262],[652,350],[612,444]]},
];
export const edgeBetween=(a,b)=>EDGES.find(e=>(e.a===a&&e.b===b)||(e.a===b&&e.b===a));
export const neighbours=port=>EDGES.filter(e=>e.a===port||e.b===port).map(edge=>({to:edge.a===port?edge.b:edge.a,edge}));
export const newWorld=()=>({port:'old',money:120,offers:{},trips:0,vars:{},news:{},recent:[]});
export const newStore=()=>({endings:{},debts:{},active:null,world:newWorld()});

// Fittings stay on the boat between voyages. Each is sold in one port, so where you sail starts to matter.
export const UPGRADES={
 table:{name:'Таблица огней в стихах',price:40,port:'old',about:'Дедова таблица Кузьмича. Открывается в любом рейсе.'},
 gasket:{name:'Прокладка для Людмилы Петровны',price:80,port:'old',about:'На среднем и полном ходу груз теряет на 5 меньше за участок.'},
 lg:{name:'Зелёный круговой фонарь',price:30,port:'fish',about:'Без него зелёный над белым не показать.'},
 screw:{name:'Новый винт',price:240,port:'far',about:'Каждый участок на 10 минут короче.'},
 radar:{name:'Радар со списанного катера',price:300,port:'light',about:'В рубке видно, что ждёт на следующем участке.'},
};
// A watchkeeper stands in the wheelhouse instead of Venya. Each is right about some lights and wrong about others,
// and quests pick their lines by the number in `crew`. Hiring another one sends the current one home.
export const CREW={
 gosha:{n:1,name:'Гоша',price:30,port:'old',about:'Матрос с парома «Ласточка», списан после суда за честность. Первым замечает любой огонь и боится каждого.'},
 gena:{n:2,name:'Геннадий Палыч',price:70,port:'fish',about:'Учил всю слободу водить на одном тракторе. Море понимает по правилам дорожного движения.'},
 zina:{n:3,name:'Зинаида Павловна',price:40,port:'light',about:'Заведовала буфетом «Северного холода» на маяке. Пересчитывает огни, как сдачу, и торгуется за каждую минуту.'},
};
export const mate=world=>Object.values(CREW).find(c=>c.n===world.vars.crew)||null;
export const hirable=(world,port)=>Object.entries(CREW).filter(([,c])=>c.port===port&&c.n!==world.vars.crew).map(([id,c])=>({id,...c}));
export function hire(world,id){
 const c=CREW[id];
 if(!c||c.port!==world.port||c.n===world.vars.crew||world.money<c.price)return false;
 world.money-=c.price;world.vars.crew=c.n;return true;
}
// Zinaida haggles: while she is aboard an errand pays a fifth more than the client offered.
export const haggle=(world,pay)=>world.vars.crew===CREW.zina.n?Math.floor(pay/5):0;
// Everything a `world` parameter may be: fittings are bought, memory is earned on the water, the watchkeeper is hired.
export const MEMORY=['zaz','marfa'];
export const WORLD_VARS=[...Object.keys(UPGRADES),...MEMORY,'crew'];
export const LOST_SHIP=100;
export const DEATH_NEWS=`Слухи о вашей гибели оказались преувеличены: «Бойкую» подняли, вас откачали. Подъём обошёлся в ${LOST_SHIP} монет, а Кузьмич жалеет о потраченном на поминки.`;
export const owned=(world,id)=>!!world.vars[id];
export const forSale=(world,port)=>Object.entries(UPGRADES).filter(([id,u])=>u.port===port&&!owned(world,id)).map(([id,u])=>({id,...u}));
export function buy(world,id){
 const u=UPGRADES[id];
 if(!u||u.port!==world.port||owned(world,id)||world.money<u.price)return false;
 world.money-=u.price;world.vars[id]=1;return true;
}
// World parameters enter a quest as its starting values and leave it as whatever the voyage made of them.
export function enterWorld(q,world){
 q.params.forEach((p,i)=>{if(p.world)q.startValues[i]=world.vars[p.id]??p.start??p.min;});
 if(q.index.money!==undefined)q.startValues[q.index.money]=world.money;
}
export function leaveWorld(q,state,world){
 for(const p of q.params)if(p.world)world.vars[p.id]=state.v[q.index[p.id]];
}
export function hearNews(world,port,text){
 if(!text)return;
 const list=world.news[port]||=[];
 list.unshift(text);list.length=Math.min(list.length,3);
}
// An encounter on a tripped rule passed without a new note pays that debt back.
export function payDebts(debts,rules,notes){
 const failed=new Set(notes.map(n=>String(n.rule)));
 for(const rule of rules.map(String)){
  if(failed.has(rule)||!debts[rule])continue;
  debts[rule].pop();
  if(!debts[rule].length)delete debts[rule];
 }
 return debts;
}

const shuffled=(list,rand)=>list.map(x=>[rand(),x]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
// Encounters on rules the player already tripped on are dealt about three times as often.
export function pickEncounters(edge,deck,debts,rand){
 const scored=edge.deck.map(name=>({name,score:rand()**(1/(deck[name].rules.some(r=>debts[r])?3:1))}));
 return scored.sort((a,b)=>b.score-a.score).slice(0,edge.legs).map(x=>x.name);
}
export function dealOffers(port,bundle,debts,rand,count=2,recent=[]){
 const routes=Object.values(bundle.errands).flatMap(e=>e.routes.filter(r=>r[0]===port).map(([from,to])=>({errand:e.id,from,to})));
 const fresh=routes.filter(r=>!recent.includes(r.errand));
 return shuffled(fresh.length>=count?fresh:routes,rand).slice(0,count).map(o=>({...o,fromName:PORTS[o.from].name,toName:PORTS[o.to].to,picks:pickEncounters(edgeBetween(o.from,o.to),bundle.deck,debts,rand)}));
}
// Every errand ends somewhere: delivered or not, the boat is at the far pier. Only a wreck goes home.
export function settle(world,offer,end,money){
 world.money=Math.max(0,end==='death'?money-LOST_SHIP:money);world.trips++;
 world.port=end==='death'?'old':offer.to;
 delete world.offers[world.port];
 if(offer.errand){world.recent=[offer.errand,...world.recent.filter(x=>x!==offer.errand)].slice(0,3);}
 return world;
}
