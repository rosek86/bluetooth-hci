import { HciAdapter } from "../../src/utils/HciAdapter.js";

import { ArgsParser, type DefaultInputArgs } from "./ArgsParser.js";
import { HciAdapterFactory } from "./HciAdapterFactory.js";

export class HciAdapterUtils {
  public static async createHciAdapter(defaults?: DefaultInputArgs): Promise<HciAdapter> {
    const argsParser = new ArgsParser();

    const args = await argsParser.getInputArgs(defaults);
    if (!args) {
      throw new Error("Invalid input parameters");
    }

    const adapterOptions = argsParser.getAdapterOptions(args);
    if (!adapterOptions) {
      throw new Error("Invalid input parameters");
    }

    const adapter = await HciAdapterFactory.create(adapterOptions);
    await adapter.open();

    return adapter;
  }
}
