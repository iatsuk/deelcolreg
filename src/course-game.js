import { cardsForModule, loadCourseProgress, recordCourseAnswer, COURSE_STORAGE_KEY } from './course.js';
import { shuffle } from './engine.js';

export class CourseGame {
  constructor(storage, changed, ticked) {
    this.storage=storage;this.changed=changed;this.ticked=ticked;
    this.progress=loadCourseProgress(storage);this.state=null;this.frame=0;this.storageOK=true;
  }
  start(module,mode='watch') {
    this.state={module,mode,phase:'question',history:[],retries:[],answers:[],score:0,lives:3,paused:false};
    this.ask();
  }
  ask() {
    const s=this.state,pool=cardsForModule(s.module);
    const due=s.retries.find(r=>r.at<=s.history.length && r.id!==s.history.at(-1));
    const recent=s.history.slice(-Math.min(2,pool.length-1));
    const candidates=shuffle(pool.filter(q=>!recent.includes(q.id)));
    candidates.sort((a,b)=>(this.progress[a.id]?.streak||0)-(this.progress[b.id]?.streak||0));
    s.question=due?pool.find(q=>q.id===due.id):candidates[0];
    s.retries=s.retries.filter(r=>r.id!==s.question.id);
    s.options=shuffle(s.question.options);s.history.push(s.question.id);
    s.limit=Math.max(12,25-Math.floor((s.history.length-1)/3)*3);s.remaining=s.limit;
    s.phase='question';s.paused=false;this.changed();
  }
  submit(id) {
    const s=this.state;if(!s||s.phase!=='question'||s.paused)return;
    this.stopClock();s.correct=id==='correct';s.timedOut=id===null;
    s.answers.push({id:s.question.id,correct:s.correct});
    if(s.correct)s.score+=100+(s.mode==='watch'?Math.round(s.remaining/s.limit*50):0);
    else{if(s.mode==='watch')s.lives--;s.retries.push({id:s.question.id,at:s.history.length+Math.min(2,cardsForModule(s.module).length-1)});}
    this.progress=recordCourseAnswer(this.progress,s.question.id,s.correct);
    try{this.storage.setItem(COURSE_STORAGE_KEY,JSON.stringify(this.progress));}catch{this.storageOK=false;}
    s.phase='feedback';this.changed();
  }
  next(){const s=this.state;if(s.history.length>=10||s.lives<=0){s.phase='results';this.changed();}else this.ask();}
  pause(){if(this.state?.phase==='question'){this.state.paused=!this.state.paused;this.changed();}}
  startClock(){
    this.stopClock();const s=this.state;if(!s||s.phase!=='question'||s.paused||s.mode==='practice')return;
    let previous=performance.now();
    const tick=now=>{if(s.phase!=='question'||s.paused)return;s.remaining=Math.max(0,s.remaining-(now-previous)/1000);previous=now;this.ticked(s);if(s.remaining===0)this.submit(null);else this.frame=requestAnimationFrame(tick);};
    this.frame=requestAnimationFrame(tick);
  }
  stopClock(){cancelAnimationFrame(this.frame);}
  reset(){this.progress={};try{this.storage.setItem(COURSE_STORAGE_KEY,'{}');}catch{this.storageOK=false;}}
}

let soundContext=null;
export function stopSignal(){if(soundContext){soundContext.close().catch(()=>{});soundContext=null;}}
export function playSignal(pattern){
  stopSignal();const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return false;
  soundContext=new Audio();let time=soundContext.currentTime+.05;
  for(const signal of pattern){const duration=signal==='-'?4.5:1;const oscillator=soundContext.createOscillator(),gain=soundContext.createGain();oscillator.type='sine';oscillator.frequency.value=330;gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(.045,time+.04);gain.gain.setValueAtTime(.045,time+duration-.04);gain.gain.linearRampToValueAtTime(0,time+duration);oscillator.connect(gain).connect(soundContext.destination);oscillator.start(time);oscillator.stop(time+duration);time+=duration+.4;}
  return true;
}
