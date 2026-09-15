/* Shared input ownership and lifecycle. Rules stay in each game's engine. */
(() => {
  'use strict';
  const config={gomoku:['setupScreen','gameScreen'],morris:['morrisSetup','morrisGame'],three:['threeSetup','threeGame'],cardchess:['ccSetup','ccGame'],quoridor:['qSetup','qGame']};
  const modes=Object.fromEntries(Object.keys(config).map(g=>[g,'solo'])),cleanups=new Map();
  const local=g=>modes[g]==='local2p';
  const label=c=>`PLAYER ${c==='black'?1:2} · ${c.toUpperCase()}`;
  function enter(id){for(const [g,cancel] of cleanups)if(config[g][1]!==id)cancel();}
  window.ClubPlay={local,label,mode:g=>modes[g],human:(g,turn,human)=>local(g)||turn===human,
    ai:g=>!local(g)&&document.getElementById(config[g][1]).classList.contains('active'),
    register:(g,cancel)=>cleanups.set(g,cancel),enter,
    turn(g,color){const screen=document.getElementById(config[g][1]);screen.dataset.turn=color;screen.dataset.playMode=modes[g];}
  };
  for(const [g,[setup,game]] of Object.entries(config)){
    const host=document.querySelector('#'+setup+' .setup-content');
    const box=document.createElement('div');box.className='play-mode';box.setAttribute('role','group');box.setAttribute('aria-label','플레이 방식');
    box.innerHTML='<button type="button" data-mode="solo" aria-pressed="true">혼자 하기</button><button type="button" data-mode="local2p" aria-pressed="false">둘이 하기</button>';
    host.prepend(box);
    const note=document.createElement('p');note.className='local-note';note.hidden=true;note.textContent='BLACK = PLAYER 1 · WHITE = PLAYER 2';box.after(note);
    const scope=document.getElementById(setup);
    const soloNodes=g==='gomoku'?[...scope.querySelectorAll('.setting-card')]:[...scope.querySelectorAll('select')].filter(n=>!/First$/.test(n.id)).flatMap(n=>[scope.querySelector(`label[for="${n.id}"]`),n]);
    if(g==='gomoku'){const p=scope.querySelector('.setup-heading p');if(p)soloNodes.push(p);}
    const orders=[...scope.querySelectorAll('select[id$="First"]')];if(g==='three')orders.push(document.getElementById('threeNextFirst'));
    const originalOptions=new Map(orders.map(n=>[n,[...n.options].map(o=>o.textContent)]));
    const soloCards=[...scope.querySelectorAll('.setting-card')].filter(n=>n.querySelector('select')&&!n.querySelector('select[id$="First"]'));
    const start=scope.querySelector('.primary-button'),startText=start.textContent;
    function sync(){
      const two=local(g);scope.dataset.playMode=modes[g];document.getElementById(game).dataset.playMode=modes[g];
      box.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===modes[g])));
      soloNodes.filter(Boolean).forEach(n=>n.hidden=two);note.hidden=!two;
      soloCards.forEach(n=>n.hidden=two);
      start.textContent=two?'둘이 시작':startText;
      orders.forEach(n=>[...n.options].forEach((o,i)=>o.textContent=two?(i===0?'PLAYER 1 · BLACK 선공':'PLAYER 2 · WHITE 선공'):originalOptions.get(n)[i]));
      document.querySelector('#'+game+' .morris-footnote')?.classList.toggle('solo-only',two);
    }
    box.onclick=e=>{const b=e.target.closest('[data-mode]');if(!b)return;for(const cancel of cleanups.values())cancel();modes[g]=b.dataset.mode;sync();};
    sync();
  }
})();
