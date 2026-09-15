/* Presentation adapter: observes existing UI only; never writes game state. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const games=[
    {id:'gameScreen',name:'오목',icon:'●',status:()=>document.querySelector('.player-box strong'),result:'resultOverlay',title:'resultTitle',human:()=>$('playerStone').classList.contains('white')?'white':'black'},
    {id:'morrisGame',name:'Nine Men’s Morris',icon:'♜',status:()=>$('morrisStatus'),result:'morrisResult',title:'morrisResultTitle',human:()=>$('morrisColor').value==='2'?'white':'black'},
    {id:'threeGame',name:'3층 오목',icon:'▱',status:()=>$('threeStatus'),result:'threeResult',title:'threeResultTitle',human:()=>$('threeColor').value},
    {id:'ccGame',name:'카드 체스',icon:'♛',status:()=>$('ccStatus'),result:'ccResult',title:'ccResultTitle',human:()=>$('ccColor').value}
  ];
  games.push({id:'qGame',name:'Quoridor',icon:'♟',status:()=>$('qStatus'),result:'qResult',title:'qResultTitle',human:()=>$('qColor').value});
  const opposite=c=>c==='black'?'white':'black';
  const asset=(color,state='default')=>'assets/dogs/'+color+'-'+state+'.webp';
  function portrait(color){return `<span class="dog-portrait dog-${color}"><img src="${asset(color)}" alt="${color.toUpperCase()} · ${color==='black'?'흰':'크림'} 포메라니안" draggable="false"></span>`;}
  function setPortrait(node,color,state){
    const img=node.querySelector('img'),src=asset(color,state);
    if(img.getAttribute('src')!==src)img.setAttribute('src',src);
    node.dataset.pose=state;
  }
  // Preload all states so brief AI turns can reuse cached image data.
  for(const color of ['black','white'])for(const state of ['default','thinking','win','lose']){const img=new Image();img.src=asset(color,state);}
  document.querySelectorAll('.dog-portrait').forEach(node=>{
    const color=node.classList.contains('dog-black')?'black':'white';
    node.innerHTML=`<img src="${asset(color)}" alt="${color.toUpperCase()} 포메라니안" draggable="false">`;
    node.removeAttribute('role');node.removeAttribute('aria-label');
  });
  function panel(g){return `<div class="club-duel" aria-label="${g.name} 라이벌"><div class="club-player" data-side="black">${portrait('black')}<div><b>BLACK</b><span class="club-reaction">준비 완료</span></div></div><span class="club-vs"><i>${g.icon}</i>VS</span><div class="club-player" data-side="white">${portrait('white')}<div><b>WHITE</b><span class="club-reaction">준비 완료</span></div></div></div>`;}
  games.forEach(g=>{
    const screen=$(g.id);screen.dataset.clubGame=g.id;
    const old=screen.querySelector('.rivals,.cc-rivals');
    if(old)old.insertAdjacentHTML('beforebegin',panel(g));else screen.querySelector('.topbar').insertAdjacentHTML('afterend',panel(g));
    // Keep original counters and IDs alive for existing render functions.
    old?.classList.add('club-legacy');
    if(g.id==='ccGame')old.querySelectorAll('.dog-portrait').forEach(n=>n.hidden=true);
    if(g.id==='qGame'){const duel=screen.querySelector('.club-duel');const sync=()=>{const local=screen.dataset.playMode==='local2p';duel.hidden=!local;for(const p of duel.querySelectorAll('.club-player')){const active=p.dataset.side===screen.dataset.turn&&!$('qResult').open;p.classList.toggle('is-turn',active);p.querySelector('b').textContent=ClubPlay.label(p.dataset.side);p.querySelector('.club-reaction').textContent=active?'내 차례!':'기다리는 중';}};new MutationObserver(sync).observe($('qStatus'),{childList:true});sync();return;}
    const result=$(g.result),card=g.id==='gameScreen'?result.querySelector('.result-card'):result;
    const backdrop=document.createElement('div');backdrop.className='club-result-backdrop';backdrop.hidden=true;screen.append(backdrop);
    let wasVisible=false,previousFocus=null;
    result.addEventListener('keydown',event=>{if(event.key!=='Tab')return;const focusable=[...result.querySelectorAll('button,select,summary')].filter(n=>!n.disabled&&n.getClientRects().length);if(!focusable.length)return;const first=focusable[0],last=focusable[focusable.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}});
    card.querySelector('.rivals')?.remove();
    card.insertAdjacentHTML('afterbegin',`<div class="club-result-art">${portrait('black')}<span>✦</span>${portrait('white')}</div><p class="club-result-kicker">${g.name}</p><p class="club-result-headline"></p>`);
    const home=document.createElement('button');home.className='secondary-button club-home';home.textContent='홈으로';
    home.onclick=()=>{if(g.id==='gameScreen'){goHome();return;}$(g.id==='morrisGame'?'morrisBack':g.id==='threeGame'?'threeBack':'ccBack').click();$(g.id==='morrisGame'?'morrisHome':g.id==='threeGame'?'threeHome':'ccHome').click();};
    card.append(home);
    const duel=screen.querySelector('.club-duel');
    function sync(){
      const text=g.status().textContent,human=g.human(),visible=g.id==='gameScreen'?result.classList.contains('show'):!result.hidden;
      backdrop.hidden=!visible||g.id==='gameScreen';
      let turn=/AI/.test(text)?opposite(human):human;
      if(g.id==='threeGame'){if(text.includes('(흑)'))turn='black';if(text.includes('(백)'))turn='white';}
      const local=screen.dataset.playMode==='local2p';if(local)turn=screen.dataset.turn;
      const paused=/합법수가 없|카드 배치/.test(text);
      for(const p of duel.querySelectorAll('.club-player')){const c=p.dataset.side,active=c===turn&&!visible&&!paused;p.querySelector('b').textContent=local?ClubPlay.label(c):c.toUpperCase();p.classList.toggle('is-turn',active);setPortrait(p.querySelector('.dog-portrait'),c,active&&!local&&c!==human&&/생각/.test(text)?'thinking':'default');p.querySelector('.club-reaction').textContent=visible?'좋은 승부!':paused?'준비 중':active?(/mill 완성/.test(text)?'잡았다!':!local&&c!==human?'생각 중…':'내 차례!'):'기다리는 중';}
      const title=$(g.title).textContent;
      let winner=/무승부/.test(title)?'draw':/흑|BLACK/.test(title)?'black':/백|WHITE/.test(title)?'white':/당신/.test(title)?human:/AI/.test(title)?opposite(human):'draw';
      card.dataset.winner=visible?winner:'';
      for(const color of ['black','white'])setPortrait(card.querySelector('.club-result-art .dog-'+color),color,visible&&winner!=='draw'?(color===winner?'win':'lose'):'default');
      card.querySelector('.club-result-headline').textContent=winner==='draw'?'GOOD GAME!':winner.toUpperCase()+' WINS!';
      if(visible){result.setAttribute('role','dialog');result.setAttribute('aria-modal','true');result.setAttribute('aria-label',g.name+' 결과');}
      if(visible&&!wasVisible){previousFocus=document.activeElement;card.querySelector('button')?.focus();}else if(!visible&&wasVisible&&previousFocus?.isConnected){previousFocus.focus();}wasVisible=visible;
    }
    const observer=new MutationObserver(sync);
    observer.observe(g.status(),{childList:true,characterData:true,subtree:true});
    observer.observe($(g.title),{childList:true,characterData:true,subtree:true});
    observer.observe(result,{attributes:true,attributeFilter:['hidden','class']});
    sync();
  });
  document.querySelectorAll('.icon-button').forEach(b=>{if(!b.hasAttribute('aria-label'))b.setAttribute('aria-label','뒤로가기');});
})();
