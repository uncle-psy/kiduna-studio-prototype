export const KI_VECTOR_DIMENSIONS = 1536;

function tokenHash(token: string, seed: number) {
  let hash = seed >>> 0;
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function prototypeEmbedding(text: string) {
  const vector = new Array<number>(KI_VECTOR_DIMENSIONS).fill(0);
  const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];

  for (const token of tokens) {
    const first = tokenHash(token, 2166136261);
    const second = tokenHash(token, 2246822519);
    vector[first % KI_VECTOR_DIMENSIONS] += 1;
    vector[second % KI_VECTOR_DIMENSIONS] += .5;
  }

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => Number((value / magnitude).toFixed(7)));
}

export function vectorLiteral(vector: number[]) {
  return `[${vector.join(",")}]`;
}
