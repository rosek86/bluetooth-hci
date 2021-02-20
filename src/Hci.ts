import { EventEmitter } from 'events';
import Debug from 'debug';

import { HciPacketType } from './HciPacketType';

import { HciErrorCode } from './HciError';
import { HciDisconnectReason } from './HciError';
import { HciParserError, makeHciError, makeParserError } from './HciError';

import { Address } from './Address';
import { HciCmd } from './HciCmd';
import { HciEvent, HciLeEvent } from './HciEvent';
import {
   HciOcfInformationParameters,
   HciOcfControlAndBasebandCommands,
   HciOcfLeControllerCommands,
   HciOcfStatusParameters,
   HciOcfLinkControlCommands
} from './HciOgfOcf'
import {
  LeAdvertisingChannelMap, LeAdvertisingDataOperation, LeAdvertisingEventProperties,
  LeAdvertisingFilterPolicy, LeOwnAddressType, LePeerAddressType, LePhy, LePrimaryAdvertisingPhy,
  LeSecondaryAdvertisingPhy, LeSupportedStates, LeScanResponseDataOperation, LeScanningFilterPolicy,
  LeScanningPhy, LeScanType, LeScanFilterDuplicates, LeAdvertisingType, LeWhiteListAddressType,
  LeModulationIndex, LeCteType, LeTxTestPayload, LeTxPhy, LeMinTransmitPowerLevel,
  LeMaxTransmitPowerLevel, LeExtAdvReport, LeExtAdvEventTypeParser
} from './HciLe';

const debug = Debug('nble-hci');

interface LocalSupportedFeatures {
  threeSlotPackets:                     boolean;
  fiveSlotPackets:                      boolean;
  encryption:                           boolean;
  slotOffset:                           boolean;
  timingAccuracy:                       boolean;
  roleSwitch:                           boolean;
  holdMode:                             boolean;
  sniffMode:                            boolean;
  powerControlRequests:                 boolean;
  channelQualityDrivenDataRate:         boolean;
  scolink:                              boolean;
  hv2packets:                           boolean;
  hv3packets:                           boolean;
  microLawLogSynchronousData:           boolean;
  aLawLogSynchronousData:               boolean;
  cvsSynchronousData:                   boolean;
  pagingParameterNegotiation:           boolean;
  powerControl:                         boolean;
  transparentSynchronousData:           boolean;
  flowControlLagLsb:                    boolean;
  flowControlLagMiddleBit:              boolean;
  flowControlLagMsb:                    boolean;
  broadcastEncryption:                  boolean;
  enhancedDataRateAcl2MbpsMode:         boolean;
  enhancedDataRateAcl3MbpsMode:         boolean;
  enhancedInquiryScan:                  boolean;
  interlacedInquiryScan:                boolean;
  interlacedPageScan:                   boolean;
  rssiWithInquiryResults:               boolean;
  extendedScoLinkEv3Packets:            boolean;
  ev4Packets:                           boolean;
  ev5Packets:                           boolean;
  afhCapableSlave:                      boolean;
  afhClassificationSlave:               boolean;
  brEdrNotSupported:                    boolean;
  leSupported:                          boolean;
  threeSlotEnhancedDataRateAclPackets:  boolean;
  fiveSlotEnhancedDataRateAclPackets:   boolean;
  sniffSubrating:                       boolean;
  pauseEncryption:                      boolean;
  afhCapableMaster:                     boolean;
  afhClassificationMaster:              boolean;
  enhancedDataRateESco2MbpsMode:        boolean;
  enhancedDataRateESco3MbpsMode:        boolean;
  threeSlotEnhancedDataRateEScoPackets: boolean;
  extendedInquiryResponse:              boolean;
  simultaneousLeAndBrEdr:               boolean;
  secureSimplePairing:                  boolean;
  encapsulatedPdu:                      boolean;
  erroneousDataReporting:               boolean;
  nonFlushablePacketBoundaryFlag:       boolean;
  linkSupervisionTimeoutChangedEvent:   boolean;
  variableInquiryTxPowerLevel:          boolean;
  enhancedPowerControl:                 boolean;
  extendedFeatures:                     boolean;
}

interface HciInit {
  cmdTimeout?: number;
  send: (pt: HciPacketType, data: Buffer) => void;
}

enum AclDataBoundary {
  FirstNoFlushFrag,
  NextFrag,
  FirstFrag,
  Complete
}

enum AclDataBroadcast {
  PointToPoint,
  Broadcast,
}

// TODO: should I reverse parameter buffers?

export declare interface Hci {
  on(event: 'ext-adv-report', listener: (report: LeExtAdvReport) => void): this;
  on(event: string, listener: Function): this;
}

export class Hci extends EventEmitter {
  private send: (pt: HciPacketType, data: Buffer) => void;
  private cmd: HciCmd;

  public constructor(init: HciInit) {
    super();

    this.send = init.send;

    const timeout = init.cmdTimeout ?? 2000;
    this.cmd = new HciCmd(this.send, timeout);
  }

  public async disconnect(params: {
    connHandle: number,
    reason: HciDisconnectReason,
  }): Promise<void> {
    const payload = Buffer.allocUnsafe(3);
    payload.writeUInt16LE(params.connHandle, 0);
    payload.writeUInt8(params.reason);
    const ocf = HciOcfLinkControlCommands.Disconnect;
    await this.cmd.linkControl({ ocf, payload });
  }

  public async reset(): Promise<void> {
    const ocf = HciOcfControlAndBasebandCommands.Reset;
    await this.cmd.controlAndBaseband({ ocf });
  }

  public async readLocalSupportedFeatures(): Promise<LocalSupportedFeatures> {
    const ocf = HciOcfInformationParameters.ReadLocalSupportedFeatures;
    const result = await this.cmd.informationParameters({ ocf });
    const params = result.returnParameters;
    if (!params || params.length < (64/8)) {
      throw makeParserError(HciParserError.InvalidPayloadSize);
    }
    const features = params.readBigUInt64LE(0);
    return {
      threeSlotPackets:                     ((features >>  0n) & 1n) !== 0n,
      fiveSlotPackets:                      ((features >>  1n) & 1n) !== 0n,
      encryption:                           ((features >>  2n) & 1n) !== 0n,
      slotOffset:                           ((features >>  3n) & 1n) !== 0n,
      timingAccuracy:                       ((features >>  4n) & 1n) !== 0n,
      roleSwitch:                           ((features >>  5n) & 1n) !== 0n,
      holdMode:                             ((features >>  6n) & 1n) !== 0n,
      sniffMode:                            ((features >>  7n) & 1n) !== 0n,
      powerControlRequests:                 ((features >>  9n) & 1n) !== 0n,
      channelQualityDrivenDataRate:         ((features >> 10n) & 1n) !== 0n,
      scolink:                              ((features >> 11n) & 1n) !== 0n,
      hv2packets:                           ((features >> 12n) & 1n) !== 0n,
      hv3packets:                           ((features >> 13n) & 1n) !== 0n,
      microLawLogSynchronousData:           ((features >> 14n) & 1n) !== 0n,
      aLawLogSynchronousData:               ((features >> 15n) & 1n) !== 0n,
      cvsSynchronousData:                   ((features >> 16n) & 1n) !== 0n,
      pagingParameterNegotiation:           ((features >> 17n) & 1n) !== 0n,
      powerControl:                         ((features >> 18n) & 1n) !== 0n,
      transparentSynchronousData:           ((features >> 19n) & 1n) !== 0n,
      flowControlLagLsb:                    ((features >> 20n) & 1n) !== 0n,
      flowControlLagMiddleBit:              ((features >> 21n) & 1n) !== 0n,
      flowControlLagMsb:                    ((features >> 22n) & 1n) !== 0n,
      broadcastEncryption:                  ((features >> 23n) & 1n) !== 0n,
      enhancedDataRateAcl2MbpsMode:         ((features >> 25n) & 1n) !== 0n,
      enhancedDataRateAcl3MbpsMode:         ((features >> 26n) & 1n) !== 0n,
      enhancedInquiryScan:                  ((features >> 27n) & 1n) !== 0n,
      interlacedInquiryScan:                ((features >> 28n) & 1n) !== 0n,
      interlacedPageScan:                   ((features >> 29n) & 1n) !== 0n,
      rssiWithInquiryResults:               ((features >> 30n) & 1n) !== 0n,
      extendedScoLinkEv3Packets:            ((features >> 31n) & 1n) !== 0n,
      ev4Packets:                           ((features >> 32n) & 1n) !== 0n,
      ev5Packets:                           ((features >> 33n) & 1n) !== 0n,
      afhCapableSlave:                      ((features >> 35n) & 1n) !== 0n,
      afhClassificationSlave:               ((features >> 36n) & 1n) !== 0n,
      brEdrNotSupported:                    ((features >> 37n) & 1n) !== 0n,
      leSupported:                          ((features >> 38n) & 1n) !== 0n,
      threeSlotEnhancedDataRateAclPackets:  ((features >> 39n) & 1n) !== 0n,
      fiveSlotEnhancedDataRateAclPackets:   ((features >> 40n) & 1n) !== 0n,
      sniffSubrating:                       ((features >> 41n) & 1n) !== 0n,
      pauseEncryption:                      ((features >> 42n) & 1n) !== 0n,
      afhCapableMaster:                     ((features >> 43n) & 1n) !== 0n,
      afhClassificationMaster:              ((features >> 44n) & 1n) !== 0n,
      enhancedDataRateESco2MbpsMode:        ((features >> 45n) & 1n) !== 0n,
      enhancedDataRateESco3MbpsMode:        ((features >> 46n) & 1n) !== 0n,
      threeSlotEnhancedDataRateEScoPackets: ((features >> 47n) & 1n) !== 0n,
      extendedInquiryResponse:              ((features >> 48n) & 1n) !== 0n,
      simultaneousLeAndBrEdr:               ((features >> 49n) & 1n) !== 0n,
      secureSimplePairing:                  ((features >> 51n) & 1n) !== 0n,
      encapsulatedPdu:                      ((features >> 52n) & 1n) !== 0n,
      erroneousDataReporting:               ((features >> 53n) & 1n) !== 0n,
      nonFlushablePacketBoundaryFlag:       ((features >> 54n) & 1n) !== 0n,
      linkSupervisionTimeoutChangedEvent:   ((features >> 56n) & 1n) !== 0n,
      variableInquiryTxPowerLevel:          ((features >> 57n) & 1n) !== 0n,
      enhancedPowerControl:                 ((features >> 58n) & 1n) !== 0n,
      extendedFeatures:                     ((features >> 63n) & 1n) !== 0n,
    };
  }

  public async readLocalVersionInformation(): Promise<{
    hciVersion: number,
    hciRevision: number,
    lmpPalVersion: number,
    lmpPalSubversion: number,
    manufacturerName: number,
  }> {
    const ocf = HciOcfInformationParameters.ReadLocalVersionInformation;
    const result = await this.cmd.informationParameters({ ocf });
    const params = result.returnParameters;
    if (!params || params.length < 8) {
      throw makeParserError(HciParserError.InvalidPayloadSize);
    }
    return {
      hciVersion:       params.readUIntLE(0, 1),
      hciRevision:      params.readUIntLE(1, 2),
      lmpPalVersion:    params.readUIntLE(3, 1),
      lmpPalSubversion: params.readUIntLE(6, 2),
      manufacturerName: params.readUIntLE(4, 2),
    };
  }

  public async readBufferSize(): Promise<{
    aclDataPacketLength: number,
    synchronousDataPacketLength: number,
    totalNumAclDataPackets: number,
    totalNumSynchronousDataPackets: number,
  }> {
    const ocf = HciOcfInformationParameters.ReadBufferSize;
    const result = await this.cmd.informationParameters({ ocf });
    const params = result.returnParameters;
    if (!params || params.length < 7) {
      throw makeParserError(HciParserError.InvalidPayloadSize);
    }
    return {
      aclDataPacketLength:            params.readUInt16LE(0),
      synchronousDataPacketLength:    params.readUInt8(2),
      totalNumAclDataPackets:         params.readUInt16LE(3),
      totalNumSynchronousDataPackets: params.readUInt16LE(5),
    };
  }

  public async readBdAddr(): Promise<number> {
    const ocf = HciOcfInformationParameters.ReadBdAddr;
    const result = await this.cmd.informationParameters({ ocf })
    const params = result.returnParameters;
    if (!params || params.length < 6) {
      throw makeParserError(HciParserError.InvalidPayloadSize);
    }
    return params.readUIntLE(0, 6);
  }

  public async readLocalSupportedCommands() {
    const ocf = HciOcfInformationParameters.ReadLocalSupportedCommands;
    const result = await this.cmd.informationParameters({ ocf })
    const params = result.returnParameters;
    if (!params || params.length < 64) {
      throw makeParserError(HciParserError.InvalidPayloadSize);
    }
    return {
      inquiry:                                                (params[0] >> 0 & 1) === 1,
      inquiryCancel:                                          (params[0] >> 1 & 1) === 1,
      periodicInquiryMode:                                    (params[0] >> 2 & 1) === 1,
      exitPeriodicInquiryMode:                                (params[0] >> 3 & 1) === 1,
      createConnection:                                       (params[0] >> 4 & 1) === 1,
      disconnect:                                             (params[0] >> 5 & 1) === 1,
      addScoConnection:                                       (params[0] >> 6 & 1) === 1,
      createConnectionCancel:                                 (params[0] >> 7 & 1) === 1,
      acceptConnectionRequest:                                (params[1] >> 0 & 1) === 1,
      rejectConnectionRequest:                                (params[1] >> 1 & 1) === 1,
      linkKeyRequestReply:                                    (params[1] >> 2 & 1) === 1,
      linkKeyRequestNegativeReply:                            (params[1] >> 3 & 1) === 1,
      pinCodeRequestReply:                                    (params[1] >> 4 & 1) === 1,
      pinCodeRequestNegativeReply:                            (params[1] >> 5 & 1) === 1,
      changeConnectionPacketType:                             (params[1] >> 6 & 1) === 1,
      authenticationRequested:                                (params[1] >> 7 & 1) === 1,
      setConnectionEncryption:                                (params[2] >> 0 & 1) === 1,
      changeConnectionLinkKey:                                (params[2] >> 1 & 1) === 1,
      masterLinkKey:                                          (params[2] >> 2 & 1) === 1,
      remoteNameRequest:                                      (params[2] >> 3 & 1) === 1,
      remoteNameRequestCancel:                                (params[2] >> 4 & 1) === 1,
      readRemoteSupportedFeatures:                            (params[2] >> 5 & 1) === 1,
      readRemoteExtendedFeatures:                             (params[2] >> 6 & 1) === 1,
      readRemoteVersionInformation:                           (params[2] >> 7 & 1) === 1,
      readClockOffset:                                        (params[3] >> 0 & 1) === 1,
      readLmpHandle:                                          (params[3] >> 1 & 1) === 1,
      holdMode:                                               (params[4] >> 1 & 1) === 1,
      sniffMode:                                              (params[4] >> 2 & 1) === 1,
      exitSniffMode:                                          (params[4] >> 3 & 1) === 1,
      qosSetup:                                               (params[4] >> 6 & 1) === 1,
      roleDiscovery:                                          (params[4] >> 7 & 1) === 1,
      switchRole:                                             (params[5] >> 0 & 1) === 1,
      readLinkPolicySettings:                                 (params[5] >> 1 & 1) === 1,
      writeLinkPolicySettings:                                (params[5] >> 2 & 1) === 1,
      readDefaultLinkPolicySettings:                          (params[5] >> 3 & 1) === 1,
      writeDefaultLinkPolicySettings:                         (params[5] >> 4 & 1) === 1,
      flowSpecification:                                      (params[5] >> 5 & 1) === 1,
      setEventMask:                                           (params[5] >> 6 & 1) === 1,
      reset:                                                  (params[5] >> 7 & 1) === 1,
      setEventFilter:                                         (params[6] >> 0 & 1) === 1,
      flush:                                                  (params[6] >> 1 & 1) === 1,
      readPinType:                                            (params[6] >> 2 & 1) === 1,
      writePinType:                                           (params[6] >> 3 & 1) === 1,
      readStoredLinkKey:                                      (params[6] >> 5 & 1) === 1,
      writeStoredLinkKey:                                     (params[6] >> 6 & 1) === 1,
      deleteStoredLinkKey:                                    (params[6] >> 7 & 1) === 1,
      writeLocalName:                                         (params[7] >> 0 & 1) === 1,
      readLocalName:                                          (params[7] >> 1 & 1) === 1,
      readConnectionAcceptTimeout:                            (params[7] >> 2 & 1) === 1,
      writeConnectionAcceptTimeout:                           (params[7] >> 3 & 1) === 1,
      readPageTimeout:                                        (params[7] >> 4 & 1) === 1,
      writePageTimeout:                                       (params[7] >> 5 & 1) === 1,
      readScanEnable:                                         (params[7] >> 6 & 1) === 1,
      writeScanEnable:                                        (params[7] >> 7 & 1) === 1,
      readPageScanActivity:                                   (params[8] >> 0 & 1) === 1,
      writePageScanActivity:                                  (params[8] >> 1 & 1) === 1,
      readInquiryScanActivity:                                (params[8] >> 2 & 1) === 1,
      writeInquiryScanActivity:                               (params[8] >> 3 & 1) === 1,
      readAuthenticationEnable:                               (params[8] >> 4 & 1) === 1,
      writeAuthenticationEnable:                              (params[8] >> 5 & 1) === 1,
      readEncryptionMode:                                     (params[8] >> 6 & 1) === 1,
      writeEncryptionMode:                                    (params[8] >> 7 & 1) === 1,
      readClassOfDevice:                                      (params[9] >> 0 & 1) === 1,
      writeClassOfDevice:                                     (params[9] >> 1 & 1) === 1,
      readVoiceSetting:                                       (params[9] >> 2 & 1) === 1,
      writeVoiceSetting:                                      (params[9] >> 3 & 1) === 1,
      readAutomaticFlushTimeout:                              (params[9] >> 4 & 1) === 1,
      writeAutomaticFlushTimeout:                             (params[9] >> 5 & 1) === 1,
      readNumBroadcastRetransmissions:                        (params[9] >> 6 & 1) === 1,
      writeNumBroadcastRetransmissions:                       (params[9] >> 7 & 1) === 1,
      readHoldModeActivity:                                   (params[10] >> 0 & 1) === 1,
      writeHoldModeActivity:                                  (params[10] >> 1 & 1) === 1,
      readTransmitPowerLevel:                                 (params[10] >> 2 & 1) === 1,
      readSynchronousFlowControlEnable:                       (params[10] >> 3 & 1) === 1,
      writeSynchronousFlowControlEnable:                      (params[10] >> 4 & 1) === 1,
      setControllerToHostFlowControl:                         (params[10] >> 5 & 1) === 1,
      hostBufferSize:                                         (params[10] >> 6 & 1) === 1,
      hostNumberOfCompletedPackets:                           (params[10] >> 7 & 1) === 1,
      readLinkSupervisionTimeout:                             (params[11] >> 0 & 1) === 1,
      writeLinkSupervisionTimeout:                            (params[11] >> 1 & 1) === 1,
      readNumberOfSupportedIac:                               (params[11] >> 2 & 1) === 1,
      readCurrentIacLap:                                      (params[11] >> 3 & 1) === 1,
      writeCurrentIacLap:                                     (params[11] >> 4 & 1) === 1,
      readPageScanModePeriod:                                 (params[11] >> 5 & 1) === 1,
      writePageScanModePeriod:                                (params[11] >> 6 & 1) === 1,
      readPageScanMode:                                       (params[11] >> 7 & 1) === 1,
      writePageScanMode:                                      (params[12] >> 0 & 1) === 1,
      setAfhHostChannelClassification:                        (params[12] >> 1 & 1) === 1,
      readInquiryScanType:                                    (params[12] >> 4 & 1) === 1,
      writeInquiryScanType:                                   (params[12] >> 5 & 1) === 1,
      readInquiryMode:                                        (params[12] >> 6 & 1) === 1,
      writeInquiryMode:                                       (params[12] >> 7 & 1) === 1,
      readPageScanType:                                       (params[13] >> 0 & 1) === 1,
      writePageScanType:                                      (params[13] >> 1 & 1) === 1,
      readAfhChannelAssessmentMode:                           (params[13] >> 2 & 1) === 1,
      writeAfhChannelAssessmentMode:                          (params[13] >> 3 & 1) === 1,
      readLocalVersionInformation:                            (params[14] >> 3 & 1) === 1,
      readLocalSupportedFeatures:                             (params[14] >> 5 & 1) === 1,
      readLocalExtendedFeatures:                              (params[14] >> 6 & 1) === 1,
      readBufferSize:                                         (params[14] >> 7 & 1) === 1,
      readCountryCode:                                        (params[15] >> 0 & 1) === 1,
      readBdAddr:                                             (params[15] >> 1 & 1) === 1,
      readFailedContactCounter:                               (params[15] >> 2 & 1) === 1,
      resetFailedContactCounter:                              (params[15] >> 3 & 1) === 1,
      readLinkQuality:                                        (params[15] >> 4 & 1) === 1,
      readRssi:                                               (params[15] >> 5 & 1) === 1,
      readAfhChannelMap:                                      (params[15] >> 6 & 1) === 1,
      readClock:                                              (params[15] >> 7 & 1) === 1,
      readLoopbackMode:                                       (params[16] >> 0 & 1) === 1,
      writeLoopbackMode:                                      (params[16] >> 1 & 1) === 1,
      enableDeviceUnderTestMode:                              (params[16] >> 2 & 1) === 1,
      setupSynchronousConnectionRequest:                      (params[16] >> 3 & 1) === 1,
      acceptSynchronousConnectionRequest:                     (params[16] >> 4 & 1) === 1,
      rejectSynchronousConnectionRequest:                     (params[16] >> 5 & 1) === 1,
      readExtendedInquiryResponse:                            (params[17] >> 0 & 1) === 1,
      writeExtendedInquiryResponse:                           (params[17] >> 1 & 1) === 1,
      refreshEncryptionKey:                                   (params[17] >> 2 & 1) === 1,
      sniffSubrating:                                         (params[17] >> 4 & 1) === 1,
      readSimplePairingMode:                                  (params[17] >> 5 & 1) === 1,
      writeSimplePairingMode:                                 (params[17] >> 6 & 1) === 1,
      readLocalOobData:                                       (params[17] >> 7 & 1) === 1,
      readInquiryResponseTransmitPowerLevel:                  (params[18] >> 0 & 1) === 1,
      writeInquiryTransmitPowerLevel:                         (params[18] >> 1 & 1) === 1,
      readDefaultErroneousDataReporting:                      (params[18] >> 2 & 1) === 1,
      writeDefaultErroneousDataReporting:                     (params[18] >> 3 & 1) === 1,
      ioCapabilityRequestReply:                               (params[18] >> 7 & 1) === 1,
      userConfirmationRequestReply:                           (params[19] >> 0 & 1) === 1,
      userConfirmationRequestNegativeReply:                   (params[19] >> 1 & 1) === 1,
      userPasskeyRequestReply:                                (params[19] >> 2 & 1) === 1,
      userPasskeyRequestNegativeReply:                        (params[19] >> 3 & 1) === 1,
      remoteOobDataRequestReply:                              (params[19] >> 4 & 1) === 1,
      writeSimplePairingDebugMode:                            (params[19] >> 5 & 1) === 1,
      enhancedFlush:                                          (params[19] >> 6 & 1) === 1,
      remoteOobDataRequestNegativeReply:                      (params[19] >> 7 & 1) === 1,
      sendKeypressNotification:                               (params[20] >> 2 & 1) === 1,
      ioCapabilityRequestNegativeReply:                       (params[20] >> 3 & 1) === 1,
      readEncryptionKeySize:                                  (params[20] >> 4 & 1) === 1,
      createPhysicalLink:                                     (params[21] >> 0 & 1) === 1,
      acceptPhysicalLink:                                     (params[21] >> 1 & 1) === 1,
      disconnectPhysicalLink:                                 (params[21] >> 2 & 1) === 1,
      createLogicalLink:                                      (params[21] >> 3 & 1) === 1,
      acceptLogicalLink:                                      (params[21] >> 4 & 1) === 1,
      disconnectLogicalLink:                                  (params[21] >> 5 & 1) === 1,
      logicalLinkCancel:                                      (params[21] >> 6 & 1) === 1,
      flowSpecModify:                                         (params[21] >> 7 & 1) === 1,
      readLogicalLinkAcceptTimeout:                           (params[22] >> 0 & 1) === 1,
      writeLogicalLinkAcceptTimeout:                          (params[22] >> 1 & 1) === 1,
      setEventMaskPage2:                                      (params[22] >> 2 & 1) === 1,
      readLocationData:                                       (params[22] >> 3 & 1) === 1,
      writeLocationData:                                      (params[22] >> 4 & 1) === 1,
      readLocalAmpInfo:                                       (params[22] >> 5 & 1) === 1,
      readLocalAmpAassoc:                                     (params[22] >> 6 & 1) === 1,
      writeRemoteAmpAssoc:                                    (params[22] >> 7 & 1) === 1,
      readFlowControlMode:                                    (params[23] >> 0 & 1) === 1,
      writeFlowControlMode:                                   (params[23] >> 1 & 1) === 1,
      readDataBlockSize:                                      (params[23] >> 2 & 1) === 1,
      enableAmpReceiverReports:                               (params[23] >> 5 & 1) === 1,
      ampTestEnd:                                             (params[23] >> 6 & 1) === 1,
      ampTest:                                                (params[23] >> 7 & 1) === 1,
      readEnhancedTransmitPowerLevel:                         (params[24] >> 0 & 1) === 1,
      readBestEffortFlushTimeout:                             (params[24] >> 2 & 1) === 1,
      writeBestEffortFlushTimeout:                            (params[24] >> 3 & 1) === 1,
      shortRangeMode:                                         (params[24] >> 4 & 1) === 1,
      readLeHostSupport:                                      (params[24] >> 5 & 1) === 1,
      writeLeHostSupport:                                     (params[24] >> 6 & 1) === 1,
      leSetEventMask:                                         (params[25] >> 0 & 1) === 1,
      leReadBufferSizeV1:                                     (params[25] >> 1 & 1) === 1,
      leReadLocalSupportedFeatures:                           (params[25] >> 2 & 1) === 1,
      leSetRandomAddress:                                     (params[25] >> 4 & 1) === 1,
      leSetAdvertisingParameters:                             (params[25] >> 5 & 1) === 1,
      leReadAdvertisingPhysicalChannelTxPower:                (params[25] >> 6 & 1) === 1,
      leSetAdvertisingData:                                   (params[25] >> 7 & 1) === 1,
      leSetScanResponseData:                                  (params[26] >> 0 & 1) === 1,
      leSetAdvertisingEnable:                                 (params[26] >> 1 & 1) === 1,
      leSetScanParameters:                                    (params[26] >> 2 & 1) === 1,
      leSetScanEnable:                                        (params[26] >> 3 & 1) === 1,
      leCreateConnection:                                     (params[26] >> 4 & 1) === 1,
      leCreateConnectionCancel:                               (params[26] >> 5 & 1) === 1,
      leReadWhiteListSize:                                    (params[26] >> 6 & 1) === 1,
      leClearWhiteList:                                       (params[26] >> 7 & 1) === 1,
      leAddDeviceToWhiteList:                                 (params[27] >> 0 & 1) === 1,
      leRemoveDeviceFromWhiteList:                            (params[27] >> 1 & 1) === 1,
      leConnectionUpdate:                                     (params[27] >> 2 & 1) === 1,
      leSetHostChannelClassification:                         (params[27] >> 3 & 1) === 1,
      leReadChannelMap:                                       (params[27] >> 4 & 1) === 1,
      leReadRemoteFeatures:                                   (params[27] >> 5 & 1) === 1,
      leEncrypt:                                              (params[27] >> 6 & 1) === 1,
      leRand:                                                 (params[27] >> 7 & 1) === 1,
      leEnableEncryption:                                     (params[28] >> 0 & 1) === 1,
      leLongTermKeyRequestReply:                              (params[28] >> 1 & 1) === 1,
      leLongTermKeyRequestNegativeReply:                      (params[28] >> 2 & 1) === 1,
      leReadSupportedStates:                                  (params[28] >> 3 & 1) === 1,
      leReceiverTestV1:                                       (params[28] >> 4 & 1) === 1,
      leTransmitterTestV1:                                    (params[28] >> 5 & 1) === 1,
      leTestEnd:                                              (params[28] >> 6 & 1) === 1,
      enhancedSetupSynchronousConnection:                     (params[29] >> 3 & 1) === 1,
      enhancedAcceptSynchronousConnection:                    (params[29] >> 4 & 1) === 1,
      readLocalSupportedCodecs:                               (params[29] >> 5 & 1) === 1,
      setMWSChannelParameters:                                (params[29] >> 6 & 1) === 1,
      setExternalFrameConfiguration:                          (params[29] >> 7 & 1) === 1,
      setMwsSignaling:                                        (params[30] >> 0 & 1) === 1,
      setMwsTransportLayer:                                   (params[30] >> 1 & 1) === 1,
      setMwsScanFrequencyTable:                               (params[30] >> 2 & 1) === 1,
      getMwsTransportLayerConfiguration:                      (params[30] >> 3 & 1) === 1,
      setMwsPatternConfiguration:                             (params[30] >> 4 & 1) === 1,
      setTriggeredClockCapture:                               (params[30] >> 5 & 1) === 1,
      truncatedPage:                                          (params[30] >> 6 & 1) === 1,
      truncatedPageCancel:                                    (params[30] >> 7 & 1) === 1,
      setConnectionlessSlaveBroadcast:                        (params[31] >> 0 & 1) === 1,
      setConnectionlessSlaveBroadcastReceive:                 (params[31] >> 1 & 1) === 1,
      startSynchronizationTrain:                              (params[31] >> 2 & 1) === 1,
      receiveSynchronizationTrain:                            (params[31] >> 3 & 1) === 1,
      setReservedLtAddr:                                      (params[31] >> 4 & 1) === 1,
      deleteReservedLtAddr:                                   (params[31] >> 5 & 1) === 1,
      setConnectionlessSlaveBroadcastData:                    (params[31] >> 6 & 1) === 1,
      readSynchronizationTrainParameters:                     (params[31] >> 7 & 1) === 1,
      writeSynchronizationTrainParameters:                    (params[32] >> 0 & 1) === 1,
      remoteOobExtendedDataRequestReply:                      (params[32] >> 1 & 1) === 1,
      readSecureConnectionsHostSupport:                       (params[32] >> 2 & 1) === 1,
      writeSecureConnectionsHostSupport:                      (params[32] >> 3 & 1) === 1,
      readAuthenticatedPayloadTimeout:                        (params[32] >> 4 & 1) === 1,
      writeAuthenticatedPayloadTimeout:                       (params[32] >> 5 & 1) === 1,
      readLocalOobExtendedData:                               (params[32] >> 6 & 1) === 1,
      writeSecureConnectionsTestMode:                         (params[32] >> 7 & 1) === 1,
      readExtendedPageTimeout:                                (params[33] >> 0 & 1) === 1,
      writeExtendedPageTimeout:                               (params[33] >> 1 & 1) === 1,
      readExtendedInquiryLength:                              (params[33] >> 2 & 1) === 1,
      writeExtendedInquiryLength:                             (params[33] >> 3 & 1) === 1,
      leRemoteConnectionParameterRequestReply:                (params[33] >> 4 & 1) === 1,
      leRemoteConnectionParameterRequestNegativeReply:        (params[33] >> 5 & 1) === 1,
      leSetDataLength:                                        (params[33] >> 6 & 1) === 1,
      leReadSuggestedDefaultDataLength:                       (params[33] >> 7 & 1) === 1,
      leWriteSuggestedDefaultDataLength:                      (params[34] >> 0 & 1) === 1,
      leReadLocalP256PublicKey:                               (params[34] >> 1 & 1) === 1,
      leGenerateDhKeyV1:                                      (params[34] >> 2 & 1) === 1,
      leAddDeviceToResolvingList:                             (params[34] >> 3 & 1) === 1,
      leRemoveDeviceFromResolvingList:                        (params[34] >> 4 & 1) === 1,
      leClearResolvingList:                                   (params[34] >> 5 & 1) === 1,
      leReadResolvingListSize:                                (params[34] >> 6 & 1) === 1,
      leReadPeerResolvableAddress:                            (params[34] >> 7 & 1) === 1,
      leReadLocalResolvableAddress:                           (params[35] >> 0 & 1) === 1,
      leSetAddressResolutionEnable:                           (params[35] >> 1 & 1) === 1,
      leSetResolvablePrivateAddressTimeout:                   (params[35] >> 2 & 1) === 1,
      leReadMaximumDataLength:                                (params[35] >> 3 & 1) === 1,
      leReadPhy:                                              (params[35] >> 4 & 1) === 1,
      leSetDefaultPhy:                                        (params[35] >> 5 & 1) === 1,
      leSetPhy:                                               (params[35] >> 6 & 1) === 1,
      leReceiverTestV2:                                       (params[35] >> 7 & 1) === 1,
      leTransmitterTestV2:                                    (params[36] >> 0 & 1) === 1,
      leSetAdvertisingSetRandomAddress:                       (params[36] >> 1 & 1) === 1,
      leSetExtendedAdvertisingParameters:                     (params[36] >> 2 & 1) === 1,
      leSetExtendedAdvertisingData:                           (params[36] >> 3 & 1) === 1,
      leSetExtendedScanResponseData:                          (params[36] >> 4 & 1) === 1,
      leSetExtendedAdvertisingEnable:                         (params[36] >> 5 & 1) === 1,
      leReadMaximumAdvertisingDataLength:                     (params[36] >> 6 & 1) === 1,
      leReadNumberofSupportedAdvertisingSets:                 (params[36] >> 7 & 1) === 1,
      leRemoveAdvertisingSet:                                 (params[37] >> 0 & 1) === 1,
      leClearAdvertisingSets:                                 (params[37] >> 1 & 1) === 1,
      leSetPeriodicAdvertisingParameters:                     (params[37] >> 2 & 1) === 1,
      leSetPeriodicAdvertisingData:                           (params[37] >> 3 & 1) === 1,
      leSetPeriodicAdvertisingEnable:                         (params[37] >> 4 & 1) === 1,
      leSetExtendedScanParameters:                            (params[37] >> 5 & 1) === 1,
      leSetExtendedScanEnable:                                (params[37] >> 6 & 1) === 1,
      leExtendedCreateConnection:                             (params[37] >> 7 & 1) === 1,
      lePeriodicAdvertisingCreateSync:                        (params[38] >> 0 & 1) === 1,
      lePeriodicAdvertisingCreateSyncCancel:                  (params[38] >> 1 & 1) === 1,
      lePeriodicAdvertisingTerminateSync:                     (params[38] >> 2 & 1) === 1,
      leAddDeviceToPeriodicAdvertiserList:                    (params[38] >> 3 & 1) === 1,
      leRemoveDeviceFromPeriodicAdvertiserList:               (params[38] >> 4 & 1) === 1,
      leClearPeriodicAdvertiserList:                          (params[38] >> 5 & 1) === 1,
      leReadPeriodicAdvertiserListSize:                       (params[38] >> 6 & 1) === 1,
      leReadTransmitPower:                                    (params[38] >> 7 & 1) === 1,
      leReadRfPathCompensation:                               (params[39] >> 0 & 1) === 1,
      leWriteRfPathCompensation:                              (params[39] >> 1 & 1) === 1,
      leSetPrivacyMode:                                       (params[39] >> 2 & 1) === 1,
      leReceiverTestV3:                                       (params[39] >> 3 & 1) === 1,
      leTransmitterTestV3:                                    (params[39] >> 4 & 1) === 1,
      leSetConnectionlessCteTransmitParameters:               (params[39] >> 5 & 1) === 1,
      leSetConnectionlessCteTransmitEnable:                   (params[39] >> 6 & 1) === 1,
      leSetConnectionlessIqSamplingEnable:                    (params[39] >> 7 & 1) === 1,
      leSetConnectionCteReceiveParameters:                    (params[40] >> 0 & 1) === 1,
      leSetConnectionCteTransmitParameters:                   (params[40] >> 1 & 1) === 1,
      leConnectionCteRequestEnable:                           (params[40] >> 2 & 1) === 1,
      leConnectionCteResponseEnable:                          (params[40] >> 3 & 1) === 1,
      leReadAntennaInformation:                               (params[40] >> 4 & 1) === 1,
      leSetPeriodicAdvertisingReceiveEnable:                  (params[40] >> 5 & 1) === 1,
      lePeriodicAdvertisingSyncTransfer:                      (params[40] >> 6 & 1) === 1,
      lePeriodicAdvertisingSetInfoTransfer:                   (params[40] >> 7 & 1) === 1,
      leSetPeriodicAdvertisingSyncTransferParameters:         (params[41] >> 0 & 1) === 1,
      leSetDefaultPeriodicAdvertisingSyncTransferParameters:  (params[41] >> 1 & 1) === 1,
      leGenerateDhKeyV2:                                      (params[41] >> 2 & 1) === 1,
      readLocalSimplePairingOptions:                          (params[41] >> 3 & 1) === 1,
      leModifySleepClockAccuracy:                             (params[41] >> 4 & 1) === 1,
      leReadBufferSizeV2:                                     (params[41] >> 5 & 1) === 1,
      leReadIsoTxSync:                                        (params[41] >> 6 & 1) === 1,
      leSetCigParameters:                                     (params[41] >> 7 & 1) === 1,
      leSetCigParametersTest:                                 (params[42] >> 0 & 1) === 1,
      leCreateCis:                                            (params[42] >> 1 & 1) === 1,
      leRemoveCig:                                            (params[42] >> 2 & 1) === 1,
      leAcceptCisRequest:                                     (params[42] >> 3 & 1) === 1,
      leRejectCisRequest:                                     (params[42] >> 4 & 1) === 1,
      leCreateBig:                                            (params[42] >> 5 & 1) === 1,
      leCreateBigTest:                                        (params[42] >> 6 & 1) === 1,
      leTerminateBig:                                         (params[42] >> 7 & 1) === 1,
      leBigCreateSync:                                        (params[43] >> 0 & 1) === 1,
      leBigTerminateSync:                                     (params[43] >> 1 & 1) === 1,
      leRequestPeerSca:                                       (params[43] >> 2 & 1) === 1,
      leSetupIsoDataPath:                                     (params[43] >> 3 & 1) === 1,
      leRemoveIsoDataPath:                                    (params[43] >> 4 & 1) === 1,
      leIsoTransmitTest:                                      (params[43] >> 5 & 1) === 1,
      leIsoReceiveTest:                                       (params[43] >> 6 & 1) === 1,
      leIsoReadTestCounters:                                  (params[43] >> 7 & 1) === 1,
      leIsoTestEnd:                                           (params[44] >> 0 & 1) === 1,
      leSetHostFeature:                                       (params[44] >> 1 & 1) === 1,
      leReadIsoLinkQuality:                                   (params[44] >> 2 & 1) === 1,
      leEnhancedReadTransmitPowerLevel:                       (params[44] >> 3 & 1) === 1,
      leReadRemoteTransmitPowerLevel:                         (params[44] >> 4 & 1) === 1,
      leSetPathLossReportingParameters:                       (params[44] >> 5 & 1) === 1,
      leSetPathLossReportingEnable:                           (params[44] >> 6 & 1) === 1,
      leSetTransmitPowerReportingEnable:                      (params[44] >> 7 & 1) === 1,
      leTransmitterTestV4:                                    (params[45] >> 0 & 1) === 1,
      setEcosystemBaseInterval:                               (params[45] >> 1 & 1) === 1,
      readLocalSupportedCodecsV2:                             (params[45] >> 2 & 1) === 1,
      readLocalSupportedCodecCapabilities:                    (params[45] >> 3 & 1) === 1,
      readLocalSupportedControllerDelay:                      (params[45] >> 4 & 1) === 1,
      configureDataPath:                                      (params[45] >> 5 & 1) === 1,
    };
  }

  public async setEventMask(): Promise<void> {
    // TODO pass event mask as argument
    const payload = Buffer.from('90e8040200800020', 'hex');
    const ocf = HciOcfControlAndBasebandCommands.SetEventMask;
    await this.cmd.controlAndBaseband({
      ocf, payload,
    });
  }

  public async setEventMaskPage2(): Promise<void> {
    // TODO pass event mask as argument
    const payload = Buffer.from('0000800000000000', 'hex');
    const ocf = HciOcfControlAndBasebandCommands.SetEventMaskPage2;
    await this.cmd.controlAndBaseband({ ocf, payload });
  }

  public async readLeHostSupport(): Promise<boolean> {
    const ocf = HciOcfControlAndBasebandCommands.ReadLeHostSupport;
    const result = await this.cmd.controlAndBaseband({ ocf });
    const params = result.returnParameters;
    if (!params || params.length < 1) {
      throw makeParserError(HciParserError.InvalidPayloadSize);
    }
    // Simultaneous Le Host shall be ignored [Vol 4] Part E, Section 6.35
    const leSupportedHost = params.readUInt8(0) === 1;
    return leSupportedHost;
  }

  public async writeLeHostSupported(leSupportedHost: boolean) {
    const payload = Buffer.allocUnsafe(2);
    payload[0] = leSupportedHost ? 1 : 0;
    payload[1] = 0; // Simultaneous Le Host shall be ignored
    const ocf = HciOcfControlAndBasebandCommands.WriteLeHostSupport;
    await this.cmd.controlAndBaseband({ ocf });
  }

  public async readRssi(connHandle: number): Promise<number> {
    const payload = Buffer.allocUnsafe(2);
    payload.writeUInt16LE(connHandle, 0);
    const ocf = HciOcfStatusParameters.ReadRssi;
    const result = await this.cmd.statusParameters({
      ocf, payload, connHandle,
    });
    const params = result.returnParameters;
    if (!params || params.length < 3) {
      throw makeParserError(HciParserError.InvalidPayloadSize);
    }
    const rssi = params.readInt8(2);
    return rssi;
  }

  public async leSetEventMask(): Promise<void> {
    // TODO pass event mask as argument
    const payload = Buffer.from('5f1e0a0000000000', 'hex');
    const ocf = HciOcfLeControllerCommands.SetEventMask;
    await this.cmd.leController({ ocf, payload });
  }

  public async leReadBufferSize() {
    const ocf = HciOcfLeControllerCommands.ReadBufferSizeV1;
    const result = await this.cmd.leController({ ocf });
    const params = result.returnParameters;
    if (!params || params.length < 3) {
      throw makeParserError(HciParserError.InvalidPayloadSize);
    }
    return {
      leAclDataPacketLength:    params.readUInt16LE(0),
      totalNumLeAclDataPackets: params.readUInt8(2),
    };
  }

  public async leReadBufferSizeV2() {
    const ocf = HciOcfLeControllerCommands.ReadBufferSizeV2;
    const result = await this.cmd.leController({ ocf });
    const params = result.returnParameters;
    if (!params || params.length < 6) {
      throw makeParserError(HciParserError.InvalidPayloadSize);
    }
    return {
      leAclDataPacketLength:    params.readUInt16LE(0),
      totalNumLeAclDataPackets: params.readUInt8(2),
      isoDataPacketLength:      params.readUInt16LE(3),
      totalNumIsoDataPackets:   params.readUInt8(5),
    };
  }

  public async leReadSupportedFeatures(): Promise<BigInt> {
    const ocf = HciOcfLeControllerCommands.ReadLocalSupportedFeatures;
    const result = await this.cmd.leController({ ocf });
    const params = result.returnParameters;
    if (!params || params.length < (64/8)) {
      throw makeParserError(HciParserError.InvalidPayloadSize);
    }
    // TODO: parse bitmask
    return params.readBigUInt64LE(0);
  }

  public async leSetRandomAddress(randomAddress: number): Promise<void> {
    const payload = Buffer.allocUnsafe(6);
    payload.writeUIntLE(randomAddress, 0, 6);

    const ocf = HciOcfLeControllerCommands.SetRandomAddress;
    await this.cmd.leController({ ocf, payload });
  }

  public async leSetAdvertisingParameters(params: {
    advertisingIntervalMinMs: number,
    advertisingIntervalMaxMs: number,
    advertisingType: LeAdvertisingType,
    ownAddressType: LeOwnAddressType,
    peerAddressType: LePeerAddressType,
    peerAddress: number,
    advertisingChannelMap: LeAdvertisingChannelMap[],
    advertisingFilterPolicy: LeAdvertisingFilterPolicy,
  }): Promise<void> {

    const advertisingIntervalMin = Math.round(params.advertisingIntervalMinMs / 0.625);
    const advertisingIntervalMax = Math.round(params.advertisingIntervalMaxMs / 0.625);
    const advertisingChannelMap  = this.buildBitfield(params.advertisingChannelMap);

    const payload = Buffer.allocUnsafe(15);

    let o = 0;
    o = payload.writeUIntLE(advertisingIntervalMin,         o, 2);
    o = payload.writeUIntLE(advertisingIntervalMax,         o, 2);
    o = payload.writeUIntLE(params.advertisingType,         o, 1);
    o = payload.writeUIntLE(params.ownAddressType,          o, 1);
    o = payload.writeUIntLE(params.peerAddressType,         o, 1);
    o = payload.writeUIntLE(params.peerAddress,             o, 6);
    o = payload.writeUIntLE(advertisingChannelMap,          o, 1);
    o = payload.writeUIntLE(params.advertisingFilterPolicy, o, 1);

    const ocf = HciOcfLeControllerCommands.SetAdvertisingParameters;
    await this.cmd.leController({ ocf, payload });
  }

  public async leReadAdvertisingPhysicalChannelTxPower(): Promise<number> {
    const ocf = HciOcfLeControllerCommands.ReadAdvertisingPhysicalChannelTxPower;
    const result = await this.cmd.leController({ ocf });
    const params = result.returnParameters;
    if (!params || params.length < 1) {
      throw makeParserError(HciParserError.InvalidPayloadSize);
    }
    return params.readInt8(0);
  }

  public async leSetAdvertisingData(data: Buffer): Promise<void> {
    if (data.length > 31) {
      throw makeHciError(HciErrorCode.InvalidCommandParameter);
    }

    const payload = Buffer.alloc(1+31, 0);
    payload.writeUInt8(data.length, 0);
    data.copy(payload, 1);

    const ocf = HciOcfLeControllerCommands.SetAdvertisingData;
    await this.cmd.leController({ ocf, payload });
  }

  public async leSetScanResponseData(data: Buffer): Promise<void> {
    if (data.length > 31) {
      throw makeHciError(HciErrorCode.InvalidCommandParameter);
    }

    const payload = Buffer.alloc(1+31, 0);
    payload.writeUInt8(data.length, 0);
    data.copy(payload, 1);

    const ocf = HciOcfLeControllerCommands.SetScanResponseData;
    await this.cmd.leController({ ocf, payload });
  }

  public async leSetAdvertisingEnable(enable: boolean): Promise<void> {
    const payload = Buffer.allocUnsafe(1);
    payload.writeUInt8(enable ? 1 : 0);
    const ocf = HciOcfLeControllerCommands.SetAdvertisingEnable;
    await this.cmd.leController({ ocf, payload });
  }

  public async leSetScanParameters(params: {
    type: LeScanType,
    intervalMs: number,
    windowMs: number,
    ownAddressType: LeOwnAddressType,
    scanningFilterPolicy: LeScanningFilterPolicy,
  }): Promise<void> {
    const payload = Buffer.allocUnsafe(1+2+2+1+1);

    const interval = this.msToHciValue(params.intervalMs);
    const window   = this.msToHciValue(params.windowMs);

    let o = 0;
    o = payload.writeUIntLE(params.type,                 o, 1);
    o = payload.writeUIntLE(interval,                    o, 2);
    o = payload.writeUIntLE(window,                      o, 2);
    o = payload.writeUIntLE(params.ownAddressType,       o, 1);
    o = payload.writeUIntLE(params.scanningFilterPolicy, o, 1);

    const ocf = HciOcfLeControllerCommands.SetScanParameters;
    await this.cmd.leController({ ocf, payload });
  }

  public async leSetScanEnable(enable: boolean, filterDuplicates?: boolean): Promise<void> {
    const payload = Buffer.allocUnsafe(2);
    payload.writeUInt8(enable           ? 1 : 0);
    payload.writeUInt8(filterDuplicates ? 1 : 0);
    const ocf = HciOcfLeControllerCommands.SetScanEnable;
    await this.cmd.leController({ ocf, payload });
  }

  public async leCreateConnection(params: {
    scanIntervalMs: number,
    scanWindowMs: number,
    initiatorFilterPolicy: number,
    peerAddressType: LePeerAddressType,
    peerAddress: number,
    ownAddressType: LeOwnAddressType,
    connectionIntervalMinMs: number,
    connectionIntervalMaxMs: number,
    connectionLatency: number,
    supervisionTimeoutMs: number,
    minCeLengthMs: number,
    maxCeLengthMs: number,
  }): Promise<void> {
    const payload = Buffer.allocUnsafe(2+2+1+1+6+1+2+2+2+2+2+2);

    const scanInterval       = this.msToHciValue(params.scanIntervalMs,          0.625);
    const scanWindow         = this.msToHciValue(params.scanWindowMs,            0.625);
    const connIntervalMin    = this.msToHciValue(params.connectionIntervalMinMs, 1.25);
    const connIntervalMax    = this.msToHciValue(params.connectionIntervalMaxMs, 1.25);
    const supervisionTimeout = this.msToHciValue(params.supervisionTimeoutMs,    10);
    const minConnEvtLength   = this.msToHciValue(params.minCeLengthMs,           0.625);
    const maxConnEvtLength   = this.msToHciValue(params.maxCeLengthMs,           0.625);

    let o = 0;
    o = payload.writeUIntLE(scanInterval,                 o, 2);
    o = payload.writeUIntLE(scanWindow,                   o, 2);
    o = payload.writeUIntLE(params.initiatorFilterPolicy, o, 1);
    o = payload.writeUIntLE(params.peerAddressType,       o, 1);
    o = payload.writeUIntLE(params.peerAddress,           o, 6);
    o = payload.writeUIntLE(params.ownAddressType,        o, 1);
    o = payload.writeUIntLE(connIntervalMin,              o, 2);
    o = payload.writeUIntLE(connIntervalMax,              o, 2);
    o = payload.writeUIntLE(params.connectionLatency,     o, 2);
    o = payload.writeUIntLE(supervisionTimeout,           o, 2);
    o = payload.writeUIntLE(minConnEvtLength,             o, 2);
    o = payload.writeUIntLE(maxConnEvtLength,             o, 2);

    const ocf = HciOcfLeControllerCommands.CreateConnection;
    await this.cmd.leController({ ocf, payload });
  }

  public async leCreateConnectionCancel(): Promise<void> {
    const ocf = HciOcfLeControllerCommands.CreateConnectionCancel;
    await this.cmd.leController({ ocf });
  }

  public async leReadWhiteListSize(): Promise<number> {
    const ocf = HciOcfLeControllerCommands.ReadWhiteListSize;
    const result = await this.cmd.leController({ ocf });
    const params = result.returnParameters;
    if (!params || params.length < 1) {
      throw makeParserError(HciParserError.InvalidPayloadSize);
    }
    return params.readUInt8(0);
  }

  public async leClearWhiteList(): Promise<void> {
    const ocf = HciOcfLeControllerCommands.ClearWhiteList;
    await this.cmd.leController({ ocf });
  }

  public async leAddDeviceToWhiteList(addressType: LeWhiteListAddressType, address?: number): Promise<void> {
    const payload = Buffer.allocUnsafe(1+6);
    payload.writeUIntLE(addressType,  0, 1);
    payload.writeUIntLE(address ?? 0, 1, 6);
    const ocf = HciOcfLeControllerCommands.AddDeviceToWhiteList;
    await this.cmd.leController({ ocf, payload });
  }

  public async leRemoveDeviceFromWhiteList(addressType: LeWhiteListAddressType, address?: number): Promise<void> {
    const payload = Buffer.allocUnsafe(1+6);
    payload.writeUIntLE(addressType,  0, 1);
    payload.writeUIntLE(address ?? 0, 1, 6);
    const ocf = HciOcfLeControllerCommands.RemoveDeviceFromWhiteList;
    await this.cmd.leController({ ocf, payload });
  }

  public async leConnectionUpdate(params: {
    connectionHandle: number,
    connectionIntervalMinMs: number,
    connectionIntervalMaxMs: number,
    connectionLatency: number,
    supervisionTimeoutMs: number,
    minCeLengthMs: number,
    maxCeLengthMs: number,
  }): Promise<void> {
    const payload = Buffer.allocUnsafe(2+2+2+2+2+2+2);

    const connIntervalMin    = this.msToHciValue(params.connectionIntervalMinMs, 1.25);
    const connIntervalMax    = this.msToHciValue(params.connectionIntervalMaxMs, 1.25);
    const supervisionTimeout = this.msToHciValue(params.supervisionTimeoutMs,    10);
    const minConnEvtLength   = this.msToHciValue(params.minCeLengthMs,           0.625);
    const maxConnEvtLength   = this.msToHciValue(params.maxCeLengthMs,           0.625);

    let o = 0;
    o = payload.writeUIntLE(params.connectionLatency,     o, 2);
    o = payload.writeUIntLE(connIntervalMin,              o, 2);
    o = payload.writeUIntLE(connIntervalMax,              o, 2);
    o = payload.writeUIntLE(params.connectionLatency,     o, 2);
    o = payload.writeUIntLE(supervisionTimeout,           o, 2);
    o = payload.writeUIntLE(minConnEvtLength,             o, 2);
    o = payload.writeUIntLE(maxConnEvtLength,             o, 2);

    const ocf = HciOcfLeControllerCommands.ConnectionUpdate;
    await this.cmd.leController({ ocf, payload });
  }

  public async leSetHostChannelClassification(channelMap: number): Promise<void> {
    const payload = Buffer.allocUnsafe(5);
    payload.writeUIntLE(channelMap, 0, 5);
    const ocf = HciOcfLeControllerCommands.SetHostChannelClassification;
    await this.cmd.leController({ ocf, payload });
  }

  public async leReadChannelMap(connHandle: number): Promise<{ connHandle: number, channelMap: number }> {
    const payload = Buffer.allocUnsafe(2);
    payload.writeUIntLE(connHandle, 0, 2);
    const ocf = HciOcfLeControllerCommands.ReadChannelMap;
    const result = await this.cmd.leController({ ocf, payload });
    const params = result.returnParameters;
    if (!params || params.length < 7) {
      throw makeParserError(HciParserError.InvalidPayloadSize);
    }
    return {
      connHandle: params.readUIntLE(0, 2),
      channelMap: params.readUIntLE(2, 5),
    };
  }

  public async leReadRemoteFeatures(connHandle: number): Promise<void> {
    const payload = Buffer.allocUnsafe(2);
    payload.writeUIntLE(connHandle, 0, 2);
    const ocf = HciOcfLeControllerCommands.ReadRemoteFeatures;
    await this.cmd.leController({ ocf, payload });
  }

  public async leEncrypt(key: Buffer, plaintextData: Buffer): Promise<Buffer> {
    if (key.length !== 16 || plaintextData.length !== 16) {
      throw makeHciError(HciErrorCode.InvalidCommandParameter);
    }

    const payload = Buffer.allocUnsafe(32);
    key.copy(payload, 0);
    plaintextData.copy(payload, 16);

    const ocf = HciOcfLeControllerCommands.Encrypt;
    const result = await this.cmd.leController({ ocf, payload });
    const params = result.returnParameters;
    if (!params) {
      throw makeParserError(HciParserError.InvalidPayloadSize);
    }
    return params;
  }

  public async leRand(): Promise<Buffer> {
    const ocf = HciOcfLeControllerCommands.Rand;
    const result = await this.cmd.leController({ ocf });
    const params = result.returnParameters;
    if (!params) {
      throw makeParserError(HciParserError.InvalidPayloadSize);
    }
    return params;
  }

  public async leEnableEncryption(params: {
    connHandle: number,
    randomNumber: Buffer,
    encryptedDiversifier: number,
    longTermKey: Buffer,
  }): Promise<void> {
    if (params.randomNumber.length !== 8 || params.longTermKey.length !== 16) {
      throw makeHciError(HciErrorCode.InvalidCommandParameter);
    }
    const payload = Buffer.allocUnsafe(2+8+2+16);

    let o = 0;
    o  = payload.writeUIntLE(params.connHandle, o, 2);
    o += params.randomNumber.copy(payload, o);
    o  = payload.writeUIntLE(params.encryptedDiversifier, o, 2);
    o += params.longTermKey.copy(payload, o);

    const ocf = HciOcfLeControllerCommands.EnableEncryption;
    await this.cmd.leController({ ocf, payload });
  }

  public async leLongTermKeyRequestReply(input: {
    connHandle: number,
    longTermKey: Buffer,
  }): Promise<number> {
    if (input.longTermKey.length !== 16) {
      throw makeHciError(HciErrorCode.InvalidCommandParameter);
    }
    const connHandle = input.connHandle;
    const payload = Buffer.allocUnsafe(2+16);

    let o = 0;
    o  = payload.writeUIntLE(connHandle, o, 2);
    o += input.longTermKey.copy(payload, o);

    const ocf = HciOcfLeControllerCommands.LongTermKeyRequestReply;
    const result = await this.cmd.leController({ ocf, connHandle, payload });
    const params = result.returnParameters;
    if (!params || params.length < 2) {
      throw makeParserError(HciParserError.InvalidPayloadSize);
    }
    return params.readUInt16LE(0);
  }

  public async leLongTermKeyRequestNegativeReply(connHandle: number): Promise<number> {
    const payload = Buffer.allocUnsafe(2);
    payload.writeUIntLE(connHandle, 0, 2);
    const ocf = HciOcfLeControllerCommands.LongTermKeyRequestNegativeReply;
    const result = await this.cmd.leController({ ocf, connHandle, payload });
    const params = result.returnParameters;
    if (!params || params.length < 2) {
      throw makeParserError(HciParserError.InvalidPayloadSize);
    }
    return params.readUInt16LE(0);
  }

  public async leReadSupportedStates(): Promise<LeSupportedStates> {
    const ocf = HciOcfLeControllerCommands.ReadSupportedStates;
    const result = await this.cmd.leController({ ocf });

    const params = result.returnParameters;
    if (!params || params.length < (64/8)) {
      throw makeParserError(HciParserError.InvalidPayloadSize);
    }
    const bitmask = params.readBigUInt64LE(0);
    return LeSupportedStates.fromBitmask(bitmask);
  }

  public async leReceiverTestV1(params: { rxChannelMhz: number }): Promise<void> {
    const rxChannel = this.channelFrequencyToHciValue(params.rxChannelMhz);

    const payload = Buffer.allocUnsafe(1);
    payload.writeUIntLE(rxChannel, 0, 1);

    const ocf = HciOcfLeControllerCommands.ReceiverTestV1;
    await this.cmd.leController({ ocf, payload });
  }

  private channelFrequencyToHciValue(rxChannelMhz: number): number {
    return (rxChannelMhz - 2402) / 2;
  }

  public async leReceiverTestV2(params: {
    rxChannelMhz: number,
    phy: LePhy,
    modulationIndex: LeModulationIndex,
  }): Promise<void> {
    const rxChannel = this.channelFrequencyToHciValue(params.rxChannelMhz);

    const payload = Buffer.allocUnsafe(1+1+1);

    let o = 0;
    o = payload.writeUIntLE(rxChannel,              o, 1);
    o = payload.writeUIntLE(params.phy,             o, 1);
    o = payload.writeUIntLE(params.modulationIndex, o, 1);

    const ocf = HciOcfLeControllerCommands.ReceiverTestV2;
    await this.cmd.leController({ ocf, payload });
  }

  public async leReceiverTestV3(params: {
    rxChannelMhz: number,
    phy: LePhy,
    modulationIndex: LeModulationIndex,
    expectedCteLength: number,
    expectedCteType: LeCteType,
    slotDurations: 1|2,
    antennaIds: number[],
  }): Promise<void> {
    const rxChannel = this.channelFrequencyToHciValue(params.rxChannelMhz);

    const payload = Buffer.allocUnsafe(1+1+1+1+1+1+1+params.antennaIds.length);

    let o = 0;
    o = payload.writeUIntLE(rxChannel,                o, 1);
    o = payload.writeUIntLE(params.phy,               o, 1);
    o = payload.writeUIntLE(params.modulationIndex,   o, 1);
    o = payload.writeUIntLE(params.expectedCteLength, o, 1);
    o = payload.writeUIntLE(params.expectedCteType,   o, 1);
    o = payload.writeUIntLE(params.slotDurations,     o, 1);
    o = payload.writeUIntLE(params.antennaIds.length, o, 1);

    for (const antennaId of params.antennaIds) {
      o = payload.writeUIntLE(antennaId, o, 1);
    }

    const ocf = HciOcfLeControllerCommands.ReceiverTestV3;
    await this.cmd.leController({ ocf, payload });
  }

  public async leTransmitterTestV1(params: {
    txChannelMhz: number,
    testDataLength: number,
    packetPayload: LeTxTestPayload,
  }): Promise<void> {
    const txChannel = this.channelFrequencyToHciValue(params.txChannelMhz);

    const payload = Buffer.allocUnsafe(1+1+1);

    let o = 0;
    o = payload.writeUIntLE(txChannel,              o, 1);
    o = payload.writeUIntLE(params.testDataLength,  o, 1);
    o = payload.writeUIntLE(params.packetPayload,   o, 1);

    const ocf = HciOcfLeControllerCommands.TransmitterTestV1;
    await this.cmd.leController({ ocf, payload });
  }

  public async leTransmitterTestV2(params: {
    txChannelMhz: number,
    testDataLength: number,
    packetPayload: LeTxTestPayload,
    phy: LeTxPhy,
  }): Promise<void> {
    const txChannel = this.channelFrequencyToHciValue(params.txChannelMhz);

    const payload = Buffer.allocUnsafe(1+1+1+1);

    let o = 0;
    o = payload.writeUIntLE(txChannel,              o, 1);
    o = payload.writeUIntLE(params.testDataLength,  o, 1);
    o = payload.writeUIntLE(params.packetPayload,   o, 1);
    o = payload.writeUIntLE(params.phy,             o, 1);

    const ocf = HciOcfLeControllerCommands.TransmitterTestV2;
    await this.cmd.leController({ ocf, payload });
  }

  public async leTransmitterTestV3(params: {
    txChannelMhz: number,
    testDataLength: number,
    packetPayload: LeTxTestPayload,
    phy: LeTxPhy,
    cteLength: number,
    cteType: LeCteType,
    antennaIds: number[],
  }): Promise<void> {
    const txChannel = this.channelFrequencyToHciValue(params.txChannelMhz);

    const payload = Buffer.allocUnsafe(1+1+1+1+1+1+1+params.antennaIds.length);

    let o = 0;
    o = payload.writeUIntLE(txChannel,                o, 1);
    o = payload.writeUIntLE(params.testDataLength,    o, 1);
    o = payload.writeUIntLE(params.packetPayload,     o, 1);
    o = payload.writeUIntLE(params.phy,               o, 1);
    o = payload.writeUIntLE(params.cteLength,         o, 1);
    o = payload.writeUIntLE(params.cteType,           o, 1);
    o = payload.writeUIntLE(params.antennaIds.length, o, 1);

    for (const antennaId of params.antennaIds) {
      o = payload.writeUIntLE(antennaId, o, 1);
    }

    const ocf = HciOcfLeControllerCommands.TransmitterTestV3;
    await this.cmd.leController({ ocf, payload });
  }

  public async leTransmitterTestV4(params: {
    txChannelMhz: number,
    testDataLength: number,
    packetPayload: LeTxTestPayload,
    phy: LeTxPhy,
    cteLength: number,
    cteType: LeCteType,
    antennaIds: number[],
    transmitPowerLevel: number|LeMinTransmitPowerLevel|LeMaxTransmitPowerLevel,
  }): Promise<void> {
    const txChannel = this.channelFrequencyToHciValue(params.txChannelMhz);

    const payload = Buffer.allocUnsafe(1+1+1+1+1+1+1+params.antennaIds.length+1);

    let o = 0;
    o = payload.writeUIntLE(txChannel,                o, 1);
    o = payload.writeUIntLE(params.testDataLength,    o, 1);
    o = payload.writeUIntLE(params.packetPayload,     o, 1);
    o = payload.writeUIntLE(params.phy,               o, 1);
    o = payload.writeUIntLE(params.cteLength,         o, 1);
    o = payload.writeUIntLE(params.cteType,           o, 1);
    o = payload.writeUIntLE(params.antennaIds.length, o, 1);

    for (const antennaId of params.antennaIds) {
      o = payload.writeUIntLE(antennaId, o, 1);
    }

    o = payload.writeIntLE(params.transmitPowerLevel, o, 1);

    const ocf = HciOcfLeControllerCommands.TransmitterTestV4;
    await this.cmd.leController({ ocf, payload });
  }

  public async leTestEnd(): Promise<number> {
    const ocf = HciOcfLeControllerCommands.TestEnd;
    const result = await this.cmd.leController({ ocf });
    const params = result.returnParameters;
    if (!params || params.length < 2) {
      throw makeParserError(HciParserError.InvalidPayloadSize);
    }
    return params.readUInt16LE(0);
  }

  public async leRemoteConnectionParameterRequestReply(params: {
    connHandle: number,
    intervalMinMs: number, // 7.5ms - 4000ms
    intervalMaxMs: number, // 7.5ms - 4000ms
    latency: number,
    timeoutMs: number,
    minCeLengthMs: number,
    maxCeLengthMs: number,
  }): Promise<void> {
    const intervalMin   = this.msToHciValue(params.intervalMinMs, 1.25);
    const intervalMax   = this.msToHciValue(params.intervalMaxMs, 1.25);
    const timeout       = this.msToHciValue(params.timeoutMs,     10);
    const minCeLength   = this.msToHciValue(params.minCeLengthMs, 0.625);
    const maxCeLength   = this.msToHciValue(params.maxCeLengthMs, 0.625);

    const payload = Buffer.allocUnsafe(2+2+2+2+2+2);

    let o = 0;
    o = payload.writeUIntLE(params.connHandle,  o, 2);
    o = payload.writeUIntLE(intervalMin,        o, 2);
    o = payload.writeUIntLE(intervalMax,        o, 2);
    o = payload.writeUIntLE(timeout,            o, 2);
    o = payload.writeUIntLE(minCeLength,        o, 2);
    o = payload.writeUIntLE(maxCeLength,        o, 2);

    const connHandle = params.connHandle;
    const ocf = HciOcfLeControllerCommands.RemoteConnectionParameterRequestReply;
    await this.cmd.leController({ ocf, connHandle, payload });
  }

  public async leRemoteConnectionParameterRequestNegativeReply(params: {
    connHandle: number,
    reason: HciErrorCode,
  }): Promise<void> {
    const connHandle = params.connHandle;
    const payload = Buffer.allocUnsafe(2+1);

    let o = 0;
    o = payload.writeUIntLE(connHandle,     o, 2);
    o = payload.writeUIntLE(params.reason,  o, 1);

    const ocf = HciOcfLeControllerCommands.RemoteConnectionParameterRequestNegativeReply;
    await this.cmd.leController({ ocf, connHandle, payload });
  }

  public async leSetDataLength(params: {
    connHandle: number,
    txOctets: number,
    txTime: number,
  }): Promise<void> {
    const connHandle = params.connHandle;
    const payload = Buffer.allocUnsafe(2+2+2);

    let o = 0;
    o = payload.writeUIntLE(connHandle,       o, 2);
    o = payload.writeUIntLE(params.txOctets,  o, 2);
    o = payload.writeUIntLE(params.txTime,    o, 2);

    const ocf = HciOcfLeControllerCommands.SetDataLength;
    await this.cmd.leController({ ocf, connHandle, payload });
  }

  public async leReadSuggestedDefaultDataLength(): Promise<{
    suggestedMaxTxOctets: number,
    suggestedMaxTxTime: number,
  }> {
    const ocf = HciOcfLeControllerCommands.ReadSuggestedDefaultDataLength;
    const result = await this.cmd.leController({ ocf });

    const params = result.returnParameters;
    if (!params || params.length < 4) {
      throw makeParserError(HciParserError.InvalidPayloadSize);
    }
    return {
      suggestedMaxTxOctets: params.readUInt16LE(0),
      suggestedMaxTxTime:   params.readUInt16LE(2)
    };
  }

  public async leWriteSuggestedDefaultDataLength(params: {
    suggestedMaxTxOctets: number,
    suggestedMaxTxTime: number,
  }): Promise<void> {
    const payload = Buffer.allocUnsafe(4);
    payload.writeUInt16LE(params.suggestedMaxTxOctets, 0);
    payload.writeUInt16LE(params.suggestedMaxTxTime,   2);
    const ocf = HciOcfLeControllerCommands.WriteSuggestedDefaultDataLength;
    await this.cmd.leController({ ocf, payload });
  }

  public async leReadLocalP256PublicKey(): Promise<void> {
    const ocf = HciOcfLeControllerCommands.ReadLocalP256PublicKey;
    await this.cmd.leController({ ocf });
  }

  public async leGenerateDhKeyV1(params: {
    publicKey: Buffer,
  }): Promise<void> {
    if (params.publicKey.length !== 64) {
      throw makeHciError(HciErrorCode.InvalidCommandParameter);
    }
    const payload = Buffer.allocUnsafe(64);
    params.publicKey.copy(payload, 0);

    const ocf = HciOcfLeControllerCommands.GenerateDhKeyV1;
    await this.cmd.leController({ ocf, payload });
  }

  public async leGenerateDhKeyV2(params: {
    publicKey: Buffer,
    keyType: number,
  }): Promise<void> {
    if (params.publicKey.length !== 64) {
      throw makeHciError(HciErrorCode.InvalidCommandParameter);
    }
    const payload = Buffer.allocUnsafe(65);
    params.publicKey.copy(payload, 0);
    payload.writeUInt8(params.keyType, 64);

    const ocf = HciOcfLeControllerCommands.GenerateDhKeyV2;
    await this.cmd.leController({ ocf, payload });
  }

  public async leClearResolvingList(): Promise<void> {
    const  ocf = HciOcfLeControllerCommands.ClearResolvingList;
    await this.cmd.leController({ ocf });
  }

  public async leReadResolvingListSize(): Promise<number> {
    const ocf = HciOcfLeControllerCommands.ReadResolvingListSize;
    const result = await this.cmd.leController({ ocf });
    const params = result.returnParameters;
    if (!params|| params.length < 1) {
      throw makeParserError(HciParserError.InvalidPayloadSize);
    }
    return params.readUInt8(0);
  }

  public async leReadMaximumDataLength(): Promise<{
    supportedMaxTxOctets: number, supportedMaxTxTime: number,
    supportedMaxRxOctets: number, supportedMaxRxTime: number,
  }> {
    const ocf = HciOcfLeControllerCommands.ReadMaximumDataLength;
    const result = await this.cmd.leController({ ocf });
    const params = result.returnParameters;

    if (!params|| params.length < 8) {
      throw makeParserError(HciParserError.InvalidPayloadSize);
    }
    return {
      supportedMaxTxOctets: params.readUInt16LE(0),
      supportedMaxTxTime:   params.readUInt16LE(2),
      supportedMaxRxOctets: params.readUInt16LE(4),
      supportedMaxRxTime:   params.readUInt16LE(6),
    };
  }

  public async leReadPhy(connectionHandle: number): Promise<{
    connectionHandle: number,
    txPhy: LePhy,
    rxPhy: LePhy,
  }> {
    const payload = Buffer.allocUnsafe(2);
    payload.writeUInt16LE(connectionHandle, 0);

    const ocf = HciOcfLeControllerCommands.ReadPhy;
    const result = await this.cmd.leController({ ocf, payload });
    const params = result.returnParameters;

    if (!params|| params.length < 4) {
      throw makeParserError(HciParserError.InvalidPayloadSize);
    }
    return {
      connectionHandle: params.readUInt16LE(0),
      txPhy:            params.readUInt8(2),
      rxPhy:            params.readUInt8(3),
    };
  }

  public async leSetDefaultPhy(params: {
    txPhys?: LePhy, rxPhys?: LePhy,
  }): Promise<void> {
    let allPhys = 0, txPhys = 0, rxPhys = 0;

    // Is there ps reference for tx/rx phy?
    if (params.txPhys === undefined) {
      allPhys |= (1 << 0);
    } else {
      txPhys = 1 << params.txPhys;
    }
    if (params.rxPhys === undefined) {
      allPhys |= (1 << 1);
    } else {
      rxPhys = 1 << params.rxPhys;
    }

    const payload = Buffer.allocUnsafe(3);

    let o = 0;
    o = payload.writeUInt8(allPhys, o);
    o = payload.writeUInt8(txPhys,  o);
    o = payload.writeUInt8(rxPhys,  o);

    const ocf = HciOcfLeControllerCommands.SetDefaultPhy;
    await this.cmd.leController({ ocf, payload });
  }

  public async leSetAdvertisingSetRandomAddress(params: {
    advertisingHandle: number,
    advertisingRandomAddress: number,
  }): Promise<void> {
    const payload = Buffer.allocUnsafe(7);

    let o = 0;
    o = payload.writeUIntLE(params.advertisingHandle,        o, 1);
    o = payload.writeUIntLE(params.advertisingRandomAddress, o, 6);

    const ocf = HciOcfLeControllerCommands.SetAdvertisingSetRandomAddress;
    await this.cmd.leController({ ocf, payload });
  }

  public async leSetExtendedAdvertisingParameters(params: {
    advertisingHandle: number,
    advertisingEventProperties: LeAdvertisingEventProperties[],
    primaryAdvertisingIntervalMinMs: number,
    primaryAdvertisingIntervalMaxMs: number,
    primaryAdvertisingChannelMap: LeAdvertisingChannelMap[],
    ownAddressType: LeOwnAddressType,
    peerAddressType: LePeerAddressType,
    peerAddress: number,
    advertisingFilterPolicy: LeAdvertisingFilterPolicy,
    advertisingTxPower?: number,
    primaryAdvertisingPhy: LePrimaryAdvertisingPhy,
    secondaryAdvertisingMaxSkip: number,
    secondaryAdvertisingPhy: LeSecondaryAdvertisingPhy,
    advertisingSid: number,
    scanRequestNotificationEnable: boolean,
  }): Promise<number> {

    const advertisingEventProperties    = this.buildBitfield(params.advertisingEventProperties);
    const primaryAdvertisingIntervalMin = Math.round(params.primaryAdvertisingIntervalMinMs / 0.625);
    const primaryAdvertisingIntervalMax = Math.round(params.primaryAdvertisingIntervalMaxMs / 0.625);
    const primaryAdvertisingChannelMap  = this.buildBitfield(params.primaryAdvertisingChannelMap);
    const advertisingTxPower            = params.advertisingTxPower ?? 0x7F; // 0x7F - Host has no preference
    const scanRequestNotificationEnable = params.scanRequestNotificationEnable ? 1 : 0;

    const payload = Buffer.allocUnsafe(25);

    let o = 0;
    o = payload.writeUIntLE(params.advertisingHandle,             o, 1);
    o = payload.writeUIntLE(advertisingEventProperties,           o, 2);
    o = payload.writeUIntLE(primaryAdvertisingIntervalMin,        o, 3);
    o = payload.writeUIntLE(primaryAdvertisingIntervalMax,        o, 3);
    o = payload.writeUIntLE(primaryAdvertisingChannelMap,         o, 1);
    o = payload.writeUIntLE(params.ownAddressType,                o, 1);
    o = payload.writeUIntLE(params.peerAddressType,               o, 1);
    o = payload.writeUIntLE(params.peerAddress,                   o, 6);
    o = payload.writeUIntLE(params.advertisingFilterPolicy,       o, 1);
    o = payload.writeIntLE (advertisingTxPower,                   o, 1);
    o = payload.writeUIntLE(params.primaryAdvertisingPhy,         o, 1);
    o = payload.writeUIntLE(params.secondaryAdvertisingMaxSkip,   o, 1);
    o = payload.writeUIntLE(params.secondaryAdvertisingPhy,       o, 1);
    o = payload.writeUIntLE(params.advertisingSid,                o, 1);
    o = payload.writeUIntLE(scanRequestNotificationEnable,        o, 1);

    const ocf = HciOcfLeControllerCommands.SetExtendedAdvertisingParameters;
    const result = await this.cmd.leController({ ocf, payload });

    if (!result.returnParameters || result.returnParameters.length < 1) {
      throw makeParserError(HciParserError.InvalidPayloadSize);
    }

    const selectedTxPower = result.returnParameters.readInt8(0);
    return selectedTxPower;
  }

  public async leSetExtendedAdvertisingData(params: {
    advertisingHandle: number,
    operation: LeAdvertisingDataOperation,
    fragment: boolean,
    data: Buffer,
  }): Promise<void> {
    const payload = Buffer.allocUnsafe(4 + params.data.length);

    let o = 0;
    o = payload.writeUIntLE(params.advertisingHandle,  o, 1);
    o = payload.writeUIntLE(params.operation,          o, 1);
    o = payload.writeUIntLE(params.fragment ? 0 : 1,   o, 1);
    o = payload.writeUIntLE(params.data.length,        o, 1);
    params.data.copy(payload, o);

    const ocf = HciOcfLeControllerCommands.SetExtendedAdvertisingData;
    await this.cmd.leController({ ocf, payload });
  }

  public async leSetExtendedScanResponseData(params: {
    advertisingHandle: number,
    operation: LeScanResponseDataOperation,
    fragment: boolean,
    data: Buffer,
  }): Promise<void> {
    const payload = Buffer.allocUnsafe(4 + params.data.length);

    let o = 0;
    o = payload.writeUIntLE(params.advertisingHandle,  o, 1);
    o = payload.writeUIntLE(params.operation,          o, 1);
    o = payload.writeUIntLE(params.fragment ? 0 : 1,   o, 1);
    o = payload.writeUIntLE(params.data.length,        o, 1);
    params.data.copy(payload, o);

    const ocf = HciOcfLeControllerCommands.SetExtendedScanResponseData;
    await this.cmd.leController({ ocf, payload });
  }

  public async leReadNumberOfSupportedAdvertisingSets(): Promise<number> {
    const ocf = HciOcfLeControllerCommands.ReadNumberOfSupportedAdvertisingSets;
    const result = await this.cmd.leController({ ocf });
    if (!result.returnParameters || result.returnParameters.length < 1) {
      throw makeParserError(HciParserError.InvalidPayloadSize);
    }
    return result.returnParameters.readUInt8(0);
  }

  public async leSetExtendedScanParameters(params: {
    ownAddressType: LeOwnAddressType,
    scanningFilterPolicy: LeScanningFilterPolicy,
    scanningPhy: {
      Phy1M?:    { type: LeScanType, intervalMs: number, windowMs: number },
      PhyCoded?: { type: LeScanType, intervalMs: number, windowMs: number },
    },
  }): Promise<void> {
    const phys = { count: 0, bitmask: 0 };

    if (params.scanningPhy.Phy1M) {
      phys.count++;
      phys.bitmask |= 1 << LeScanningPhy.Phy1M;
    }
    if (params.scanningPhy.PhyCoded) {
      phys.count++;
      phys.bitmask |= 1 << LeScanningPhy.PhyCoded;
    }

    if (phys.count === 0) {
      throw makeHciError(HciErrorCode.InvalidCommandParameter);
    }

    const payload = Buffer.allocUnsafe(3 + phys.count * (1+2+2));

    let o = 0;
    o = payload.writeUIntLE(params.ownAddressType,       o, 1);
    o = payload.writeUIntLE(params.scanningFilterPolicy, o, 1);
    o = payload.writeUIntLE(phys.bitmask,                o, 1);

    if (params.scanningPhy.Phy1M) {
      o = payload.writeUIntLE(params.scanningPhy.Phy1M.type, o, 1);
    }
    if (params.scanningPhy.PhyCoded) {
      o = payload.writeUIntLE(params.scanningPhy.PhyCoded.type, o, 1);
    }
    if (params.scanningPhy.Phy1M) {
      const interval = this.msToHciValue(params.scanningPhy.Phy1M.intervalMs);
      o = payload.writeUIntLE(interval, o, 2);
    }
    if (params.scanningPhy.PhyCoded) {
      const interval = this.msToHciValue(params.scanningPhy.PhyCoded.intervalMs);
      o = payload.writeUIntLE(interval, o, 2);
    }
    if (params.scanningPhy.Phy1M) {
      const window = this.msToHciValue(params.scanningPhy.Phy1M.windowMs);
      o = payload.writeUIntLE(window, o, 2);
    }
    if (params.scanningPhy.PhyCoded) {
      const window = this.msToHciValue(params.scanningPhy.PhyCoded.windowMs);
      o = payload.writeUIntLE(window, o, 2);
    }

    const ocf = HciOcfLeControllerCommands.SetExtendedScanParameters;
    await this.cmd.leController({ ocf, payload });
  }

  public async leSetExtendedScanEnable(params: {
    enable: boolean,
    filterDuplicates: LeScanFilterDuplicates,
    durationMs?: number,
    periodSec?: number,
  }): Promise<void> {
    const duration = Math.round((params.durationMs ?? 0) / 10);
    const period = Math.round((params.periodSec ?? 0) / 1.28);

    const payload = Buffer.allocUnsafe(1+1+2+2);

    let o = 0;
    o = payload.writeUIntLE(params.enable ? 1 : 0,   o, 1);
    o = payload.writeUIntLE(params.filterDuplicates, o, 1);
    o = payload.writeUIntLE(duration,                o, 2);
    o = payload.writeUIntLE(period,                  o, 2);

    const ocf = HciOcfLeControllerCommands.SetExtendedScanEnable;
    await this.cmd.leController({ ocf, payload });
  }

  private hciValueToMs(val: number, factor: number = 0.625): number {
    return val * factor;
  }
  private msToHciValue(ms: number, factor: number = 0.625): number {
    return Math.round(ms / factor);
  }

  private buildBitfield(bits: number[]): number {
    let bitfield = 0;
    for (const bit of bits) {
      bitfield |= 1 << bit;
    }
    return bitfield;
  }

  public async sendAclData(params: {
    handle: number,
    boundary: AclDataBoundary,
    broadcast: AclDataBroadcast,
    data: Buffer,
  }): Promise<void> {
    const aclHdrSize = 4;
    const hdr = params.handle     <<  0 |
                params.boundary   << 12 |
                params.broadcast  << 14;

    const totalSize = aclHdrSize + params.data.length;
    const buffer = Buffer.allocUnsafe(totalSize);
    buffer.writeUInt16LE(hdr, 0);
    buffer.writeUInt16LE(params.data.length, 2);
    params.data.copy(buffer, aclHdrSize);

    await this.send(HciPacketType.HciAclData, buffer);
  }


  public onData(packetType: HciPacketType, data: Buffer): void {
    try {
      if (packetType === HciPacketType.HciEvent) {
        this.onEvent(data);
      }
    } catch (err) {
      debug(err);
    }
  }

  private onEvent(data: Buffer): void {
    if (data.length < 2) {
      debug(`hci event - invalid size ${data.length}`);
      return;
    }

    const eventCode     = data[0];
    const payloadLength = data[1];
    const payload       = data.slice(2);

    if (payloadLength !== payload.length) {
      debug(`(evt) invalid payload size: ${payloadLength}/${payload.length}`);
      return;
    }

    switch (eventCode) {
      case HciEvent.CommandComplete:
        if (payload.length < 4) {
          debug(`(evt-cmd_complete) invalid payload size: ${payload.length}`);
          return;
        }
        this.cmd.onCmdResult({
          status:           payload[3],
          numHciPackets:    payload[0],
          opcode:           payload.readUInt16LE(1),
          returnParameters: payload.slice(4),
        });
        break;
      case HciEvent.CommandStatus:
        if (payload.length < 4) {
          debug(`(evt-cmd_status) invalid payload size: ${payload.length}`);
          return;
        }
        this.cmd.onCmdResult({
          status:         payload[0],
          numHciPackets:  payload[1],
          opcode:         payload.readUInt16LE(2),
        });
        break;
      case HciEvent.LEMeta:
        this.onLeEvent(payload);
        break;
    }
  }

  private onLeEvent(data: Buffer): void {
    const eventType = data[0];
    const payload = data.slice(1);

    switch  (eventType) {
      case HciLeEvent.ExtendedAdvertisingReport:
        this.parseLeExtAdvertReport(payload);
        break;
    }
  }

  private parseLeExtAdvertReport(data: Buffer): void {
    const numReports = data[0];

    const reportsRaw: Partial<{
      eventType: number;
      addressType: number;
      address: number;
      primaryPhy: number;
      secondaryPhy: number;
      advertisingSid: number;
      txPower: number;
      rssi: number;
      periodicAdvInterval: number;
      directAddressType: number;
      directAddress: number;
      dataLength: number;
      data: Buffer;
    }>[] = [];

    let o = 1;

    for (let i = 0; i < numReports; i++) {
      reportsRaw.push({});
    }
    for (let i = 0; i < numReports; i++, o += 2) {
      reportsRaw[i].eventType = data.readUIntLE(o, 2);
    }
    for (let i = 0; i < numReports; i++, o += 1) {
      reportsRaw[i].addressType = data.readUIntLE(o, 1);
    }
    for (let i = 0; i < numReports; i++, o += 6) {
      reportsRaw[i].address = data.readUIntLE(o, 6);
    }
    for (let i = 0; i < numReports; i++, o += 1) {
      reportsRaw[i].primaryPhy = data.readUIntLE(o, 1);
    }
    for (let i = 0; i < numReports; i++, o += 1) {
      reportsRaw[i].secondaryPhy = data.readUIntLE(o, 1);
    }
    for (let i = 0; i < numReports; i++, o += 1) {
      reportsRaw[i].advertisingSid = data.readUIntLE(o, 1);
    }
    for (let i = 0; i < numReports; i++, o += 1) {
      reportsRaw[i].txPower = data.readIntLE(o, 1);
    }
    for (let i = 0; i < numReports; i++, o += 1) {
      reportsRaw[i].rssi = data.readIntLE(o, 1);
    }
    for (let i = 0; i < numReports; i++, o += 2) {
      reportsRaw[i].periodicAdvInterval = data.readUIntLE(o, 2);
    }
    for (let i = 0; i < numReports; i++, o += 1) {
      reportsRaw[i].directAddressType = data.readUIntLE(o, 1);
    }
    for (let i = 0; i < numReports; i++, o += 6) {
      reportsRaw[i].directAddress = data.readUIntLE(o, 6);
    }
    for (let i = 0; i < numReports; i++, o += 1) {
      reportsRaw[i].dataLength = data.readUIntLE(o, 1);
    }
    for (let i = 0; i < numReports; i++) {
      const dataLength = reportsRaw[i].dataLength!;
      if (dataLength === 0) {
        continue;
      }
      reportsRaw[i].data = data.slice(o, o + dataLength);
      o += dataLength;
    }

    const powerOrNull = (v: number): number|null => {
      return v !== 0x7F ? v : null;
    };

    const reports = reportsRaw.map<LeExtAdvReport>((reportRaw) => {
      return {
        eventType:              LeExtAdvEventTypeParser.parse(reportRaw.eventType!),
        addressType:            reportRaw.addressType!,
        address:                Address.from(reportRaw.address!),
        primaryPhy:             reportRaw.primaryPhy!,
        secondaryPhy:           reportRaw.secondaryPhy!,
        advertisingSid:         reportRaw.advertisingSid!,
        txPower:                powerOrNull(reportRaw.txPower!),
        rssi:                   powerOrNull(reportRaw.rssi!),
        periodicAdvIntervalMs:  reportRaw.periodicAdvInterval! * 1.25,
        directAddressType:      reportRaw.directAddressType!,
        directAddress:          reportRaw.directAddress!,
        data:                   reportRaw.data ?? null,
      };
    });

    for (const report of reports) {
      this.emit('ext-adv-report', report);
    }
  }
}
