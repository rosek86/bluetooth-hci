export abstract class Uint8ArrayUtils {
  public static toHexNumber(a: Uint8Array) {
    return (
      "0x" +
      [...a]
        .map((v) => v.toString(16).padStart(2, "0"))
        .reverse()
        .join("")
    );
  }

  public static toHexArray(a: Uint8Array) {
    return (
      "new Uint8Array([\n  " +
      [...a]
        .map((v, i) => {
          const field = "0x" + v.toString(16).padStart(2, "0") + ", ";
          if (i % 16 === 15) {
            return field + "\n  ";
          }
          return field;
        })
        .join("") +
      "\n])"
    );
  }

  public static toHex(u8a: Uint8Array): string {
    return [...u8a].map((v) => v.toString(16).padStart(2, "0")).join("");
  }

  public static fromHex(hex: string): Uint8Array {
    return new Uint8Array(hex.match(/.{1,2}/g)!.map((v) => parseInt(v, 16)));
  }

  public static xor(a: Uint8Array, b: Uint8Array) {
    if (a.length !== b.length) {
      throw new Error("a and b must be same length");
    }

    return new Uint8Array([...a].map((v, i) => v ^ b[i]));
  }
}
