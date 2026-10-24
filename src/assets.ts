/** Resolve packaged art and the self-contained edition through the same contract. */
export function asset(path:string|undefined):string {
 if(!path)return '';
 const inline=(window as unknown as {__armorAssetMap?:Record<string,string>}).__armorAssetMap;
 return inline?.[path] || import.meta.env.BASE_URL+path;
}
