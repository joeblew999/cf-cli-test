// Search over the operations in catalog.json (the whole visible Cloudflare API), the way cf's
// `cf cli search` is meant to be used: describe the task, get the best operations back.
// Plain BM25 over each operation's name, summary, description, path and tags; no synonym lists.
import { readFileSync } from 'node:fs';

const words = text => (text ?? '')
  .replace(/([a-z])([A-Z])/g, '$1 $2')
  .toLowerCase()
  .split(/[^a-z0-9]+/)
  .filter(w => w.length > 1)
  .map(w => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w));

export function loadCatalog(file = new URL('./catalog.json', import.meta.url)) {
  return JSON.parse(readFileSync(file, 'utf8')).tools;
}

export function createIndex(tools) {
  const docs = tools.map(tool => {
    const { method, path, tags } = tool._http;
    // The path without {params}, and the name, count twice: they say what the operation is.
    const route = path.replace(/\{[^}]+\}/g, ' ');
    const terms = [...words(tool.name), ...words(tool.name), ...words(route), ...words(route), ...words(tool.description), ...words(tags.join(' ')), method.toLowerCase()];
    const tf = new Map();
    for (const t of terms) tf.set(t, (tf.get(t) ?? 0) + 1);
    return { tool, tf, length: terms.length };
  });
  const df = new Map();
  for (const doc of docs) for (const t of doc.tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  const avg = docs.reduce((sum, d) => sum + d.length, 0) / docs.length;
  const k1 = 1.2, b = 0.75, n = docs.length;

  return function search(query, limit = 5) {
    const q = [...new Set(words(query))];
    return docs
      .map(doc => {
        let score = 0;
        for (const t of q) {
          const f = doc.tf.get(t);
          if (!f) continue;
          const idf = Math.log(1 + (n - df.get(t) + 0.5) / (df.get(t) + 0.5));
          score += idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * doc.length / avg));
        }
        return { doc, score };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ doc }) => ({ name: doc.tool.name, method: doc.tool._http.method, path: doc.tool._http.path, summary: doc.tool.description.split(' — ')[0] }));
  };
}
