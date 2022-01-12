import { EventEmitter } from "events";
import {
  AttErrorRspMsg, AttExchangeMtuReqMsg, AttExchangeMtuRspMsg, AttExecuteWriteReqMsg,
  AttExecuteWriteRspMsg, AttFindByTypeValueReqMsg, AttFindByTypeValueRspMsg,
  AttFindInformationReqMsg, AttFindInformationRspMsg, AttHandleValueCfmMsg, AttHandleValueIndMsg, AttHandleValueNtfMsg,
  AttMultipleHandleValueNtfMsg, AttPrepareWriteReqMsg, AttPrepareWriteRspMsg,
  AttReadBlobReqMsg, AttReadBlobRspMsg, AttReadByGroupTypeReqMsg, AttReadByGroupTypeRspMsg,
  AttReadByTypeReqMsg, AttReadByTypeRspMsg, AttReadMultipleReqMsg, AttReadMultipleRspMsg,
  AttReadMultipleVariableReqMsg, AttReadMultipleVariableRspMsg, AttReadReqMsg, AttReadRspMsg,
  AttSignedWriteCmdMsg, AttWriteCmdMsg, AttWriteReqMsg, AttWriteRspMsg
} from "../att/AttSerDes";
import { HciError } from "../hci/HciError";

export interface AttDataEntry {
  handle: number;
  value: Buffer;
  endingHandle: number;
}

export interface Att extends EventEmitter {
  // Responses
  errorRsp(rsp: AttErrorRspMsg): Promise<void>;
  exchangeMtuRsp(rsp: AttExchangeMtuRspMsg): Promise<void>;
  findInformationRsp(rsp: AttFindInformationRspMsg): Promise<void>;
  findByTypeValueRsp(rsp: AttFindByTypeValueRspMsg): Promise<void>;
  readByTypeRsp(rsp: AttReadByTypeRspMsg): Promise<void>;
  readRsp(rsp: AttReadRspMsg): Promise<void>;
  readBlobRsp(rsp: AttReadBlobRspMsg): Promise<void>;
  readMultipleRsp(rsp: AttReadMultipleRspMsg): Promise<void>;
  readByGroupTypeRsp(rsp: AttReadByGroupTypeRspMsg): Promise<void>;
  writeRsp(rsp: AttWriteRspMsg): Promise<void>;
  prepareWriteRsp(rsp: AttPrepareWriteRspMsg): Promise<void>;
  executeWriteRsp(rsp: AttExecuteWriteRspMsg): Promise<void>;
  readMultipleVariableRsp(rsp: AttReadMultipleVariableRspMsg): Promise<void>;

  // Requests
  exchangeMtuReq(req: AttExchangeMtuReqMsg): Promise<AttExchangeMtuRspMsg>;
  findInformationReq(req: AttFindInformationReqMsg): Promise<AttFindInformationRspMsg>;
  findByTypeValueReq(req: AttFindByTypeValueReqMsg): Promise<AttFindByTypeValueRspMsg>;
  readByTypeReq(req: AttReadByTypeReqMsg): Promise<AttReadByTypeRspMsg>;
  readReq(req: AttReadReqMsg): Promise<AttReadRspMsg>;
  readBlobReq(req: AttReadBlobReqMsg): Promise<AttReadBlobRspMsg>;
  readMultipleReq(req: AttReadMultipleReqMsg): Promise<AttReadMultipleRspMsg>;
  readByGroupTypeReq(req: AttReadByGroupTypeReqMsg): Promise<AttReadByGroupTypeRspMsg>;
  writeReq(req: AttWriteReqMsg): Promise<AttWriteRspMsg>;
  prepareWriteReq(req: AttPrepareWriteReqMsg): Promise<AttPrepareWriteRspMsg>;
  executeWriteReq(req: AttExecuteWriteReqMsg): Promise<AttExecuteWriteRspMsg>;
  readMultipleVariableReq(req: AttReadMultipleVariableReqMsg): Promise<AttReadMultipleVariableRspMsg>;

  // Other
  writeCmd(cmd: AttWriteCmdMsg): Promise<void>;
  signedWriteCmd(cmd: AttSignedWriteCmdMsg): Promise<void>;
  handleValueNtf(ntf: AttHandleValueNtfMsg): Promise<void>;
  handleValueInd(ind: AttHandleValueIndMsg): Promise<void>;
  handleValueCfm(): Promise<void>;
  multipleHandleValueNtf(ntfs: AttMultipleHandleValueNtfMsg): Promise<void>;

  // Events
  on(event: 'Disconnected',            listener: (event: HciError) => void): this;
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
}
