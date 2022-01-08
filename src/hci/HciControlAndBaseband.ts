import { HciParserError, makeParserError } from "./HciError";
import { bitSet } from "../utils/Utils";
import { HciOcfControlAndBasebandCommands } from "./HciOgfOcf";

export interface EventMask {
  inquiryComplete: boolean;
  inquiryResult: boolean;
  connectionComplete: boolean;
  connectionRequest: boolean;
  disconnectionComplete: boolean;
  authenticationComplete: boolean;
  remoteNameRequestComplete: boolean;
  encryptionChange: boolean;
  changeConnectionLinkKeyComplete: boolean;
  masterLinkKeyComplete: boolean;
  readRemoteSupportedFeaturesComplete: boolean;
  readRemoteVersionInformationComplete: boolean;
  qosSetupComplete: boolean;
  hardwareError: boolean;
  flushOccurred: boolean;
  roleChange: boolean;
  modeChange: boolean;
  returnLinkKeys: boolean;
  pinCodeRequest: boolean;
  linkKeyRequest: boolean;
  linkKeyNotification: boolean;
  loopbackCommand: boolean;
  dataBufferOverflow: boolean;
  maxSlotsChange: boolean;
  readClockOffsetComplete: boolean;
  connectionPacketTypeChanged: boolean;
  qosViolation: boolean;
  pageScanModeChange: boolean;
  pageScanRepetitionModeChange: boolean;
  flowSpecificationComplete: boolean;
  inquiryResultWithRssi: boolean;
  readRemoteExtendedFeaturesComplete: boolean;
  synchronousConnectionComplete: boolean;
  synchronousConnectionChanged: boolean;
  sniffSubrating: boolean;
  extendedInquiryResult: boolean;
  encryptionKeyRefreshComplete: boolean;
  ioCapabilityRequest: boolean;
  ioCapabilityResponse: boolean;
  userConfirmationRequest: boolean;
  userPasskeyRequest: boolean;
  remoteOobDataRequest: boolean;
  simplePairingComplete: boolean;
  linkSupervisionTimeoutChanged: boolean;
  enhancedFlushComplete: boolean;
  userPasskeyNotification: boolean;
  keypressNotification: boolean;
  remoteHostSupportedFeaturesNotification: boolean;
  leMeta: boolean;
}

interface InParams<T> {
  ocf: T;
  payload: Buffer;
}

interface InParamsConn<T> {
  ocf: T;
  payload: Buffer;
  connectionHandle: number;
}

export class SetEventMask {
  static inParams(events: Partial<EventMask>): InParams<HciOcfControlAndBasebandCommands.SetEventMask> {
    let mask = 0n;

    mask = bitSet(mask, 0n,  events.inquiryComplete);
    mask = bitSet(mask, 1n,  events.inquiryResult);
    mask = bitSet(mask, 2n,  events.connectionComplete);
    mask = bitSet(mask, 3n,  events.connectionRequest);
    mask = bitSet(mask, 4n,  events.disconnectionComplete);
    mask = bitSet(mask, 5n,  events.authenticationComplete);
    mask = bitSet(mask, 6n,  events.remoteNameRequestComplete);
    mask = bitSet(mask, 7n,  events.encryptionChange);
    mask = bitSet(mask, 8n,  events.changeConnectionLinkKeyComplete);
    mask = bitSet(mask, 9n,  events.masterLinkKeyComplete);
    mask = bitSet(mask, 10n, events.readRemoteSupportedFeaturesComplete);
    mask = bitSet(mask, 11n, events.readRemoteVersionInformationComplete);
    mask = bitSet(mask, 12n, events.qosSetupComplete);
    mask = bitSet(mask, 15n, events.hardwareError);
    mask = bitSet(mask, 16n, events.flushOccurred);
    mask = bitSet(mask, 17n, events.roleChange);
    mask = bitSet(mask, 19n, events.modeChange);
    mask = bitSet(mask, 20n, events.returnLinkKeys);
    mask = bitSet(mask, 21n, events.pinCodeRequest);
    mask = bitSet(mask, 22n, events.linkKeyRequest);
    mask = bitSet(mask, 23n, events.linkKeyNotification);
    mask = bitSet(mask, 24n, events.loopbackCommand);
    mask = bitSet(mask, 25n, events.dataBufferOverflow);
    mask = bitSet(mask, 26n, events.maxSlotsChange);
    mask = bitSet(mask, 27n, events.readClockOffsetComplete);
    mask = bitSet(mask, 28n, events.connectionPacketTypeChanged);
    mask = bitSet(mask, 29n, events.qosViolation);
    mask = bitSet(mask, 30n, events.pageScanModeChange);
    mask = bitSet(mask, 31n, events.pageScanRepetitionModeChange);
    mask = bitSet(mask, 32n, events.flowSpecificationComplete);
    mask = bitSet(mask, 33n, events.inquiryResultWithRssi);
    mask = bitSet(mask, 34n, events.readRemoteExtendedFeaturesComplete);
    mask = bitSet(mask, 43n, events.synchronousConnectionComplete);
    mask = bitSet(mask, 44n, events.synchronousConnectionChanged);
    mask = bitSet(mask, 45n, events.sniffSubrating);
    mask = bitSet(mask, 46n, events.extendedInquiryResult);
    mask = bitSet(mask, 47n, events.encryptionKeyRefreshComplete);
    mask = bitSet(mask, 48n, events.ioCapabilityRequest);
    mask = bitSet(mask, 49n, events.ioCapabilityResponse);
    mask = bitSet(mask, 50n, events.userConfirmationRequest);
    mask = bitSet(mask, 51n, events.userPasskeyRequest);
    mask = bitSet(mask, 52n, events.remoteOobDataRequest);
    mask = bitSet(mask, 53n, events.simplePairingComplete);
    mask = bitSet(mask, 55n, events.linkSupervisionTimeoutChanged);
    mask = bitSet(mask, 56n, events.enhancedFlushComplete);
    mask = bitSet(mask, 58n, events.userPasskeyNotification);
    mask = bitSet(mask, 59n, events.keypressNotification);
    mask = bitSet(mask, 60n, events.remoteHostSupportedFeaturesNotification);
    mask = bitSet(mask, 61n, events.leMeta);

    const payload = Buffer.alloc(8);
    payload.writeBigUInt64LE(mask, 0);

    return { ocf: HciOcfControlAndBasebandCommands.SetEventMask, payload };
  }
}

export enum ReadTransmitPowerLevelType {
  Current = 0, // Read Current Transmit Power Level.
  Maximum = 1, // Read Maximum Transmit Power Level.
}

export class ReadTransmitPowerLevel {
  static inParams(connectionHandle: number, type: ReadTransmitPowerLevelType): InParamsConn<HciOcfControlAndBasebandCommands.ReadTransmitPowerLevel> {
    const payload = Buffer.alloc(3);
    payload.writeUInt16LE(connectionHandle, 0);
    payload.writeUInt8(type, 2);
    return { ocf: HciOcfControlAndBasebandCommands.ReadTransmitPowerLevel, payload, connectionHandle };
  }

  static outParams(params?: Buffer): number {
    if (!params || params.length < 3) {
      throw makeParserError(HciParserError.InvalidPayloadSize);
    }
    return params.readInt8(2);
  }
}

export enum FlowControlEnable {
  Off       = 0x00,
  AclOn     = 0x01,
  SyncOn    = 0x02,
  AclSyncOn = 0x03,
}

export class SetControllerToHostFlowControl {
  static inParams(enable: FlowControlEnable): Buffer {
    const payload = Buffer.alloc(1);
    payload.writeUInt8(enable, 0);
    return payload;
  }
}

export interface EventMask2 {
  physicalLinkComplete: boolean;
  channelSelected: boolean;
  disconnectionPhysicalLinkComplete: boolean;
  physicalLinkLossEarlyWarning: boolean;
  physicalLinkRecovery: boolean;
  logicalLinkComplete: boolean;
  disconnectionLogicalLinkComplete: boolean;
  flowSpecModifyComplete: boolean;
  numberOfCompletedDataBlocks: boolean;
  ampStartTest: boolean;
  ampTestEnd: boolean;
  ampReceiverReport: boolean;
  shortRangeModeChangeComplete: boolean;
  ampStatusChange: boolean;
  triggeredClockCapture: boolean;
  synchronizationTrainComplete: boolean;
  synchronizationTrainReceived: boolean;
  connectionlessSlaveBroadcastReceive: boolean;
  connectionlessSlaveBroadcastTimeout: boolean;
  truncatedPageComplete: boolean;
  slavePageResponseTimeout: boolean;
  connectionlessSlaveBroadcastChannelMapChange: boolean;
  inquiryResponseNotification: boolean;
  authenticatedPayloadTimeoutExpired: boolean;
  samStatusChange: boolean;
}

export class SetEventMask2 {
  static inParams(events: Partial<EventMask2>): Buffer {
    let mask = 0n;

    mask = bitSet(mask, 0n,   events.physicalLinkComplete);
    mask = bitSet(mask, 1n,   events.channelSelected);
    mask = bitSet(mask, 2n,   events.disconnectionPhysicalLinkComplete);
    mask = bitSet(mask, 3n,   events.physicalLinkLossEarlyWarning);
    mask = bitSet(mask, 4n,   events.physicalLinkRecovery);
    mask = bitSet(mask, 5n,   events.logicalLinkComplete);
    mask = bitSet(mask, 6n,   events.disconnectionLogicalLinkComplete);
    mask = bitSet(mask, 7n,   events.flowSpecModifyComplete);
    mask = bitSet(mask, 8n,   events.numberOfCompletedDataBlocks);
    mask = bitSet(mask, 9n,   events.ampStartTest);
    mask = bitSet(mask, 10n,  events.ampTestEnd);
    mask = bitSet(mask, 11n,  events.ampReceiverReport);
    mask = bitSet(mask, 12n,  events.shortRangeModeChangeComplete);
    mask = bitSet(mask, 13n,  events.ampStatusChange);
    mask = bitSet(mask, 14n,  events.triggeredClockCapture);
    mask = bitSet(mask, 15n,  events.synchronizationTrainComplete);
    mask = bitSet(mask, 16n,  events.synchronizationTrainReceived);
    mask = bitSet(mask, 17n,  events.connectionlessSlaveBroadcastReceive);
    mask = bitSet(mask, 18n,  events.connectionlessSlaveBroadcastTimeout);
    mask = bitSet(mask, 19n,  events.truncatedPageComplete);
    mask = bitSet(mask, 20n,  events.slavePageResponseTimeout);
    mask = bitSet(mask, 21n,  events.connectionlessSlaveBroadcastChannelMapChange);
    mask = bitSet(mask, 22n,  events.inquiryResponseNotification);
    mask = bitSet(mask, 23n,  events.authenticatedPayloadTimeoutExpired);
    mask = bitSet(mask, 24n,  events.samStatusChange);

    const payload = Buffer.alloc(8);
    payload.writeBigUInt64LE(mask, 0);
    return payload;
  }
}

export class ReadLeHostSupport {
  static outParams(params?: Buffer): boolean {
    if (!params || params.length < 1) {
      throw makeParserError(HciParserError.InvalidPayloadSize);
    }
    // Simultaneous Le Host shall be ignored [Vol 4] Part E, Section 6.35
    const leSupportedHost = params.readUInt8(0) === 1;
    return leSupportedHost;
  }
}

export class WriteLeHostSupported {
  static inParams(leSupportedHost: boolean): Buffer {
    const payload = Buffer.alloc(2);
    payload[0] = leSupportedHost ? 1 : 0;
    payload[1] = 0; // Simultaneous Le Host shall be ignored
    return payload;
  }
}

export interface HostBufferSize {
  hostAclDataPacketLength:     number;
  hostSyncDataPacketLength:    number;
  hostTotalNumAclDataPackets:  number;
  hostTotalNumSyncDataPackets: number;
}

export class HostBufferSize {
  static inParams(params: HostBufferSize): Buffer {
    const payload = Buffer.alloc(2);
    payload.writeUInt16LE(params.hostAclDataPacketLength);
    return payload;
  }
}

export interface CompletedPackets {
  connectionHandle: number;
  completedPackets: number;
}

export class HostNumberOfCompletedPackets {
  static inParams(completedPackets: CompletedPackets[]): Buffer {
    const payload = Buffer.alloc(1 + (2+2) * completedPackets.length);

    let o = payload.writeUInt8(completedPackets.length, 0);

    for (const entry of completedPackets) {
      o = payload.writeUInt16LE(entry.connectionHandle, o);
      o = payload.writeUInt16LE(entry.completedPackets, o);
    }

    return payload;
  }
}

export class ReadAuthenticatedPayloadTimeout {
  private static readonly timeoutFactor = 10;

  static inParams(connectionHandle: number): Buffer {
    const payload = Buffer.alloc(2);
    payload.writeUInt16LE(connectionHandle, 0);
    return payload;
  }

  static outParams(params?: Buffer): number {
    if (!params || params.length < 2) {
      throw makeParserError(HciParserError.InvalidPayloadSize);
    }
    return params.readUInt16LE(0) * this.timeoutFactor;
  }
}

export class WriteAuthenticatedPayloadTimeout {
  private static readonly timeoutFactor = 10;

  static inParams(connectionHandle: number, timeoutMs: number): Buffer {
    const payload = Buffer.alloc(4);
    payload.writeUInt16LE(connectionHandle, 0);
    payload.writeUInt16LE(Math.round(timeoutMs / this.timeoutFactor), 2);
    return payload;
  }
}
