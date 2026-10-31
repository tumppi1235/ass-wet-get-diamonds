import G from '../game/engine';
import { isPlayablePoint, type Point } from '../map/region';
import {RELEASE_FEATURES} from '../config/features';
import {groundDistance,type Geographic} from '../map/geodesy';
type Sample=Point&Geographic;
const distanceBetween=(a:Sample,b:Sample)=>RELEASE_FEATURES.nationalExploration?groundDistance(a,b):Math.hypot(a.x-b.x,a.y-b.y);
export type LocationFix = { latitude: number; longitude: number; accuracy: number | null; timestamp: number; speed?: number | null };
export type PlayerPosition = Point & { latitude: number; longitude: number; accuracy: number; timestamp: number; inside: boolean; precise: boolean };
export type TrackedFix = { position: PlayerPosition; eligible: boolean; distance: number; startSegment: boolean; reason: 'accurate' | 'approximate' | 'outside' | 'speed' | 'jump' };
export class PositionTracker {
  private anchor: Sample | null = null;
  private previous: (Sample & { timestamp: number }) | null = null;
  private latest = 0;
  accept(fix: LocationFix, now = Date.now()): TrackedFix | null {
    if (!Number.isFinite(fix.latitude) || !Number.isFinite(fix.longitude) || Math.abs(fix.latitude) > 90 || Math.abs(fix.longitude) > 180 || fix.accuracy == null || !Number.isFinite(fix.accuracy) || fix.accuracy < 0 || !Number.isFinite(fix.timestamp) || now - fix.timestamp > 10000 || fix.timestamp - now > 5000 || fix.timestamp <= this.latest) return null;
    this.latest = fix.timestamp;
    const point = {...G.xy(fix.latitude, fix.longitude),latitude:fix.latitude,longitude:fix.longitude}, inside = isPlayablePoint(point), precise = fix.accuracy <= 25;
    const position: PlayerPosition = { ...point, ...fix, accuracy: fix.accuracy, inside, precise };
    if (!inside || !precise || (fix.speed || 0) > 7) {
      this.anchor = null; this.previous = null;
      return { position, distance: 0, eligible: false, startSegment: true, reason: !inside ? 'outside' : !precise ? 'approximate' : 'speed' };
    }
    let startSegment = this.previous === null, distance = 0;
    if (this.previous) {
      const dt = (fix.timestamp - this.previous.timestamp) / 1000, jump = distanceBetween(point,this.previous);
      if (dt > 30) { this.anchor = null; startSegment = true; }
      else if (jump > Math.max(35, dt * 7)) {
        this.anchor = point; this.previous = { ...point, timestamp: fix.timestamp };
        return { position, distance: 0, eligible: false, startSegment: true, reason: 'jump' };
      }
    }
    if (this.anchor) { const travelled = distanceBetween(point,this.anchor); if (travelled >= 8) { distance = travelled; this.anchor = point; } } else this.anchor = point;
    this.previous = { ...point, timestamp: fix.timestamp };
    return { position, eligible: true, distance, startSegment, reason: 'accurate' };
  }
}
