/** Pure, deterministic layout: identical paths produce identical positions. */
export function hash01(value) {
  let hash = 2166136261;
  for (const c of String(value)) {
    hash ^= c.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}
export function topology(files, bounds) {
  const inputs = Array.isArray(files) ? files : Array.from(files.values());
  const paths = new Set();
  for (const f of inputs) {
    const parts = f.path.split('/');
    for (let i = 1; i < parts.length; i++) paths.add(parts.slice(0,i).join('/'));
  }
  const all = [
    ...Array.from(paths, path => ({ path, directory: true, changes: 0 })),
    ...inputs.map(f => ({ ...f, directory: false }))
  ];
  const { x, y, width, height } = bounds;
  const radius = Math.min(width, height) * .44;
  return all.map(node => {
    const parts = node.path.split('/');
    const depth = parts.length;
    const root = parts[0];
    const rootAngle = hash01(root) * Math.PI * 2;
    const variation = (hash01(node.path) - .5) * 2.25;
    const angle = rootAngle + variation * Math.min(1, depth * .32);
    const r = radius * Math.min(.98, .10 + depth * .18 + (node.directory ? -.1 : 0));
    return { ...node, parent: depth > 1 ? parts.slice(0,-1).join('/') : null,
      x: x + width / 2 + Math.cos(angle) * r,
      y: y + height / 2 + Math.sin(angle) * r };
  });
}
export function clamp(value,min,max) { return Math.min(max,Math.max(min,value)); }
export function ageGlow(now,lastAt,windowMs=16000) {
  return clamp(1 - Math.max(0,now-lastAt) / windowMs,0,1);
}
