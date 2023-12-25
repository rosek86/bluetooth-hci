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

  public static xor(a: Uint8Array, b: Uint8Array) {
    if (a.length !== b.length) {
      throw new Error("a and b must be same length");
    }

    return new Uint8Array([...a].map((v, i) => v ^ b[i]));
  }
}
