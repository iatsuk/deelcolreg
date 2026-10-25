import { angle,turn,clamp,vector,createVoyage,stepVoyage,commandVoyage,LANTERNS,WHISTLES,LOOKOUT_ROUNDS,lookoutAt,stepLookout,gradeLantern,gradeWhistle,loadArcade,saveArcade,ARCADE_KEY,TOKEN_NAMES } from './arcade-engine.js';
import { GAME_TYPES,tokenHTML } from './arcade-pages.js';
export class Arcade {
 constructor(storage,changed,home){this.storage=storage;this.changed=changed;this.home=home;this.progress=loadArcade(storage);this.state=null;this.frame=0;this.audio=null;this.saved=true;}
 start(type,index=0,run=false){this.detach();if(!GAME_TYPES[type])return;this.state=type==='bridge'?createVoyage(GAME_TYPES[type].items[index]?.id,Math.floor(Math.random()*8)*45):{phase:'brief',paused:false,slots:[],selected:null,blasts:[],elapsed:0,samples:[],picks:new Set(),time:0};Object.assign(this.state,{type,index,elapsed:0,commandOffset:0});if(run)this.state.phase='running';this.changed();}
 task(){return GAME_TYPES[this.state.type].items[this.state.index];}
 detach(){cancelAnimationFrame(this.frame);this.abort?.abort();this.release(true);this.dragGhost?.remove();this.dragGhost=null;this.dragToken=null;}
 pause(){const s=this.state;if(!s||s.phase!=='running')return;this.release(true);s.paused=!s.paused;this.changed();}
 suspend(){if(this.state?.phase==='running')this.state.paused=true;this.detach();}
 mount(){
  this.detach();this.abort=new AbortController();const options={signal:this.abort.signal},s=this.state;
  this.canvas=document.querySelector('#arcade-sea');if(!this.canvas)return;this.ctx=this.canvas.getContext('2d');
  document.querySelectorAll('[data-arcade]').forEach(b=>b.addEventListener('click',()=>this.action(b.dataset.arcade),options));
  document.querySelectorAll('[data-arcade-level]').forEach(b=>b.addEventListener('click',()=>this.start(s.type,Number(b.dataset.arcadeLevel)),options));
  document.querySelectorAll('[data-helm]').forEach(b=>b.addEventListener('click',()=>this.helm(Number(b.dataset.helm)),options));
  document.querySelector('[data-helm-course]')?.addEventListener('input',e=>this.helm(Number(e.target.value)-s.commandOffset),options);
  document.querySelector('[data-helm-speed]')?.addEventListener('input',e=>this.helm(0,Number(e.target.value)/1.94384),options);
  document.querySelectorAll('[data-contact]').forEach(b=>b.addEventListener('click',()=>this.pick(b.dataset.contact),options));
  this.canvas.addEventListener('click',e=>{if(s.type!=='lookout'||s.phase!=='running'||s.paused)return;const r=this.canvas.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*900,y=(e.clientY-r.top)/r.height*620;const scene=lookoutAt(this.task(),s.time);let best=null,d=45;for(const t of scene.targets){const p=this.position(t.x-scene.own.x,t.y-scene.own.y);const range=Math.hypot(p.x-x,p.y-y);if(range<d){best=t.id;d=range;}}if(best)this.pick(best);},options);
  document.querySelectorAll('[data-token]').forEach(b=>{
   b.addEventListener('click',()=>{if(s.phase!=='running'||s.paused)return;s.selected=b.dataset.token;document.querySelectorAll('[data-token]').forEach(t=>t.classList.toggle('selected',t===b));},options);
   b.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',b.dataset.token);s.selected=b.dataset.token;},options);
   b.addEventListener('pointerdown',e=>{if(s.phase!=='running'||s.paused)return;e.preventDefault();b.setPointerCapture(e.pointerId);b.focus({preventScroll:true});s.selected=b.dataset.token;document.querySelectorAll('[data-token]').forEach(t=>t.classList.toggle('selected',t===b));this.dragToken=b.dataset.token;this.dragStart={x:e.clientX,y:e.clientY};},options);
  });
  document.querySelectorAll('[data-slot]').forEach(b=>{
   b.addEventListener('click',()=>this.put(Number(b.dataset.slot),s.selected),options);
   b.addEventListener('dragover',e=>e.preventDefault(),options);
   b.addEventListener('drop',e=>{e.preventDefault();this.put(Number(b.dataset.slot),e.dataTransfer.getData('text/plain'));},options);
  });
  document.addEventListener('pointermove',e=>{if(!this.dragToken)return;if(!this.dragGhost&&Math.hypot(e.clientX-this.dragStart.x,e.clientY-this.dragStart.y)>7){this.dragGhost=document.createElement('div');this.dragGhost.className='token-ghost';this.dragGhost.innerHTML=tokenHTML(this.dragToken);document.body.append(this.dragGhost);}if(this.dragGhost){e.preventDefault();this.dragGhost.style.left=`${e.clientX}px`;this.dragGhost.style.top=`${e.clientY}px`;}},{...options,passive:false});
  document.addEventListener('pointerup',e=>{if(this.dragGhost){const slot=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-slot]');if(slot)this.put(Number(slot.dataset.slot),this.dragToken);this.dragGhost.remove();this.dragGhost=null;}this.dragToken=null;},options);
  document.addEventListener('pointercancel',()=>{this.dragGhost?.remove();this.dragGhost=null;this.dragToken=null;},options);
  const pad=document.querySelector('[data-whistle-pad]');
  pad?.addEventListener('pointerdown',e=>{e.preventDefault();pad.setPointerCapture(e.pointerId);this.press();},options);
  pad?.addEventListener('pointerup',()=>this.release(),options);pad?.addEventListener('pointercancel',()=>this.release(true),options);pad?.addEventListener('lostpointercapture',()=>this.release(),options);
  document.addEventListener('keydown',e=>{
   if(document.querySelector('#modal')?.open||e.ctrlKey||e.metaKey||e.altKey||e.target.matches('input,select,textarea')||s.phase!=='running'||s.paused)return;
   if(s.type==='whistle'&&e.code==='Space'){e.preventDefault();if(!e.repeat)this.press();return;}
   if(s.type==='bridge'&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();this.helm(e.key==='ArrowLeft'?-5:e.key==='ArrowRight'?5:0,e.key==='ArrowUp'?s.speed+.5144:e.key==='ArrowDown'?s.speed-.5144:undefined);}
   if(e.key.toLowerCase()==='p'){e.preventDefault();this.pause();}
  },options);
  document.addEventListener('keyup',e=>{if(s.type==='whistle'&&e.code==='Space'){e.preventDefault();this.release();}},options);
  window.addEventListener('blur',()=>{if(s.phase==='running'&&!s.paused)this.pause();},options);
  this.last=performance.now();this.draw();this.updateHUD();this.frame=requestAnimationFrame(t=>this.tick(t));
 }
 action(action){const s=this.state;if(!s)return;
  if(action==='begin'){s.phase='running';this.changed();document.querySelector('.arcade-water')?.scrollIntoView({block:'start',behavior:'smooth'});}
  if(action==='pause')this.pause();
  if(action==='retry')this.start(s.type,s.index,true);
  if(action==='next'){if(s.index+1===GAME_TYPES[s.type].items.length)this.home();else this.start(s.type,s.index+1);}
  if(action==='clear'&&s.phase==='running'&&!s.paused){this.release(true);s.slots=[];s.blasts=[];this.changed();}
  if(action==='observe')this.observe();
  if(action==='check')this.check();
 }
 helm(delta,speed){const s=this.state;if(s.type!=='bridge'||s.phase!=='running'||s.paused)return;s.commandOffset=clamp(s.commandOffset+delta,-75,75);commandVoyage(s,s.mission.own.h+s.commandOffset,speed===undefined?s.speed:clamp(speed,0,17/1.94384));this.updateHUD();}
 put(i,token){const s=this.state;if(s.type!=='lantern'||s.phase!=='running'||s.paused||!TOKEN_NAMES[token])return;const pool=this.task().kind==='lights'?['red','green','white','yellow']:['ball','diamond','cones','cone','cylinder'];if(!pool.includes(token))return;s.slots[i]=token;const b=document.querySelector(`[data-slot="${i}"]`);b.innerHTML=tokenHTML(token)+`<small>${i+1}</small>`;b.setAttribute('aria-label',`Место ${i+1} сверху: ${TOKEN_NAMES[token]}`);}
 pick(id){const s=this.state;if(s.phase!=='running'||s.paused)return;s.picks.has(id)?s.picks.delete(id):s.picks.add(id);const b=document.querySelector(`[data-contact="${id}"]`);b?.classList.toggle('selected',s.picks.has(id));b?.setAttribute('aria-pressed',String(s.picks.has(id)));if(b)b.textContent=`Цель ${id} ${s.picks.has(id)?'●':'○'}`;this.draw();}
 observe(){const s=this.state;if(s.type!=='lookout'||s.phase!=='running'||s.paused||s.samples.length>=3)return;const last=s.samples.at(-1);if(last&&s.time-last.time<9.9)return;s.samples.push({time:s.time,targets:lookoutAt(this.task(),s.time).targets});this.updateHUD();}
 press(){const s=this.state;if(s.type!=='whistle'||s.phase!=='running'||s.paused||this.holding||s.blasts.length>=10)return;this.holding={start:s.elapsed,wall:performance.now()};document.querySelector('[data-whistle-pad]')?.classList.add('sounding');try{const Audio=window.AudioContext||window.webkitAudioContext;if(Audio){this.audio??=new Audio();this.audio.resume().catch(()=>{});this.osc=this.audio.createOscillator();this.gain=this.audio.createGain();this.osc.frequency.value=330;this.gain.gain.value=.05;this.osc.connect(this.gain).connect(this.audio.destination);this.osc.start();}}catch{/* The visible timer remains usable if sound is unavailable. */}}
 release(discard=false){if(!this.holding)return;const held=this.holding;this.holding=null;try{this.osc?.stop();this.osc?.disconnect();this.gain?.disconnect();}catch{}this.osc=null;document.querySelector('[data-whistle-pad]')?.classList.remove('sounding');if(!discard&&this.state?.type==='whistle'){this.state.blasts.push({start:held.start,duration:Math.min(10,(performance.now()-held.wall)/1000)});this.updateHUD();}}
 check(){const s=this.state;if(s.phase!=='running'||s.paused)return;this.release();const task=this.task();
  if(s.type==='lantern'){s.success=gradeLantern(task,s.slots);s.reason=s.success?'Опознавательные сигналы выставлены верно.':'Проверьте состав и порядок сверху вниз. Сравните свою мачту с комбинацией в разборе.';}
  else if(s.type==='whistle'){const grade=gradeWhistle(task,s.blasts);s.success=grade.correct;s.reason=grade.reason;}
  else if(s.type==='lookout'){if(s.samples.length<3){this.status('Сначала снимите три пеленга с интервалами.');return;}const dangerous=lookoutAt(task,0).targets.filter(t=>t.risk).map(t=>t.id);s.success=dangerous.length===s.picks.size&&dangerous.every(id=>s.picks.has(id));s.reason=s.success?`Верно: опасно сближается цель ${dangerous.join(', ')}. Её пеленг почти постоянен, а расстояние уменьшается.`:`Опасная цель: ${dangerous.join(', ')}. Сравните три наблюдения в таблице: пеленг почти не меняется, дистанция уменьшается.`;}
  else return;s.phase='result';this.complete();
 }
 complete(){const s=this.state;const g=GAME_TYPES[s.type];this.saved=saveArcade(this.storage,this.progress,`${g.prefix}-${this.task().id}`,s.success);this.changed();}
 status(text){const el=document.querySelector('#bearing-status');if(el)el.textContent=text;}
 tick(now){const s=this.state;if(!this.canvas?.isConnected)return;const dt=Math.min(.05,Math.max(0,(now-this.last)/1000));this.last=now;
  if(s.phase==='running'&&!s.paused){s.elapsed+=dt;if(s.type==='bridge'){for(let i=0;i<2;i++)stepVoyage(s,dt*2);if(s.phase==='result'){this.complete();return;}}if(s.type==='lookout')stepLookout(s,dt*4);}
  this.draw();this.updateHUD();this.frame=requestAnimationFrame(t=>this.tick(t));
 }
 updateHUD(){const s=this.state;const set=(id,t)=>{const el=document.getElementById(id);if(el&&el.textContent!==t)el.textContent=t;};const t=s.type==='bridge'?s.time:s.type==='lookout'?s.time:s.elapsed||0;set('sea-clock',`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`);
  if(s.type==='bridge'){
   set('own-heading',`${String(Math.round(s.own.h)%360).padStart(3,'0')}°`);set('own-speed',`${(s.own.s*1.94384).toFixed(1)} уз`);set('own-range',s.target?`${Math.round(Math.hypot(s.target.x-s.own.x,s.target.y-s.own.y))} м`:'Проход');set('command-heading',`${String(Math.round(s.command)%360).padStart(3,'0')}°`);set('command-speed',`${(s.speed*1.94384).toFixed(1)} уз`);
   const course=document.querySelector('[data-helm-course]'),speed=document.querySelector('[data-helm-speed]');if(course)course.value=s.commandOffset;if(speed)speed.value=Math.round(s.speed*1.94384);
   if(s.phase==='running')set('bridge-status',s.paused?'Пауза':s.mission.id==='standon-late'?(s.time<25?'Наблюдаем: обязанности другого судна пока не меняются':'Очевидно: уступающее судно не действует. Вы можете действовать сами.'):s.auto?'Другое судно изменяет курс':s.mission.id==='channel'?'Учитывайте снос влево':'Контролируйте развитие сближения');
  }
  if(s.type==='whistle'){
   if(this.holding)set('whistle-duration',`${((performance.now()-this.holding.wall)/1000).toFixed(1)} с`);else set('whistle-duration','Удерживайте кнопку или Пробел');
   const log=document.querySelector('#blast-history');const html=s.blasts.length?s.blasts.map(b=>`<span><i class="${b.duration>=4?'long':''} ${b.duration<.6||b.duration>6||(b.duration>1.6&&b.duration<4)?'invalid':''}"></i><small>${b.duration.toFixed(1)} с</small></span>`).join(''):'Ваш сигнал появится здесь';if(log&&log.innerHTML!==html)log.innerHTML=html;
   const last=s.blasts.at(-1);if(last&&!this.holding)set('whistle-gap',`Пауза: ${Math.max(0,s.elapsed-last.start-last.duration).toFixed(1)} с`);
  }
  if(s.type==='lookout'){
   const log=document.querySelector('#bearing-log');const html=`<table><caption>${s.samples.length} / 3 наблюдения</caption><thead><tr><th>Цель</th>${s.samples.map((v,i)=>`<th>${i+1}: ${Math.round(v.time)} с</th>`).join('')}</tr></thead><tbody>${['A','B','C'].map(id=>`<tr><th>${id}</th>${s.samples.map(v=>{const b=v.targets.find(t=>t.id===id);return `<td>${Math.round(b.bearing)}°<small>${Math.round(b.range)} м</small></td>`;}).join('')}</tr>`).join('')}</tbody></table><p id="bearing-status" role="status">${s.phase==='result'?'Наблюдения завершены.':s.samples.length>=3?'Отметьте опасные цели и завершите наблюдение.':s.samples.length&&s.time-s.samples.at(-1).time<10?`Следующее наблюдение через ${Math.ceil(10-s.time+s.samples.at(-1).time)} с`:'Можно снять пеленги всех целей.'}</p>`;
   if(log&&log.innerHTML!==html)log.innerHTML=html;const observe=document.querySelector('[data-arcade="observe"]');const complete=document.querySelector('[data-arcade="check"]');if(complete)complete.disabled=s.phase!=='running'||s.paused||s.samples.length<3;if(observe)observe.disabled=s.phase!=='running'||s.paused||s.samples.length>=3||(s.samples.length>0&&s.time-s.samples.at(-1).time<9.9);
  }
 }
 position(x,y){return {x:450+x*.52,y:322-y*.52};}
 draw(){const c=this.ctx,s=this.state;if(!c)return;const day=s.type==='lantern'&&this.task().kind==='shapes';c.clearRect(0,0,900,620);const gradient=c.createLinearGradient(0,0,0,620);gradient.addColorStop(0,day?'#c1ddd7':'#102e32');gradient.addColorStop(1,day?'#8db9ae':'#164347');c.fillStyle=gradient;c.fillRect(0,0,900,620);
  if(s.type==='bridge'||s.type==='lookout'){
   c.strokeStyle='#76b9aa20';c.lineWidth=1;for(let x=8;x<900;x+=40){c.beginPath();c.moveTo(x,0);c.lineTo(x,620);c.stroke();}for(let y=2;y<620;y+=40){c.beginPath();c.moveTo(0,y);c.lineTo(900,y);c.stroke();}
   c.fillStyle='#b9d6c8';c.font='12px Manrope';c.fillText('N',42,84);c.beginPath();c.moveTo(46,95);c.lineTo(41,110);c.lineTo(51,110);c.closePath();c.fill();c.font='11px Manrope';c.fillStyle='#b9d6c880';c.fillText('УЧЕБНАЯ АКВАТОРИЯ',30,592);
   if(s.type==='lookout'){this.radar();return;}
   if(s.mission.id==='channel'){
    c.fillStyle='#728a68';c.fillRect(0,0,this.position(-205,0).x,620);c.fillRect(this.position(205,0).x,0,900,620);c.strokeStyle='#e3c28a';c.setLineDash([10,8]);for(const x of [-195,195]){c.beginPath();c.moveTo(this.position(x,0).x,0);c.lineTo(this.position(x,0).x,620);c.stroke();}c.setLineDash([]);const p=this.position(125,350);c.strokeStyle='#80e0b4';c.lineWidth=4;c.beginPath();c.moveTo(p.x-30,p.y);c.lineTo(p.x+30,p.y);c.stroke();c.fillStyle='#b8efd8';c.fillText('ВОРОТА',p.x-24,p.y-15);
   }
   this.trail(s.trail,'#89dfbd');this.trail(s.otherTrail,'#f2b47d');this.boat(s.own,'#8ce0bd','ВЫ');if(s.target){if(s.mission.radar){const p=this.position(s.target.x,s.target.y);c.strokeStyle='#f2b47d';c.lineWidth=2;c.beginPath();c.arc(p.x,p.y,8,0,Math.PI*2);c.stroke();c.fillStyle='#f2b47d';c.fillText('ЦЕЛЬ',p.x+15,p.y);}else this.boat(s.target,'#f2b47d','ЦЕЛЬ');}
   return;
  }
  // Side view gives the signal games a physical setting, rather than a card face.
  const horizon=day?360:385;c.fillStyle=day?'#77a79d':'#173f44';c.fillRect(0,horizon,900,620);c.strokeStyle=day?'#e3ece557':'#93c7b329';c.lineWidth=1;for(let j=0;j<9;j++){const y=horizon+20+j*26;for(let i=0;i<9;i++){const x=i*120+Math.sin((s.elapsed||0)*.5+j)*15;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+22,y-5,x+45,y);c.stroke();}}
  if(!day){c.fillStyle='#c9d9be';c.beginPath();c.arc(115,135,19,0,Math.PI*2);c.fill();c.fillStyle='#bed2c5';for(let i=0;i<20;i++){c.globalAlpha=.15+(i%3)*.13;c.fillRect((i*131+230)%890,(i*41)%280+70,2,2);}c.globalAlpha=1;}
  c.save();c.translate(s.type==='whistle'?330:450,435+Math.sin((s.elapsed||0)*.8)*2);c.fillStyle=day?'#264a44':'#081f26';c.beginPath();c.moveTo(-220,-22);c.lineTo(205,-22);c.lineTo(160,36);c.quadraticCurveTo(0,55,-180,30);c.closePath();c.fill();c.fillRect(-60,-95,120,75);c.fillRect(-80,-80,25,58);c.fillRect(10,-125,30,30);c.fillStyle=day?'#c6d8bd':'#a6c6a1';c.globalAlpha=.5;for(let i=0;i<4;i++)c.fillRect(-40+i*26,-81,14,17);c.globalAlpha=1;c.strokeStyle=day?'#34594d':'#668f80';c.lineWidth=5;c.beginPath();c.moveTo(0,-120);c.lineTo(0,-355);c.stroke();c.lineWidth=1;c.beginPath();c.moveTo(-130,-22);c.lineTo(0,-300);c.lineTo(120,-22);c.stroke();
  if(s.type==='whistle'&&this.holding){c.strokeStyle='#a9e7b9';c.lineWidth=3;for(let i=0;i<3;i++){c.beginPath();c.arc(40,-115,30+i*30+((performance.now()-this.holding.wall)/40)%25,-.75,.75);c.stroke();}}c.restore();
 }
 trail(points,color){if(points.length<2)return;const c=this.ctx;c.strokeStyle=color+'80';c.lineWidth=2;c.beginPath();points.forEach(([x,y],i)=>{const p=this.position(x,y);i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);});c.stroke();}
 boat(b,color,label){const c=this.ctx,p=this.position(b.x,b.y),v=vector(b.h,130);c.strokeStyle=color+'75';c.lineWidth=1.5;c.setLineDash([5,7]);c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x+v.x*.52,p.y-v.y*.52);c.stroke();c.setLineDash([]);c.save();c.translate(p.x,p.y);c.rotate(b.h*Math.PI/180);c.fillStyle=color;c.beginPath();c.moveTo(0,-19);c.lineTo(9,-3);c.lineTo(8,18);c.lineTo(-8,18);c.lineTo(-9,-3);c.closePath();c.fill();c.fillStyle='#173b39';c.fillRect(-4,-2,8,10);c.restore();c.fillStyle=color;c.font='bold 11px Manrope';c.fillText(label,p.x+17,p.y+5);}
 radar(){const c=this.ctx,s=this.state,scene=lookoutAt(this.task(),s.time);c.strokeStyle='#80d9b640';for(const r of [85,170,255]){c.beginPath();c.arc(450,322,r,0,Math.PI*2);c.stroke();}const sweep=(s.elapsed||0)*.6;c.strokeStyle='#8be3b645';c.beginPath();c.moveTo(450,322);c.lineTo(450+Math.sin(sweep)*255,322-Math.cos(sweep)*255);c.stroke();this.boat({x:0,y:0,h:scene.own.h,s:5},'#8ce0bd','ВЫ');for(const b of scene.targets){const p=this.position(b.x-scene.own.x,b.y-scene.own.y);c.fillStyle=s.picks.has(b.id)?'#ffd19a':'#9ce6c2';c.strokeStyle=c.fillStyle;c.lineWidth=2;c.beginPath();c.arc(p.x,p.y,s.picks.has(b.id)?15:6,0,Math.PI*2);s.picks.has(b.id)?c.stroke():c.fill();c.font='bold 16px Manrope';c.fillText(b.id,p.x+16,p.y+5);}}
 reset(){this.progress={};try{this.storage.removeItem(ARCADE_KEY);}catch{}this.state=null;this.detach();}
}
