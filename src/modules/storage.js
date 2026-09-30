const memory = new Map();
const prefix = 'nd_';

function key(name) { return `${prefix}${name}_v1`; }

export function read(name, fallback) {
  try {
    const raw = localStorage.getItem(key(name));
    return raw ? JSON.parse(raw) : fallback;
  } catch { return memory.has(key(name)) ? memory.get(key(name)) : fallback; }
}

export function write(name, value) {
  try { localStorage.setItem(key(name), JSON.stringify(value)); }
  catch { memory.set(key(name), value); }
  return value;
}

export function remove(name) {
  try { localStorage.removeItem(key(name)); }
  catch { memory.delete(key(name)); }
}

export function has(name) {
  try { return localStorage.getItem(key(name)) !== null; }
  catch { return memory.has(key(name)); }
}
