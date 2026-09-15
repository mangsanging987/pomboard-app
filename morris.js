/* Nine Men's Morris. Board edges verified against the supplied image.
 * TODO: define timeout consequences and the exact ten-turn stalemate rule.
 * Protected mills never permit an exception capture; no target means no capture.
 */
(function (root) {
  'use strict';
  const names = 'A7 D7 G7 B6 D6 F6 C5 D5 E5 A4 B4 C4 E4 F4 G4 C3 D3 E3 B2 D2 F2 A1 D1 G1'.split(' ');
  const millNames = ['A7 D7 G7','B6 D6 F6','C5 D5 E5','A4 B4 C4','E4 F4 G4','C3 D3 E3','B2 D2 F2','A1 D1 G1','A7 A4 A1','B6 B4 B2','C5 C4 C3','D7 D6 D5','D3 D2 D1','E5 E4 E3','F6 F4 F2','G7 G4 G1'];
  const mills = millNames.map(s => s.split(' ').map(n => names.indexOf(n)));
  const adjacency = names.map(() => []);
  const edges = [];
  for (const m of mills) for (let j=0;j<2;j++) { const a=m[j],b=m[j+1]; adjacency[a].push(b);adjacency[b].push(a);edges.push([a,b]); }
  const count = (s,p) => s.board.filter(v=>v===p).length;
  const placing = s => s.reserve[1]+s.reserve[2]>0;
  const initial = () => ({board:Array(24).fill(0),reserve:[0,9,9],turn:1});
  const inMill = (b,i,p) => mills.some(m=>m.includes(i)&&m.every(n=>b[n]===p));
  const targets = (s,p) => names.map((_,i)=>i).filter(i=>s.board[i]===3-p&&!inMill(s.board,i,3-p));
  function moves(s,p=s.turn) {
    const empty=names.map((_,i)=>i).filter(i=>!s.board[i]);
    if(placing(s)) return s.reserve[p]>0?empty.map(to=>({from:-1,to})):[];
    const result=[]; const fly=count(s,p)===3;
    s.board.forEach((v,from)=>{if(v===p) for(const to of fly?empty:adjacency[from].filter(i=>!s.board[i])) result.push({from,to});});
    return result;
  }
  function place(s,m) {
    const n={board:s.board.slice(),reserve:s.reserve.slice(),turn:s.turn};
    if(m.from<0)n.reserve[s.turn]--;else n.board[m.from]=0;
    n.board[m.to]=s.turn;return n;
  }
  function turns(s) {
    const result=[];
    for(const m of moves(s)) {
      const n=place(s,m), mill=inMill(n.board,m.to,s.turn);
      const captures=mill?targets(n,s.turn):[];
      for(const capture of captures.length?captures:[-1]) result.push({...m,capture,mill});
    } return result;
  }
  function apply(s,t) {
    const n=place(s,t);if(t.capture>=0)n.board[t.capture]=0;n.turn=3-s.turn;return n;
  }
  function winner(s) {
    for(const p of [1,2]) if(count(s,p)+s.reserve[p]<3)return 3-p;
    if(!placing(s)&&!moves(s).length)return 3-s.turn;
    return 0;
  }
  function evaluate(s,p) {
    const w=winner(s);if(w)return w===p?100000:-100000;
    function value(q) {
      let v=(count(s,q)+s.reserve[q])*180;
      for(const m of mills) {
        const own=m.filter(i=>s.board[i]===q).length, other=m.some(i=>s.board[i]===3-q);
        if(!other) v += [0,4,65,95][own];
      }
      v+=moves(s,q).length*3;
      s.board.forEach((n,i)=>{if(n===q)v+=adjacency[i].length*2;});return v;
    } return value(p)-value(3-p);
  }
  function choose(s,level='normal',budget=550) {
    const p=s.turn, all=turns(s);if(!all.length)return null;
    const ordered=(state)=>turns(state).map(t=>({t,n:apply(state,t)})).sort((a,b)=>evaluate(b.n,state.turn)-evaluate(a.n,state.turn));
    const candidates=ordered(s);let best=candidates[0].t;
    if(level!=='hard')return best;
    const deadline=Date.now()+budget;let visited=0;
    function search(state,depth,alpha,beta) {
      if((++visited&63)===0&&Date.now()>deadline)throw new Error('budget');
      if(!depth||winner(state))return evaluate(state,p);
      const maximizing=state.turn===p;let score=maximizing?-Infinity:Infinity;
      for(const {n} of ordered(state)) {
        const v=search(n,depth-1,alpha,beta);
        score=maximizing?Math.max(score,v):Math.min(score,v);
        if(maximizing)alpha=Math.max(alpha,score);else beta=Math.min(beta,score);
        if(beta<=alpha)break;
      }return score;
    }
    // Iterative deepening only publishes a fully completed depth. No candidate truncation.
    for(let depth=2;depth<=4;depth++) {
      let score=-Infinity,next=best;
      try {for(const c of candidates) {if(Date.now()>deadline)throw new Error('budget');const v=search(c.n,depth-1,score,Infinity);if(v>score){score=v;next=c.t;}}best=next;}
      catch(e){if(e.message!=='budget')throw e;break;}
    }return best;
  }
  const api={names,mills,edges,adjacency,initial,count,placing,inMill,targets,moves,turns,apply,winner,evaluate,choose};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.MorrisEngine=api;
  // The same file is a worker so difficult searches do not block touch/paint.
  if(typeof document==='undefined') {
    if(typeof self!=='undefined'&&typeof self.postMessage==='function')self.onmessage=e=>self.postMessage(choose(e.data.state,e.data.level));
    return;
  }
  const $=id=>document.getElementById(id);
  let state=initial(),human=1,level='normal',selected=-1,pending=[],scores=[0,0,0],round=1,done=false,busy=false,worker=null,timer=null,epoch=0,notice='',lastAction=null;
  function cancel(){epoch++;if(worker)worker.terminate();worker=null;clearTimeout(timer);busy=false;}
  function screen(id){cancel();document.querySelectorAll('.screen').forEach(e=>e.classList.remove('active'));$(id).classList.add('active');window.scrollTo(0,0);}
  function coords(i){return [8+(names[i].charCodeAt(0)-65)*14,8+(7-Number(names[i][1]))*14];}
  const ns='http://www.w3.org/2000/svg';const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('aria-hidden','true');
  for(const [a,b] of edges){const l=document.createElementNS(ns,'line'),[x,y]=coords(a),[u,v]=coords(b);Object.entries({x1:x,y1:y,x2:u,y2:v}).forEach(([k,val])=>l.setAttribute(k,val));svg.appendChild(l);} $('morrisBoard').appendChild(svg);
  const buttons=names.map((name,i)=>{const b=document.createElement('button'),[x,y]=coords(i);b.className='morris-node';b.style.left=x+'%';b.style.top=y+'%';b.addEventListener('click',()=>tap(i));$('morrisBoard').appendChild(b);return b;});
  function render(){
    $('morrisScore').textContent=`${round}라운드 · 흑 ${scores[1]} : ${scores[2]} 백 · 나: ${human===1?'흑':'백'} · ${level==='hard'?'어려움':'보통'}`;
    $('morrisCounts').textContent=`흑: 판 ${count(state,1)} · 남은 배치 ${state.reserve[1]}  /  백: 판 ${count(state,2)} · 남은 배치 ${state.reserve[2]}`;
    const phase=placing(state)?'배치':count(state,state.turn)===3?'자유 이동':'이동';
    $('morrisStatus').textContent=done?notice:pending.length?'mill 완성! 표시된 상대 말을 제거하세요.':busy?'AI가 생각 중…':`${notice?notice+' ':''}${phase} · ${state.turn===human?'당신':'AI'}의 차례${selected>=0?' — 이동할 빈 점 선택':''}`;
    const legal=done||busy||state.turn!==human?[]:moves(state);
    buttons.forEach((b,i)=>{const capture=pending.some(t=>t.capture===i),dest=legal.some(m=>m.to===i&&(placing(state)||m.from===selected));b.className='morris-node'+(state.board[i]===1?' morris-black':state.board[i]===2?' morris-white':'')+(selected===i?' morris-selected':'')+(capture?' morris-capture':'')+(dest?' morris-destination':'');b.classList.toggle('ux-last-from',lastAction?.from===i);b.classList.toggle('ux-last-to',lastAction?.to===i);b.classList.toggle('ux-last-capture',lastAction?.capture===i);b.textContent=state.board[i]?'':names[i];b.setAttribute('aria-label',`${names[i]} ${state.board[i]===1?'흑':state.board[i]===2?'백':'빈 점'}${capture?' 제거 가능':''}`);b.disabled=done||busy||state.turn!==human||(pending.length?!capture:!dest&&!legal.some(m=>m.from===i));});
  }
  function finish(t,alreadyPlaced=false){
    lastAction={...t};ClubUX.action('morrisGame',t.capture>=0?'capture':t.from>=0?'move':'place');
    const p=state.turn;
    if(alreadyPlaced){if(t.capture>=0)state.board[t.capture]=0;state.turn=3-p;}else state=apply(state,t);
    selected=-1;pending=[];notice=t.mill&&t.capture<0?'보호되지 않은 상대 말이 없어 제거 없이 진행합니다.':'';
    const w=winner(state);
    if(w){done=true;scores[w]++;if(scores[w]===2)ClubUX.result('morris',w===1?'black':'white');notice=`${w===1?'흑':'백'} 진영 ${scores[w]===2?'매치':'라운드'} 승리!`;$('morrisResult').hidden=false;$('morrisResultTitle').textContent=notice;$('morrisNext').textContent=scores[w]===2?'재대결!':'다음 라운드';}
    render();if(!done)think();
  }
  function tap(i){
    if(done||busy||state.turn!==human)return;
    if(pending.length){const t=pending.find(t=>t.capture===i);if(t)finish(t,true);return;}
    if(!placing(state)&&state.board[i]===human){selected=selected===i?-1:i;render();return;}
    const choices=turns(state).filter(t=>t.to===i&&(placing(state)||t.from===selected));if(!choices.length)return;
    if(choices[0].capture>=0){lastAction={...choices[0],capture:-1};ClubUX.action('morrisGame',choices[0].from>=0?'move':'place');state=place(state,choices[0]);pending=choices;selected=-1;notice='';render();}else finish(choices[0]);
  }
  function think(){
    if(done||state.turn===human)return;busy=true;render();const token=epoch;
    const accept=t=>{if(token!==epoch)return;if(worker)worker.terminate();worker=null;busy=false;const valid=turns(state).find(m=>m.from===t?.from&&m.to===t.to&&m.capture===t.capture);finish(valid||choose(state,'normal'));};
    const fallback=()=>{if(worker)worker.terminate();worker=null;timer=setTimeout(()=>{if(token===epoch)accept(choose(state,'normal'));},60);};
    try{worker=new Worker('morris.js');worker.onmessage=e=>accept(e.data);worker.onerror=fallback;worker.postMessage({state,level});}catch(e){fallback();}
  }
  function newRound(){lastAction=null;cancel();state=initial();selected=-1;pending=[];done=false;notice='';$('morrisResult').hidden=true;render();think();}
  function newMatch(){ClubUX.begin('morris');scores=[0,0,0];round=1;newRound();}
  $('morrisOpen').addEventListener('click',()=>screen('morrisSetup'));
  $('morrisHome').addEventListener('click',()=>screen('homeScreen'));
  $('morrisBack').addEventListener('click',()=>screen('morrisSetup'));
  $('morrisStart').addEventListener('click',()=>{human=Number($('morrisColor').value);level=$('morrisLevel').value;screen('morrisGame');newMatch();});
  $('morrisRestart').addEventListener('click',newMatch);
  $('morrisNext').addEventListener('click',()=>{if(Math.max(...scores)===2)newMatch();else{round++;newRound();}});
})(typeof globalThis!=='undefined'?globalThis:this);
