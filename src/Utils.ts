
export function bitGet(field: number, bit: number): boolean {
  return ((field >> bit) & 1) === 1;
}

export function bigintBitGet(field: bigint, bit: bigint): boolean {
  return ((field >> bit) & 1n) === 1n;
}

export function bigintBitSet(field: bigint, bit: bigint, set?: boolean): bigint {
  if (set === true) {
    field |= 1n << bit;
  }
  return field;
}

export function buildBitfield(bits: number[]): number {
  let bitfield = 0;
  for (const bit of bits) {
    bitfield |= 1 << bit;
  }
  return bitfield;
}
