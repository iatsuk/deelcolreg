import { CHAPTERS, NODES, CONVERSATIONS, REVIEW_CASES } from './campaign-data.js';
export const SAVE_KEY='deelstuff.colreg.campaign.v1';
export function createCampaign(seed=Math.floor(Math.random()*0xffffffff)){
 return {version:1,seed:seed>>>0,node:'departure',history:[],flags:{},talks:[],hints:[],pending:null,events:[],review:null};
}
const resolve=(value,s)=>typeof value==='function'?value(s):value;
function shuffle(list,seed,key){
 let x=(seed||1)>>>0;for(const c of key)x=(Math.imul(x,31)+c.charCodeAt(0))>>>0;
 const a=[...list];for(let i=a.length-1;i>0;i--){x=(Math.imul(x,1664525)+1013904223)>>>0;const j=x%(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;
}
export function campaignScene(s){
 const n=NODES[s.node];
 return {...n,id:s.node,title:resolve(n.title,s),paragraphs:resolve(n.paragraphs,s)||[],dialogue:resolve(n.dialogue,s)||[],choices:shuffle(n.choices||[],s.seed,s.node),chapterInfo:CHAPTERS[n.chapter]};
}
export function answer(s,id){
 const scene=campaignScene(s),c=scene.choices.find(c=>c.id===id);
 if(s.pending||scene.end||s.review||!c)return false;
 s.pending={node:s.node,choice:id,correct:c.correct,playerText:c.text,feedback:c.feedback,why:c.why||scene.why,rule:scene.rule,clause:scene.clause,assisted:s.hints.includes(s.node),chapter:scene.chapter,title:scene.title,dialogue:scene.dialogue.map(l=>({...l}))};
 s.history.push({...s.pending});Object.assign(s.flags,c.set||{});s.events.push(['answer',id]);return true;
}
export function continueCampaign(s){
 if(!s.pending||s.review)return false;
 const c=NODES[s.node].choices.find(c=>c.id===s.pending.choice),next=typeof c.next==='function'?c.next(s):c.next;
 if(!Object.hasOwn(NODES,next))return false;
 s.node=next;s.pending=null;s.events.push(['continue']);return true;
}
export function talk(s,id){
 const c=CONVERSATIONS.find(c=>c.flag===id);
 if(!c||campaignScene(s).chapter!==c.chapter||s.talks.includes(id)||s.review)return false;
 s.talks.push(id);s.flags[id]=true;s.events.push(['talk',id]);return true;
}
export function useReference(s){
 if(s.pending||campaignScene(s).end||s.hints.includes(s.node)||s.review)return false;
 s.hints.push(s.node);s.events.push(['hint']);return true;
}
export function stats(s){
 const h=s.history;return {decisions:h.length,correct:h.filter(e=>e.correct&&!e.assisted).length,assisted:h.filter(e=>e.assisted).length,errors:h.filter(e=>!e.correct).length,chapters:[...new Set(h.map(e=>e.chapter))].length};
}
export function startReview(s){
 if(!campaignScene(s).end||s.review)return false;
 const missed=s.history.filter(h=>!h.correct||h.assisted),targeted=[...new Map(missed.map(h=>{const c=REVIEW_CASES.find(c=>c.clause.split(',')[0]===h.clause.split(',')[0])||REVIEW_CASES.find(c=>c.rule===h.rule);return [c.id,c];})).values()];
 const selected=targeted.length?targeted.slice(0,3):[REVIEW_CASES.find(c=>c.id==='cross'),REVIEW_CASES.find(c=>c.id==='fog'),REVIEW_CASES.find(c=>c.id==='water')];
 s.review={ids:selected.map(c=>c.id),index:0,answers:[],pending:null,done:false};s.events.push(['review']);return true;
}
export function reviewCase(s){
 if(!s.review||s.review.done)return null;
 const c=REVIEW_CASES.find(c=>c.id===s.review.ids[s.review.index]);return {...c,choices:shuffle(c.choices.map((c,i)=>({...c,id:String(i)})),s.seed,c.id)};
}
export function answerReview(s,id){
 const c=reviewCase(s),a=c?.choices.find(c=>c.id===id);if(!a||s.review.pending)return false;
 s.review.pending={id:c.id,choice:id,correct:a.correct};s.review.answers.push({...s.review.pending});s.events.push(['review-answer',id]);return true;
}
export function nextReview(s){
 if(!s.review?.pending||s.review.done)return false;
 s.review.index++;s.review.pending=null;s.review.done=s.review.index>=s.review.ids.length;s.events.push(['review-next']);return true;
}
export function serializeCampaign(s){return JSON.stringify({version:1,seed:s.seed,events:s.events});}
export function restoreCampaign(raw){
 try{
  const data=JSON.parse(raw);if(data.version!==1||!Number.isInteger(data.seed)||data.seed<0||data.seed>0xffffffff||!Array.isArray(data.events)||data.events.length>240)return null;
  const s=createCampaign(data.seed),handlers={answer,continue:continueCampaign,talk,hint:useReference,review:startReview,'review-answer':answerReview,'review-next':nextReview};
  for(const e of data.events){if(!Array.isArray(e)||typeof e[0]!=='string'||!Object.hasOwn(handlers,e[0])||!handlers[e[0]](s,e[1]))return null;}return s;
 }catch{return null;}
}
