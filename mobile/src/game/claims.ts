import G from './engine';
import { isInJyvaskyla } from '../map/region';
export type TileClaim = { ownerId: string; ownerName: string; pricePaid: number; claimedAt: number };
export type TileClaims = Record<string, TileClaim>;
export function tilePoint(id: string) {
  if (!/^-?\d+,-?\d+$/.test(id)) return null;
  const [i,j]=id.split(',').map(Number);
  if (!Number.isSafeInteger(i) || !Number.isSafeInteger(j) || G.key(i,j)!==id) return null;
  const point={x:(i+.5)*250,y:(j+.5)*250};
  return isInJyvaskyla(point)?point:null;
}
export const claimPrice = (claim?: TileClaim) => (claim?.pricePaid || 0) + 1;
export const currentTile = (point:{x:number;y:number}) => { const c=G.cell(point.x,point.y);return G.key(c.i,c.j); };
type Wallet = { gold: number; claimGoldSpent?: number };
// A monotonically increasing spending receipt prevents a queued pre-purchase save
// from refunding the claim, while retaining any gold earned during the purchase.
export function reconcileClaimGold<T extends Wallet>(wallet:T, spent:number):T {
  const previous=Number.isSafeInteger(wallet.claimGoldSpent)&&wallet.claimGoldSpent!>=0?wallet.claimGoldSpent!:0;
  const total=Math.max(previous,spent);
  return {...wallet,gold:Math.max(0,wallet.gold-(total-previous)),claimGoldSpent:total};
}
