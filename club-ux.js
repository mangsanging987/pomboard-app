/* Shared UX only. No rule or AI decisions belong in this file. */
(() => {
  'use strict';
  const key='pomBoardClub.v1', games={gomoku:'Gomoku',morris:'Nine Men’s Morris',three:'3층 오목',cardchess:'Card Chess',quoridor:'Quoridor'};
  const count=v=>Number.isSafeInteger(v)&&v>=0?v:0;
  const pair=v=>({black:count(v?.black),white:count(v?.white),draw:count(v?.draw)});
  const date=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  function normalize(v){return {version:1,total:pair(v?.total),today:{date:typeof v?.today?.date==='string'?v.today.date:date(),...pair(v?.today)},games:Object.fromEntries(Object.keys(games).map(g=>[g,pair(v?.games?.[g])])),settings:{sound:typeof v?.settings?.sound==='boolean'?v.settings.sound:true,haptics:typeof v?.settings?.haptics==='boolean'?v.settings.haptics:true},recorded:Array.isArray(v?.recorded)?v.recorded.filter(x=>typeof x==='string'):[]};}
  let data;try{data=normalize(JSON.parse(localStorage.getItem(key)));}catch(_){data=normalize(null);}
  const sessions={},completed=new Set();let audio=null;
  const save=()=>{try{localStorage.setItem(key,JSON.stringify(data));}catch(_){/* Private mode / full storage: keep playing in memory. */}};
  function rollover(){if(data.today.date!==date()){data.today={date:date(),...pair()};save();}}
  function begin(game){sessions[game]=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}-${game}`;}
  function unlock(){if(!data.settings.sound)return;try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;audio||=new Audio();if(audio.state==='suspended')audio.resume().catch(()=>{});}catch(_){}}
  function effect(kind){
    if(data.settings.haptics)try{navigator.vibrate?.(kind==='win'?[12,35,12]:kind==='capture'?12:6);}catch(_){}
    if(!data.settings.sound||!audio||audio.state!=='running')return;
    try{const t=audio.currentTime;const notes=kind==='win'?[523,659,784]:[kind==='capture'?220:kind==='move'?330:440];notes.forEach((hz,i)=>{const o=audio.createOscillator(),g=audio.createGain(),at=t+i*.085;o.type='sine';o.frequency.setValueAtTime(hz,at);o.frequency.exponentialRampToValueAtTime(hz*.7,at+.07);g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(.045,at+.006);g.gain.exponentialRampToValueAtTime(.0001,at+.1);o.connect(g);g.connect(audio.destination);o.start(at);o.stop(at+.11);o.onended=()=>{o.disconnect();g.disconnect();};});}catch(_){}
  }
  const timers=new Map();let lastReaction=0;
  function action(screen,kind){effect(kind);if(kind!=='capture'||Date.now()-lastReaction<6000)return;lastReaction=Date.now();const host=document.querySelector('#'+screen+' .club-duel');if(!host)return;let b=host.querySelector('.ux-bubble');if(!b){b=document.createElement('span');b.className='ux-bubble';b.setAttribute('role','status');host.append(b);}b.textContent='잡았다!';b.hidden=false;clearTimeout(timers.get(screen));timers.set(screen,setTimeout(()=>b.hidden=true,1800));}
  function result(game,winner){const id=sessions[game];if(!id||!['black','white','draw'].includes(winner)||completed.has(id))return;rollover();if(data.recorded.includes(id))return;completed.add(id);data.recorded.push(id);data.total[winner]++;data.today[winner]++;data.games[game][winner]++;save();render();effect('win');}
  function render(){rollover();const box=document.getElementById('clubStats');if(!box)return;box.querySelector('.ux-total').textContent=`BLACK ${data.total.black}승  vs  WHITE ${data.total.white}승`;box.querySelector('.ux-today').textContent=`오늘 ${data.today.black} : ${data.today.white}`;box.querySelector('.ux-games').innerHTML=Object.entries(games).map(([g,n])=>`<p><span>${n}</span><b>${data.games[g].black} : ${data.games[g].white}${data.games[g].draw?` · 무승부 ${data.games[g].draw}`:''}</b></p>`).join('');document.querySelectorAll('[data-ux-setting]').forEach(e=>{e.checked=data.settings[e.dataset.uxSetting];const label=`${e.dataset.uxSetting==='sound'?'효과음':'햅틱'} ${e.checked?'끄기':'켜기'}`;e.setAttribute('aria-label',label);e.title=label;e.closest('.ux-control').title=label;});}
  window.ClubUX={begin,result,action};
  document.addEventListener('pointerdown',unlock,{passive:true});document.addEventListener('keydown',unlock);
  document.addEventListener('DOMContentLoaded',()=>{
    document.querySelector('.club-hero').insertAdjacentHTML('afterend','<section id="clubStats" aria-label="라이벌 전적"><b class="ux-total"></b><small class="ux-today"></small><details><summary>게임별 전적</summary><p class="ux-stat-key">BLACK : WHITE · 매치 기준</p><div class="ux-games"></div></details></section>');
    // Native checkboxes keep the existing change handler and persistence path.
    const icons={sound:'<path d="M4 9h4l5-4v14l-5-4H4z"/><path class="ux-on-mark" d="M16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',haptics:'<rect x="8" y="5" width="8" height="14" rx="2"/><path class="ux-on-mark" d="m4 7-2 3 2 3-2 3m18-9-2 3 2 3-2 3"/>'};
    const settings='<div class="ux-quick-controls" role="group" aria-label="효과음 및 햅틱">'+Object.entries(icons).map(([k,icon])=>'<label class="ux-control"><input type="checkbox" data-ux-setting="'+k+'"><span class="ux-control-face" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+icon+'<path class="ux-off-mark" d="m4 3 16 18"/></svg><i></i></span></label>').join('')+'</div>';
    for(const id of ['homeScreen','setupScreen','morrisSetup','threeSetup','ccSetup','qSetup','gameScreen','morrisGame','threeGame','ccGame','qGame']){
      const header=document.getElementById(id)?.querySelector('.home-header,.topbar');
      if(!header||header.querySelector('.ux-quick-controls'))continue;
      header.classList.add('ux-control-header');
      header.insertAdjacentHTML('beforeend',settings);
    }
    document.addEventListener('change',e=>{const k=e.target.dataset.uxSetting;if(!['sound','haptics'].includes(k))return;data.settings[k]=e.target.checked;if(k==='sound'){if(data.settings.sound)unlock();else if(audio?.state==='running')audio.suspend().catch(()=>{});}if(k==='haptics'&&!data.settings.haptics)try{navigator.vibrate?.(0);}catch(_){}save();render();});
    render();
  });
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});window.addEventListener('focus',render);setInterval(render,30000);
  window.addEventListener('storage',e=>{if(e.key!==key)return;try{data=normalize(JSON.parse(e.newValue));render();if(!data.settings.sound&&audio?.state==='running')audio.suspend().catch(()=>{});}catch(_){}});
})();

