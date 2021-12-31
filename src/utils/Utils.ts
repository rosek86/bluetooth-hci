export function bitGet(field: bigint, bit: bigint): boolean;
export function bitGet(field: number, bit: number): boolean;
export function bitGet(field: unknown, bit: unknown): boolean {
  if (typeof field === 'number') {
    return ((field >> Number(bit)) & 1) === 1;
  }
  if (typeof field === 'bigint' && (typeof bit === 'number' || typeof bit === 'bigint')) {
    return ((field >> BigInt(bit)) & 1n) === 1n;
  }
  throw new Error('Invalid params');
}

export function bitSet(field: number, bit: number, set?: boolean): number;
export function bitSet(field: bigint, bit: bigint, set?: boolean): bigint;
export function bitSet(field: unknown, bit: unknown, set?: boolean): unknown {
  if (!set) {
    return field;
  }
  if (typeof field === 'number') {
    field |= 1 << Number(bit);
    return field;
  }
  if (typeof field === 'bigint' && (typeof bit === 'number' || typeof bit === 'bigint')) {
    field |= 1n << BigInt(bit);
    return field;
  }
  throw new Error('Invalid params');
}

export function buildBitfield(bits: number[]): number {
  let bitfield = 0;
  for (const bit of bits) {
    bitfield |= 1 << bit;
  }
  return bitfield;
}
