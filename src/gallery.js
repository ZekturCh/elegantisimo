const NAME='team-elegantisimos-gallery';
const STORE='photos';
export const MAX_PHOTOS=20;
export function openGalleryDB(){
  if(!('indexedDB' in window)) return Promise.reject(new Error('IndexedDB no disponible'));
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(NAME,1);
    request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'id'});};
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
    request.onblocked=()=>reject(new Error('Almacenamiento bloqueado'));
  });
}
function txDone(tx){return new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
export async function listPhotos(){
  const db=await openGalleryDB();
  try{const tx=db.transaction(STORE,'readonly');const finished=txDone(tx);const request=tx.objectStore(STORE).getAll();const rows=await new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});await finished;return rows.sort((a,b)=>b.createdAt-a.createdAt);}finally{db.close();}
}
export async function savePhoto(blob){
  const db=await openGalleryDB();
  try{
    const tx=db.transaction(STORE,'readwrite');
    const store=tx.objectStore(STORE);
    const id=`${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
    store.put({id,createdAt:Date.now(),blob});
    const itemsRequest=store.getAll();
    itemsRequest.onsuccess=()=>{
      const rows=itemsRequest.result.sort((a,b)=>b.createdAt-a.createdAt);
      for(const row of rows.slice(MAX_PHOTOS))store.delete(row.id);
    };
    await txDone(tx);return id;
  } finally {db.close();}
}
export async function deletePhoto(id){
  const db=await openGalleryDB();
  try{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(id);await txDone(tx);}finally{db.close();}
}
