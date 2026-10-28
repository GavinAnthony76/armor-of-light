/** Resolve packaged art and the self-contained edition through the same contract. */
export function asset(path:string|undefined):string {
 if(!path)return '';
 const inline=(window as unknown as {__armorAssetMap?:Record<string,string>}).__armorAssetMap;
 // An embedded edition must never fall through to file/network sidecars.
 if(inline)return inline[path] || 'data:application/octet-stream;base64,';
 return import.meta.env.BASE_URL+path;
}
