/** Presentation data only. No hitboxes, movement, damage or gameplay events. */
export type SourceRect = [number, number, number, number]; // x, y, width, height
export interface BodyBands {
  top: number; neck: number; hip: number; legTop: number; foot: number;
}
export interface EnemyPresentation {
  /** Source-pixel band boundaries; two-pixel seam overlap is added by the renderer. */
  bands?: BodyBands;
  samples?: Partial<Record<'serpentScales' | 'serpentHead' | 'colossusStone', SourceRect>>;
}
export interface ImageSpec {
  src: string;
  width: number;
  height: number;
  frame?: { width: number; height: number; columns: number; count: number };
  anchor: [number, number]; // untrimmed source-cell pixels, normally the feet
  scale: number; // world units per source pixel; uniform on both axes
  sockets?: Record<string, [number, number]>;
  enemyPresentation?: EnemyPresentation;
  source: string;
  license: string;
}
export interface Clip {
  image: string;
  frames: number[];
  fps: number;
  loop: boolean;
  mode?: 'overlay' | 'replace';
  /** Articulated body-only painting; procedural limbs, gear and warnings survive. */
  bodyMotion?: 'spawn' | 'move' | 'windup' | 'active' | 'recover' | 'stagger' | 'hurt' | 'dying';
}
export interface SceneLayer {
  image: string;
  plane: 'background' | 'foreground';
  height: number; // world height; width always preserves source aspect ratio
  x?: number;
  y?: number;
  speedX: number;
  speedY: number;
  repeatX?: boolean;
  cover?: boolean;
  opacity?: number;
  depth?: [number,number]; // visible player-foot Y interval, e.g. archive vs sky
  fadeY?: number;
}
export interface SceneProp {
  image: string; x: number; y: number; facing?: 1 | -1; clip?: string;
  sway?: number; // small decorative shear about the source base; never collision
}
export interface SampleSpec { sources: string[]; gain: number; voices: number }
export interface ProductionManifest {
  version: 1;
  images: Record<string, ImageSpec>;
  clips: Record<string, Clip>;
  actors: Record<string, { states: Record<string, string> }>;
  effects: Record<string, string>;
  lands: Record<string, { layers: SceneLayer[]; props: SceneProp[]; surfaces?:{ground?:string;platform?:string} }>;
  audio: Record<string, SampleSpec>;
}
export interface BodyArt {
  mode: 'overlay' | 'replace';
  bodyOnly?: boolean;
  /** Resident body material for original articulated geometry (e.g. serpent). */
  texture?: () => HTMLImageElement | undefined;
  samples?: EnemyPresentation['samples'];
  draw: () => boolean;
}
export const emptyManifest = (): ProductionManifest =>
  ({version:1,images:{},clips:{},actors:{},effects:{},lands:{},audio:{}});
