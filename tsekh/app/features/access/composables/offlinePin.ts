import { installationId } from '@obshaya/contracts/client-api'
const key='tsekh:offline-pin:v1'
type Credential={salt:number[];hash:string;device:string;until:number;failures:number;retryAt:number}
async function derive(pin:string,salt:Uint8Array<ArrayBuffer>){
  const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(pin),'PBKDF2',false,['deriveBits'])
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',iterations:600000,salt},material,256)
  return Array.from(new Uint8Array(bits),x=>x.toString(16).padStart(2,'0')).join('')
}
export function forgetOfflinePin(){localStorage.removeItem(key)}
export async function rememberOfflinePin(pin:string,expires:string|null|undefined){
  forgetOfflinePin()
  const until=Date.parse(expires??'')
  if(!(until>Date.now()))return
  const salt=crypto.getRandomValues(new Uint8Array(16))
  const saved:Credential={salt:Array.from(salt),hash:await derive(pin,salt),device:installationId('tsekh'),until,failures:0,retryAt:0}
  localStorage.setItem(key,JSON.stringify(saved))
}
export async function offlineVerify(pin:string,expiry:string|null|undefined){
  const raw=localStorage.getItem(key)
  if(!raw)return false
  const c:Credential=JSON.parse(raw)
  if(c.device!==installationId('tsekh') || !(Math.min(c.until,Date.parse(expiry??''))>Date.now()) || c.retryAt>Date.now())return false
  const valid=c.hash===await derive(pin,new Uint8Array(c.salt))
  c.failures=valid?0:c.failures+1
  c.retryAt=c.failures>=5?Date.now()+60000:0
  localStorage.setItem(key,JSON.stringify(c))
  return valid
}
