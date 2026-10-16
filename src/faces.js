import {makeSmileGate, smileScore} from './renderer.js';

const FACE_LIFETIME_MS = 520;
function centerOf(points) {
  const a=points?.[33],b=points?.[263],nose=points?.[1];
  if(a&&b)return{x:(a.x+b.x)/2,y:(a.y+b.y)/2,span:Math.hypot(a.x-b.x,a.y-b.y)};
  if(nose)return{x:nose.x,y:nose.y,span:.13};
  return null;
}
/** Proximity matching keeps each person's smile independent if detection order changes. */
export function createFaceTracker(maxFaces=3) {
  let tracks=[],nextId=1;
  const reset=()=>{tracks=[];nextId=1;};
  const getFaces=now=>tracks.filter(t=>now-t.lastSeen<=FACE_LIFETIME_MS);
  function update(result,now) {
    const landmarks=(result?.faceLandmarks||[]).slice(0,maxFaces);
    const categories=result?.faceBlendshapes||[];
    const detections=landmarks.map((points,i)=>({
      points,center:centerOf(points),score:smileScore(categories[i]?.categories)
    })).filter(d=>d.center);
    const candidates=[];
    for(let t=0;t<tracks.length;t++)for(let d=0;d<detections.length;d++){
      const a=tracks[t].center,b=detections[d].center;
      const distance=Math.hypot(a.x-b.x,a.y-b.y);
      if(distance<Math.max(.095,Math.max(a.span,b.span)*1.25))candidates.push({t,d,distance});
    }
    candidates.sort((a,b)=>a.distance-b.distance);
    const assignedTracks=new Set(),assignedDetections=new Set();
    for(const {t,d} of candidates){
      if(assignedTracks.has(t)||assignedDetections.has(d))continue;
      assignedTracks.add(t);assignedDetections.add(d);
      const track=tracks[t],det=detections[d],wasSmiling=track.smiling;
      track.center=det.center;track.landmarks=det.points;track.lastSeen=now;
      track.smiling=track.gate.update(det.score,now);
      if(track.smiling&&!wasSmiling)track.smileAt=now;
      if(!track.smiling)track.smileAt=null;
    }
    for(let d=0;d<detections.length;d++){
      if(assignedDetections.has(d))continue;
      const det=detections[d],gate=makeSmileGate(.46,.29,170);
      tracks.push({id:nextId++,center:det.center,landmarks:det.points,lastSeen:now,
        gate,smiling:gate.update(det.score,now),smileAt:null});
    }
    tracks=tracks.filter(t=>now-t.lastSeen<=FACE_LIFETIME_MS);
    return getFaces(now);
  }
  return {update,getFaces,reset};
}
