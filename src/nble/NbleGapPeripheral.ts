import { EventEmitter } from "node:events";

export abstract class NbleGapCentral extends EventEmitter {
  constructor() {
    super();
  }
}
