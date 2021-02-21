import { HciParserError, makeParserError } from "./HciError";
import { bigintBitSet } from "./Utils";

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

export class SetEventMask {
  static inParams(events: Partial<EventMask>): Buffer {
    let mask = 0n;

    mask = bigintBitSet(mask, 0n,  events.inquiryComplete);
    mask = bigintBitSet(mask, 1n,  events.inquiryResult);
    mask = bigintBitSet(mask, 2n,  events.connectionComplete);
    mask = bigintBitSet(mask, 3n,  events.connectionRequest);
    mask = bigintBitSet(mask, 4n,  events.disconnectionComplete);
    mask = bigintBitSet(mask, 5n,  events.authenticationComplete);
    mask = bigintBitSet(mask, 6n,  events.remoteNameRequestComplete);
    mask = bigintBitSet(mask, 7n,  events.encryptionChange);
    mask = bigintBitSet(mask, 8n,  events.changeConnectionLinkKeyComplete);
    mask = bigintBitSet(mask, 9n,  events.masterLinkKeyComplete);
    mask = bigintBitSet(mask, 10n, events.readRemoteSupportedFeaturesComplete);
    mask = bigintBitSet(mask, 11n, events.readRemoteVersionInformationComplete);
    mask = bigintBitSet(mask, 12n, events.qosSetupComplete);
    mask = bigintBitSet(mask, 15n, events.hardwareError);
    mask = bigintBitSet(mask, 16n, events.flushOccurred);
    mask = bigintBitSet(mask, 17n, events.roleChange);
    mask = bigintBitSet(mask, 19n, events.modeChange);
    mask = bigintBitSet(mask, 20n, events.returnLinkKeys);
    mask = bigintBitSet(mask, 21n, events.pinCodeRequest);
    mask = bigintBitSet(mask, 22n, events.linkKeyRequest);
    mask = bigintBitSet(mask, 23n, events.linkKeyNotification);
    mask = bigintBitSet(mask, 24n, events.loopbackCommand);
    mask = bigintBitSet(mask, 25n, events.dataBufferOverflow);
    mask = bigintBitSet(mask, 26n, events.maxSlotsChange);
    mask = bigintBitSet(mask, 27n, events.readClockOffsetComplete);
    mask = bigintBitSet(mask, 28n, events.connectionPacketTypeChanged);
    mask = bigintBitSet(mask, 29n, events.qosViolation);
    mask = bigintBitSet(mask, 30n, events.pageScanModeChange);
    mask = bigintBitSet(mask, 31n, events.pageScanRepetitionModeChange);
    mask = bigintBitSet(mask, 32n, events.flowSpecificationComplete);
    mask = bigintBitSet(mask, 33n, events.inquiryResultWithRssi);
    mask = bigintBitSet(mask, 34n, events.readRemoteExtendedFeaturesComplete);
    mask = bigintBitSet(mask, 43n, events.synchronousConnectionComplete);
    mask = bigintBitSet(mask, 44n, events.synchronousConnectionChanged);
    mask = bigintBitSet(mask, 45n, events.sniffSubrating);
    mask = bigintBitSet(mask, 46n, events.extendedInquiryResult);
    mask = bigintBitSet(mask, 47n, events.encryptionKeyRefreshComplete);
    mask = bigintBitSet(mask, 48n, events.ioCapabilityRequest);
    mask = bigintBitSet(mask, 49n, events.ioCapabilityResponse);
    mask = bigintBitSet(mask, 50n, events.userConfirmationRequest);
    mask = bigintBitSet(mask, 51n, events.userPasskeyRequest);
    mask = bigintBitSet(mask, 52n, events.remoteOobDataRequest);
    mask = bigintBitSet(mask, 53n, events.simplePairingComplete);
    mask = bigintBitSet(mask, 55n, events.linkSupervisionTimeoutChanged);
    mask = bigintBitSet(mask, 56n, events.enhancedFlushComplete);
    mask = bigintBitSet(mask, 58n, events.userPasskeyNotification);
    mask = bigintBitSet(mask, 59n, events.keypressNotification);
    mask = bigintBitSet(mask, 60n, events.remoteHostSupportedFeaturesNotification);
    mask = bigintBitSet(mask, 61n, events.leMeta);

    const payload = Buffer.allocUnsafe(8);
    payload.writeBigUInt64LE(mask, 0);
    return payload;
  }
}

export enum ReadTransmitPowerLevelType {
  Current = 0, // Read Current Transmit Power Level.
  Maximum = 1, // Read Maximum Transmit Power Level.
}

export interface ReadTransmitPowerLevelInParams {
  connHandle: number,
  type: ReadTransmitPowerLevelType,
}

export class ReadTransmitPowerLevel {
  static inParams(params: ReadTransmitPowerLevelInParams): Buffer {
    const payload = Buffer.allocUnsafe(3);
    payload.writeUInt16LE(params.connHandle, 0);
    payload.writeUInt8(params.type, 2);
    return payload;
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
    const payload = Buffer.allocUnsafe(1);
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

    mask = bigintBitSet(mask, 0n,   events.physicalLinkComplete);
    mask = bigintBitSet(mask, 1n,   events.channelSelected);
    mask = bigintBitSet(mask, 2n,   events.disconnectionPhysicalLinkComplete);
    mask = bigintBitSet(mask, 3n,   events.physicalLinkLossEarlyWarning);
    mask = bigintBitSet(mask, 4n,   events.physicalLinkRecovery);
    mask = bigintBitSet(mask, 5n,   events.logicalLinkComplete);
    mask = bigintBitSet(mask, 6n,   events.disconnectionLogicalLinkComplete);
    mask = bigintBitSet(mask, 7n,   events.flowSpecModifyComplete);
    mask = bigintBitSet(mask, 8n,   events.numberOfCompletedDataBlocks);
    mask = bigintBitSet(mask, 9n,   events.ampStartTest);
    mask = bigintBitSet(mask, 10n,  events.ampTestEnd);
    mask = bigintBitSet(mask, 11n,  events.ampReceiverReport);
    mask = bigintBitSet(mask, 12n,  events.shortRangeModeChangeComplete);
    mask = bigintBitSet(mask, 13n,  events.ampStatusChange);
    mask = bigintBitSet(mask, 14n,  events.triggeredClockCapture);
    mask = bigintBitSet(mask, 15n,  events.synchronizationTrainComplete);
    mask = bigintBitSet(mask, 16n,  events.synchronizationTrainReceived);
    mask = bigintBitSet(mask, 17n,  events.connectionlessSlaveBroadcastReceive);
    mask = bigintBitSet(mask, 18n,  events.connectionlessSlaveBroadcastTimeout);
    mask = bigintBitSet(mask, 19n,  events.truncatedPageComplete);
    mask = bigintBitSet(mask, 20n,  events.slavePageResponseTimeout);
    mask = bigintBitSet(mask, 21n,  events.connectionlessSlaveBroadcastChannelMapChange);
    mask = bigintBitSet(mask, 22n,  events.inquiryResponseNotification);
    mask = bigintBitSet(mask, 23n,  events.authenticatedPayloadTimeoutExpired);
    mask = bigintBitSet(mask, 24n,  events.samStatusChange);

    const payload = Buffer.allocUnsafe(8);
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
    const payload = Buffer.allocUnsafe(2);
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
    const payload = Buffer.allocUnsafe(2);
    payload.writeUInt16LE(params.hostAclDataPacketLength);
    return payload;
  }
}

export interface CompletedPackets {
  connHandle: number;
  completedPackets: number;
}

export class HostNumberOfCompletedPackets {
  static inParams(completedPackets: CompletedPackets[]): Buffer {
    const payload = Buffer.allocUnsafe(1 + (2+2) * completedPackets.length);

    let o = payload.writeUInt8(completedPackets.length, 0);

    for (const entry of completedPackets) {
      o = payload.writeUInt16LE(entry.connHandle,       o);
      o = payload.writeUInt16LE(entry.completedPackets, o);
    }

    return payload;
  }
}

export class ReadAuthenticatedPayloadTimeout {
  private static readonly timeoutFactor = 10;

  static inParams(connHandle: number): Buffer {
    const payload = Buffer.allocUnsafe(2);
    payload.writeUInt16LE(connHandle, 0);
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

  static inParams(connHandle: number, timeoutMs: number): Buffer {
    const payload = Buffer.allocUnsafe(4);
    payload.writeUInt16LE(connHandle, 0);
    payload.writeUInt16LE(Math.round(timeoutMs / this.timeoutFactor), 2);
    return payload;
  }
}