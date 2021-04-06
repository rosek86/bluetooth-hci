// ref Core5.2 p1480
import Debug from 'debug';
import { EventEmitter } from 'events';

import { L2capChannelId } from '../l2cap/L2capChannelId';

import { AttOpcode } from './AttOpcode';
import { AttErrorCode } from './AttError';
import {
  AttSerDes, AttErrorRsp, AttErrorRspMsg,
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
  AttWriteCmd, AttWriteCmdMsg, AttSignedWriteCmd, AttSignedWriteCmdMsg,
  AttHandleValueNtf, AttHandleValueNtfMsg, AttHandleValueInd, AttHandleValueIndMsg,
  AttHandleValueCfm, AttHandleValueCfmMsg, AttMultipleHandleValueNtf, AttMultipleHandleValueNtfMsg
} from './AttSerDes';

const debug = Debug('nble-att');

type AttEvents = keyof typeof AttOpcode;

interface L2cap extends EventEmitter {
  on(event: 'AttData', listener: (connectionHandle: number, payload: Buffer) => void): this;
  writeAclData: (connectionHandle: number, channelId: L2capChannelId, data: Buffer) => void;
}

export declare interface Att {
  on(event: 'ErrorRsp',                listener: (event: AttErrorRspMsg) => void): this;
  on(event: 'ExchangeMtuReq',          listener: (event: AttExchangeMtuReqMsg) => void): this;
  on(event: 'ExchangeMtuRsp',          listener: (event: AttExchangeMtuRspMsg) => void): this;
  on(event: 'FindInformationReq',      listener: (event: AttFindInformationReqMsg) => void): this;
  on(event: 'FindInformationRsp',      listener: (event: AttFindInformationRspMsg) => void): this;
  on(event: 'FindByTypeValueReq',      listener: (event: AttFindByTypeValueReqMsg) => void): this;
  on(event: 'FindByTypeValueRsp',      listener: (event: AttFindByTypeValueRspMsg) => void): this;
  on(event: 'ReadByTypeReq',           listener: (event: AttReadByTypeReqMsg) => void): this;
  on(event: 'ReadByTypeRsp',           listener: (event: AttReadByTypeRspMsg) => void): this;
  on(event: 'ReadReq',                 listener: (event: AttReadReqMsg) => void): this;
  on(event: 'ReadRsp',                 listener: (event: AttReadRspMsg) => void): this;
  on(event: 'ReadBlobReq',             listener: (event: AttReadBlobReqMsg) => void): this;
  on(event: 'ReadBlobRsp',             listener: (event: AttReadBlobRspMsg) => void): this;
  on(event: 'ReadMultipleReq',         listener: (event: AttReadMultipleReqMsg) => void): this;
  on(event: 'ReadMultipleRsp',         listener: (event: AttReadMultipleRspMsg) => void): this;
  on(event: 'ReadByGroupTypeReq',      listener: (event: AttReadByGroupTypeReqMsg) => void): this;
  on(event: 'ReadByGroupTypeRsp',      listener: (event: AttReadByGroupTypeRspMsg) => void): this;
  on(event: 'WriteReq',                listener: (event: AttWriteReqMsg) => void): this;
  on(event: 'WriteRsp',                listener: (event: AttWriteRspMsg) => void): this;
  on(event: 'PrepareWriteReq',         listener: (event: AttPrepareWriteReqMsg) => void): this;
  on(event: 'PrepareWriteRsp',         listener: (event: AttPrepareWriteRspMsg) => void): this;
  on(event: 'ExecuteWriteReq',         listener: (event: AttExecuteWriteReqMsg) => void): this;
  on(event: 'ExecuteWriteRsp',         listener: (event: AttExecuteWriteRspMsg) => void): this;
  on(event: 'ReadMultipleVariableReq', listener: (event: AttReadMultipleVariableReqMsg) => void): this;
  on(event: 'ReadMultipleVariableRsp', listener: (event: AttReadMultipleVariableRspMsg) => void): this;

  on(event: 'HandleValueNtf',          listener: (event: AttHandleValueNtfMsg) => void): this;
  on(event: 'HandleValueInd',          listener: (event: AttHandleValueIndMsg) => void): this;
  on(event: 'HandleValueCfm',          listener: (event: AttHandleValueCfmMsg) => void): this;
  on(event: 'MultipleHandleValueNtf',  listener: (event: AttMultipleHandleValueNtfMsg) => void): this;

  on<T>(event: AttEvents, listener: (event: T) => void): this;
}

export class Att extends EventEmitter {
  private readonly handlers: Record<number, (data: Buffer) => void> = {
    [AttOpcode.ErrorRsp]:                this.handleEvent.bind(this, AttOpcode.ErrorRsp,                AttErrorRsp),
    [AttOpcode.ExchangeMtuReq]:          this.handleEvent.bind(this, AttOpcode.ExchangeMtuReq,          AttExchangeMtuReq),
    [AttOpcode.ExchangeMtuRsp]:          this.handleEvent.bind(this, AttOpcode.ExchangeMtuRsp,          AttExchangeMtuRsp),
    [AttOpcode.FindInformationReq]:      this.handleEvent.bind(this, AttOpcode.FindInformationReq,      AttFindInformationReq),
    [AttOpcode.FindInformationRsp]:      this.handleEvent.bind(this, AttOpcode.FindInformationRsp,      AttFindInformationRsp),
    [AttOpcode.FindByTypeValueReq]:      this.handleEvent.bind(this, AttOpcode.FindByTypeValueReq,      AttFindByTypeValueReq),
    [AttOpcode.FindByTypeValueRsp]:      this.handleEvent.bind(this, AttOpcode.FindByTypeValueRsp,      AttFindByTypeValueRsp),
    [AttOpcode.ReadByTypeReq]:           this.handleEvent.bind(this, AttOpcode.ReadByTypeReq,           AttReadByTypeReq),
    [AttOpcode.ReadByTypeRsp]:           this.handleEvent.bind(this, AttOpcode.ReadByTypeRsp,           AttReadByTypeRsp),
    [AttOpcode.ReadReq]:                 this.handleEvent.bind(this, AttOpcode.ReadReq,                 AttReadReq),
    [AttOpcode.ReadRsp]:                 this.handleEvent.bind(this, AttOpcode.ReadRsp,                 AttReadRsp),
    [AttOpcode.ReadBlobReq]:             this.handleEvent.bind(this, AttOpcode.ReadBlobReq,             AttReadBlobReq),
    [AttOpcode.ReadBlobRsp]:             this.handleEvent.bind(this, AttOpcode.ReadBlobRsp,             AttReadBlobRsp),
    [AttOpcode.ReadMultipleReq]:         this.handleEvent.bind(this, AttOpcode.ReadMultipleReq,         AttReadMultipleReq),
    [AttOpcode.ReadMultipleRsp]:         this.handleEvent.bind(this, AttOpcode.ReadMultipleRsp,         AttReadMultipleRsp),
    [AttOpcode.ReadByGroupTypeReq]:      this.handleEvent.bind(this, AttOpcode.ReadByGroupTypeReq,      AttReadByGroupTypeReq),
    [AttOpcode.ReadByGroupTypeRsp]:      this.handleEvent.bind(this, AttOpcode.ReadByGroupTypeRsp,      AttReadByGroupTypeRsp),
    [AttOpcode.WriteReq]:                this.handleEvent.bind(this, AttOpcode.WriteReq,                AttWriteReq),
    [AttOpcode.WriteRsp]:                this.handleEvent.bind(this, AttOpcode.WriteRsp,                AttWriteRsp),
    [AttOpcode.PrepareWriteReq]:         this.handleEvent.bind(this, AttOpcode.PrepareWriteReq,         AttPrepareWriteReq),
    [AttOpcode.PrepareWriteRsp]:         this.handleEvent.bind(this, AttOpcode.PrepareWriteRsp,         AttPrepareWriteRsp),
    [AttOpcode.ExecuteWriteReq]:         this.handleEvent.bind(this, AttOpcode.ExecuteWriteReq,         AttExecuteWriteReq),
    [AttOpcode.ExecuteWriteRsp]:         this.handleEvent.bind(this, AttOpcode.ExecuteWriteRsp,         AttExecuteWriteRsp),
    [AttOpcode.ReadMultipleVariableReq]: this.handleEvent.bind(this, AttOpcode.ReadMultipleVariableReq, AttReadMultipleVariableReq),
    [AttOpcode.ReadMultipleVariableRsp]: this.handleEvent.bind(this, AttOpcode.ReadMultipleVariableRsp, AttReadMultipleVariableRsp),
  
    [AttOpcode.HandleValueNtf]:          this.handleEvent.bind(this, AttOpcode.HandleValueNtf,          AttHandleValueNtf),
    [AttOpcode.HandleValueInd]:          this.handleEvent.bind(this, AttOpcode.HandleValueInd,          AttHandleValueInd),
    [AttOpcode.HandleValueCfm]:          this.handleEvent.bind(this, AttOpcode.HandleValueCfm,          AttHandleValueCfm),
    [AttOpcode.MultipleHandleValueNtf]:  this.handleEvent.bind(this, AttOpcode.MultipleHandleValueNtf,  AttMultipleHandleValueNtf),
  };

  constructor (private l2cap: L2cap, private connectionHandle: number) {
    super();
    l2cap.on('AttData', this.onAttData);
  }

  public destroy(): void {
    this.l2cap.off('AttData', this.onAttData);
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
    return await this.writeAttWaitEvent<AttExchangeMtuRspMsg>(
      AttOpcode.ExchangeMtuReq, AttOpcode.ExchangeMtuRsp, AttExchangeMtuReq.serialize(req)
    );
  }

  public async findInformationReq(req: AttFindInformationReqMsg): Promise<AttFindInformationRspMsg> {
    return await this.writeAttWaitEvent<AttFindInformationRspMsg>(
      AttOpcode.FindInformationReq, AttOpcode.FindInformationRsp, AttFindInformationReq.serialize(req)
    );
  }

  public async findByTypeValueReq(req: AttFindByTypeValueReqMsg): Promise<AttFindByTypeValueRspMsg> {
    return await this.writeAttWaitEvent<AttFindByTypeValueRspMsg>(
      AttOpcode.FindByTypeValueReq, AttOpcode.FindByTypeValueRsp, AttFindByTypeValueReq.serialize(req)
    );
  }

  public async readByTypeReq(req: AttReadByTypeReqMsg): Promise<AttReadByTypeRspMsg> {
    return await this.writeAttWaitEvent<AttReadByTypeRspMsg>(
      AttOpcode.ReadByTypeReq, AttOpcode.ReadByTypeRsp, AttReadByTypeReq.serialize(req)
    );
  }

  public async readReq(req: AttReadReqMsg): Promise<AttReadRspMsg> {
    return await this.writeAttWaitEvent<AttReadRspMsg>(
      AttOpcode.ReadReq, AttOpcode.ReadRsp, AttReadReq.serialize(req)
    );
  }

  public async readBlobReq(req: AttReadBlobReqMsg): Promise<AttReadBlobRspMsg> {
    return await this.writeAttWaitEvent<AttReadBlobRspMsg>(
      AttOpcode.ReadBlobReq, AttOpcode.ReadBlobRsp, AttReadBlobReq.serialize(req)
    );
  }

  public async readMultipleReq(req: AttReadMultipleReqMsg): Promise<AttReadMultipleRspMsg> {
    return await this.writeAttWaitEvent<AttReadMultipleRspMsg>(
      AttOpcode.ReadMultipleReq, AttOpcode.ReadMultipleRsp, AttReadMultipleReq.serialize(req)
    );
  }

  public async readByGroupTypeReq(req: AttReadByGroupTypeReqMsg): Promise<AttReadByGroupTypeRspMsg> {
    return await this.writeAttWaitEvent<AttReadByGroupTypeRspMsg>(
      AttOpcode.ReadByGroupTypeReq, AttOpcode.ReadByGroupTypeRsp, AttReadByGroupTypeReq.serialize(req)
    );
  }

  public async writeReq(req: AttWriteReqMsg): Promise<AttWriteRspMsg> {
    return await this.writeAttWaitEvent<AttWriteRspMsg>(
      AttOpcode.WriteReq, AttOpcode.WriteRsp, AttWriteReq.serialize(req)
    );
  }

  public async prepareWriteReq(req: AttPrepareWriteReqMsg): Promise<AttPrepareWriteRspMsg> {
    return await this.writeAttWaitEvent<AttPrepareWriteRspMsg>(
      AttOpcode.PrepareWriteReq, AttOpcode.PrepareWriteRsp, AttPrepareWriteReq.serialize(req)
    );
  }

  public async executeWriteReq(req: AttExecuteWriteReqMsg): Promise<AttExecuteWriteRspMsg> {
    return await this.writeAttWaitEvent<AttExecuteWriteRspMsg>(
      AttOpcode.ExecuteWriteReq, AttOpcode.ExecuteWriteRsp, AttExecuteWriteReq.serialize(req)
    );
  }

  public async readMultipleVariableReq(req: AttReadMultipleVariableReqMsg): Promise<AttReadMultipleVariableRspMsg> {
    return await this.writeAttWaitEvent<AttReadMultipleVariableRspMsg>(
      AttOpcode.ReadMultipleVariableReq, AttOpcode.ReadMultipleVariableRsp, AttReadMultipleVariableReq.serialize(req)
    );
  }

  // Other
  public async writeCmd(cmd: AttWriteCmdMsg): Promise<void> {
    return await this.writeAtt(AttWriteCmd.serialize(cmd));
  }

  public async signedWriteCmd(cmd: AttSignedWriteCmdMsg): Promise<void> {
    return await this.writeAtt(AttSignedWriteCmd.serialize(cmd));
  }

  public async handleValueNtf(ntf: AttHandleValueNtfMsg): Promise<void> {
    return await this.writeAtt(AttHandleValueNtf.serialize(ntf));
  }

  public async handleValueInd(ind: AttHandleValueIndMsg): Promise<void> {
    return await this.writeAtt(AttHandleValueInd.serialize(ind));
  }

  public async handleValueCfm(): Promise<void> {
    return await this.writeAtt(AttHandleValueCfm.serialize({}));
  }

  public async multipleHandleValueNtf(ntfs: AttMultipleHandleValueNtfMsg): Promise<void> {
    return await this.writeAtt(AttMultipleHandleValueNtf.serialize(ntfs));
  }

  // Events
  private onAttData = (connectionHandle: number, data: Buffer): void => {
    if (this.connectionHandle !== connectionHandle) {
      return;
    }

    const opcode: AttOpcode = data[0];

    if (this.handlers[opcode]) {
      this.handlers[opcode](data);
    }
  }

  // Utils
  private async writeAttWaitEvent<T>(req: AttOpcode, res: AttOpcode, data: Buffer): Promise<T> {
    // NOTE: cast necessary due to https://github.com/microsoft/TypeScript/issues/38806
    const resEventType = AttOpcode[res] as AttEvents;
    const waitAttRsp = this.waitAttEvent<T>(req, resEventType);
    await this.writeAtt(data);
    return await waitAttRsp;
  }

  private async writeAtt(data: Buffer): Promise<void> {
    await this.l2cap.writeAclData(
      this.connectionHandle,
      L2capChannelId.LeAttributeProtocol,
      data
    );
  }

  private waitAttEvent<T>(reqOpcode: AttOpcode, resEventType: AttEvents): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const cleanup = () => {
        this.off(resEventType, onSuccess);
        this.off('ErrorRsp',   onFailure);
        clearTimeout(timerHandle);
      };
      const onTimeout = () => {
        cleanup();
        reject(new Error(`ATT request (${AttOpcode[reqOpcode]}) timeout`));
      };
      const onFailure = (event: AttErrorRspMsg) => {
        if (event.requestOpcodeInError !== reqOpcode) {
          return;
        }
        cleanup();
        reject(new Error(
          `ATT request (${AttOpcode[reqOpcode]}) failed due to ${AttErrorCode[event.errorCode]}` +
          `attribute handle: ${event.attributeHandleInError}`
        ));
      };
      const onSuccess = (event: T) => {
        cleanup();
        resolve(event);
      };
      this.on('ErrorRsp',   onFailure);
      this.on(resEventType, onSuccess);
      const timerTimeout = 30 * 1000;
      const timerHandle = setTimeout(onTimeout, timerTimeout);
    });
  }

  private handleEvent<T>(opcode: AttOpcode, serDes: AttSerDes<T>, data: Buffer): void {
    const name = AttOpcode[opcode];

    const msg = serDes.deserialize(data);
    if (!msg) {
      return debug(`Cannot parse ${name}`);
    }

    debug(`${name}: ${msg}`);
    this.emit(name, msg);
  }
}
