/** Pure geometry and canvas illustration helpers. No user images leave the browser. */
export const PALETTE = Object.freeze({
  violet: '#bd94dc', violetDeep: '#281031', magenta: '#f45ffa', lime: '#d2ff39', cyan: '#17eff4', white: '#ffffff'
});
export const clamp = (number, lower, upper) => Math.max(lower, Math.min(upper, number));
export function getCoverGeometry(videoWidth, videoHeight, canvasWidth, canvasHeight, mirror = false) {
  const scale = Math.max(canvasWidth / videoWidth, canvasHeight / videoHeight);
  const drawWidth = videoWidth * scale;
  const drawHeight = videoHeight * scale;
  return {scale, drawWidth, drawHeight, offsetX: (canvasWidth - drawWidth) / 2, offsetY: (canvasHeight - drawHeight) / 2, mirror, canvasWidth};
}
export function projectLandmark(landmark, geometry) {
  let x = geometry.offsetX + landmark.x * geometry.drawWidth;
  if (geometry.mirror) x = geometry.canvasWidth - x;
  return {x, y: geometry.offsetY + landmark.y * geometry.drawHeight};
}
export function smileScore(categories) {
  if (!Array.isArray(categories)) return 0;
  const value = name => categories.find(c => c.categoryName === name)?.score ?? 0;
  return (value('mouthSmileLeft') + value('mouthSmileRight')) / 2;
}
export function makeSmileGate(on = .46, off = .29, minHoldMs = 170) {
  let active = false;
  let candidateSince = null;
  return {
    update(score, timestamp) {
      if (active) {
        if (score < off) { active = false; candidateSince = null; }
        return active;
      }
      if (score >= on) {
        if (candidateSince === null) candidateSince = timestamp;
        if (timestamp - candidateSince >= minHoldMs) active = true;
      } else candidateSince = null;
      return active;
    },
    reset() { active = false; candidateSince = null; },
    get active() { return active; }
  };
}
function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();ctx.roundRect(x, y, w, h, radius);
}
function glowLine(ctx, startX, startY, endX, endY, color, width = 3) {
  ctx.save();ctx.strokeStyle = color;ctx.shadowColor = color;ctx.shadowBlur = 16;ctx.lineWidth = width;ctx.lineCap = 'round';ctx.beginPath();ctx.moveTo(startX, startY);ctx.lineTo(endX, endY);ctx.stroke();ctx.restore();
}
function star(ctx, x, y, r, color, rotation = 0) {
  ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.strokeStyle=color;ctx.lineWidth=1.8;ctx.shadowColor=color;ctx.shadowBlur=8;ctx.beginPath();ctx.moveTo(-r,0);ctx.lineTo(r,0);ctx.moveTo(0,-r);ctx.lineTo(0,r);ctx.stroke();ctx.restore();
}
export function drawFrame(ctx, W, H, logo) {
  ctx.save();
  const s = W / 390;
  // Tasteful vignette without hiding the face.
  const shade = ctx.createLinearGradient(0, 0, 0, H);
  shade.addColorStop(0, '#0b0616bb'); shade.addColorStop(.22, '#05020900');shade.addColorStop(.71, '#05020900');shade.addColorStop(1, '#090411db');
  ctx.fillStyle=shade;ctx.fillRect(0,0,W,H);
  const left=14*s, right=W-14*s, top=18*s, bottom=H-17*s;
  ctx.strokeStyle='#bc93db9e';ctx.shadowColor=PALETTE.magenta;ctx.shadowBlur=18*s;ctx.lineWidth=1.7*s;
  ctx.beginPath();ctx.moveTo(left,top+38*s);ctx.lineTo(left,top+11*s);ctx.quadraticCurveTo(left,top,left+12*s,top);ctx.lineTo(left+82*s,top);
  ctx.moveTo(right-82*s,top);ctx.lineTo(right-12*s,top);ctx.quadraticCurveTo(right,top,right,top+12*s);ctx.lineTo(right,top+38*s);
  ctx.moveTo(left,bottom-45*s);ctx.lineTo(left,bottom-12*s);ctx.quadraticCurveTo(left,bottom,left+12*s,bottom);ctx.lineTo(left+82*s,bottom);
  ctx.moveTo(right-82*s,bottom);ctx.lineTo(right-12*s,bottom);ctx.quadraticCurveTo(right,bottom,right,bottom-12*s);ctx.lineTo(right,bottom-45*s);ctx.stroke();ctx.shadowBlur=0;
  glowLine(ctx, left+2*s,top+14*s,left+61*s,top+14*s,PALETTE.lime,2.1*s);
  glowLine(ctx, right-61*s,top+14*s,right-2*s,top+14*s,PALETTE.cyan,2.1*s);
  glowLine(ctx, left+2*s,bottom-14*s,left+61*s,bottom-14*s,PALETTE.cyan,2.1*s);
  glowLine(ctx, right-61*s,bottom-14*s,right-2*s,bottom-14*s,PALETTE.lime,2.1*s);
  for (const [x,y,r,c] of [[28,103,5,PALETTE.magenta],[360,144,7,PALETTE.cyan],[26,380,6,PALETTE.lime],[365,455,5,PALETTE.magenta],[31,650,5,PALETTE.cyan],[356,710,5,PALETTE.lime]]) {
    const sy=(y/845)*H; star(ctx,x*s,sy,r*s,c,Math.PI/6);
  }
  // Branded photo, naturally independent of the editing UI controls.
  const logoWidth=Math.min(W*.68,380*s);
  const logoHeight=logoWidth*(362/1421);
  const logoY=H - Math.max(64*s, H*.09) - logoHeight;
  if (logo?.complete && logo.naturalWidth) {
    ctx.shadowColor='#c589f8';ctx.shadowBlur=17*s;ctx.drawImage(logo,(W-logoWidth)/2,logoY,logoWidth,logoHeight);ctx.shadowBlur=0;
  } else {
    ctx.font=`900 ${18*s}px system-ui`;ctx.textAlign='center';ctx.fillStyle=PALETTE.violet;ctx.fillText('TEAM ELEGANTÍSIMOS',W/2,logoY+logoHeight*.7);
  }
  ctx.fillStyle='#fff';ctx.font=`800 ${11*s}px system-ui`;ctx.textAlign='center';ctx.letterSpacing=`${2.1*s}px`;
  ctx.fillText('MASTER CLASS  •  PAOLO',W/2,logoY-12*s);ctx.letterSpacing='0px';
  ctx.restore();
}
export function drawCheeks(ctx, landmarks, geometry) {
  if (!landmarks || !landmarks[205] || !landmarks[425]) return;
  const cheekA=projectLandmark(landmarks[205],geometry),cheekB=projectLandmark(landmarks[425],geometry);
  const eyes=[projectLandmark(landmarks[33],geometry),projectLandmark(landmarks[263],geometry)];
  const eyeDist=Math.hypot(eyes[1].x-eyes[0].x,eyes[1].y-eyes[0].y);
  let angle = Math.atan2(eyes[1].y-eyes[0].y,eyes[1].x-eyes[0].x);
  if (Math.cos(angle)<0) angle += angle>0 ? -Math.PI : Math.PI;
  const cheeks=[cheekA,cheekB].sort((a,b)=>a.x-b.x);
  const fontsize=clamp(eyeDist*.21,12,46);
  for(const [i,cheek] of cheeks.entries()){
    const label=i===0?'Zum':'baa!';
    ctx.save();ctx.translate(cheek.x,cheek.y);ctx.rotate(angle);
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`900 italic ${fontsize}px Arial,system-ui,sans-serif`;
    ctx.lineJoin='round';ctx.lineWidth=clamp(fontsize*.34,4,11);
    ctx.strokeStyle='#20042adf';ctx.shadowColor=i===0?PALETTE.lime:PALETTE.magenta;ctx.shadowBlur=10;
    ctx.strokeText(label,0,0);ctx.fillStyle=i===0?PALETTE.lime:'#f6c8ff';ctx.fillText(label,0,0);
    ctx.restore();
  }
}
export function drawCrown(ctx, landmarks, geometry, timestamp = 0) {
  if (!landmarks?.[10] || !landmarks?.[33] || !landmarks?.[263]) return;
  const top=projectLandmark(landmarks[10],geometry);
  const leftEye=projectLandmark(landmarks[33],geometry),rightEye=projectLandmark(landmarks[263],geometry);
  const distance=Math.hypot(rightEye.x-leftEye.x,rightEye.y-leftEye.y);
  let angle=Math.atan2(rightEye.y-leftEye.y,rightEye.x-leftEye.x);
  if (Math.cos(angle)<0) angle += angle>0 ? -Math.PI : Math.PI;
  const width=clamp(distance*2.05,125,390),height=width*.44;
  const x=top.x,y=top.y-width*.20;
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);
  const w=width,h=height;
  ctx.shadowColor=PALETTE.magenta;ctx.shadowBlur=23;ctx.lineWidth=Math.max(3,w*.014);
  ctx.strokeStyle=PALETTE.lime;ctx.fillStyle='#b988e8';
  ctx.beginPath();ctx.moveTo(-w*.46,h*.13);ctx.lineTo(-w*.48,-h*.44);ctx.lineTo(-w*.22,-h*.15);ctx.lineTo(0,-h*.69);ctx.lineTo(w*.22,-h*.15);ctx.lineTo(w*.48,-h*.44);ctx.lineTo(w*.46,h*.13);ctx.closePath();ctx.fill();ctx.stroke();
  const gradient=ctx.createLinearGradient(0,-h*.05,0,h*.32);gradient.addColorStop(0,'#4a1e67');gradient.addColorStop(1,'#20082c');
  roundRect(ctx,-w*.49,-h*.09,w*.98,h*.38,h*.1);ctx.fillStyle=gradient;ctx.fill();ctx.strokeStyle='#f8d4ff';ctx.lineWidth=Math.max(1.2,w*.006);ctx.stroke();
  ctx.shadowBlur=5;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';
  ctx.font=`900 ${w*.104}px system-ui,Arial`;ctx.fillText('MASTER CLASS',0,h*.015,w*.88);
  ctx.fillStyle=PALETTE.lime;ctx.font=`1000 ${w*.155}px system-ui,Arial`;ctx.fillText('PAOLO',0,h*.22,w*.67);
  ctx.shadowBlur=12;ctx.fillStyle=PALETTE.lime;
  for(const pt of [[-w*.48,-h*.44],[0,-h*.69],[w*.48,-h*.44]]){
    ctx.beginPath();ctx.arc(pt[0],pt[1],w*.034,0,Math.PI*2);ctx.fill();
  }
  const wobble=Math.sin(timestamp/370)*w*.018;
  star(ctx,-w*.56,-h*.48+wobble,w*.065,PALETTE.cyan);
  star(ctx,w*.55,-h*.54-wobble,w*.063,PALETTE.lime);
  ctx.restore();
}
