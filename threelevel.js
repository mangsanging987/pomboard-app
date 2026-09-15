/* 3층 오목 — independent rules, AI worker and namespaced UI.
 * Reference rows: 4,7,8,9,10,9,10,9,8,7,4 (85 points), NOT a regular radius-5 hexagon.
 * Stacks are bottom → top arrays of 'black'/'white'.
 */
(function(root){
  'use strict';
  const COLORS=['black','white'], other=p=>p==='black'?'white':'black';
  const rowCounts=[4,7,8,9,10,9,10,9,8,7,4];
  const points=[];
  rowCounts.forEach((n,row)=>{const r=row-5;for(let j=0;j<n;j++){const x=j-(n-1)/2;points.push({q:x-r/2,r,x,y:r*Math.sqrt(3)/2,row,col:j});}});
  const lookup=new Map(points.map((p,i)=>[`${p.q},${p.r}`,i]));
  const at=(q,r)=>lookup.get(`${q},${r}`);
  const dirs=[[1,0],[0,1],[-1,1]], six=[...dirs,...dirs.map(([q,r])=>[-q,-r])];
  const adjacency=points.map(p=>six.map(([q,r])=>at(p.q+q,p.r+r)).filter(i=>i!==undefined));
  const edges=[];adjacency.forEach((ns,i)=>ns.forEach(j=>{if(i<j)edges.push([i,j]);}));
  const lines=[];
  for(const [dq,dr] of dirs)points.forEach(p=>{if(at(p.q-dq,p.r-dr)!==undefined)return;const line=[];let q=p.q,r=p.r,i;while((i=at(q,r))!==undefined){line.push(i);q+=dq;r+=dr;}lines.push(line);});
  const center=at(0,0),top=stack=>stack[stack.length-1];
  const initial=(first='black')=>({board:points.map(()=>[]),reserve:{black:25,white:25},first,turn:first,setup:0,last:null});
  const setupOrder=s=>[s.first,other(s.first),other(s.first),s.first,s.first,other(s.first)];
  const isSetup=s=>s.setup<6;
  // Assumption isolated here: only a stack's top stone can move. Hidden stones cannot be extracted.
  function movableStone(s,from,p){return top(s.board[from])===p?s.board[from].length-1:-1;}
  const allowedHeight=(from,to)=>({1:[2],2:[1,2,3],3:[1,2,3]}[from]||[]).includes(to);
  function canMove(s,from,to,p=s.turn){
    return !isSetup(s)&&!!s.board[from]&&!!s.board[to]&&
      movableStone(s,from,p)>=0&&adjacency[from].includes(to)&&
      allowedHeight(s.board[from].length,s.board[to].length+1);
  }
  function legalActions(s,p=s.turn){
    const actions=[];
    s.board.forEach((stack,to)=>{if(stack.length||s.reserve[p]<=0)return;if(isSetup(s)&&(to===center||adjacency[to].some(i=>top(s.board[i])===p)))return;actions.push({from:-1,to});});
    if(!isSetup(s))s.board.forEach((stack,from)=>{if(movableStone(s,from,p)<0)return;for(const to of adjacency[from])if(canMove(s,from,to,p))actions.push({from,to});});
    return actions;
  }
  function apply(s,a){
    const n={...s,board:s.board.map(v=>v.slice()),reserve:{...s.reserve},last:{...a,player:s.turn}};
    if(a.from<0)n.reserve[s.turn]--;else n.board[a.from].pop();
    n.board[a.to].push(s.turn);
    if(isSetup(s)){n.setup++;n.turn=n.setup<6?setupOrder(n)[n.setup]:n.first;}else n.turn=other(s.turn);
    return n;
  }
  // Assumption: "three adjacent points" means a connected group of >=3 (chain, bend or triangle).
  // Change only this function if the intended rule requires a mutually adjacent triangle.
  function adjacentTriple(s,p){
    return s.board.some((b,i)=>b.length===3&&top(b)===p&&adjacency[i].filter(j=>s.board[j].length===3&&top(s.board[j])===p).length>=2);
  }
  function winReasons(s,p){
    const reasons=[];
    if(lines.some(line=>{let run=0;for(const i of [...line,-1]){if(i>=0&&top(s.board[i])===p)run++;else{if(run===5)return true;run=0;}}return false;}))reasons.push('정확히 5목');
    if(s.board.filter(b=>b.length===3&&top(b)===p).length>=5)reasons.push('3층 스택 5개');
    if(adjacentTriple(s,p))reasons.push('인접한 3층 스택 3개');return reasons;
  }
  function winner(s,mover=s.last?.player){if(isSetup(s))return null;for(const p of mover?[mover,other(mover)]:COLORS){const reasons=winReasons(s,p);if(reasons.length)return {player:p,reasons};}return null;}
  function evaluate(s,p){
    const w=winner(s);if(w)return w.player===p?1000000:-1000000;
    function value(c){let score=0;const heights=[];
      s.board.forEach((b,i)=>{if(top(b)!==c)return;const t=points[i];score+=8+adjacency[i].length*2-Math.hypot(t.x,t.y);if(b.length===3){heights.push(i);score+=170;}else if(b.length===2)score+=24;score+=adjacency[i].filter(j=>top(s.board[j])===c).length*3;});
      for(const i of heights)score+=adjacency[i].filter(j=>heights.includes(j)).length*95;
      for(const line of lines)for(let start=0;start<=line.length-5;start++){
        const window=line.slice(start,start+5),own=window.filter(i=>top(s.board[i])===c).length;
        if(window.some(i=>top(s.board[i])===other(c)))continue;
        if((start>0&&top(s.board[line[start-1]])===c)||(start+5<line.length&&top(s.board[line[start+5]])===c))continue;
        score += [0,2,16,100,900,100000][own];
      }
      score+=legalActions(s,c).filter(a=>a.from>=0).length*2;return score;
    }return value(p)-value(other(p))*1.08;
  }
  function choose(s,level='normal',budget=650){
    const p=s.turn,all=legalActions(s);if(!all.length)return null;
    const ranked=state=>legalActions(state).map(a=>{const n=apply(state,a);return {a,n,v:evaluate(n,state.turn)};}).sort((a,b)=>b.v-a.v);
    let candidates=ranked(s);
    const win=candidates.find(c=>winner(c.n)?.player===p);if(win)return win.a;
    // Exhaustive immediate-reply safety check before selective deeper search: placement AND movement.
    if(!isSetup(s)){
      for(const c of candidates)c.unsafe=legalActions(c.n).some(a=>winner(apply(c.n,a))?.player===other(p));
      const safe=candidates.filter(c=>!c.unsafe);if(safe.length)candidates=safe;
    }
    let best=candidates[0].a;if(level!=='hard')return best;
    const deadline=Date.now()+budget;
    function search(state,depth,alpha,beta){
      if(Date.now()>deadline)throw new Error('budget');
      if(!depth||winner(state))return evaluate(state,p);
      const maximizing=state.turn===p;let result=maximizing?-Infinity:Infinity;
      let children=ranked(state);if(!children.length)return evaluate(state,p);
      // Beam is ordered on full legal actions. Preserve all immediate wins.
      children=children.filter((c,i)=>i<12||winner(c.n)?.player===state.turn);
      for(const c of children){const v=search(c.n,depth-1,alpha,beta);result=maximizing?Math.max(result,v):Math.min(result,v);if(maximizing)alpha=Math.max(alpha,result);else beta=Math.min(beta,result);if(beta<=alpha)break;}return result;
    }
    for(let depth=2;depth<=3;depth++){
      let next=best,score=-Infinity;
      try{for(const c of candidates.slice(0,18)){const v=search(c.n,depth-1,score,Infinity);if(v>score){score=v;next=c.a;}}best=next;}catch(e){if(e.message!=='budget')throw e;break;}
    }return best;
  }
  const api={points,rowCounts,at,center,adjacency,edges,lines,initial,other,top,isSetup,movableStone,allowedHeight,canMove,legalActions,apply,adjacentTriple,winReasons,winner,evaluate,choose};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ThreeLevelEngine=api;
  if(typeof document==='undefined'){if(typeof self!=='undefined'&&self.postMessage)self.onmessage=e=>self.postMessage(choose(e.data.state,e.data.level));return;}
  const $=id=>document.getElementById(id),name=p=>p==='black'?'흑':'백';
  let state=initial(),human='black',level='normal',selected=-1,busy=false,done=true,worker=null,timer=null,epoch=0,scores={black:0,white:0},round=1,loser=null;
  function cancel(){epoch++;worker?.terminate();worker=null;clearTimeout(timer);busy=false;}
  function screen(id){cancel();ClubPlay.enter(id);document.querySelectorAll('.screen').forEach(e=>e.classList.toggle('active',e.id===id));window.scrollTo(0,0);}
  function coords(i){const p=points[i];return [50+p.x*9,50+p.y*9];}
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('aria-hidden','true');
  for(const [a,b] of edges){const line=document.createElementNS(svg.namespaceURI,'line'),[x,y]=coords(a),[u,v]=coords(b);Object.entries({x1:x,y1:y,x2:u,y2:v}).forEach(([k,v])=>line.setAttribute(k,v));svg.appendChild(line);} $('threeBoard').appendChild(svg);
  const buttons=points.map((p,i)=>{const b=document.createElement('button'),[x,y]=coords(i);b.className='three-node';b.style.left=x+'%';b.style.top=y+'%';b.addEventListener('click',()=>tap(i));$('threeBoard').appendChild(b);return b;});
  function render(){
    ClubPlay.turn('three',state.turn);
    $('threeScore').textContent=`${round}라운드 / 최대 3 · 흑 ${scores.black} : ${scores.white} 백 · 먼저 2승`;
    for(const p of COLORS){$('threeCount'+name(p)).textContent=`${name(p)} · ${ClubPlay.local('three')?ClubPlay.label(p):p===human?'나':'AI'} · 보유 ${state.reserve[p]}`;}
    $('threeStatus').textContent=done?'아래에서 다음 진행을 선택하세요.':`${ClubPlay.local('three')?ClubPlay.label(state.turn)+' 차례':state.turn===human?'당신':'AI'} (${name(state.turn)}) · `+(isSetup(state)?`기본 배치 ${state.setup+1}/6 · 이번 순서 ${[1,2,1,2,1,1][state.setup]}개 남음${busy?" · 생각 중…":""}`:busy?'생각 중…':selected<0?'빈 곳을 누르면 놓기 · 내 돌을 누르면 이동':'강조된 목적지를 누르세요 · 같은 돌은 선택 해제');
    const legal=!done&&!busy&&ClubPlay.human('three',state.turn,human)?legalActions(state):[];
    buttons.forEach((b,i)=>{
      const stack=state.board[i],height=stack.length,c=top(stack),source=!isSetup(state)&&!done&&!busy&&ClubPlay.human('three',state.turn,human)&&c===state.turn,dest=legal.some(a=>a.to===i&&(selected<0?a.from<0:a.from===selected));
      b.className='three-node'+(source?' three-source':'')+(dest&&selected>=0?' three-dest three-move-dest':'')+(selected===i?' three-selected':'')+(state.last?.to===i?' three-last ux-last-to':'')+(state.last?.from===i?' ux-last-from':'');
      b.innerHTML=height?`${Array.from({length:height},(_,k)=>`<span class="three-stone ${k===height-1?c:'three-under'}" style="--layer:${k}"></span>`).join('')}${height>1?`<span class="three-height three-height-${height}">${height}</span>`:''}`:`<span class="three-point">${i===center?'·':''}</span>`;
      b.disabled=!(source||dest||(selected>=0&&!done&&!busy&&ClubPlay.human('three',state.turn,human)&&!height));b.setAttribute('aria-pressed',selected===i?'true':'false');b.setAttribute('aria-label',`${pLabel(i)} ${height?name(c)+' '+height+'층':'빈 점'}${source?' 이동 가능':''}${dest&&selected>=0?' 이동 목적지':''}`);
    });
    $('threeHint').textContent=isSetup(state)?'중앙 및 내 돌과 인접한 점은 기본 배치할 수 없어요.':`이동: 1→2층 · 2→1/2/3층 · 3→1/2/3층${!state.reserve[ClubPlay.local('three')?state.turn:human]?' · 보유 돌 소진: 이동만 가능':''}`;
  }
  function pLabel(i){return `${points[i].row+1}행 ${points[i].col+1}번째`;}
  function finish(a){
    if(!a){endRound(null,['합법수가 없어 무승부 · 같은 라운드 재대결']);return;}
    ClubUX.action('threeGame',a.from>=0?'move':'place');state=apply(state,a);selected=-1;const w=winner(state);if(w){endRound(w.player,w.reasons);return;}
    if(!legalActions(state).length){endRound(null,['합법수가 없어 무승부 · 같은 라운드 재대결']);return;}
    render();think();
  }
  function endRound(p,reasons){cancel();done=true;if(p){scores[p]++;if(scores[p]===2)ClubUX.result('three',p);loser=other(p);}else loser=null;
    $('threeResult').hidden=false;$('threeResultTitle').textContent=p?`${name(p)} ${scores[p]===2?'매치':'라운드'} 승리!`:'무승부';$('threeReason').textContent=reasons.join(' · ');
    $('threeNext').textContent=Math.max(...Object.values(scores))===2?'재대결!':'선후공 선택 후 시작';$('threeOrderBox').hidden=Math.max(...Object.values(scores))===2;
    $('threeChooser').textContent=loser?`직전 패자: ${name(loser)} (${ClubPlay.local('three')?ClubPlay.label(loser):loser===human?'나':'AI'}) · 다음 라운드 선후공`: '같은 라운드 선후공';
    // Manual order selection explicitly stands in for the original vote / AI loser's decision.
    render();
  }
  function tap(i){
    if(done||busy||!ClubPlay.human('three',state.turn,human))return;
    const legal=legalActions(state);
    if(isSetup(state)){
      const placement=legal.find(a=>a.from<0&&a.to===i);
      if(placement)finish(placement);
      return;
    }
    if(selected===i){selected=-1;render();return;}
    // A highlighted destination takes priority, even when its top stone is mine.
    if(selected>=0){
      const move=legal.find(a=>a.from===selected&&a.to===i);
      if(move){finish(move);return;}
      selected=top(state.board[i])===state.turn?i:-1;
      render();return; // Never place a new stone on the same tap that cancels selection.
    }
    if(top(state.board[i])===state.turn){selected=i;render();return;}
    const placement=legal.find(a=>a.from<0&&a.to===i);
    if(placement)finish(placement);
  }
  function think(){if(!ClubPlay.ai('three')||done||ClubPlay.human('three',state.turn,human))return;busy=true;render();const token=epoch;
    const accept=a=>{if(token!==epoch||!ClubPlay.ai('three'))return;worker?.terminate();worker=null;busy=false;const legal=legalActions(state);finish(legal.find(m=>m.from===a?.from&&m.to===a?.to)||legal[0]);};
    const fallback=()=>{if(token!==epoch||!ClubPlay.ai('three'))return;worker?.terminate();worker=null;timer=setTimeout(()=>{if(token===epoch&&ClubPlay.ai('three'))accept(choose(state,level,250));},60);};
    try{worker=new Worker('threelevel.js');worker.onmessage=e=>accept(e.data);worker.onerror=fallback;worker.postMessage({state,level});}catch(e){fallback();}
  }
  function newRound(first){cancel();state=initial(first);selected=-1;done=false;$('threeResult').hidden=true;render();think();}
  $('threeOpen').addEventListener('click',()=>screen('threeSetup'));
  $('threeHome').addEventListener('click',()=>screen('homeScreen'));
  $('threeBack').addEventListener('click',()=>screen('threeSetup'));
  $('threeRestart').addEventListener('click',()=>screen('threeSetup'));
  $('threeStart').addEventListener('click',()=>{ClubUX.begin('three');human=ClubPlay.local('three')?'black':$('threeColor').value;level=$('threeLevel').value;scores={black:0,white:0};round=1;loser=null;screen('threeGame');newRound($('threeFirst').value==='me'?human:other(human));});
  $('threeNext').addEventListener('click',()=>{if(Math.max(...Object.values(scores))===2){$('threeStart').click();return;}if(loser)round++;newRound($('threeNextFirst').value==='me'?human:other(human));});
  ClubPlay.register('three',cancel);
})(typeof globalThis!=='undefined'?globalThis:this);
