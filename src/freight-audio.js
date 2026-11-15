// Generated ambience: swell, the diesel and a squelch on the radio. Off until the player asks.
export class Ambience{
 constructor(){this.ctx=null;this.on=false;}
 start(){
  const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return false;
  this.ctx=new Audio();const c=this.ctx,master=this.master=c.createGain();master.gain.value=0;master.connect(c.destination);
  const noise=c.createBuffer(1,c.sampleRate*4,c.sampleRate),d=noise.getChannelData(0);let last=0;
  for(let i=0;i<d.length;i++){const w=Math.random()*2-1;last=(last+.02*w)/1.02;d[i]=last*3.2;}
  this.noise=noise;
  const src=c.createBufferSource();src.buffer=noise;src.loop=true;
  const band=c.createBiquadFilter();band.type='lowpass';band.frequency.value=420;
  const swell=c.createGain();swell.gain.value=.3;
  const lfo=c.createOscillator(),depth=c.createGain();lfo.frequency.value=.11;depth.gain.value=.16;lfo.connect(depth);depth.connect(swell.gain);lfo.start();
  src.connect(band);band.connect(swell);swell.connect(master);src.start();
  const diesel=c.createOscillator(),dg=c.createGain(),thump=c.createOscillator(),tg=c.createGain();
  diesel.type='sawtooth';diesel.frequency.value=46;dg.gain.value=.018;thump.frequency.value=6.2;tg.gain.value=.012;
  const low=c.createBiquadFilter();low.type='lowpass';low.frequency.value=150;
  thump.connect(tg);tg.connect(dg.gain);diesel.connect(low);low.connect(dg);dg.connect(master);diesel.start();thump.start();
  return true;
 }
 toggle(){
  if(!this.ctx&&!this.start())return false;
  this.on=!this.on;
  if(this.ctx.state==='suspended')this.ctx.resume();
  this.master.gain.setTargetAtTime(this.on?.7:0,this.ctx.currentTime,.4);
  return this.on;
 }
 // A ship's whistle for the rule book's signals. It plays when asked, even with the ambience off.
 whistle(blasts,hz=196){
  if(!this.ctx&&!this.start())return;
  if(this.ctx.state==='suspended')this.ctx.resume();
  this.hush();
  const c=this.ctx,now=c.currentTime+.05,g=this.horn=c.createGain(),f=c.createBiquadFilter(),end=now+blasts.at(-1)[0]+blasts.at(-1)[1]+.5;
  f.type='lowpass';f.frequency.value=1300;g.gain.value=0;f.connect(g);g.connect(c.destination);
  for(const [type,pitch] of [['sawtooth',hz],['triangle',hz*2]]){const o=c.createOscillator();o.type=type;o.frequency.value=pitch;o.connect(f);o.start(now);o.stop(end);}
  for(const [at,len] of blasts){g.gain.setTargetAtTime(.16,now+at,.04);g.gain.setTargetAtTime(0,now+at+len,.06);}
 }
 hush(){this.horn?.disconnect();this.horn=null;}
 radio(){
  if(!this.on)return;
  const c=this.ctx,src=c.createBufferSource(),g=c.createGain(),f=c.createBiquadFilter(),now=c.currentTime;
  src.buffer=this.noise;f.type='bandpass';f.frequency.value=1900;f.Q.value=.9;
  g.gain.setValueAtTime(.5,now);g.gain.exponentialRampToValueAtTime(.001,now+.28);
  src.connect(f);f.connect(g);g.connect(this.master);src.start(now,Math.random()*3,.3);
 }
}
