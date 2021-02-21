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
      inquiry:                                                this.bitGet(params[0], 0),
      inquiryCancel:                                          this.bitGet(params[0], 1),
      periodicInquiryMode:                                    this.bitGet(params[0], 2),
      exitPeriodicInquiryMode:                                this.bitGet(params[0], 3),
      createConnection:                                       this.bitGet(params[0], 4),
      disconnect:                                             this.bitGet(params[0], 5),
      addScoConnection:                                       this.bitGet(params[0], 6),
      createConnectionCancel:                                 this.bitGet(params[0], 7),
      acceptConnectionRequest:                                this.bitGet(params[1], 0),
      rejectConnectionRequest:                                this.bitGet(params[1], 1),
      linkKeyRequestReply:                                    this.bitGet(params[1], 2),
      linkKeyRequestNegativeReply:                            this.bitGet(params[1], 3),
      pinCodeRequestReply:                                    this.bitGet(params[1], 4),
      pinCodeRequestNegativeReply:                            this.bitGet(params[1], 5),
      changeConnectionPacketType:                             this.bitGet(params[1], 6),
      authenticationRequested:                                this.bitGet(params[1], 7),
      setConnectionEncryption:                                this.bitGet(params[2], 0),
      changeConnectionLinkKey:                                this.bitGet(params[2], 1),
      masterLinkKey:                                          this.bitGet(params[2], 2),
      remoteNameRequest:                                      this.bitGet(params[2], 3),
      remoteNameRequestCancel:                                this.bitGet(params[2], 4),
      readRemoteSupportedFeatures:                            this.bitGet(params[2], 5),
      readRemoteExtendedFeatures:                             this.bitGet(params[2], 6),
      readRemoteVersionInformation:                           this.bitGet(params[2], 7),
      readClockOffset:                                        this.bitGet(params[3], 0),
      readLmpHandle:                                          this.bitGet(params[3], 1),
      holdMode:                                               this.bitGet(params[4], 1),
      sniffMode:                                              this.bitGet(params[4], 2),
      exitSniffMode:                                          this.bitGet(params[4], 3),
      qosSetup:                                               this.bitGet(params[4], 6),
      roleDiscovery:                                          this.bitGet(params[4], 7),
      switchRole:                                             this.bitGet(params[5], 0),
      readLinkPolicySettings:                                 this.bitGet(params[5], 1),
      writeLinkPolicySettings:                                this.bitGet(params[5], 2),
      readDefaultLinkPolicySettings:                          this.bitGet(params[5], 3),
      writeDefaultLinkPolicySettings:                         this.bitGet(params[5], 4),
      flowSpecification:                                      this.bitGet(params[5], 5),
      setEventMask:                                           this.bitGet(params[5], 6),
      reset:                                                  this.bitGet(params[5], 7),
      setEventFilter:                                         this.bitGet(params[6], 0),
      flush:                                                  this.bitGet(params[6], 1),
      readPinType:                                            this.bitGet(params[6], 2),
      writePinType:                                           this.bitGet(params[6], 3),
      readStoredLinkKey:                                      this.bitGet(params[6], 5),
      writeStoredLinkKey:                                     this.bitGet(params[6], 6),
      deleteStoredLinkKey:                                    this.bitGet(params[6], 7),
      writeLocalName:                                         this.bitGet(params[7], 0),
      readLocalName:                                          this.bitGet(params[7], 1),
      readConnectionAcceptTimeout:                            this.bitGet(params[7], 2),
      writeConnectionAcceptTimeout:                           this.bitGet(params[7], 3),
      readPageTimeout:                                        this.bitGet(params[7], 4),
      writePageTimeout:                                       this.bitGet(params[7], 5),
      readScanEnable:                                         this.bitGet(params[7], 6),
      writeScanEnable:                                        this.bitGet(params[7], 7),
      readPageScanActivity:                                   this.bitGet(params[8], 0),
      writePageScanActivity:                                  this.bitGet(params[8], 1),
      readInquiryScanActivity:                                this.bitGet(params[8], 2),
      writeInquiryScanActivity:                               this.bitGet(params[8], 3),
      readAuthenticationEnable:                               this.bitGet(params[8], 4),
      writeAuthenticationEnable:                              this.bitGet(params[8], 5),
      readEncryptionMode:                                     this.bitGet(params[8], 6),
      writeEncryptionMode:                                    this.bitGet(params[8], 7),
      readClassOfDevice:                                      this.bitGet(params[9], 0),
      writeClassOfDevice:                                     this.bitGet(params[9], 1),
      readVoiceSetting:                                       this.bitGet(params[9], 2),
      writeVoiceSetting:                                      this.bitGet(params[9], 3),
      readAutomaticFlushTimeout:                              this.bitGet(params[9], 4),
      writeAutomaticFlushTimeout:                             this.bitGet(params[9], 5),
      readNumBroadcastRetransmissions:                        this.bitGet(params[9], 6),
      writeNumBroadcastRetransmissions:                       this.bitGet(params[9], 7),
      readHoldModeActivity:                                   this.bitGet(params[10], 0),
      writeHoldModeActivity:                                  this.bitGet(params[10], 1),
      readTransmitPowerLevel:                                 this.bitGet(params[10], 2),
      readSynchronousFlowControlEnable:                       this.bitGet(params[10], 3),
      writeSynchronousFlowControlEnable:                      this.bitGet(params[10], 4),
      setControllerToHostFlowControl:                         this.bitGet(params[10], 5),
      hostBufferSize:                                         this.bitGet(params[10], 6),
      hostNumberOfCompletedPackets:                           this.bitGet(params[10], 7),
      readLinkSupervisionTimeout:                             this.bitGet(params[11], 0),
      writeLinkSupervisionTimeout:                            this.bitGet(params[11], 1),
      readNumberOfSupportedIac:                               this.bitGet(params[11], 2),
      readCurrentIacLap:                                      this.bitGet(params[11], 3),
      writeCurrentIacLap:                                     this.bitGet(params[11], 4),
      readPageScanModePeriod:                                 this.bitGet(params[11], 5),
      writePageScanModePeriod:                                this.bitGet(params[11], 6),
      readPageScanMode:                                       this.bitGet(params[11], 7),
      writePageScanMode:                                      this.bitGet(params[12], 0),
      setAfhHostChannelClassification:                        this.bitGet(params[12], 1),
      readInquiryScanType:                                    this.bitGet(params[12], 4),
      writeInquiryScanType:                                   this.bitGet(params[12], 5),
      readInquiryMode:                                        this.bitGet(params[12], 6),
      writeInquiryMode:                                       this.bitGet(params[12], 7),
      readPageScanType:                                       this.bitGet(params[13], 0),
      writePageScanType:                                      this.bitGet(params[13], 1),
      readAfhChannelAssessmentMode:                           this.bitGet(params[13], 2),
      writeAfhChannelAssessmentMode:                          this.bitGet(params[13], 3),
      readLocalVersionInformation:                            this.bitGet(params[14], 3),
      readLocalSupportedFeatures:                             this.bitGet(params[14], 5),
      readLocalExtendedFeatures:                              this.bitGet(params[14], 6),
      readBufferSize:                                         this.bitGet(params[14], 7),
      readCountryCode:                                        this.bitGet(params[15], 0),
      readBdAddr:                                             this.bitGet(params[15], 1),
      readFailedContactCounter:                               this.bitGet(params[15], 2),
      resetFailedContactCounter:                              this.bitGet(params[15], 3),
      readLinkQuality:                                        this.bitGet(params[15], 4),
      readRssi:                                               this.bitGet(params[15], 5),
      readAfhChannelMap:                                      this.bitGet(params[15], 6),
      readClock:                                              this.bitGet(params[15], 7),
      readLoopbackMode:                                       this.bitGet(params[16], 0),
      writeLoopbackMode:                                      this.bitGet(params[16], 1),
      enableDeviceUnderTestMode:                              this.bitGet(params[16], 2),
      setupSynchronousConnectionRequest:                      this.bitGet(params[16], 3),
      acceptSynchronousConnectionRequest:                     this.bitGet(params[16], 4),
      rejectSynchronousConnectionRequest:                     this.bitGet(params[16], 5),
      readExtendedInquiryResponse:                            this.bitGet(params[17], 0),
      writeExtendedInquiryResponse:                           this.bitGet(params[17], 1),
      refreshEncryptionKey:                                   this.bitGet(params[17], 2),
      sniffSubrating:                                         this.bitGet(params[17], 4),
      readSimplePairingMode:                                  this.bitGet(params[17], 5),
      writeSimplePairingMode:                                 this.bitGet(params[17], 6),
      readLocalOobData:                                       this.bitGet(params[17], 7),
      readInquiryResponseTransmitPowerLevel:                  this.bitGet(params[18], 0),
      writeInquiryTransmitPowerLevel:                         this.bitGet(params[18], 1),
      readDefaultErroneousDataReporting:                      this.bitGet(params[18], 2),
      writeDefaultErroneousDataReporting:                     this.bitGet(params[18], 3),
      ioCapabilityRequestReply:                               this.bitGet(params[18], 7),
      userConfirmationRequestReply:                           this.bitGet(params[19], 0),
      userConfirmationRequestNegativeReply:                   this.bitGet(params[19], 1),
      userPasskeyRequestReply:                                this.bitGet(params[19], 2),
      userPasskeyRequestNegativeReply:                        this.bitGet(params[19], 3),
      remoteOobDataRequestReply:                              this.bitGet(params[19], 4),
      writeSimplePairingDebugMode:                            this.bitGet(params[19], 5),
      enhancedFlush:                                          this.bitGet(params[19], 6),
      remoteOobDataRequestNegativeReply:                      this.bitGet(params[19], 7),
      sendKeypressNotification:                               this.bitGet(params[20], 2),
      ioCapabilityRequestNegativeReply:                       this.bitGet(params[20], 3),
      readEncryptionKeySize:                                  this.bitGet(params[20], 4),
      createPhysicalLink:                                     this.bitGet(params[21], 0),
      acceptPhysicalLink:                                     this.bitGet(params[21], 1),
      disconnectPhysicalLink:                                 this.bitGet(params[21], 2),
      createLogicalLink:                                      this.bitGet(params[21], 3),
      acceptLogicalLink:                                      this.bitGet(params[21], 4),
      disconnectLogicalLink:                                  this.bitGet(params[21], 5),
      logicalLinkCancel:                                      this.bitGet(params[21], 6),
      flowSpecModify:                                         this.bitGet(params[21], 7),
      readLogicalLinkAcceptTimeout:                           this.bitGet(params[22], 0),
      writeLogicalLinkAcceptTimeout:                          this.bitGet(params[22], 1),
      setEventMaskPage2:                                      this.bitGet(params[22], 2),
      readLocationData:                                       this.bitGet(params[22], 3),
      writeLocationData:                                      this.bitGet(params[22], 4),
      readLocalAmpInfo:                                       this.bitGet(params[22], 5),
      readLocalAmpAassoc:                                     this.bitGet(params[22], 6),
      writeRemoteAmpAssoc:                                    this.bitGet(params[22], 7),
      readFlowControlMode:                                    this.bitGet(params[23], 0),
      writeFlowControlMode:                                   this.bitGet(params[23], 1),
      readDataBlockSize:                                      this.bitGet(params[23], 2),
      enableAmpReceiverReports:                               this.bitGet(params[23], 5),
      ampTestEnd:                                             this.bitGet(params[23], 6),
      ampTest:                                                this.bitGet(params[23], 7),
      readEnhancedTransmitPowerLevel:                         this.bitGet(params[24], 0),
      readBestEffortFlushTimeout:                             this.bitGet(params[24], 2),
      writeBestEffortFlushTimeout:                            this.bitGet(params[24], 3),
      shortRangeMode:                                         this.bitGet(params[24], 4),
      readLeHostSupport:                                      this.bitGet(params[24], 5),
      writeLeHostSupport:                                     this.bitGet(params[24], 6),
      leSetEventMask:                                         this.bitGet(params[25], 0),
      leReadBufferSizeV1:                                     this.bitGet(params[25], 1),
      leReadLocalSupportedFeatures:                           this.bitGet(params[25], 2),
      leSetRandomAddress:                                     this.bitGet(params[25], 4),
      leSetAdvertisingParameters:                             this.bitGet(params[25], 5),
      leReadAdvertisingPhysicalChannelTxPower:                this.bitGet(params[25], 6),
      leSetAdvertisingData:                                   this.bitGet(params[25], 7),
      leSetScanResponseData:                                  this.bitGet(params[26], 0),
      leSetAdvertisingEnable:                                 this.bitGet(params[26], 1),
      leSetScanParameters:                                    this.bitGet(params[26], 2),
      leSetScanEnable:                                        this.bitGet(params[26], 3),
      leCreateConnection:                                     this.bitGet(params[26], 4),
      leCreateConnectionCancel:                               this.bitGet(params[26], 5),
      leReadWhiteListSize:                                    this.bitGet(params[26], 6),
      leClearWhiteList:                                       this.bitGet(params[26], 7),
      leAddDeviceToWhiteList:                                 this.bitGet(params[27], 0),
      leRemoveDeviceFromWhiteList:                            this.bitGet(params[27], 1),
      leConnectionUpdate:                                     this.bitGet(params[27], 2),
      leSetHostChannelClassification:                         this.bitGet(params[27], 3),
      leReadChannelMap:                                       this.bitGet(params[27], 4),
      leReadRemoteFeatures:                                   this.bitGet(params[27], 5),
      leEncrypt:                                              this.bitGet(params[27], 6),
      leRand:                                                 this.bitGet(params[27], 7),
      leEnableEncryption:                                     this.bitGet(params[28], 0),
      leLongTermKeyRequestReply:                              this.bitGet(params[28], 1),
      leLongTermKeyRequestNegativeReply:                      this.bitGet(params[28], 2),
      leReadSupportedStates:                                  this.bitGet(params[28], 3),
      leReceiverTestV1:                                       this.bitGet(params[28], 4),
      leTransmitterTestV1:                                    this.bitGet(params[28], 5),
      leTestEnd:                                              this.bitGet(params[28], 6),
      enhancedSetupSynchronousConnection:                     this.bitGet(params[29], 3),
      enhancedAcceptSynchronousConnection:                    this.bitGet(params[29], 4),
      readLocalSupportedCodecs:                               this.bitGet(params[29], 5),
      setMWSChannelParameters:                                this.bitGet(params[29], 6),
      setExternalFrameConfiguration:                          this.bitGet(params[29], 7),
      setMwsSignaling:                                        this.bitGet(params[30], 0),
      setMwsTransportLayer:                                   this.bitGet(params[30], 1),
      setMwsScanFrequencyTable:                               this.bitGet(params[30], 2),
      getMwsTransportLayerConfiguration:                      this.bitGet(params[30], 3),
      setMwsPatternConfiguration:                             this.bitGet(params[30], 4),
      setTriggeredClockCapture:                               this.bitGet(params[30], 5),
      truncatedPage:                                          this.bitGet(params[30], 6),
      truncatedPageCancel:                                    this.bitGet(params[30], 7),
      setConnectionlessSlaveBroadcast:                        this.bitGet(params[31], 0),
      setConnectionlessSlaveBroadcastReceive:                 this.bitGet(params[31], 1),
      startSynchronizationTrain:                              this.bitGet(params[31], 2),
      receiveSynchronizationTrain:                            this.bitGet(params[31], 3),
      setReservedLtAddr:                                      this.bitGet(params[31], 4),
      deleteReservedLtAddr:                                   this.bitGet(params[31], 5),
      setConnectionlessSlaveBroadcastData:                    this.bitGet(params[31], 6),
      readSynchronizationTrainParameters:                     this.bitGet(params[31], 7),
      writeSynchronizationTrainParameters:                    this.bitGet(params[32], 0),
      remoteOobExtendedDataRequestReply:                      this.bitGet(params[32], 1),
      readSecureConnectionsHostSupport:                       this.bitGet(params[32], 2),
      writeSecureConnectionsHostSupport:                      this.bitGet(params[32], 3),
      readAuthenticatedPayloadTimeout:                        this.bitGet(params[32], 4),
      writeAuthenticatedPayloadTimeout:                       this.bitGet(params[32], 5),
      readLocalOobExtendedData:                               this.bitGet(params[32], 6),
      writeSecureConnectionsTestMode:                         this.bitGet(params[32], 7),
      readExtendedPageTimeout:                                this.bitGet(params[33], 0),
      writeExtendedPageTimeout:                               this.bitGet(params[33], 1),
      readExtendedInquiryLength:                              this.bitGet(params[33], 2),
      writeExtendedInquiryLength:                             this.bitGet(params[33], 3),
      leRemoteConnectionParameterRequestReply:                this.bitGet(params[33], 4),
      leRemoteConnectionParameterRequestNegativeReply:        this.bitGet(params[33], 5),
      leSetDataLength:                                        this.bitGet(params[33], 6),
      leReadSuggestedDefaultDataLength:                       this.bitGet(params[33], 7),
      leWriteSuggestedDefaultDataLength:                      this.bitGet(params[34], 0),
      leReadLocalP256PublicKey:                               this.bitGet(params[34], 1),
      leGenerateDhKeyV1:                                      this.bitGet(params[34], 2),
      leAddDeviceToResolvingList:                             this.bitGet(params[34], 3),
      leRemoveDeviceFromResolvingList:                        this.bitGet(params[34], 4),
      leClearResolvingList:                                   this.bitGet(params[34], 5),
      leReadResolvingListSize:                                this.bitGet(params[34], 6),
      leReadPeerResolvableAddress:                            this.bitGet(params[34], 7),
      leReadLocalResolvableAddress:                           this.bitGet(params[35], 0),
      leSetAddressResolutionEnable:                           this.bitGet(params[35], 1),
      leSetResolvablePrivateAddressTimeout:                   this.bitGet(params[35], 2),
      leReadMaximumDataLength:                                this.bitGet(params[35], 3),
      leReadPhy:                                              this.bitGet(params[35], 4),
      leSetDefaultPhy:                                        this.bitGet(params[35], 5),
      leSetPhy:                                               this.bitGet(params[35], 6),
      leReceiverTestV2:                                       this.bitGet(params[35], 7),
      leTransmitterTestV2:                                    this.bitGet(params[36], 0),
      leSetAdvertisingSetRandomAddress:                       this.bitGet(params[36], 1),
      leSetExtendedAdvertisingParameters:                     this.bitGet(params[36], 2),
      leSetExtendedAdvertisingData:                           this.bitGet(params[36], 3),
      leSetExtendedScanResponseData:                          this.bitGet(params[36], 4),
      leSetExtendedAdvertisingEnable:                         this.bitGet(params[36], 5),
      leReadMaximumAdvertisingDataLength:                     this.bitGet(params[36], 6),
      leReadNumberOfSupportedAdvertisingSets:                 this.bitGet(params[36], 7),
      leRemoveAdvertisingSet:                                 this.bitGet(params[37], 0),
      leClearAdvertisingSets:                                 this.bitGet(params[37], 1),
      leSetPeriodicAdvertisingParameters:                     this.bitGet(params[37], 2),
      leSetPeriodicAdvertisingData:                           this.bitGet(params[37], 3),
      leSetPeriodicAdvertisingEnable:                         this.bitGet(params[37], 4),
      leSetExtendedScanParameters:                            this.bitGet(params[37], 5),
      leSetExtendedScanEnable:                                this.bitGet(params[37], 6),
      leExtendedCreateConnection:                             this.bitGet(params[37], 7),
      lePeriodicAdvertisingCreateSync:                        this.bitGet(params[38], 0),
      lePeriodicAdvertisingCreateSyncCancel:                  this.bitGet(params[38], 1),
      lePeriodicAdvertisingTerminateSync:                     this.bitGet(params[38], 2),
      leAddDeviceToPeriodicAdvertiserList:                    this.bitGet(params[38], 3),
      leRemoveDeviceFromPeriodicAdvertiserList:               this.bitGet(params[38], 4),
      leClearPeriodicAdvertiserList:                          this.bitGet(params[38], 5),
      leReadPeriodicAdvertiserListSize:                       this.bitGet(params[38], 6),
      leReadTransmitPower:                                    this.bitGet(params[38], 7),
      leReadRfPathCompensation:                               this.bitGet(params[39], 0),
      leWriteRfPathCompensation:                              this.bitGet(params[39], 1),
      leSetPrivacyMode:                                       this.bitGet(params[39], 2),
      leReceiverTestV3:                                       this.bitGet(params[39], 3),
      leTransmitterTestV3:                                    this.bitGet(params[39], 4),
      leSetConnectionlessCteTransmitParameters:               this.bitGet(params[39], 5),
      leSetConnectionlessCteTransmitEnable:                   this.bitGet(params[39], 6),
      leSetConnectionlessIqSamplingEnable:                    this.bitGet(params[39], 7),
      leSetConnectionCteReceiveParameters:                    this.bitGet(params[40], 0),
      leSetConnectionCteTransmitParameters:                   this.bitGet(params[40], 1),
      leConnectionCteRequestEnable:                           this.bitGet(params[40], 2),
      leConnectionCteResponseEnable:                          this.bitGet(params[40], 3),
      leReadAntennaInformation:                               this.bitGet(params[40], 4),
      leSetPeriodicAdvertisingReceiveEnable:                  this.bitGet(params[40], 5),
      lePeriodicAdvertisingSyncTransfer:                      this.bitGet(params[40], 6),
      lePeriodicAdvertisingSetInfoTransfer:                   this.bitGet(params[40], 7),
      leSetPeriodicAdvertisingSyncTransferParameters:         this.bitGet(params[41], 0),
      leSetDefaultPeriodicAdvertisingSyncTransferParameters:  this.bitGet(params[41], 1),
      leGenerateDhKeyV2:                                      this.bitGet(params[41], 2),
      readLocalSimplePairingOptions:                          this.bitGet(params[41], 3),
      leModifySleepClockAccuracy:                             this.bitGet(params[41], 4),
      leReadBufferSizeV2:                                     this.bitGet(params[41], 5),
      leReadIsoTxSync:                                        this.bitGet(params[41], 6),
      leSetCigParameters:                                     this.bitGet(params[41], 7),
      leSetCigParametersTest:                                 this.bitGet(params[42], 0),
      leCreateCis:                                            this.bitGet(params[42], 1),
      leRemoveCig:                                            this.bitGet(params[42], 2),
      leAcceptCisRequest:                                     this.bitGet(params[42], 3),
      leRejectCisRequest:                                     this.bitGet(params[42], 4),
      leCreateBig:                                            this.bitGet(params[42], 5),
      leCreateBigTest:                                        this.bitGet(params[42], 6),
      leTerminateBig:                                         this.bitGet(params[42], 7),
      leBigCreateSync:                                        this.bitGet(params[43], 0),
      leBigTerminateSync:                                     this.bitGet(params[43], 1),
      leRequestPeerSca:                                       this.bitGet(params[43], 2),
      leSetupIsoDataPath:                                     this.bitGet(params[43], 3),
      leRemoveIsoDataPath:                                    this.bitGet(params[43], 4),
      leIsoTransmitTest:                                      this.bitGet(params[43], 5),
      leIsoReceiveTest:                                       this.bitGet(params[43], 6),
      leIsoReadTestCounters:                                  this.bitGet(params[43], 7),
      leIsoTestEnd:                                           this.bitGet(params[44], 0),
      leSetHostFeature:                                       this.bitGet(params[44], 1),
      leReadIsoLinkQuality:                                   this.bitGet(params[44], 2),
      leEnhancedReadTransmitPowerLevel:                       this.bitGet(params[44], 3),
      leReadRemoteTransmitPowerLevel:                         this.bitGet(params[44], 4),
      leSetPathLossReportingParameters:                       this.bitGet(params[44], 5),
      leSetPathLossReportingEnable:                           this.bitGet(params[44], 6),
      leSetTransmitPowerReportingEnable:                      this.bitGet(params[44], 7),
      leTransmitterTestV4:                                    this.bitGet(params[45], 0),
      setEcosystemBaseInterval:                               this.bitGet(params[45], 1),
      readLocalSupportedCodecsV2:                             this.bitGet(params[45], 2),
      readLocalSupportedCodecCapabilities:                    this.bitGet(params[45], 3),
      readLocalSupportedControllerDelay:                      this.bitGet(params[45], 4),
      configureDataPath:                                      this.bitGet(params[45], 5),
    };
  }

  private bitGet(field: number, bit: number): boolean {
    return ((field >> bit) & 1) === 1;
  }

  private bigintBitGet(field: bigint, bit: bigint): boolean {
    return ((field >> bit) & 1n) === 1n;
  }

  private bigintBitSet(field: bigint, bit: bigint, set?: boolean): bigint {
    if (set === true) {
      field |= 1n << bit;
    }
    return field;
  }

  public async setEventMask(events: {
    inquiryComplete?: boolean,
    inquiryResult?: boolean,
    connectionComplete?: boolean,
    connectionRequest?: boolean,
    disconnectionComplete?: boolean,
    authenticationComplete?: boolean,
    remoteNameRequestComplete?: boolean,
    encryptionChange?: boolean,
    changeConnectionLinkKeyComplete?: boolean,
    masterLinkKeyComplete?: boolean,
    readRemoteSupportedFeaturesComplete?: boolean,
    readRemoteVersionInformationComplete?: boolean,
    qosSetupComplete?: boolean,
    hardwareError?: boolean,
    flushOccurred?: boolean,
    roleChange?: boolean,
    modeChange?: boolean,
    returnLinkKeys?: boolean,
    pinCodeRequest?: boolean,
    linkKeyRequest?: boolean,
    linkKeyNotification?: boolean,
    loopbackCommand?: boolean,
    dataBufferOverflow?: boolean,
    maxSlotsChange?: boolean,
    readClockOffsetComplete?: boolean,
    connectionPacketTypeChanged?: boolean,
    qosViolation?: boolean,
    pageScanModeChange?: boolean,
    pageScanRepetitionModeChange?: boolean,
    flowSpecificationComplete?: boolean,
    inquiryResultWithRssi?: boolean,
    readRemoteExtendedFeaturesComplete?: boolean,
    synchronousConnectionComplete?: boolean,
    synchronousConnectionChanged?: boolean,
    sniffSubrating?: boolean,
    extendedInquiryResult?: boolean,
    encryptionKeyRefreshComplete?: boolean,
    ioCapabilityRequest?: boolean,
    ioCapabilityResponse?: boolean,
    userConfirmationRequest?: boolean,
    userPasskeyRequest?: boolean,
    remoteOobDataRequest?: boolean,
    simplePairingComplete?: boolean,
    linkSupervisionTimeoutChanged?: boolean,
    enhancedFlushComplete?: boolean,
    userPasskeyNotification?: boolean,
    keypressNotification?: boolean,
    remoteHostSupportedFeaturesNotification?: boolean,
    leMeta?: boolean,
  } = {}): Promise<void> {
    let mask = 0n;
    mask = this.bigintBitSet(mask, 0n,  events.inquiryComplete);
    mask = this.bigintBitSet(mask, 1n,  events.inquiryResult);
    mask = this.bigintBitSet(mask, 2n,  events.connectionComplete);
    mask = this.bigintBitSet(mask, 3n,  events.connectionRequest);
    mask = this.bigintBitSet(mask, 4n,  events.disconnectionComplete);
    mask = this.bigintBitSet(mask, 5n,  events.authenticationComplete);
    mask = this.bigintBitSet(mask, 6n,  events.remoteNameRequestComplete);
    mask = this.bigintBitSet(mask, 7n,  events.encryptionChange);
    mask = this.bigintBitSet(mask, 8n,  events.changeConnectionLinkKeyComplete);
    mask = this.bigintBitSet(mask, 9n,  events.masterLinkKeyComplete);
    mask = this.bigintBitSet(mask, 10n, events.readRemoteSupportedFeaturesComplete);
    mask = this.bigintBitSet(mask, 11n, events.readRemoteVersionInformationComplete);
    mask = this.bigintBitSet(mask, 12n, events.qosSetupComplete);
    mask = this.bigintBitSet(mask, 15n, events.hardwareError);
    mask = this.bigintBitSet(mask, 16n, events.flushOccurred);
    mask = this.bigintBitSet(mask, 17n, events.roleChange);
    mask = this.bigintBitSet(mask, 19n, events.modeChange);
    mask = this.bigintBitSet(mask, 20n, events.returnLinkKeys);
    mask = this.bigintBitSet(mask, 21n, events.pinCodeRequest);
    mask = this.bigintBitSet(mask, 22n, events.linkKeyRequest);
    mask = this.bigintBitSet(mask, 23n, events.linkKeyNotification);
    mask = this.bigintBitSet(mask, 24n, events.loopbackCommand);
    mask = this.bigintBitSet(mask, 25n, events.dataBufferOverflow);
    mask = this.bigintBitSet(mask, 26n, events.maxSlotsChange);
    mask = this.bigintBitSet(mask, 27n, events.readClockOffsetComplete);
    mask = this.bigintBitSet(mask, 28n, events.connectionPacketTypeChanged);
    mask = this.bigintBitSet(mask, 29n, events.qosViolation);
    mask = this.bigintBitSet(mask, 30n, events.pageScanModeChange);
    mask = this.bigintBitSet(mask, 31n, events.pageScanRepetitionModeChange);
    mask = this.bigintBitSet(mask, 32n, events.flowSpecificationComplete);
    mask = this.bigintBitSet(mask, 33n, events.inquiryResultWithRssi);
    mask = this.bigintBitSet(mask, 34n, events.readRemoteExtendedFeaturesComplete);
    mask = this.bigintBitSet(mask, 43n, events.synchronousConnectionComplete);
    mask = this.bigintBitSet(mask, 44n, events.synchronousConnectionChanged);
    mask = this.bigintBitSet(mask, 45n, events.sniffSubrating);
    mask = this.bigintBitSet(mask, 46n, events.extendedInquiryResult);
    mask = this.bigintBitSet(mask, 47n, events.encryptionKeyRefreshComplete);
    mask = this.bigintBitSet(mask, 48n, events.ioCapabilityRequest);
    mask = this.bigintBitSet(mask, 49n, events.ioCapabilityResponse);
    mask = this.bigintBitSet(mask, 50n, events.userConfirmationRequest);
    mask = this.bigintBitSet(mask, 51n, events.userPasskeyRequest);
    mask = this.bigintBitSet(mask, 52n, events.remoteOobDataRequest);
    mask = this.bigintBitSet(mask, 53n, events.simplePairingComplete);
    mask = this.bigintBitSet(mask, 55n, events.linkSupervisionTimeoutChanged);
    mask = this.bigintBitSet(mask, 56n, events.enhancedFlushComplete);
    mask = this.bigintBitSet(mask, 58n, events.userPasskeyNotification);
    mask = this.bigintBitSet(mask, 59n, events.keypressNotification);
    mask = this.bigintBitSet(mask, 60n, events.remoteHostSupportedFeaturesNotification);
    mask = this.bigintBitSet(mask, 61n, events.leMeta);

    const payload = Buffer.allocUnsafe(8);
    payload.writeBigUInt64LE(mask, 0);

    const ocf = HciOcfControlAndBasebandCommands.SetEventMask;
    await this.cmd.controlAndBaseband({
      ocf, payload,
    });
  }

  public async setEventMaskPage2(events: {
    physicalLinkComplete?: boolean,
    channelSelected?: boolean,
    disconnectionPhysicalLinkComplete?: boolean,
    physicalLinkLossEarlyWarning?: boolean,
    physicalLinkRecovery?: boolean,
    logicalLinkComplete?: boolean,
    disconnectionLogicalLinkComplete?: boolean,
    flowSpecModifyComplete?: boolean,
    numberOfCompletedDataBlocks?: boolean,
    ampStartTest?: boolean,
    ampTestEnd?: boolean,
    ampReceiverReport?: boolean,
    shortRangeModeChangeComplete?: boolean,
    ampStatusChange?: boolean,
    triggeredClockCapture?: boolean,
    synchronizationTrainComplete?: boolean,
    synchronizationTrainReceived?: boolean,
    connectionlessSlaveBroadcastReceive?: boolean,
    connectionlessSlaveBroadcastTimeout?: boolean,
    truncatedPageComplete?: boolean,
    slavePageResponseTimeout?: boolean,
    connectionlessSlaveBroadcastChannelMapChange?: boolean,
    inquiryResponseNotification?: boolean,
    authenticatedPayloadTimeoutExpired?: boolean,
    samStatusChange?: boolean,
  } = {}): Promise<void> {
    let mask = 0n;
    mask = this.bigintBitSet(mask, 0n,   events.physicalLinkComplete);
    mask = this.bigintBitSet(mask, 1n,   events.channelSelected);
    mask = this.bigintBitSet(mask, 2n,   events.disconnectionPhysicalLinkComplete);
    mask = this.bigintBitSet(mask, 3n,   events.physicalLinkLossEarlyWarning);
    mask = this.bigintBitSet(mask, 4n,   events.physicalLinkRecovery);
    mask = this.bigintBitSet(mask, 5n,   events.logicalLinkComplete);
    mask = this.bigintBitSet(mask, 6n,   events.disconnectionLogicalLinkComplete);
    mask = this.bigintBitSet(mask, 7n,   events.flowSpecModifyComplete);
    mask = this.bigintBitSet(mask, 8n,   events.numberOfCompletedDataBlocks);
    mask = this.bigintBitSet(mask, 9n,   events.ampStartTest);
    mask = this.bigintBitSet(mask, 10n,  events.ampTestEnd);
    mask = this.bigintBitSet(mask, 11n,  events.ampReceiverReport);
    mask = this.bigintBitSet(mask, 12n,  events.shortRangeModeChangeComplete);
    mask = this.bigintBitSet(mask, 13n,  events.ampStatusChange);
    mask = this.bigintBitSet(mask, 14n,  events.triggeredClockCapture);
    mask = this.bigintBitSet(mask, 15n,  events.synchronizationTrainComplete);
    mask = this.bigintBitSet(mask, 16n,  events.synchronizationTrainReceived);
    mask = this.bigintBitSet(mask, 17n,  events.connectionlessSlaveBroadcastReceive);
    mask = this.bigintBitSet(mask, 18n,  events.connectionlessSlaveBroadcastTimeout);
    mask = this.bigintBitSet(mask, 19n,  events.truncatedPageComplete);
    mask = this.bigintBitSet(mask, 20n,  events.slavePageResponseTimeout);
    mask = this.bigintBitSet(mask, 21n,  events.connectionlessSlaveBroadcastChannelMapChange);
    mask = this.bigintBitSet(mask, 22n,  events.inquiryResponseNotification);
    mask = this.bigintBitSet(mask, 23n,  events.authenticatedPayloadTimeoutExpired);
    mask = this.bigintBitSet(mask, 24n,  events.samStatusChange);

    const payload = Buffer.allocUnsafe(8);
    payload.writeBigUInt64LE(mask, 0);

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

  public async leSetEventMask(events: {
    connectionComplete?:                      boolean,
    advertisingReport?:                       boolean,
    connectionUpdateComplete?:                boolean,
    readRemoteFeaturesComplete?:              boolean,
    longTermKeyRequest?:                      boolean,
    remoteConnectionParameterRequest?:        boolean,
    dataLengthChange?:                        boolean,
    readLocalP256PublicKeyComplete?:          boolean,
    generateDhKeyComplete?:                   boolean,
    enhancedConnectionComplete?:              boolean,
    directedAdvertisingReport?:               boolean,
    phyUpdateComplete?:                       boolean,
    extendedAdvertisingReport?:               boolean,
    periodicAdvertisingSyncEstablished?:      boolean,
    periodicAdvertisingReport?:               boolean,
    periodicAdvertisingSyncLost?:             boolean,
    scanTimeout?:                             boolean,
    advertisingSetTerminated?:                boolean,
    scanRequestReceived?:                     boolean,
    channelSelectionAlgorithm?:               boolean,
    connectionlessIqReport?:                  boolean,
    connectionIqReport?:                      boolean,
    cteRequestFailed?:                        boolean,
    periodicAdvertisingSyncTransferReceived?: boolean,
    cisEstablished?:                          boolean,
    cisRequest?:                              boolean,
    createBigComplete?:                       boolean,
    terminateBigComplete?:                    boolean,
    bigSyncEstablished?:                      boolean,
    bigSyncLost?:                             boolean,
    requestPeerScaComplete?:                  boolean,
    pathLossThreshold?:                       boolean,
    transmitPowerReporting?:                  boolean,
    bigInfoAdvertisingReport?:                boolean,
  } = {}): Promise<void> {
    let mask = 0n;
    mask = this.bigintBitSet(mask, 0n,   events.connectionComplete);
    mask = this.bigintBitSet(mask, 1n,   events.advertisingReport);
    mask = this.bigintBitSet(mask, 2n,   events.connectionUpdateComplete);
    mask = this.bigintBitSet(mask, 3n,   events.readRemoteFeaturesComplete);
    mask = this.bigintBitSet(mask, 4n,   events.longTermKeyRequest);
    mask = this.bigintBitSet(mask, 5n,   events.remoteConnectionParameterRequest);
    mask = this.bigintBitSet(mask, 6n,   events.dataLengthChange);
    mask = this.bigintBitSet(mask, 7n,   events.readLocalP256PublicKeyComplete);
    mask = this.bigintBitSet(mask, 8n,   events.generateDhKeyComplete);
    mask = this.bigintBitSet(mask, 9n,   events.enhancedConnectionComplete);
    mask = this.bigintBitSet(mask, 10n,  events.directedAdvertisingReport);
    mask = this.bigintBitSet(mask, 11n,  events.phyUpdateComplete);
    mask = this.bigintBitSet(mask, 12n,  events.extendedAdvertisingReport);
    mask = this.bigintBitSet(mask, 13n,  events.periodicAdvertisingSyncEstablished);
    mask = this.bigintBitSet(mask, 14n,  events.periodicAdvertisingReport);
    mask = this.bigintBitSet(mask, 15n,  events.periodicAdvertisingSyncLost);
    mask = this.bigintBitSet(mask, 16n,  events.scanTimeout);
    mask = this.bigintBitSet(mask, 17n,  events.advertisingSetTerminated);
    mask = this.bigintBitSet(mask, 18n,  events.scanRequestReceived);
    mask = this.bigintBitSet(mask, 19n,  events.channelSelectionAlgorithm);
    mask = this.bigintBitSet(mask, 20n,  events.connectionlessIqReport);
    mask = this.bigintBitSet(mask, 21n,  events.connectionIqReport);
    mask = this.bigintBitSet(mask, 22n,  events.cteRequestFailed);
    mask = this.bigintBitSet(mask, 23n,  events.periodicAdvertisingSyncTransferReceived);
    mask = this.bigintBitSet(mask, 24n,  events.cisEstablished);
    mask = this.bigintBitSet(mask, 25n,  events.cisRequest);
    mask = this.bigintBitSet(mask, 26n,  events.createBigComplete);
    mask = this.bigintBitSet(mask, 27n,  events.terminateBigComplete);
    mask = this.bigintBitSet(mask, 28n,  events.bigSyncEstablished);
    mask = this.bigintBitSet(mask, 29n,  events.bigSyncLost);
    mask = this.bigintBitSet(mask, 30n,  events.requestPeerScaComplete);
    mask = this.bigintBitSet(mask, 31n,  events.pathLossThreshold);
    mask = this.bigintBitSet(mask, 32n,  events.transmitPowerReporting);
    mask = this.bigintBitSet(mask, 33n,  events.bigInfoAdvertisingReport);

    const payload = Buffer.allocUnsafe(8);
    payload.writeBigUInt64LE(mask, 0);
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

  public async leReadLocalSupportedFeatures() {
    const ocf = HciOcfLeControllerCommands.ReadLocalSupportedFeatures;
    const result = await this.cmd.leController({ ocf });
    const params = result.returnParameters;
    if (!params || params.length < (64/8)) {
      throw makeParserError(HciParserError.InvalidPayloadSize);
    }

    const mask = params.readBigUInt64LE(0);
    return {
      leEncryption:                               this.bigintBitGet(mask, 0n),
      connectionParametersRequestProcedure:       this.bigintBitGet(mask, 1n),
      extendedRejectIndication:                   this.bigintBitGet(mask, 2n),
      slaveInitiatedFeaturesExchange:             this.bigintBitGet(mask, 3n),
      lePing:                                     this.bigintBitGet(mask, 4n),
      leDataPacketLengthExtension:                this.bigintBitGet(mask, 5n),
      llPrivacy:                                  this.bigintBitGet(mask, 6n),
      extendedScannerFilterPolicies:              this.bigintBitGet(mask, 7n),
      le2mPhy:                                    this.bigintBitGet(mask, 8n),
      stableModulationIndexTransmitter:           this.bigintBitGet(mask, 9n),
      stableModulationIndexReceiver:              this.bigintBitGet(mask, 10n),
      leCodedPhy:                                 this.bigintBitGet(mask, 11n),
      leExtendedAdvertising:                      this.bigintBitGet(mask, 12n),
      lePeriodicAdvertising:                      this.bigintBitGet(mask, 13n),
      channelSelectionAlgorithmV2:                this.bigintBitGet(mask, 14n),
      lePowerClass1:                              this.bigintBitGet(mask, 15n),
      minimumNumberOfUsedChannelsProcedure:       this.bigintBitGet(mask, 16n),
      connectionCteRequest:                       this.bigintBitGet(mask, 17n),
      connectionCteResponse:                      this.bigintBitGet(mask, 18n),
      connectionlessCteTransmitter:               this.bigintBitGet(mask, 19n),
      connectionlessCteReceiver:                  this.bigintBitGet(mask, 20n),
      antennaSwitchingDuringCteTransmission:      this.bigintBitGet(mask, 21n),
      antennaSwitchingDuringCteReception:         this.bigintBitGet(mask, 22n),
      receivingConstantToneExtensions:            this.bigintBitGet(mask, 23n),
      periodicAdvertisingSyncTransferSender:      this.bigintBitGet(mask, 24n),
      periodicAdvertisingSyncTransferRecipient:   this.bigintBitGet(mask, 25n),
      sleepClockAccuracyUpdates:                  this.bigintBitGet(mask, 26n),
      remotePublicKeyValidation:                  this.bigintBitGet(mask, 27n),
      connectedIsochronousStreamMaster:           this.bigintBitGet(mask, 28n),
      connectedIsochronousStreamSlave:            this.bigintBitGet(mask, 29n),
      isochronousBroadcaster:                     this.bigintBitGet(mask, 30n),
      synchronizedReceiver:                       this.bigintBitGet(mask, 31n),
      isochronousChannels:                        this.bigintBitGet(mask, 32n),
      lePowerControlRequest:                      this.bigintBitGet(mask, 33n),
      lePowerChangeIndication:                    this.bigintBitGet(mask, 34n),
      lePathLossMonitoring:                       this.bigintBitGet(mask, 35n),
    };
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
