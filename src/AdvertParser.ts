export interface AdvertField {
  type: number;
  data: Buffer;
}

export class AdvertParser {
  static parse(advert: Buffer): AdvertField[] {
    const fields: AdvertField[] = [];

    let o = 0;
    while (o < advert.length) {
      const len = advert[o++];

      if (len === 0 || o >= advert.length) {
        continue;
      }

      const type = advert[o++];
      const data = advert.slice(o, o + (len - 1));

      o += len - 1;

      fields.push({ type, data });

      if (type === 8 || type === 9) {
        const name = data.toString('ascii');
        console.log(name);
      }
    }

    return fields;
  }
}
