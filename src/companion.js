import {clamp, projectLandmark} from './renderer.js';

export const INSTRUCTORS = [
  {id:'instructor-1', name:'Instructor 1', src:'./assets/instructors/instructor-1.png',
    calibration:{userCenter:.345,shoulderSpan:.25,shoulderY:.31,hand:{x:.179,y:.30,w:.082,h:.16}}},
  {id:'instructor-2', name:'Instructor 2', src:'./assets/instructors/instructor-2.png',
    calibration:{userCenter:.345,shoulderSpan:.25,shoulderY:.28,hand:{x:.185,y:.25,w:.102,h:.18}}}
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

/** One calibrated sprite transform shared by the rear body and front hand layers. */
export function drawCompanion(ctx,image,anchor,calibration,side=1,front=false) {
  if(!anchor||!image?.naturalWidth)return;
  const c=calibration;
  const width=anchor.span/c.shoulderSpan;
  const height=width*image.naturalHeight/image.naturalWidth;
  ctx.save();ctx.globalAlpha=anchor.alpha;
  ctx.translate(anchor.x,anchor.y);ctx.rotate(anchor.angle);ctx.scale(side,1);
  const x=-c.userCenter*width,y=-c.shoulderY*height;
  if(front){
    ctx.beginPath();ctx.rect(x+c.hand.x*width,y+c.hand.y*height,c.hand.w*width,c.hand.h*height);ctx.clip();
  }
  ctx.drawImage(image,x,y,width,height);ctx.restore();
}

