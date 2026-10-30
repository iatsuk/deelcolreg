// The archipelago between quests: ports, passages and what each port offers. Pure data and rules,
// so the same logic runs in the game and in tools/questlab when it checks every possible trip.
export const PORTS={
 old:{name:'Старый порт',to:'в Старый порт',blurb:'Контора, лавка Кузьмича и Третий причал. Здесь заказы берут вечером, а отвечают за них утром.',x:176,y:510},
 fish:{name:'Рыбачья слобода',to:'в Рыбачью слободу',blurb:'Сорок дворов, два причала и староста, который помнит всё. Рыбой пахнет даже почта.',x:188,y:196},
 light:{name:'Северный маяк',to:'на Северный маяк',blurb:'Маяк, смотритель и его беременная жена. Суда заходят редко и каждый раз по делу.',x:560,y:132},
 far:{name:'Остров Дальний',to:'на остров Дальний',blurb:'Кафе «Девятый вал», причал для рыбаков и госпожа Тарасюк. Здесь всё узнают к обеду.',x:566,y:506},
};
export const EDGES=[
 {a:'old',b:'fish',name:'Прибрежный фарватер',legs:2,deck:['nets','yacht','cross'],via:[92,350]},
 {a:'old',b:'far',name:'Сквозной пролив',legs:3,deck:['tow','tanker','cross'],via:[372,600],scene:'strait'},
 {a:'fish',b:'far',name:'Банка Сорок Чертей',legs:2,deck:['aground','dredge','cross'],via:[390,330]},
 {a:'fish',b:'light',name:'Внешний рейд',legs:2,deck:['nets','yacht','cross'],via:[372,62]},
 {a:'light',b:'far',name:'Восточный рейд',legs:2,deck:['yacht','nets','cross'],via:[668,320]},
];
export const edgeBetween=(a,b)=>EDGES.find(e=>(e.a===a&&e.b===b)||(e.a===b&&e.b===a));
export const neighbours=port=>EDGES.filter(e=>e.a===port||e.b===port).map(edge=>({to:edge.a===port?edge.b:edge.a,edge}));
export const newWorld=()=>({port:'old',money:120,offers:{},trips:0});

const shuffled=(list,rand)=>list.map(x=>[rand(),x]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
// Encounters on rules the player already tripped on are dealt about three times as often.
export function pickEncounters(edge,deck,debts,rand){
 const scored=edge.deck.map(name=>({name,score:rand()**(1/(deck[name].rules.some(r=>debts[r])?3:1))}));
 return scored.sort((a,b)=>b.score-a.score).slice(0,edge.legs).map(x=>x.name);
}
export function dealOffers(port,bundle,debts,rand,count=2){
 const routes=Object.values(bundle.errands).flatMap(e=>e.routes.filter(r=>r[0]===port).map(([from,to])=>({errand:e.id,from,to})));
 return shuffled(routes,rand).slice(0,count).map(o=>({...o,fromName:PORTS[o.from].name,toName:PORTS[o.to].to,picks:pickEncounters(edgeBetween(o.from,o.to),bundle.deck,debts,rand)}));
}
// Every errand ends somewhere: delivered or not, the boat is at the far pier. Only a wreck goes home.
export function settle(world,offer,end,money){
 world.money=Math.max(0,money);world.trips++;
 world.port=end==='death'?'old':offer.to;
 delete world.offers[world.port];
 return world;
}
