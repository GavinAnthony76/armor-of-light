/** Presentation data only. No hitboxes, movement, damage or gameplay events. */
export interface ImageSpec {
  src: string;
  width: number;
  height: number;
  frame?: { width: number; height: number; columns: number; count: number };
  anchor: [number, number]; // untrimmed source-cell pixels, normally the feet
  scale: number; // world units per source pixel; uniform on both axes
  sockets?: Record<string, [number, number]>;
  source: string;
  license: string;
}
export interface Clip {
  image: string;
  frames: number[];
  fps: number;
  loop: boolean;
  mode?: 'overlay' | 'replace';
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
  draw: () => boolean;
}
export const emptyManifest = (): ProductionManifest =>
  ({version:1,images:{},clips:{},actors:{},effects:{},lands:{},audio:{}});
