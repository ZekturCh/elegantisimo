export function createLoadingIndicator(root,message,button){
  const track=root.querySelector('.loading-track'),detail=root.querySelector('.loading-detail');
  const original=button.innerHTML;
  let slowTimer=null;
  function stop(){clearTimeout(slowTimer);slowTimer=null;button.classList.remove('is-loading');button.removeAttribute('aria-busy');button.innerHTML=original;}
  function stage(text,step,slowText='La primera carga puede tardar un poco más. Mantén esta pestaña abierta.'){
    clearTimeout(slowTimer);root.hidden=false;root.dataset.state='loading';track.hidden=false;
    message.textContent=text;detail.textContent='Paso '+step+' de 4 · Preparando tu experiencia';
    track.setAttribute('aria-valuetext','Paso '+step+' de 4: '+text);
    button.classList.add('is-loading');button.setAttribute('aria-busy','true');button.textContent='Preparando…';
    slowTimer=setTimeout(()=>{detail.textContent=slowText;},12000);
  }
  return {stage,async paint(){await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));},
    done(){stop();root.hidden=true;message.textContent='';},
    fail(text){stop();root.hidden=false;root.dataset.state='error';track.hidden=true;message.textContent=text;detail.textContent='Puedes volver a intentarlo con el botón de arriba.';}
  };
}
