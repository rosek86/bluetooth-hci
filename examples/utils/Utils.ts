import { ArgsParser, DefaultInputArgs } from './ArgsParser';
import { Adapter, HciAdapterFactory } from './HciAdapterFactory';

export class Utils {
  public static async createHciAdapter(defaults?: DefaultInputArgs): Promise<Adapter> {
    const argsParser = new ArgsParser();

    const args = await argsParser.getInputArgs(defaults);
    if (!args) {
      throw new Error('Invalid input parameters');
    }

    const adapterOptions = argsParser.getAdapterOptions(args);
    if (!adapterOptions) {
      throw new Error('Invalid input parameters');
    }

    return HciAdapterFactory.create(adapterOptions);
  }
}
