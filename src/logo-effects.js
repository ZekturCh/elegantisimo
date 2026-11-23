import {clamp,projectLandmark} from './renderer.js';

export const LOGOS = [
  {name:'Elegantísimos blanco',src:'./assets/logos/01-elegantisimos-blanco.jpeg',crop:[.02,.12,.96,.79]},
  {name:'Team Paolo blanco',src:'./assets/logos/02-team-paolo-blanco.jpeg',crop:[.03,.05,.94,.90]},
  {name:'Team Paolo color',src:'./assets/logos/03-team-paolo-color.jpeg',crop:[.04,.17,.92,.62]},
  {name:'Elegantísimos lila',src:'./assets/logos/04-elegantisimos-lila.jpeg',crop:[.03,.24,.94,.55]}
];

export function facePlacement(points,geometry){
  if(!points?.[33]||!points?.[263]||!points?.[10])return null;
  const a=projectLandmark(points[33],geometry),b=projectLandmark(points[263],geometry);
  const left=a.x<b.x?a:b,right=a.x<b.x?b:a;
  const span=Math.hypot(right.x-left.x,right.y-left.y);
  if(span<12)return null;
  return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,span,
    angle:Math.atan2(right.y-left.y,right.x-left.x),top:projectLandmark(points[10],geometry)};
}

/** Screen blending drops the supplied black logo backdrop without rewriting brand artwork. */
function logoStamp(ctx,image,item,x,y,w,h){
  const [sx,sy,sw,sh]=item.crop;
  const ratio=(image.naturalWidth*sw)/(image.naturalHeight*sh);
  const width=Math.min(w,h*ratio),height=width/ratio;
  ctx.save();ctx.globalCompositeOperation='screen';ctx.shadowBlur=0;
  ctx.drawImage(image,sx*image.naturalWidth,sy*image.naturalHeight,sw*image.naturalWidth,sh*image.naturalHeight,x-width/2,y-height/2,width,height);
  ctx.restore();
}

export function drawLogoEffect(ctx,points,geometry,image,item,mode,now,smileAt){
  const p=facePlacement(points,geometry);
  if(!p||!image?.naturalWidth)return;
  const size=p.span;
  ctx.save();ctx.globalAlpha=clamp((now-(smileAt??now))/200,.05,1);
  ctx.translate(p.x,p.y);ctx.rotate(p.angle);
  ctx.strokeStyle='#ead0ff';ctx.lineWidth=Math.max(2,size*.025);
  ctx.shadowColor='#c989ef';ctx.shadowBlur=size*.06;
  if(mode==='crown'){
    const y=-Math.hypot(p.top.x-p.x,p.top.y-p.y)-size*.15,w=size*1.95;
    ctx.fillStyle='#371345b8';
    ctx.beginPath();ctx.moveTo(-w/2,y);ctx.lineTo(-w*.55,y-size*.82);
    ctx.lineTo(-w*.25,y-size*.55);ctx.lineTo(0,y-size*1.04);
    ctx.lineTo(w*.25,y-size*.55);ctx.lineTo(w*.55,y-size*.82);ctx.lineTo(w/2,y);ctx.closePath();ctx.fill();ctx.stroke();
    logoStamp(ctx,image,item,0,y-size*.48,w*.92,size*.86);
    ctx.beginPath();ctx.moveTo(-w/2,y+size*.05);ctx.lineTo(w/2,y+size*.05);ctx.stroke();
  }else if(mode==='glasses'){
    const lensW=size*.79,lensH=size*.48;
    for(const sign of [-1,1]){
      const x=sign*size*.5;
      ctx.fillStyle='#210a39d9';ctx.beginPath();ctx.roundRect(x-lensW/2,-lensH/2,lensW,lensH,lensH*.25);ctx.fill();ctx.stroke();
      logoStamp(ctx,image,item,x,0,lensW*.85,lensH*.78);
    }
    ctx.beginPath();ctx.moveTo(-size*.10,-size*.02);ctx.quadraticCurveTo(0,-size*.16,size*.10,-size*.02);
    ctx.moveTo(-size*.90,-size*.07);ctx.lineTo(-size*1.05,-size*.16);
    ctx.moveTo(size*.90,-size*.07);ctx.lineTo(size*1.05,-size*.16);ctx.stroke();
  }
  ctx.restore();
}
