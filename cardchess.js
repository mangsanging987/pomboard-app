/* Card Chess: shared immutable rules for UI and worker AI. */
(() => {
  'use strict';
  const CARDS = ['Rook','Bishop','Attacker','Knight','Jumper'];
  const NAMES = {Rook:'룩',Bishop:'비숍',Attacker:'어태커',Knight:'나이트',Jumper:'점퍼',Queen:'퀸'};
  const ORTH = [[1,0],[-1,0],[0,1],[0,-1]], DIAG = [[1,1],[1,-1],[-1,1],[-1,-1]], ALL = [...ORTH,...DIAG];
  const KNIGHT = [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]];
  const castle = p => p === 0 ? 22 : 2;
  const type = (s,c) => c === 'Jumper' && s.queen ? 'Queen' : c;
  function initial(first = 0) {
    const board = Array(25).fill(null);
    for(let x=0;x<5;x++){board[x]={id:'a'+x,p:1,d:1};board[20+x]={id:'h'+x,p:0,d:-1};}
    return {board,hands:[['Rook','Bishop'],['Attacker','Knight']],wait:'Jumper',turn:first,pending:[],queen:false,winner:null,reason:''};
  }
  function moves(s,p=s.turn) {
    if(s.winner !== null) return [];
    const out=[];
    s.board.forEach((piece,from)=>{
      if(!piece || piece.p!==p)return;
      const y=Math.floor(from/5),x=from%5;
      s.hands[p].forEach(card=>{
        const t=type(s,card);
        const offsets=t==='Rook'?ORTH:t==='Bishop'?DIAG:t==='Knight'?KNIGHT:t==='Queen'?ALL:t==='Jumper'?ALL.map(([dy,dx])=>[dy*2,dx*2]):[[piece.d,0],[piece.d*2,0],[piece.d,-1],[piece.d,1]];
        offsets.forEach(([dy,dx])=>{
          const ny=y+dy,nx=x+dx;
          if(ny<0||ny>4||nx<0||nx>4)return;
          const to=ny*5+nx;
          if(s.board[to]?.p===p)return;
          if(t==='Jumper'&&!s.board[(y+dy/2)*5+x+dx/2])return;
          if(t==='Attacker'&&Math.abs(dy)===2&&s.board[(y+piece.d)*5+x])return;
          out.push({from,to,card});
        });
      });
    });
    return out;
  }
  function apply(s,m) {
    const p=s.turn,board=s.board.slice(),piece={...board[m.from]};
    board[m.from]=null; board[m.to]=piece;
    const row=Math.floor(m.to/5);
    if((piece.d===-1&&row===0)||(piece.d===1&&row===4))piece.d=-piece.d;
    const hands=s.hands.map(h=>h.slice()),slot=hands[p].indexOf(m.card);
    hands[p][slot]=s.wait;
    const pending=s.pending.filter(q=>board[q.square]?.id===q.id);
    let winner=null,reason='';
    if(!board.some(a=>a&&a.p===1-p)){winner=p;reason='상대 말을 모두 잡았습니다.';}
    const held=pending.find(q=>q.p!==p);
    if(winner===null&&held){winner=held.p;reason='상대 성에서 한 턴을 버텼습니다.';}
    if(m.to===castle(1-p)&&!pending.some(q=>q.id===piece.id))pending.push({p,id:piece.id,square:m.to});
    return {board,hands,wait:m.card,turn:1-p,pending,queen:s.queen||board.filter(Boolean).length===2,winner,reason};
  }
  function evaluate(s,p) {
    if(s.winner!==null)return s.winner===p?100000:-100000;
    let score=0;
    s.board.forEach((a,i)=>{if(!a)return;const c=castle(1-a.p),dist=Math.abs(Math.floor(i/5)-Math.floor(c/5))+Math.abs(i%5-2);score+=(a.p===p?1:-1)*(300+(6-dist)*13);});
    const own=moves(s,p),opp=moves(s,1-p);
    score+=(own.length-opp.length)*2;
    score+=(new Set(own.map(m=>m.card)).size-new Set(opp.map(m=>m.card)).size)*12;
    for(const q of s.pending)score+=(q.p===p?1:-1)*220;
    return score;
  }
  function order(s,ms){return ms.map(m=>({m,n:apply(s,m)})).sort((a,b)=>priority(b)-priority(a));
    function priority(a){return (a.n.winner===s.turn?100000:0)+(s.board[a.m.to]?1000:0)+(a.m.to===castle(1-s.turn)?500:0)+evaluate(a.n,s.turn)*.02;}}
  function weighted(items,temperature,rng=Math.random){const top=items[0].score;const weights=items.map(a=>Math.exp(Math.max(-30,(a.score-top)/temperature)));let r=rng()*weights.reduce((a,b)=>a+b,0);for(let i=0;i<items.length;i++){r-=weights[i];if(r<=0)return items[i];}return items.at(-1);}
  function choose(s,level='normal',budget=650,rng=Math.random){
    const root=s.turn,ordered=order(s,moves(s)); if(!ordered.length)return null;
    const win=ordered.find(a=>a.n.winner===root);if(win)return win.m;
    let ranked=ordered.map(a=>{
      const replies=moves(a.n);let score=evaluate(a.n,root);
      if(replies.some(r=>apply(a.n,r).winner===1-root))score-=50000;
      else if(a.n.pending.some(q=>q.p===root)&&!replies.some(r=>apply(a.n,r).winner!==root))score+=50000;
      return {m:a.m,score};
    }).sort((a,b)=>b.score-a.score);
    if(level==='normal')return weighted(ranked.slice(0,4),18,rng).m;
    const deadline=performance.now()+budget;let nodes=0;
    function search(n,depth,alpha,beta){
      if((++nodes&63)===0&&performance.now()>deadline)throw new Error('budget');
      if(n.winner!==null||depth===0)return evaluate(n,root);
      const children=order(n,moves(n));if(!children.length)return evaluate(n,root);
      const maximizing=n.turn===root;let best=maximizing?-Infinity:Infinity;
      for(const a of children){const v=search(a.n,depth-1,alpha,beta);best=maximizing?Math.max(best,v):Math.min(best,v);if(maximizing)alpha=Math.max(alpha,best);else beta=Math.min(beta,best);if(beta<=alpha)break;}return best;
    }
    for(let depth=1;depth<=5;depth++){
      try{const next=ranked.map(a=>({m:a.m,score:search(apply(s,a.m),depth-1,-Infinity,Infinity)}));next.sort((a,b)=>b.score-a.score);ranked=next;}catch(e){if(e.message!=='budget')throw e;break;}
      if(performance.now()>deadline||Math.abs(ranked[0].score)>=100000)break;
    }
    return weighted(ranked.slice(0,3),3,rng).m;
  }
  function deal(s,level,rng=Math.random){
    const second=1-s.turn,candidates=[];
    for(let i=0;i<5;i++)for(let j=i+1;j<5;j++){
      const rest=CARDS.filter((_,k)=>k!==i&&k!==j);
      for(const wait of rest){const n={...s,hands:[[],[]],wait};n.hands[second]=[CARDS[i],CARDS[j]];n.hands[1-second]=rest.filter(c=>c!==wait);
        const own=moves(n,second),opp=moves(n,1-second);
        const flexibility=own.reduce((sum,m)=>sum+moves({...apply({...n,turn:second},m),turn:second},second).length,0)/Math.max(1,own.length);
        let score=evaluate(n,second)+flexibility*(level==='hard'?1.5:.5);
        if(level==='hard')score-=Math.max(...opp.map(m=>evaluate(apply(n,m),1-second)));
        candidates.push({n,score});
      }
    }
    candidates.sort((a,b)=>b.score-a.score);return weighted(candidates.slice(0,level==='hard'?3:10),level==='hard'?10:35,rng).n;
  }
  const engine={initial,moves,apply,evaluate,choose,deal,type,castle};
  if(typeof module!=='undefined')module.exports=engine;
  if(typeof document==='undefined'){
    if(typeof self!=='undefined')self.onmessage=e=>{try{self.postMessage({move:choose(e.data.state,e.data.level)});}catch(error){self.postMessage({error:String(error)});}};
    return;
  }
  const $=id=>document.getElementById(id);
  let state=null,selectedCard=null,selectedPiece=null,worker=null,timer=null,generation=0,level='normal',humanColor='black',allocation=[],lastMove=null;
  const descriptions={Rook:'상하좌우 1칸',Bishop:'대각선 1칸',Attacker:'앞 1·2칸 / 앞 대각선 1칸',Knight:'L자 점프',Jumper:'인접 말을 넘어 2칸',Queen:'8방향 1칸'};
  function diagram(t){const offsets=t==='Rook'?ORTH:t==='Bishop'?DIAG:t==='Knight'?KNIGHT:t==='Jumper'?ALL.map(([y,x])=>[y*2,x*2]):t==='Attacker'?[[-1,0],[-2,0],[-1,-1],[-1,1]]:ALL;return '<span class="cc-pattern" aria-hidden="true">'+Array.from({length:25},(_,i)=>'<i class="'+(i===12?'cc-origin':offsets.some(([y,x])=>(y+2)*5+x+2===i)?'cc-step':t==='Jumper'&&ALL.some(([y,x])=>(y+2)*5+x+2===i)?'cc-hurdle':'')+'"></i>').join('')+'</span>';}
  function card(c,interactive=false){const t=state?type(state,c):c;return `<button type="button" class="cc-card ${selectedCard===c?'cc-picked':''}" data-cc-card="${c}" ${interactive?'':'disabled'} aria-pressed="${selectedCard===c}">${diagram(t)}<span><strong>${NAMES[t]}</strong><small>${descriptions[t]}</small></span></button>`;}
  function cancel(){generation++;clearTimeout(timer);if(worker)worker.terminate();worker=null;}
  function screen(id){cancel();document.querySelectorAll('.screen').forEach(e=>e.classList.toggle('active',e.id===id));}
  function start(){ClubUX.begin('cardchess');cancel();level=$('ccLevel').value;humanColor=$('ccColor').value;state=initial(Number($('ccFirst').value));selectedCard=selectedPiece=null;allocation=[];lastMove=null;screen('ccGame');
    if(state.turn===0){state=deal(state,level);$('ccDeal').hidden=true;render();schedule();}
    else{$('ccDeal').hidden=false;renderDeal();render();}
  }
  function renderDeal(){const step=allocation.length<2?'내 카드 2장을 선택하세요':'AI에게 줄 카드 2장을 선택하세요';$('ccDealTitle').textContent=step;$('ccDealCards').innerHTML=CARDS.filter(c=>!allocation.includes(c)).map(c=>card(c,true)).join('');$('ccDealChosen').textContent='내 카드: '+allocation.slice(0,2).map(c=>NAMES[c]).join(' · ')+' / AI: '+allocation.slice(2).map(c=>NAMES[c]).join(' · ');}
  function render(){
    const allocating=!$('ccDeal').hidden,ms=moves(state),available=ms.filter(m=>m.card===selectedCard);
    $('ccAIHand').innerHTML=state.hands[1].map(c=>card(c)).join('');$('ccWait').innerHTML=card(state.wait);
    $('ccHand').innerHTML=state.hands[0].map(c=>card(c,!allocating&&state.turn===0&&state.winner===null)).join('');
    $('ccTable').hidden=allocating;
    $('ccBoard').innerHTML=state.board.map((a,i)=>{
      const dest=available.some(m=>m.from===selectedPiece&&m.to===i),source=available.some(m=>m.from===i),isCastle=i===2||i===22;
      return `<button class="cc-cell ${lastMove?.from===i?'cc-last-from':''} ${lastMove?.to===i?'cc-last-to'+(lastMove.capture?' cc-last-capture':''):''} ${source?'cc-source':''} ${dest?'cc-dest':''} ${selectedPiece===i?'cc-selected':''}" data-cc-cell="${i}" aria-label="${Math.floor(i/5)+1}행 ${i%5+1}열${isCastle?' 성':''}${a?' '+(a.p===0?'내 말':'AI 말')+' '+(a.d===-1?'위':'아래')+' 방향':''}${dest?' 이동 가능':''}" ${allocating||state.turn!==0||state.winner!==null?'disabled':''}>${isCastle?'<span class="cc-castle" aria-hidden="true">♜</span>':''}${a?`<span class="cc-piece cc-${a.p===0?humanColor:humanColor==='black'?'white':'black'}"><span>${a.d===-1?'▲':'▼'}</span></span>`:''}${dest?'<span class="cc-dot"></span>':''}</button>`;
    }).join('');
    $('ccHumanDog').className='dog-portrait dog-'+humanColor;$('ccAIDog').className='dog-portrait dog-'+(humanColor==='black'?'white':'black');
    $('ccCounts').textContent=`나 ${state.board.filter(a=>a?.p===0).length}개 · AI ${state.board.filter(a=>a?.p===1).length}개 · ${level==='hard'?'어려움':'보통'}`;
    $('ccResult').hidden=state.winner===null;
    $('ccResultTitle').textContent=state.winner===0?'당신의 승리!':'AI의 승리';$('ccReason').textContent=state.reason;
    $('ccStatus').textContent=allocating?'후공인 내가 카드 배치를 결정합니다.':state.winner!==null?state.reason:!ms.length?'합법수가 없습니다. 처리 규칙이 정해지지 않아 진행을 멈췄습니다. 다시 하기 또는 설정으로 이동하세요.':state.turn===1?'AI가 생각하고 있어요…':selectedPiece!==null?'강조된 목적지를 누르세요.':selectedCard?'테두리가 빛나는 내 말을 선택하세요.':'내 카드 한 장을 선택하세요.';
    $('ccThreat').textContent=state.winner===null&&state.pending.length?'성 침입! 방어 측의 이번 턴이 끝날 때 침입 말이 살아 있으면 승리합니다.':state.queen?'말이 2개 남아 점퍼가 퀸으로 바뀌었습니다.':'';
  }
  function commit(m){lastMove={from:m.from,to:m.to,capture:!!state.board[m.to]};ClubUX.action('ccGame',lastMove.capture?'capture':'move');state=apply(state,m);if(state.winner!==null)ClubUX.result('cardchess',state.winner===0?humanColor:humanColor==='black'?'white':'black');selectedCard=selectedPiece=null;render();schedule();}
  function schedule(){if(state.turn!==1||state.winner!==null||!moves(state).length)return;const token=generation,started=performance.now();let finished=false;
    const finish=m=>{if(finished||token!==generation||!$('ccGame').classList.contains('active'))return;finished=true;if(worker)worker.terminate();worker=null;timer=setTimeout(()=>{timer=null;if(token!==generation||!$('ccGame').classList.contains('active'))return;if(m&&moves(state).some(a=>a.from===m.from&&a.to===m.to&&a.card===m.card))commit(m);},Math.max(0,550-(performance.now()-started)));};
    const fallback=()=>{if(worker)worker.terminate();worker=null;timer=setTimeout(()=>{if(token===generation)finish(choose(state,level,180));},30);};
    try{worker=new Worker('cardchess.js');worker.onmessage=e=>e.data.error?fallback():finish(e.data.move);worker.onerror=e=>{e.preventDefault();fallback();};worker.postMessage({state,level});}catch(_){fallback();}
  }
  $('ccOpen').onclick=()=>screen('ccSetup');$('ccHome').onclick=()=>screen('homeScreen');$('ccBack').onclick=()=>screen('ccSetup');$('ccSettings').onclick=()=>screen('ccSetup');$('ccStart').onclick=start;$('ccRestart').onclick=start;$('ccAgain').onclick=start;
  $('ccDealUndo').onclick=()=>{allocation.pop();renderDeal();};
  $('ccDealCards').onclick=e=>{const b=e.target.closest('[data-cc-card]');if(!b||allocation.includes(b.dataset.ccCard))return;allocation.push(b.dataset.ccCard);if(allocation.length===4){state.hands=[allocation.slice(0,2),allocation.slice(2)];state.wait=CARDS.find(c=>!allocation.includes(c));$('ccDeal').hidden=true;render();schedule();}else renderDeal();};
  $('ccHand').onclick=e=>{const b=e.target.closest('[data-cc-card]');if(!b||b.disabled)return;selectedCard=selectedCard===b.dataset.ccCard?null:b.dataset.ccCard;selectedPiece=null;render();};
  $('ccBoard').onclick=e=>{const b=e.target.closest('[data-cc-cell]');if(!b||b.disabled||!selectedCard)return;const i=Number(b.dataset.ccCell),ms=moves(state).filter(m=>m.card===selectedCard),m=ms.find(a=>a.from===selectedPiece&&a.to===i);if(m){commit(m);return;}selectedPiece=i!==selectedPiece&&ms.some(a=>a.from===i)?i:null;render();};
})();
