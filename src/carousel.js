import {LOGOS} from './logo-effects.js';
export const FILTERS=LOGOS.flatMap((logo,logoIndex)=>[
  {mode:'crown',logoIndex,name:'Corona · '+logo.name},
  {mode:'glasses',logoIndex,name:'Lentes · '+logo.name}
]);
export const wrapIndex=(index,length=FILTERS.length)=>((index%length)+length)%length;
const icon=mode=>mode==='crown'?'<path d="m3 17-1-10 6 4 4-8 4 8 6-4-1 10Z"/><path d="M4 21h16"/>':'<rect x="2" y="8" width="8" height="9" rx="3"/><rect x="14" y="8" width="8" height="9" rx="3"/><path d="M10 11q2-2 4 0M2 10 1 6m21 4 1-4"/>';
const thumbnail=filter=>`<span class="filter-art"><img src="${LOGOS[filter.logoIndex].src}" alt="" draggable="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">${icon(filter.mode)}</svg></span>`;
export function mountCarousel(root,capture,onSelect){
  let selected=0,startX=null,lastWheel=0;
  const buttons=FILTERS.map((filter,index)=>{
    const button=document.createElement('button');button.type='button';button.className='carousel-option';
    button.innerHTML=thumbnail(filter);button.setAttribute('aria-label',filter.name);
    button.addEventListener('click',()=>select(index));root.appendChild(button);return button;
  });
  function select(index){
    selected=wrapIndex(index);
    buttons.forEach((button,i)=>{
      const offset=wrapIndex(i-selected+4)-4,distance=Math.abs(offset);
      button.style.setProperty('--offset',offset);button.style.setProperty('--size',distance===1?'.80':'.64');
      button.style.opacity=distance>3||!offset?'0':distance===1?'1':distance===2?'.65':'.28';
      button.style.visibility=distance>3||!offset?'hidden':'visible';
      button.tabIndex=distance>3||!offset?-1:0;button.setAttribute('aria-pressed',String(i===selected));
      button.setAttribute('aria-hidden',String(distance>3||!offset));
    });
    capture.querySelector('.capture-art').innerHTML=thumbnail(FILTERS[selected]);
    capture.setAttribute('aria-label','Tomar foto con '+FILTERS[selected].name);
    onSelect(FILTERS[selected],selected);
  }
  root.addEventListener('pointerdown',event=>{startX=event.clientX;});
  root.addEventListener('pointermove',event=>{
    if(startX===null)return;const delta=event.clientX-startX;
    if(Math.abs(delta)>8){root.dataset.dragging='true';root.style.setProperty('--drag',Math.max(-78,Math.min(78,delta))+'px');}
  });
  root.addEventListener('pointerup',event=>{
    if(startX===null)return;const delta=event.clientX-startX;startX=null;
    delete root.dataset.dragging;root.style.setProperty('--drag','0px');
    if(Math.abs(delta)>28){select(selected+(delta<0?1:-1));root.dataset.swiped='true';setTimeout(()=>delete root.dataset.swiped,100);}
  });
  root.addEventListener('pointercancel',()=>{startX=null;delete root.dataset.dragging;root.style.setProperty('--drag','0px');});
  root.addEventListener('click',event=>{if(root.dataset.swiped)event.stopImmediatePropagation();},true);
  root.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();select(selected+(event.key==='ArrowRight'?1:-1));root.focus();}});
  root.addEventListener('wheel',event=>{if(Math.abs(event.deltaX)<8)return;event.preventDefault();if(performance.now()-lastWheel<180)return;lastWheel=performance.now();select(selected+(event.deltaX>0?1:-1));},{passive:false});
  select(0);return {select,getIndex:()=>selected};
}
