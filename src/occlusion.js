/** Reject empty/fully opaque masks instead of silently drawing an arm across the user. */
export function maskHasForeground(rgba) {
  if(!rgba?.length)return false;
  let foreground=0,samples=0;
  for(let i=3;i<rgba.length;i+=32){foreground+=rgba[i]>32?1:0;samples++;}
  const coverage=foreground/samples;
  return coverage>.02&&coverage<.97;
}

/** Put the real user's silhouette back over the rear instructor layer. */
export function drawMaskedUser(ctx,source,geometry,mask,scratch,W,H,ratio=1){
  const width=Math.round(W*ratio),height=Math.round(H*ratio);
  if(scratch.width!==width||scratch.height!==height){scratch.width=width;scratch.height=height;}
  const user=scratch.getContext('2d');
  user.setTransform(ratio,0,0,ratio,0,0);
  user.globalCompositeOperation='source-over';user.clearRect(0,0,W,H);
  user.save();
  if(geometry.mirror){user.translate(W,0);user.scale(-1,1);}
  user.drawImage(source,geometry.offsetX,geometry.offsetY,geometry.drawWidth,geometry.drawHeight);
  user.globalCompositeOperation='destination-in';
  user.drawImage(mask,geometry.offsetX,geometry.offsetY,geometry.drawWidth,geometry.drawHeight);
  user.restore();user.globalCompositeOperation='source-over';
  ctx.drawImage(scratch,0,0,W,H);
}
