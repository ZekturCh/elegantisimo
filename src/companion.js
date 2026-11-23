import {clamp, projectLandmark} from './renderer.js';

export const INSTRUCTORS = [
  {id:'instructor-1', name:'Instructor 1', src:'./assets/instructors/instructor-1.png',
    calibration:{userCenter:.345,shoulderSpan:.25,shoulderY:.31,hand:{x:.16,y:.235,w:.16,h:.245,fadeStart:.62}}},
  {id:'instructor-2', name:'Instructor 2', src:'./assets/instructors/instructor-2.png',
    calibration:{userCenter:.345,shoulderSpan:.25,shoulderY:.28,hand:{x:.17,y:.20,w:.16,h:.25,fadeStart:.63}}}
];

/** Anchor to both shoulders, independent of camera crop and selfie mirroring. */
export function shoulderAnchor(points, geometry) {
  const a=points?.[11], b=points?.[12];
  if(!a||!b||[a,b].some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||(p.visibility??1)<.65))return null;
  const shoulders=[projectLandmark(a,geometry),projectLandmark(b,geometry)].sort((p,q)=>p.x-q.x);
  const [left,right]=shoulders, span=Math.hypot(right.x-left.x,right.y-left.y);
  if(span<35||span>geometry.canvasWidth*.85)return null;
  return {x:(left.x+right.x)/2,y:(left.y+right.y)/2,span,
    angle:clamp(Math.atan2(right.y-left.y,right.x-left.x),-.35,.35)};
}

export function createShoulderTracker() {
  let value=null,lastSeen=-Infinity,lastUpdate=null;
  return {
    reset(){value=null;lastSeen=-Infinity;lastUpdate=null;},
    update(points,geometry,now){
      const next=shoulderAnchor(points,geometry);
      if(!next)return this.get(now);
      const dt=lastUpdate===null?100:Math.max(0,now-lastUpdate);
      // Time-based smoothing; reacquire immediately after losing the subject.
      const alpha=!value||now-lastSeen>350?1:1-Math.exp(-dt/95);
      if(!value)value={...next};
      else for(const key of ['x','y','span','angle'])value[key]+=(next[key]-value[key])*alpha;
      lastSeen=now;lastUpdate=now;
      return this.get(now);
    },
    get(now){return value&&now-lastSeen<350?{...value,alpha:clamp((350-(now-lastSeen))/150,0,1)}:null;}
  };
}

/** Keep the complete wrist/cuff, then taper the short arm connection into the shoulder. */
export function createHandLayer(image,calibration,createCanvas=()=>document.createElement('canvas')){
  const hand=calibration.hand,canvas=createCanvas();
  canvas.width=Math.ceil(image.naturalWidth*hand.w);canvas.height=Math.ceil(image.naturalHeight*hand.h);
  const ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height;
  ctx.drawImage(image,hand.x*image.naturalWidth,hand.y*image.naturalHeight,hand.w*image.naturalWidth,hand.h*image.naturalHeight,0,0,W,H);
  ctx.globalCompositeOperation='destination-in';
  const horizontal=ctx.createLinearGradient(0,0,W,0);
  horizontal.addColorStop(0,'#fff');horizontal.addColorStop(hand.fadeStart,'#fff');horizontal.addColorStop(1,'#fff0');
  ctx.fillStyle=horizontal;ctx.fillRect(0,0,W,H);
  const vertical=ctx.createLinearGradient(0,0,0,H);
  vertical.addColorStop(0,'#fff0');vertical.addColorStop(.14,'#fff');vertical.addColorStop(.88,'#fff');vertical.addColorStop(1,'#fff0');
  ctx.fillStyle=vertical;ctx.fillRect(0,0,W,H);
  ctx.globalCompositeOperation='source-over';
  return canvas;
}

/** One calibrated sprite transform shared by the rear body and front hand layers. */
export function drawCompanion(ctx,image,anchor,calibration,side=1,front=false,handLayer=null) {
  if(!anchor||!image?.naturalWidth)return;
  if(front&&!handLayer)return;
  const c=calibration;
  const width=anchor.span/c.shoulderSpan;
  const height=width*image.naturalHeight/image.naturalWidth;
  ctx.save();ctx.globalAlpha=anchor.alpha;
  ctx.translate(anchor.x,anchor.y);ctx.rotate(anchor.angle);ctx.scale(side,1);
  const x=-c.userCenter*width,y=-c.shoulderY*height;
  if(front){
    ctx.drawImage(handLayer,x+c.hand.x*width,y+c.hand.y*height,c.hand.w*width,c.hand.h*height);
  }else ctx.drawImage(image,x,y,width,height);
  ctx.restore();
}

