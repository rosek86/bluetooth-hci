import {
  AttErrorRspMsg, AttExchangeMtuReqMsg, AttExchangeMtuRspMsg, AttExecuteWriteReqMsg,
  AttExecuteWriteRspMsg, AttFindByTypeValueReqMsg, AttFindByTypeValueRspMsg,
  AttFindInformationReqMsg, AttFindInformationRspMsg, AttHandleValueIndMsg, AttHandleValueNtfMsg,
  AttMultipleHandleValueNtfMsg, AttPrepareWriteReqMsg, AttPrepareWriteRspMsg,
  AttReadBlobReqMsg, AttReadBlobRspMsg, AttReadByGroupTypeReqMsg, AttReadByGroupTypeRspMsg,
  AttReadByTypeReqMsg, AttReadByTypeRspMsg, AttReadMultipleReqMsg, AttReadMultipleRspMsg,
  AttReadMultipleVariableReqMsg, AttReadMultipleVariableRspMsg, AttReadReqMsg, AttReadRspMsg,
  AttSignedWriteCmdMsg, AttWriteCmdMsg, AttWriteReqMsg, AttWriteRspMsg
} from "../att/AttSerDes";

export interface AttDataEntry {
  handle: number;
  value: Buffer;
  endingHandle: number;
}

export interface Att {
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
}
