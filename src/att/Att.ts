// ref Core5.2 p1480
import Debug from 'debug';
import { EventEmitter } from 'events';

import { L2CAP, L2capChannelId } from '../l2cap/L2CAP';

import { AttOpcode } from './AttOpcode';
import { AttErrorCode } from './AttError';
import {
  AttErrorRsp, AttErrorRspMsg, AttMtuExchangeReq, AttMtuExchangeRsp,
  AttFindInformationReq, AttFindInformationReqMsg, AttFindInformationRsp, AttFindInformationRspMsg
} from './AttSerDes';

const debug = Debug('nble-att');

type AttEvents =         'ErrorRsp'           |
  'ExchangeMtuReq'     | 'ExchangeMtuRsp'     |
  'FindInformationReq' | 'FindInformationRsp';

export declare interface Att {
  on(event: 'ErrorRsp',             listener: (event: AttErrorRspMsg) => void): this;
  on(event: 'ExchangeMtuReq',       listener: (event: number) => void): this;
  on(event: 'ExchangeMtuRsp',       listener: (event: number) => void): this;
  on(event: 'FindInformationReq',   listener: (event: AttFindInformationReqMsg) => void): this;
  on(event: 'FindInformationRsp',   listener: (event: AttFindInformationRspMsg) => void): this;

  on<T>(event: AttEvents, listener: (event: T) => void): this;
}

export class Att extends EventEmitter {
  // TODO: l2cap can be moved away from this class

  constructor (private l2cap: L2CAP, private connectionHandle: number) {
    super();
    l2cap.on('AttData', this.onAttData);
  }

  public destroy(): void {
    this.l2cap.removeListener('AttData', this.onAttData);
  }

  // Responses
  public async errorRsp(msg: AttErrorRspMsg): Promise<void> {
    await this.writeAtt(AttErrorRsp.serialize(msg));
  }

  public async mtuExchangeRsp(serverRxMtu: number): Promise<void> {
    await this.writeAtt(AttMtuExchangeRsp.serialize(serverRxMtu));
  }

  public async findInformationRsp(info: AttFindInformationRspMsg): Promise<void> {
    await this.writeAtt(AttFindInformationRsp.serialize(info));
  }

  // Requests
  public async mtuExchangeReq(clientRxMtu: number): Promise<number> {
    const waitAttRsp = this.waitAttEvent<number>('ExchangeMtuRsp', AttOpcode.ExchangeMtuReq);
    await this.writeAtt(AttMtuExchangeReq.serialize(clientRxMtu));
    return await waitAttRsp;
  }

  public async findInformationReq(info: AttFindInformationReqMsg): Promise<AttFindInformationRspMsg> {
    const waitAttRsp = this.waitAttEvent<AttFindInformationRspMsg>(
      'FindInformationRsp', AttOpcode.FindInformationReq
    );
    await this.writeAtt(AttFindInformationReq.serialize(info));
    return await waitAttRsp;
  }

  // Events
  private onAttData = (connectionHandle: number, data: Buffer): void => {
    if (this.connectionHandle !== connectionHandle) {
      return;
    }

    const opcode: AttOpcode = data[0];

    switch (opcode) {
      case AttOpcode.ErrorRsp: {
        const errorRspMsg = AttErrorRsp.deserialize(data);
        if (!errorRspMsg) {
          return debug('cannot parse ErrorRsp');
        }
        debug(`errorRsp: ${errorRspMsg}`);

        this.emit('ErrorRsp', errorRspMsg);
        break;
      }
      case AttOpcode.ExchangeMtuReq: {
        const serverRxMtu = AttMtuExchangeReq.deserialize(data);
        if (!serverRxMtu) {
          return debug('cannot parse ExchangeMtuReq');
        }
        debug(`serverRxMtu: ${serverRxMtu}`);

        this.emit('ExchangeMtuReq', serverRxMtu);
        break;
      }
      case AttOpcode.ExchangeMtuRsp: {
        const clientRxMtu = AttMtuExchangeRsp.deserialize(data);
        if (!clientRxMtu) {
          return debug('cannot parse ExchangeMtuRsp');
        }
        debug(`clientRxMtu: ${clientRxMtu}`);

        this.emit('ExchangeMtuRsp', clientRxMtu);
        break;
      }
      case AttOpcode.FindInformationReq: {
        const info = AttFindInformationReq.deserialize(data);
        if (!info) {
          return debug('cannot parse FindInformationReq');
        }
        debug(`find info: ${info}`);

        this.emit('FindInformationReq', info);
        break;
      }
      case AttOpcode.FindInformationRsp: {
        const info = AttFindInformationRsp.deserialize(data);
        if (!info) {
          return debug('cannot parse FindInformationRsp');
        }
        for (const e of info) {
          debug(e.handle, e.uuid.toString('hex'));
        }

        this.emit('FindInformationRsp', info);
        break;
      }
    }
  }

  // Utils
  private async writeAtt(data: Buffer): Promise<void> {
    await this.l2cap.writeAclData(
      this.connectionHandle,
      L2capChannelId.LeAttributeProtocol,
      data
    );
  }

  private waitAttEvent<T>(eventType: AttEvents, opcode: AttOpcode): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const cleanup = () => {
        this.off(eventType,  onSuccess);
        this.off('ErrorRsp', onFailure);
        clearTimeout(timerHandle);
      };
      const onTimeout = () => {
        cleanup();
        reject(new Error(`ATT request (${AttOpcode[opcode]}) timeout`));
      };
      const onFailure = (event: AttErrorRspMsg) => {
        if (event.requestOpcodeInError !== opcode) {
          return;
        }
        cleanup();
        reject(new Error(
          `ATT request (${AttOpcode[opcode]}) failed due to ${AttErrorCode[event.errorCode]}` +
          `attribute handle: ${event.attributeHandleInError}`
        ));
      };
      const onSuccess = (event: T) => {
        cleanup();
        resolve(event);
      };
      this.on('ErrorRsp', onFailure);
      this.on(eventType,  onSuccess);
      const timerTimeout = 30 * 1000;
      const timerHandle = setTimeout(onTimeout, timerTimeout);
    });
  }
}
