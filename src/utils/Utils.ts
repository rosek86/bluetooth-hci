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

export function readBigUInt128LE(buffer: Buffer, offset = 0): bigint {
  const first = buffer[offset];
  const last = buffer[offset + 15];
  if (first === undefined || last === undefined)
    throw new Error('Out of range')

  let value = 0n;

  for (let shift = 0n; shift < 128n; shift += 32n) {
    value += BigInt(
      buffer[offset++] +
      buffer[offset++] * 2 ** 8 +
      buffer[offset++] * 2 ** 16 +
      buffer[offset++] * 2 ** 24
    ) << shift;
  }

  return value;
}

export function writeBigUInt128LE(buf: Buffer, value: bigint, offset: number): number {
  for (let shift = 0n; shift < 128n; shift += 32n) {
    let dw = Number((value >> shift) & 0xffffffffn);
    buf[offset++] = dw;
    dw = dw >> 8;
    buf[offset++] = dw;
    dw = dw >> 8;
    buf[offset++] = dw;
    dw = dw >> 8;
    buf[offset++] = dw;
  }
  return offset;
}

export function delay(ms: number): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}
