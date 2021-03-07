// ref Core5.2 p1480
import Debug from 'debug';
import { EventEmitter } from 'events';

import { L2CAP, L2capChannelId } from '../l2cap/L2CAP';

import { AttOpcode } from './AttOpcode';
import { AttErrorCode } from './AttError';
import {
  AttErrorRsp, AttErrorRspMsg,
  AttExchangeMtuReq, AttExchangeMtuReqMsg, AttExchangeMtuRsp, AttExchangeMtuRspMsg,
  AttFindInformationReq, AttFindInformationReqMsg, AttFindInformationRsp, AttFindInformationRspMsg,
  AttFindByTypeValueReq, AttFindByTypeValueReqMsg, AttFindByTypeValueRsp, AttFindByTypeValueRspMsg,
  AttReadByTypeReq, AttReadByTypeReqMsg, AttReadByTypeRsp, AttReadByTypeRspMsg,
  AttReadReq, AttReadReqMsg, AttReadRsp, AttReadRspMsg,
  AttReadBlobReq, AttReadBlobReqMsg, AttReadBlobRsp, AttReadBlobRspMsg,
  AttReadMultipleReq, AttReadMultipleReqMsg, AttReadMultipleRsp, AttReadMultipleRspMsg,
  AttReadByGroupTypeReq, AttReadByGroupTypeReqMsg, AttReadByGroupTypeRsp, AttReadByGroupTypeRspMsg,
  AttWriteReq, AttWriteReqMsg, AttWriteRsp, AttWriteRspMsg,
  AttPrepareWriteReq, AttPrepareWriteReqMsg, AttPrepareWriteRsp, AttPrepareWriteRspMsg,
  AttExecuteWriteReq, AttExecuteWriteReqMsg, AttExecuteWriteRsp, AttExecuteWriteRspMsg,
  AttReadMultipleVariableReq, AttReadMultipleVariableReqMsg, AttReadMultipleVariableRsp, AttReadMultipleVariableRspMsg,
} from './AttSerDes';

const debug = Debug('nble-att');

type AttEvents =              'ErrorRsp'                |
  'ExchangeMtuReq'          | 'ExchangeMtuRsp'          |
  'FindInformationReq'      | 'FindInformationRsp'      |
  'FindByTypeValueReq'      | 'FindByTypeValueRsp'      |
  'ReadByTypeReq'           | 'ReadByTypeRsp'           |
  'ReadReq'                 | 'ReadRsp'                 |
  'ReadBlobReq'             | 'ReadBlobRsp'             |
  'ReadMultipleReq'         | 'ReadMultipleRsp'         |
  'ReadByGroupTypeReq'      | 'ReadByGroupTypeRsp'      |
  'WriteReq'                | 'WriteRsp'                |
  'PrepareWriteReq'         | 'PrepareWriteRsp'         |
  'ExecuteWriteReq'         | 'ExecuteWriteRsp'         |
  'ReadMultipleVariableReq' | 'ReadMultipleVariableRsp';

export declare interface Att {
  on(event: 'ErrorRsp',             listener: (event: AttErrorRspMsg) => void): this;
  on(event: 'ExchangeMtuReq',       listener: (event: AttExchangeMtuReqMsg) => void): this;
  on(event: 'ExchangeMtuRsp',       listener: (event: AttExchangeMtuRspMsg) => void): this;
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
  public async errorRsp(rsp: AttErrorRspMsg): Promise<void> {
    await this.writeAtt(AttErrorRsp.serialize(rsp));
  }

  public async exchangeMtuRsp(rsp: AttExchangeMtuRspMsg): Promise<void> {
    await this.writeAtt(AttExchangeMtuRsp.serialize(rsp));
  }

  public async findInformationRsp(rsp: AttFindInformationRspMsg): Promise<void> {
    await this.writeAtt(AttFindInformationRsp.serialize(rsp));
  }

  public async findByTypeValueRsp(rsp: AttFindByTypeValueRspMsg): Promise<void> {
    await this.writeAtt(AttFindByTypeValueRsp.serialize(rsp));
  }

  public async readByTypeRsp(rsp: AttReadByTypeRspMsg): Promise<void> {
    await this.writeAtt(AttReadByTypeRsp.serialize(rsp));
  }

  public async readRsp(rsp: AttReadRspMsg): Promise<void> {
    await this.writeAtt(AttReadRsp.serialize(rsp));
  }

  public async readBlobRsp(rsp: AttReadBlobRspMsg): Promise<void> {
    await this.writeAtt(AttReadBlobRsp.serialize(rsp));
  }

  public async readMultipleRsp(rsp: AttReadMultipleRspMsg): Promise<void> {
    await this.writeAtt(AttReadMultipleRsp.serialize(rsp));
  }

  public async readByGroupTypeRsp(rsp: AttReadByGroupTypeRspMsg): Promise<void> {
    await this.writeAtt(AttReadByGroupTypeRsp.serialize(rsp));
  }

  public async writeRsp(rsp: AttWriteRspMsg): Promise<void> {
    await this.writeAtt(AttWriteRsp.serialize(rsp));
  }

  public async prepareWriteRsp(rsp: AttPrepareWriteRspMsg): Promise<void> {
    await this.writeAtt(AttPrepareWriteRsp.serialize(rsp));
  }

  public async executeWriteRsp(rsp: AttExecuteWriteRspMsg): Promise<void> {
    await this.writeAtt(AttExecuteWriteRsp.serialize(rsp));
  }

  public async readMultipleVariableRsp(rsp: AttReadMultipleVariableRspMsg): Promise<void> {
    await this.writeAtt(AttReadMultipleVariableRsp.serialize(rsp));
  }

  // Requests
  public async exchangeMtuReq(req: AttExchangeMtuReqMsg): Promise<AttExchangeMtuRspMsg> {
    const waitAttRsp = this.waitAttEvent<AttExchangeMtuRspMsg>(
      'ExchangeMtuRsp', AttOpcode.ExchangeMtuReq
    );
    await this.writeAtt(AttExchangeMtuReq.serialize(req));
    return await waitAttRsp;
  }

  public async findInformationReq(req: AttFindInformationReqMsg): Promise<AttFindInformationRspMsg> {
    const waitAttRsp = this.waitAttEvent<AttFindInformationRspMsg>(
      'FindInformationRsp', AttOpcode.FindInformationReq
    );
    await this.writeAtt(AttFindInformationReq.serialize(req));
    return await waitAttRsp;
  }

  public async findByTypeValueReq(req: AttFindByTypeValueReqMsg): Promise<AttFindByTypeValueRspMsg> {
    const waitAttRsp = this.waitAttEvent<AttFindByTypeValueRspMsg>(
      'FindByTypeValueRsp', AttOpcode.FindByTypeValueReq
    );
    await this.writeAtt(AttFindByTypeValueReq.serialize(req));
    return await waitAttRsp;
  }

  public async readByTypeReq(req: AttReadByTypeReqMsg): Promise<AttReadByTypeRspMsg> {
    const waitAttRsp = this.waitAttEvent<AttReadByTypeRspMsg>(
      'ReadByTypeRsp', AttOpcode.ReadByTypeReq
    );
    await this.writeAtt(AttReadByTypeReq.serialize(req));
    return await waitAttRsp;
  }

  public async readReq(req: AttReadReqMsg): Promise<AttReadRspMsg> {
    const waitAttRsp = this.waitAttEvent<AttReadRspMsg>(
      'ReadRsp', AttOpcode.ReadReq
    );
    await this.writeAtt(AttReadReq.serialize(req));
    return await waitAttRsp;
  }

  public async readBlobReq(req: AttReadBlobReqMsg): Promise<AttReadBlobRspMsg> {
    const waitAttRsp = this.waitAttEvent<AttReadBlobRspMsg>(
      'ReadBlobRsp', AttOpcode.ReadBlobReq
    );
    await this.writeAtt(AttReadBlobReq.serialize(req));
    return await waitAttRsp;
  }

  public async readMultipleReq(req: AttReadMultipleReqMsg): Promise<AttReadMultipleRspMsg> {
    const waitAttRsp = this.waitAttEvent<AttReadMultipleRspMsg>(
      'ReadMultipleRsp', AttOpcode.ReadMultipleReq
    );
    await this.writeAtt(AttReadMultipleReq.serialize(req));
    return await waitAttRsp;
  }

  public async readByGroupTypeReq(req: AttReadByGroupTypeReqMsg): Promise<AttReadByGroupTypeRspMsg> {
    const waitAttRsp = this.waitAttEvent<AttReadByGroupTypeRspMsg>(
      'ReadByGroupTypeRsp', AttOpcode.ReadByGroupTypeReq
    );
    await this.writeAtt(AttReadByGroupTypeReq.serialize(req));
    return await waitAttRsp;
  }

  public async writeReq(req: AttWriteReqMsg): Promise<AttWriteRspMsg> {
    const waitAttRsp = this.waitAttEvent<AttWriteRspMsg>(
      'WriteRsp', AttOpcode.WriteReq
    );
    await this.writeAtt(AttWriteReq.serialize(req));
    return await waitAttRsp;
  }

  public async prepareWriteReq(req: AttPrepareWriteReqMsg): Promise<AttPrepareWriteRspMsg> {
    const waitAttRsp = this.waitAttEvent<AttPrepareWriteRspMsg>(
      'PrepareWriteRsp', AttOpcode.PrepareWriteReq
    );
    await this.writeAtt(AttPrepareWriteReq.serialize(req));
    return await waitAttRsp;
  }

  public async executeWriteReq(req: AttExecuteWriteReqMsg): Promise<AttExecuteWriteRspMsg> {
    const waitAttRsp = this.waitAttEvent<AttExecuteWriteRspMsg>(
      'ExecuteWriteRsp', AttOpcode.ExecuteWriteReq
    );
    await this.writeAtt(AttExecuteWriteReq.serialize(req));
    return await waitAttRsp;
  }

  public async readMultipleVariableReq(req: AttReadMultipleVariableReqMsg): Promise<AttReadMultipleVariableRspMsg> {
    const waitAttRsp = this.waitAttEvent<AttReadMultipleVariableRspMsg>(
      'ReadMultipleVariableRsp', AttOpcode.ReadMultipleVariableReq
    );
    await this.writeAtt(AttReadMultipleVariableReq.serialize(req));
    return await waitAttRsp;
  }

  // WriteCmd
  // MultipleHandleValueNtf
  // HandleValueNtf
  // HandleValueInd
  // HandleValueCfm
  // SignedWriteCmd

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
        const result = AttExchangeMtuReq.deserialize(data);
        if (!result) {
          return debug('Cannot parse ExchangeMtuReq');
        }
        debug(`ExchangeMtuReq: ${result}`);

        this.emit('ExchangeMtuReq', result);
        break;
      }
      case AttOpcode.ExchangeMtuRsp: {
        const result = AttExchangeMtuRsp.deserialize(data);
        if (!result) {
          return debug('Cannot parse ExchangeMtuRsp');
        }
        debug(`ExchangeMtuRsp: ${result}`);

        this.emit('ExchangeMtuRsp', result);
        break;
      }

      case AttOpcode.FindInformationReq: {
        const result = AttFindInformationReq.deserialize(data);
        if (!result) {
          return debug('Cannot parse FindInformationReq');
        }
        debug(`FindInformationReq: ${result}`);

        this.emit('FindInformationReq', result);
        break;
      }
      case AttOpcode.FindInformationRsp: {
        const result = AttFindInformationRsp.deserialize(data);
        if (!result) {
          return debug('Cannot parse FindInformationRsp');
        }
        debug(`FindInformationRsp: ${result}`);

        this.emit('FindInformationRsp', result);
        break;
      }

      case AttOpcode.FindByTypeValueReq: {
        const result = AttFindByTypeValueReq.deserialize(data);
        if (!result) {
          return debug('Cannot parse FindByTypeValueReq');
        }
        debug(`FindByTypeValueReq: ${result}`);

        this.emit('FindByTypeValueReq', result);
        break;
      }
      case AttOpcode.FindByTypeValueRsp: {
        const result = AttFindByTypeValueRsp.deserialize(data);
        if (!result) {
          return debug('Cannot parse FindByTypeValueRsp');
        }
        debug(`FindByTypeValueRsp: ${result}`);

        this.emit('FindByTypeValueRsp', result);
        break;
      }

      case AttOpcode.ReadByTypeReq: {
        const result = AttReadByTypeReq.deserialize(data);
        if (!result) {
          return debug('Cannot parse ReadByTypeReq');
        }
        debug(`ReadByTypeReq: ${result}`);

        this.emit('ReadByTypeReq', result);
        break;
      }
      case AttOpcode.ReadByTypeRsp: {
        const result = AttReadByTypeRsp.deserialize(data);
        if (!result) {
          return debug('Cannot parse ReadByTypeRsp');
        }
        debug(`ReadByTypeRsp: ${result}`);

        this.emit('ReadByTypeRsp', result);
        break;
      }

      case AttOpcode.ReadReq: {
        const result = AttReadReq.deserialize(data);
        if (!result) {
          return debug('Cannot parse ReadReq');
        }
        debug(`ReadReq: ${result}`);

        this.emit('ReadReq', result);
        break;
      }
      case AttOpcode.ReadRsp: {
        const result = AttReadRsp.deserialize(data);
        if (!result) {
          return debug('Cannot parse ReadRsp');
        }
        debug(`ReadRsp: ${result}`);

        this.emit('ReadRsp', result);
        break;
      }

      case AttOpcode.ReadBlobReq: {
        const result = AttReadBlobReq.deserialize(data);
        if (!result) {
          return debug('Cannot parse ReadBlobReq');
        }
        debug(`ReadBlobReq: ${result}`);

        this.emit('ReadBlobReq', result);
        break;
      }
      case AttOpcode.ReadBlobRsp: {
        const result = AttReadBlobRsp.deserialize(data);
        if (!result) {
          return debug('Cannot parse ReadBlobRsp');
        }
        debug(`ReadBlobRsp: ${result}`);

        this.emit('ReadBlobRsp', result);
        break;
      }

      case AttOpcode.ReadMultipleReq: {
        const result = AttReadMultipleReq.deserialize(data);
        if (!result) {
          return debug('Cannot parse ReadMultipleReq');
        }
        debug(`ReadMultipleReq: ${result}`);

        this.emit('ReadMultipleReq', result);
        break;
      }
      case AttOpcode.ReadMultipleRsp: {
        const result = AttReadMultipleRsp.deserialize(data);
        if (!result) {
          return debug('Cannot parse ReadMultipleRsp');
        }
        debug(`ReadMultipleRsp: ${result}`);

        this.emit('ReadMultipleRsp', result);
        break;
      }

      case AttOpcode.ReadByGroupTypeReq: {
        const result = AttReadByGroupTypeReq.deserialize(data);
        if (!result) {
          return debug('Cannot parse ReadByGroupTypeReq');
        }
        debug(`ReadByGroupTypeReq: ${result}`);

        this.emit('ReadByGroupTypeReq', result);
        break;
      }
      case AttOpcode.ReadByGroupTypeRsp: {
        const result = AttReadByGroupTypeRsp.deserialize(data);
        if (!result) {
          return debug('Cannot parse ReadByGroupTypeRsp');
        }
        debug(`ReadByGroupTypeRsp: ${result}`);

        this.emit('ReadByGroupTypeRsp', result);
        break;
      }

      case AttOpcode.WriteReq: {
        const result = AttWriteReq.deserialize(data);
        if (!result) {
          return debug('Cannot parse WriteReq');
        }
        debug(`WriteReq: ${result}`);

        this.emit('WriteReq', result);
        break;
      }
      case AttOpcode.WriteRsp: {
        const result = AttWriteRsp.deserialize(data);
        if (!result) {
          return debug('Cannot parse WriteRsp');
        }
        debug(`WriteRsp: ${result}`);

        this.emit('WriteRsp', result);
        break;
      }

      case AttOpcode.PrepareWriteReq: {
        const result = AttPrepareWriteReq.deserialize(data);
        if (!result) {
          return debug('Cannot parse PrepareWriteReq');
        }
        debug(`PrepareWriteReq: ${result}`);

        this.emit('PrepareWriteReq', result);
        break;
      }
      case AttOpcode.PrepareWriteRsp: {
        const result = AttPrepareWriteRsp.deserialize(data);
        if (!result) {
          return debug('Cannot parse PrepareWriteRsp');
        }
        debug(`PrepareWriteRsp: ${result}`);

        this.emit('PrepareWriteRsp', result);
        break;
      }

      case AttOpcode.ExecuteWriteReq: {
        const result = AttExecuteWriteReq.deserialize(data);
        if (!result) {
          return debug('Cannot parse ExecuteWriteReq');
        }
        debug(`ExecuteWriteReq: ${result}`);

        this.emit('ExecuteWriteReq', result);
        break;
      }
      case AttOpcode.ExecuteWriteRsp: {
        const result = AttExecuteWriteRsp.deserialize(data);
        if (!result) {
          return debug('Cannot parse ExecuteWriteRsp');
        }
        debug(`ExecuteWriteRsp: ${result}`);

        this.emit('ExecuteWriteRsp', result);
        break;
      }

      case AttOpcode.ReadMultipleVariableReq: {
        const result = AttReadMultipleVariableReq.deserialize(data);
        if (!result) {
          return debug('Cannot parse ReadMultipleVariableReq');
        }
        debug(`ReadMultipleVariableReq: ${result}`);

        this.emit('ReadMultipleVariableReq', result);
        break;
      }
      case AttOpcode.ReadMultipleVariableRsp: {
        const result = AttReadMultipleVariableRsp.deserialize(data);
        if (!result) {
          return debug('Cannot parse ReadMultipleVariableRsp');
        }
        debug(`ReadMultipleVariableRsp: ${result}`);

        this.emit('ReadMultipleVariableRsp', result);
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
