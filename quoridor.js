/* Quoridor rules and AI. Coordinates are row-major 0..80; BLACK=0, WHITE=1.
   Walls anchor at the upper-left of a 2x2 square: h blocks rows, v blocks columns. */
(function(root){
'use strict';
const dirs=[[-1,0],[0,1],[1,0],[0,-1]],inside=(r,c)=>r>=0&&r<9&&c>=0&&c<9;
const initial=()=>({pawns:[76,4],remaining:[10,10],walls:[],turn:0,winner:null,last:null});
const graphs=new WeakMap();
function graph(s){if(graphs.has(s))return graphs.get(s);const g=new Uint8Array(81);for(let n=0;n<81;n++)for(let d=0;d<4;d++)if(inside((n/9|0)+dirs[d][0],n%9+dirs[d][1]))g[n]|=1<<d;
function cut(a,b,d){g[a]&=~(1<<d);g[b]&=~(1<<((d+2)%4));}
for(const w of s.walls){const a=w.r*9+w.c;if(w.o==='h'){cut(a,a+9,2);cut(a+1,a+10,2);}else{cut(a,a+1,1);cut(a+9,a+10,1);}}graphs.set(s,g);return g;}
const next=(n,d)=>n+dirs[d][0]*9+dirs[d][1];
function shortestPath(s,p){const g=graph(s),start=s.pawns[p],goal=p===0?0:8,q=new Int16Array(81),prev=new Int16Array(81);prev.fill(-1);prev[start]=start;q[0]=start;let head=0,tail=1;
while(head<tail){const n=q[head++];if((n/9|0)===goal){const path=[n];while(path[path.length-1]!==start)path.push(prev[path[path.length-1]]);path.reverse();return {distance:path.length-1,path};}for(let d=0;d<4;d++)if(g[n]&(1<<d)){const m=next(n,d);if(prev[m]===-1){prev[m]=n;q[tail++]=m;}}}return {distance:Infinity,path:[]};}
function pawnMoves(s,p=s.turn){if(s.winner!==null)return [];const a=s.pawns[p],b=s.pawns[1-p],g=graph(s),out=[];for(let d=0;d<4;d++)if(g[a]&(1<<d)){const n=next(a,d);if(n!==b)out.push(n);else if(g[b]&(1<<d))out.push(next(b,d));else for(const side of [(d+1)%4,(d+3)%4])if(g[b]&(1<<side))out.push(next(b,side));}return [...new Set(out)];}
function wallShapeLegal(s,w){if(!w||!['h','v'].includes(w.o)||!Number.isInteger(w.r)||!Number.isInteger(w.c)||w.r<0||w.r>7||w.c<0||w.c>7)return false;return !s.walls.some(x=>x.o===w.o?(w.o==='h'?x.r===w.r&&Math.abs(x.c-w.c)<2:x.c===w.c&&Math.abs(x.r-w.r)<2):x.r===w.r&&x.c===w.c);}
function wallLegal(s,w,p=s.turn){if(s.winner!==null||s.remaining[p]<=0||!wallShapeLegal(s,w))return false;const t={...s,walls:[...s.walls,w]};return [0,1].every(p=>Number.isFinite(shortestPath(t,p).distance));}
function legal(s,a){return !!a&&(a.type==='move'?pawnMoves(s).includes(a.to):a.type==='wall'&&wallLegal(s,a));}
function apply(s,a){if(!legal(s,a))return null;return applyLegal(s,a);}
function applyLegal(s,a){const p=s.turn,t={...s,pawns:[...s.pawns],remaining:[...s.remaining],walls:s.walls,turn:1-p,last:{...a,player:p}};if(a.type==='move'){t.last.from=s.pawns[p];t.pawns[p]=a.to;if((a.to/9|0)===(p===0?0:8))t.winner=p;}else{t.walls=[...s.walls,{r:a.r,c:a.c,o:a.o}];t.remaining[p]--;}return t;}
function actions(s){const list=pawnMoves(s).map(to=>({type:'move',to}));if(s.remaining[s.turn]>0&&s.winner===null)for(const o of ['h','v'])for(let r=0;r<8;r++)for(let c=0;c<8;c++){const a={type:'wall',o,r,c};if(wallLegal(s,a))list.push(a);}return list;}
function evaluate(s,p){if(s.winner!==null)return s.winner===p?100000:-100000;const own=shortestPath(s,p).distance,opp=shortestPath(s,1-p).distance;let score=(opp-own)*100+(s.remaining[p]-s.remaining[1-p])*5;const winNow=pawnMoves(s,s.turn).some(n=>(n/9|0)===(s.turn===0?0:8));if(winNow)score+=s.turn===p?20000:-20000;return score;}
function chooseAI(s,level='normal',random=Math.random){if(s.winner!==null)return null;const p=s.turn,start=Date.now(),deadline=start+1200;const list=actions(s);const winning=list.find(a=>a.type==='move'&&(a.to/9|0)===(p===0?0:8));if(winning)return winning;
function ranked(t,limit){const who=t.turn;return actions(t).map(a=>{const child=applyLegal(t,a);return {a,child,value:evaluate(child,who)};}).sort((a,b)=>b.value-a.value).slice(0,limit);}
let root=list.map(a=>({a,child:applyLegal(s,a)})).map(x=>({...x,value:evaluate(x.child,p)})).sort((a,b)=>b.value-a.value);
if(level!=='hard'){const top=root.filter(x=>x.value>=root[0].value-110).slice(0,5);const weights=top.map(x=>Math.exp((x.value-top[0].value)/45));let pick=random()*weights.reduce((a,b)=>a+b,0);for(let i=0;i<top.length;i++){pick-=weights[i];if(pick<=0)return top[i].a;}return top[0].a;}
// All walls are examined at the root. Ordering favors walls changing shortest paths;
// bounded adversarial search runs off the UI thread, retaining the last completed depth.
root=root.slice(0,12);let best=root[0].a;const timeout={};
function search(t,depth,alpha,beta){if(Date.now()>deadline)throw timeout;if(!depth||t.winner!==null)return evaluate(t,p);const max=t.turn===p;let value=max?-Infinity:Infinity;for(const x of ranked(t,depth===1?5:8)){const v=search(x.child,depth-1,alpha,beta);value=max?Math.max(value,v):Math.min(value,v);if(max)alpha=Math.max(alpha,value);else beta=Math.min(beta,value);if(beta<=alpha)break;}return value;}
for(const depth of [2,3]){let candidate=best,value=-Infinity;try{for(const x of root){const v=search(x.child,depth-1,-Infinity,Infinity);if(v>value){value=v;candidate=x.a;}}best=candidate;}catch(e){if(e!==timeout)throw e;break;}}return legal(s,best)?best:list[0];}
const api={initial,shortestPath,pawnMoves,wallLegal,wallShapeLegal,legal,apply,actions,evaluate,chooseAI};root.QuoridorEngine=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

/* Browser presentation: the same engine drives highlights, walls and final AI commit. */
if(typeof document!=='undefined')(()=>{
'use strict';const E=window.QuoridorEngine,$=id=>document.getElementById(id),color=p=>p===0?'black':'white',asset=(p,pose='default')=>`assets/dogs/${color(p)}-${pose}.webp`;
let state=E.initial(),human=0,level='normal',pawnSelected=false,preview=null,busy=false,generation=0,worker=null,timer=null,active=false;
function show(id){ClubPlay.enter(id);document.querySelectorAll('.screen').forEach(e=>e.classList.toggle('active',e.id===id));window.scrollTo(0,0);}
function stop(){generation++;clearTimeout(timer);worker?.terminate();worker=null;busy=false;active=false;preview=null;pawnSelected=false;gesture=null;$('qResult').close();}
function leave(id){stop();show(id);}
function start(){stop();human=$('qColor').value==='black'?0:1;level=$('qLevel').value;state=E.initial();pawnSelected=false;preview=null;active=true;ClubUX.begin('quoridor');show('qGame');render();schedule();}
const coord=n=>`${String.fromCharCode(65+n%9)}${9-(n/9|0)}`;
function makeBoard(){const b=$('qCells');for(let n=0;n<81;n++){const el=document.createElement('button');el.className='q-cell';el.dataset.cell=n;el.setAttribute('aria-label',coord(n));el.onclick=e=>{if(e.detail===0&&canSelect())activate({type:'cell',to:n});};b.append(el);}for(let p=0;p<2;p++){const token=document.createElement('div');token.className='q-token q-'+color(p);token.id='qPawn'+p;token.innerHTML=`<img src="${asset(p)}" alt="${color(p).toUpperCase()} 포메라니안" draggable="false"><b>${p===0?'B':'W'}</b>`;$('qBoard').append(token);}}

function render(){ClubPlay.turn('quoridor',color(state.turn));const yours=active&&!busy&&state.winner===null&&ClubPlay.human('quoridor',state.turn,human);const moves=pawnSelected&&yours?E.pawnMoves(state):[];
$('qStatus').textContent=state.winner!==null?`${color(state.winner).toUpperCase()} 승리!`:`${ClubPlay.local('quoridor')?ClubPlay.label(color(state.turn))+' 차례':color(state.turn).toUpperCase()} · ${busy?'AI가 생각 중…':yours?(ClubPlay.local('quoridor')?'한 수를 선택하세요':'내 차례'): 'AI 차례'}`;
$('qCounts').innerHTML=[0,1].map(p=>`<span class="${state.turn===p?'q-current':''}"><i class="q-side q-${color(p)}"></i>${color(p).toUpperCase()} <b>벽 ${state.remaining[p]}</b></span>`).join('');

$('qSlots').hidden=true;
for(const el of $('qCells').children){const n=Number(el.dataset.cell);el.disabled=!(moves.includes(n)||(yours&&n===state.pawns[ClubPlay.local('quoridor')?state.turn:human]));el.setAttribute('aria-pressed',n===state.pawns[ClubPlay.local('quoridor')?state.turn:human]&&pawnSelected&&yours?'true':'false');el.classList.toggle('q-legal',moves.includes(n));el.classList.toggle('q-from',state.last?.type==='move'&&state.last.from===n);el.classList.toggle('q-to',state.last?.type==='move'&&state.last.to===n);}
for(let p=0;p<2;p++){const el=$('qPawn'+p),n=state.pawns[p];el.style.left=((n%9+.5)/9*100)+'%';el.style.top=(((n/9|0)+.5)/9*100)+'%';el.classList.toggle('q-selected',p===(ClubPlay.local('quoridor')?state.turn:human)&&pawnSelected&&yours);// Pawns always retain the default pose; thinking lives above the board.
}
$('qThinking').hidden=!busy;$('qThinking').src=asset(1-human,'thinking');
$('qWalls').innerHTML=state.walls.map((w,i)=>wallHTML(w,i===state.walls.length-1&&state.last?.type==='wall'?'q-last-wall':'')).join('');
const candidate=yours&&preview,ok=candidate&&E.wallLegal(state,preview);
if(candidate)$('qWalls').insertAdjacentHTML('beforeend',wallHTML(preview,'q-preview'+(ok?'':' q-preview-invalid')));
$('qHint').textContent=!yours?(busy?'AI가 생각 중…':''):preview?(ok?`${coord(preview.r*9+preview.c)} · ${preview.o==='h'?'가로':'세로'} 벽 — 같은 위치를 한 번 더 누르면 설치`:'여기에는 벽을 설치할 수 없어요. 다른 틈이나 내 강아지를 누르세요.'):pawnSelected?'작은 점을 누르면 이동 · 틈을 누르면 벽 선택':'내 강아지를 누르면 이동 · 칸 사이 틈을 두 번 누르면 벽 설치';
const last=state.last;$('qLast').textContent=last?`${color(last.player).toUpperCase()} · ${last.type==='move'?coord(last.from)+' → '+coord(last.to):`${last.o==='h'?'가로':'세로'} 벽 ${coord(last.r*9+last.c)}`}`:'BLACK 선공 · 각자 벽 10개';
}
function wallHTML(w,cls){const h=w.o==='h';return `<i class="q-fence ${h?'q-h':'q-v'} ${cls}" style="left:${(w.c+(h?0:1))/9*100}%;top:${(w.r+(h?1:0))/9*100}%"></i>`;}
function commit(a,fromAI=false){if(fromAI&&!ClubPlay.ai('quoridor'))return;if(!active||state.winner!==null||(!fromAI&&(busy||!ClubPlay.human('quoridor',state.turn,human))))return;const t=E.apply(state,a);if(!t)return;state=t;preview=null;pawnSelected=false;busy=false;ClubUX.action('qGame',a.type==='wall'?'place':'move');render();if(state.winner!==null){ClubUX.result('quoridor',color(state.winner));$('qResultTitle').textContent=`${color(state.winner).toUpperCase()} WINS!`;$('qResultDogs').innerHTML=[0,1].map(p=>`<img src="${asset(p,p===state.winner?'win':'lose')}" alt="${color(p).toUpperCase()} ${p===state.winner?'승리':'패배'}">`).join('');$('qResult').showModal();$('qAgain').focus();}else schedule();}
function schedule(){if(!ClubPlay.ai('quoridor')||!active||state.winner!==null||ClubPlay.human('quoridor',state.turn,human))return;busy=true;render();const ticket=generation;
const finish=a=>{if(ticket!==generation||!active||!ClubPlay.ai('quoridor'))return;worker?.terminate();worker=null;const safe=E.legal(state,a)?a:E.pawnMoves(state).map(to=>({type:'move',to}))[0];commit(safe,true);};
const fallback=()=>{if(ticket!==generation||!active||!ClubPlay.ai('quoridor'))return;worker?.terminate();worker=null;timer=setTimeout(()=>{if(ticket===generation&&active&&ClubPlay.ai('quoridor'))finish(E.chooseAI(state,level));},30);};
timer=setTimeout(()=>{if(ticket!==generation||!active||!ClubPlay.ai('quoridor'))return;try{worker=new Worker('quoridor-worker.js');worker.onmessage=e=>finish(e.data);worker.onerror=()=>fallback();worker.postMessage({state,level});}catch(_){fallback();}},180);
}
$('qOpen').onclick=()=>show('qSetup');$('qHome').onclick=()=>leave('homeScreen');$('qBack').onclick=()=>leave('qSetup');$('qStart').onclick=start;$('qAgain').onclick=start;$('qSettings').onclick=()=>leave('qSetup');$('qResultHome').onclick=()=>leave('homeScreen');
$('qResult').addEventListener('cancel',e=>e.preventDefault());

// Preview is a locked selection. Pointer motion never writes it.
let gesture=null;
const canSelect=()=>active&&!busy&&state.winner===null&&ClubPlay.human('quoridor',state.turn,human);
const same=(a,b)=>a&&b&&a.r===b.r&&a.c===b.c&&a.o===b.o;
function candidateAt(e){
  const rect=$('qBoard').getBoundingClientRect();
  const x=(e.clientX-rect.left)/rect.width*9,y=(e.clientY-rect.top)/rect.height*9;
  if(x<0||x>9||y<0||y>9)return null;
  let best=null,score=Infinity;
  for(const o of ['h','v'])for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const dx=x-c-1,dy=y-r-1;
    const along=o==='h'?dx:dy,across=o==='h'?dy:dx;
    // Only narrow gap corridors are wall targets; cell centers never qualify.
    if(Math.abs(across)>.18||Math.abs(along)>1)continue;
    // Distance to the two-cell slot, with a center preference resolving shared ends.
    const d=across*across+Math.max(0,Math.abs(along)-1)**2+.05*along*along;
    if(d<score){score=d;best={type:'wall',o,r,c};}
  }
  return best;
}
// Resolve the target once on pointerdown; no hover or compatibility-click mutation.
function targetAt(e){
  const rect=$('qBoard').getBoundingClientRect();
  const x=(e.clientX-rect.left)/rect.width*9,y=(e.clientY-rect.top)/rect.height*9;
  if(x<0||x>=9||y<0||y>=9)return null;
  const n=Math.floor(y)*9+Math.floor(x),dx=Math.abs(x%1-.5),dy=Math.abs(y%1-.5);
  if(n===state.pawns[ClubPlay.local('quoridor')?state.turn:human]&&dx<.44&&dy<.45)return {type:'cell',to:n};
  if(pawnSelected&&dx<.32&&dy<.32&&E.pawnMoves(state).includes(n))return {type:'cell',to:n};
  return candidateAt(e);
}
function activate(a){
  if(!canSelect())return;
  if(a?.type==='cell'){
    if(a.to===state.pawns[ClubPlay.local('quoridor')?state.turn:human]){preview=null;pawnSelected=!pawnSelected;render();}
    else if(pawnSelected&&E.pawnMoves(state).includes(a.to))commit({type:'move',to:a.to});
    return;
  }
  if(!a){pawnSelected=false;preview=null;render();return;}
  pawnSelected=false;
  if(same(preview,a)){commit(a);return;}
  preview=a;render();
}
ClubPlay.register('quoridor',stop);
makeBoard();
const slots=$('qBoard');
slots.addEventListener('pointerdown',e=>{
  if(!canSelect()||!e.isPrimary||e.button!==0||gesture)return;
  gesture={id:e.pointerId,x:e.clientX,y:e.clientY,candidate:targetAt(e)};
  slots.setPointerCapture(e.pointerId);
});
slots.addEventListener('pointerup',e=>{
  if(!gesture||gesture.id!==e.pointerId)return;
  const g=gesture;gesture=null;
  if(slots.hasPointerCapture(e.pointerId))slots.releasePointerCapture(e.pointerId);
  if(Math.hypot(e.clientX-g.x,e.clientY-g.y)<=12)activate(g.candidate);
});
slots.addEventListener('pointercancel',()=>{gesture=null;});
slots.addEventListener('lostpointercapture',()=>{gesture=null;});
// No click/touch handlers: compatibility clicks cannot confirm a first tap twice.
})();
