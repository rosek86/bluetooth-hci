
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

// export function bitGetG<T extends number|bigint>(field: T, bit: T): boolean {
//   if (typeof field === 'number' && typeof bit === 'number') {
//     return ((field >> bit) & 1) === 1;
//   }
//   if (typeof field === 'bigint' && typeof bit === 'bigint') {
//     return ((field >> bit) & 1n) === 1n;
//   }
//   return false;
// }
