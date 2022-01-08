import { Address } from "../utils/Address";
import { HciParserError, makeParserError } from "./HciError";
import { bitGet } from "../utils/Utils";

export interface LocalSupportedFeatures {
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

export class ReadLocalSupportedFeatures {
  static outParams(params?: Buffer): LocalSupportedFeatures {
    if (!params || params.length < (64/8)) {
      throw makeParserError(HciParserError.InvalidPayloadSize);
    }
    const features = params.readBigUInt64LE(0);
    return {
      threeSlotPackets:                     bitGet(features, 0n),
      fiveSlotPackets:                      bitGet(features, 1n),
      encryption:                           bitGet(features, 2n),
      slotOffset:                           bitGet(features, 3n),
      timingAccuracy:                       bitGet(features, 4n),
      roleSwitch:                           bitGet(features, 5n),
      holdMode:                             bitGet(features, 6n),
      sniffMode:                            bitGet(features, 7n),
      powerControlRequests:                 bitGet(features, 9n),
      channelQualityDrivenDataRate:         bitGet(features, 10n),
      scolink:                              bitGet(features, 11n),
      hv2packets:                           bitGet(features, 12n),
      hv3packets:                           bitGet(features, 13n),
      microLawLogSynchronousData:           bitGet(features, 14n),
      aLawLogSynchronousData:               bitGet(features, 15n),
      cvsSynchronousData:                   bitGet(features, 16n),
      pagingParameterNegotiation:           bitGet(features, 17n),
      powerControl:                         bitGet(features, 18n),
      transparentSynchronousData:           bitGet(features, 19n),
      flowControlLagLsb:                    bitGet(features, 20n),
      flowControlLagMiddleBit:              bitGet(features, 21n),
      flowControlLagMsb:                    bitGet(features, 22n),
      broadcastEncryption:                  bitGet(features, 23n),
      enhancedDataRateAcl2MbpsMode:         bitGet(features, 25n),
      enhancedDataRateAcl3MbpsMode:         bitGet(features, 26n),
      enhancedInquiryScan:                  bitGet(features, 27n),
      interlacedInquiryScan:                bitGet(features, 28n),
      interlacedPageScan:                   bitGet(features, 29n),
      rssiWithInquiryResults:               bitGet(features, 30n),
      extendedScoLinkEv3Packets:            bitGet(features, 31n),
      ev4Packets:                           bitGet(features, 32n),
      ev5Packets:                           bitGet(features, 33n),
      afhCapableSlave:                      bitGet(features, 35n),
      afhClassificationSlave:               bitGet(features, 36n),
      brEdrNotSupported:                    bitGet(features, 37n),
      leSupported:                          bitGet(features, 38n),
      threeSlotEnhancedDataRateAclPackets:  bitGet(features, 39n),
      fiveSlotEnhancedDataRateAclPackets:   bitGet(features, 40n),
      sniffSubrating:                       bitGet(features, 41n),
      pauseEncryption:                      bitGet(features, 42n),
      afhCapableMaster:                     bitGet(features, 43n),
      afhClassificationMaster:              bitGet(features, 44n),
      enhancedDataRateESco2MbpsMode:        bitGet(features, 45n),
      enhancedDataRateESco3MbpsMode:        bitGet(features, 46n),
      threeSlotEnhancedDataRateEScoPackets: bitGet(features, 47n),
      extendedInquiryResponse:              bitGet(features, 48n),
      simultaneousLeAndBrEdr:               bitGet(features, 49n),
      secureSimplePairing:                  bitGet(features, 51n),
      encapsulatedPdu:                      bitGet(features, 52n),
      erroneousDataReporting:               bitGet(features, 53n),
      nonFlushablePacketBoundaryFlag:       bitGet(features, 54n),
      linkSupervisionTimeoutChangedEvent:   bitGet(features, 56n),
      variableInquiryTxPowerLevel:          bitGet(features, 57n),
      enhancedPowerControl:                 bitGet(features, 58n),
      extendedFeatures:                     bitGet(features, 63n),
    };
  }
}

export interface LocalVersionInformation {
  hciVersion:       number;
  hciRevision:      number;
  lmpPalVersion:    number;
  lmpPalSubversion: number;
  manufacturerName: number;
}

export class ReadLocalVersionInformation {
  static outParams(params?: Buffer): LocalVersionInformation {
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
}

export interface BufferSize {
  aclDataPacketLength:            number;
  synchronousDataPacketLength:    number;
  totalNumAclDataPackets:         number;
  totalNumSynchronousDataPackets: number;
}

export class ReadBufferSize {
  static outParams(params?: Buffer): BufferSize {
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
}

export class ReadBdAddr {
  static outParams(params?: Buffer): Address {
    if (!params || params.length < 6) {
      throw makeParserError(HciParserError.InvalidPayloadSize);
    }
    return Address.from(params.readUIntLE(0, 6));
  }
}

export interface LocalSupportedCommands {
  inquiry:                                                boolean;
  inquiryCancel:                                          boolean;
  periodicInquiryMode:                                    boolean;
  exitPeriodicInquiryMode:                                boolean;
  createConnection:                                       boolean;
  disconnect:                                             boolean;
  addScoConnection:                                       boolean;
  createConnectionCancel:                                 boolean;
  acceptConnectionRequest:                                boolean;
  rejectConnectionRequest:                                boolean;
  linkKeyRequestReply:                                    boolean;
  linkKeyRequestNegativeReply:                            boolean;
  pinCodeRequestReply:                                    boolean;
  pinCodeRequestNegativeReply:                            boolean;
  changeConnectionPacketType:                             boolean;
  authenticationRequested:                                boolean;
  setConnectionEncryption:                                boolean;
  changeConnectionLinkKey:                                boolean;
  masterLinkKey:                                          boolean;
  remoteNameRequest:                                      boolean;
  remoteNameRequestCancel:                                boolean;
  readRemoteSupportedFeatures:                            boolean;
  readRemoteExtendedFeatures:                             boolean;
  readRemoteVersionInformation:                           boolean;
  readClockOffset:                                        boolean;
  readLmpHandle:                                          boolean;
  holdMode:                                               boolean;
  sniffMode:                                              boolean;
  exitSniffMode:                                          boolean;
  qosSetup:                                               boolean;
  roleDiscovery:                                          boolean;
  switchRole:                                             boolean;
  readLinkPolicySettings:                                 boolean;
  writeLinkPolicySettings:                                boolean;
  readDefaultLinkPolicySettings:                          boolean;
  writeDefaultLinkPolicySettings:                         boolean;
  flowSpecification:                                      boolean;
  setEventMask:                                           boolean;
  reset:                                                  boolean;
  setEventFilter:                                         boolean;
  flush:                                                  boolean;
  readPinType:                                            boolean;
  writePinType:                                           boolean;
  readStoredLinkKey:                                      boolean;
  writeStoredLinkKey:                                     boolean;
  deleteStoredLinkKey:                                    boolean;
  writeLocalName:                                         boolean;
  readLocalName:                                          boolean;
  readConnectionAcceptTimeout:                            boolean;
  writeConnectionAcceptTimeout:                           boolean;
  readPageTimeout:                                        boolean;
  writePageTimeout:                                       boolean;
  readScanEnable:                                         boolean;
  writeScanEnable:                                        boolean;
  readPageScanActivity:                                   boolean;
  writePageScanActivity:                                  boolean;
  readInquiryScanActivity:                                boolean;
  writeInquiryScanActivity:                               boolean;
  readAuthenticationEnable:                               boolean;
  writeAuthenticationEnable:                              boolean;
  readEncryptionMode:                                     boolean;
  writeEncryptionMode:                                    boolean;
  readClassOfDevice:                                      boolean;
  writeClassOfDevice:                                     boolean;
  readVoiceSetting:                                       boolean;
  writeVoiceSetting:                                      boolean;
  readAutomaticFlushTimeout:                              boolean;
  writeAutomaticFlushTimeout:                             boolean;
  readNumBroadcastRetransmissions:                        boolean;
  writeNumBroadcastRetransmissions:                       boolean;
  readHoldModeActivity:                                   boolean;
  writeHoldModeActivity:                                  boolean;
  readTransmitPowerLevel:                                 boolean;
  readSynchronousFlowControlEnable:                       boolean;
  writeSynchronousFlowControlEnable:                      boolean;
  setControllerToHostFlowControl:                         boolean;
  hostBufferSize:                                         boolean;
  hostNumberOfCompletedPackets:                           boolean;
  readLinkSupervisionTimeout:                             boolean;
  writeLinkSupervisionTimeout:                            boolean;
  readNumberOfSupportedIac:                               boolean;
  readCurrentIacLap:                                      boolean;
  writeCurrentIacLap:                                     boolean;
  readPageScanModePeriod:                                 boolean;
  writePageScanModePeriod:                                boolean;
  readPageScanMode:                                       boolean;
  writePageScanMode:                                      boolean;
  setAfhHostChannelClassification:                        boolean;
  readInquiryScanType:                                    boolean;
  writeInquiryScanType:                                   boolean;
  readInquiryMode:                                        boolean;
  writeInquiryMode:                                       boolean;
  readPageScanType:                                       boolean;
  writePageScanType:                                      boolean;
  readAfhChannelAssessmentMode:                           boolean;
  writeAfhChannelAssessmentMode:                          boolean;
  readLocalVersionInformation:                            boolean;
  readLocalSupportedFeatures:                             boolean;
  readLocalExtendedFeatures:                              boolean;
  readBufferSize:                                         boolean;
  readCountryCode:                                        boolean;
  readBdAddr:                                             boolean;
  readFailedContactCounter:                               boolean;
  resetFailedContactCounter:                              boolean;
  readLinkQuality:                                        boolean;
  readRssi:                                               boolean;
  readAfhChannelMap:                                      boolean;
  readClock:                                              boolean;
  readLoopbackMode:                                       boolean;
  writeLoopbackMode:                                      boolean;
  enableDeviceUnderTestMode:                              boolean;
  setupSynchronousConnectionRequest:                      boolean;
  acceptSynchronousConnectionRequest:                     boolean;
  rejectSynchronousConnectionRequest:                     boolean;
  readExtendedInquiryResponse:                            boolean;
  writeExtendedInquiryResponse:                           boolean;
  refreshEncryptionKey:                                   boolean;
  sniffSubrating:                                         boolean;
  readSimplePairingMode:                                  boolean;
  writeSimplePairingMode:                                 boolean;
  readLocalOobData:                                       boolean;
  readInquiryResponseTransmitPowerLevel:                  boolean;
  writeInquiryTransmitPowerLevel:                         boolean;
  readDefaultErroneousDataReporting:                      boolean;
  writeDefaultErroneousDataReporting:                     boolean;
  ioCapabilityRequestReply:                               boolean;
  userConfirmationRequestReply:                           boolean;
  userConfirmationRequestNegativeReply:                   boolean;
  userPasskeyRequestReply:                                boolean;
  userPasskeyRequestNegativeReply:                        boolean;
  remoteOobDataRequestReply:                              boolean;
  writeSimplePairingDebugMode:                            boolean;
  enhancedFlush:                                          boolean;
  remoteOobDataRequestNegativeReply:                      boolean;
  sendKeypressNotification:                               boolean;
  ioCapabilityRequestNegativeReply:                       boolean;
  readEncryptionKeySize:                                  boolean;
  createPhysicalLink:                                     boolean;
  acceptPhysicalLink:                                     boolean;
  disconnectPhysicalLink:                                 boolean;
  createLogicalLink:                                      boolean;
  acceptLogicalLink:                                      boolean;
  disconnectLogicalLink:                                  boolean;
  logicalLinkCancel:                                      boolean;
  flowSpecModify:                                         boolean;
  readLogicalLinkAcceptTimeout:                           boolean;
  writeLogicalLinkAcceptTimeout:                          boolean;
  setEventMaskPage2:                                      boolean;
  readLocationData:                                       boolean;
  writeLocationData:                                      boolean;
  readLocalAmpInfo:                                       boolean;
  readLocalAmpAassoc:                                     boolean;
  writeRemoteAmpAssoc:                                    boolean;
  readFlowControlMode:                                    boolean;
  writeFlowControlMode:                                   boolean;
  readDataBlockSize:                                      boolean;
  enableAmpReceiverReports:                               boolean;
  ampTestEnd:                                             boolean;
  ampTest:                                                boolean;
  readEnhancedTransmitPowerLevel:                         boolean;
  readBestEffortFlushTimeout:                             boolean;
  writeBestEffortFlushTimeout:                            boolean;
  shortRangeMode:                                         boolean;
  readLeHostSupport:                                      boolean;
  writeLeHostSupport:                                     boolean;
  leSetEventMask:                                         boolean;
  leReadBufferSizeV1:                                     boolean;
  leReadLocalSupportedFeatures:                           boolean;
  leSetRandomAddress:                                     boolean;
  leSetAdvertisingParameters:                             boolean;
  leReadAdvertisingPhysicalChannelTxPower:                boolean;
  leSetAdvertisingData:                                   boolean;
  leSetScanResponseData:                                  boolean;
  leSetAdvertisingEnable:                                 boolean;
  leSetScanParameters:                                    boolean;
  leSetScanEnable:                                        boolean;
  leCreateConnection:                                     boolean;
  leCreateConnectionCancel:                               boolean;
  leReadWhiteListSize:                                    boolean;
  leClearWhiteList:                                       boolean;
  leAddDeviceToWhiteList:                                 boolean;
  leRemoveDeviceFromWhiteList:                            boolean;
  leConnectionUpdate:                                     boolean;
  leSetHostChannelClassification:                         boolean;
  leReadChannelMap:                                       boolean;
  leReadRemoteFeatures:                                   boolean;
  leEncrypt:                                              boolean;
  leRand:                                                 boolean;
  leEnableEncryption:                                     boolean;
  leLongTermKeyRequestReply:                              boolean;
  leLongTermKeyRequestNegativeReply:                      boolean;
  leReadSupportedStates:                                  boolean;
  leReceiverTestV1:                                       boolean;
  leTransmitterTestV1:                                    boolean;
  leTestEnd:                                              boolean;
  enhancedSetupSynchronousConnection:                     boolean;
  enhancedAcceptSynchronousConnection:                    boolean;
  readLocalSupportedCodecs:                               boolean;
  setMWSChannelParameters:                                boolean;
  setExternalFrameConfiguration:                          boolean;
  setMwsSignaling:                                        boolean;
  setMwsTransportLayer:                                   boolean;
  setMwsScanFrequencyTable:                               boolean;
  getMwsTransportLayerConfiguration:                      boolean;
  setMwsPatternConfiguration:                             boolean;
  setTriggeredClockCapture:                               boolean;
  truncatedPage:                                          boolean;
  truncatedPageCancel:                                    boolean;
  setConnectionlessSlaveBroadcast:                        boolean;
  setConnectionlessSlaveBroadcastReceive:                 boolean;
  startSynchronizationTrain:                              boolean;
  receiveSynchronizationTrain:                            boolean;
  setReservedLtAddr:                                      boolean;
  deleteReservedLtAddr:                                   boolean;
  setConnectionlessSlaveBroadcastData:                    boolean;
  readSynchronizationTrainParameters:                     boolean;
  writeSynchronizationTrainParameters:                    boolean;
  remoteOobExtendedDataRequestReply:                      boolean;
  readSecureConnectionsHostSupport:                       boolean;
  writeSecureConnectionsHostSupport:                      boolean;
  readAuthenticatedPayloadTimeout:                        boolean;
  writeAuthenticatedPayloadTimeout:                       boolean;
  readLocalOobExtendedData:                               boolean;
  writeSecureConnectionsTestMode:                         boolean;
  readExtendedPageTimeout:                                boolean;
  writeExtendedPageTimeout:                               boolean;
  readExtendedInquiryLength:                              boolean;
  writeExtendedInquiryLength:                             boolean;
  leRemoteConnectionParameterRequestReply:                boolean;
  leRemoteConnectionParameterRequestNegativeReply:        boolean;
  leSetDataLength:                                        boolean;
  leReadSuggestedDefaultDataLength:                       boolean;
  leWriteSuggestedDefaultDataLength:                      boolean;
  leReadLocalP256PublicKey:                               boolean;
  leGenerateDhKeyV1:                                      boolean;
  leAddDeviceToResolvingList:                             boolean;
  leRemoveDeviceFromResolvingList:                        boolean;
  leClearResolvingList:                                   boolean;
  leReadResolvingListSize:                                boolean;
  leReadPeerResolvableAddress:                            boolean;
  leReadLocalResolvableAddress:                           boolean;
  leSetAddressResolutionEnable:                           boolean;
  leSetResolvablePrivateAddressTimeout:                   boolean;
  leReadMaximumDataLength:                                boolean;
  leReadPhy:                                              boolean;
  leSetDefaultPhy:                                        boolean;
  leSetPhy:                                               boolean;
  leReceiverTestV2:                                       boolean;
  leTransmitterTestV2:                                    boolean;
  leSetAdvertisingSetRandomAddress:                       boolean;
  leSetExtendedAdvertisingParameters:                     boolean;
  leSetExtendedAdvertisingData:                           boolean;
  leSetExtendedScanResponseData:                          boolean;
  leSetExtendedAdvertisingEnable:                         boolean;
  leReadMaximumAdvertisingDataLength:                     boolean;
  leReadNumberOfSupportedAdvertisingSets:                 boolean;
  leRemoveAdvertisingSet:                                 boolean;
  leClearAdvertisingSets:                                 boolean;
  leSetPeriodicAdvertisingParameters:                     boolean;
  leSetPeriodicAdvertisingData:                           boolean;
  leSetPeriodicAdvertisingEnable:                         boolean;
  leSetExtendedScanParameters:                            boolean;
  leSetExtendedScanEnable:                                boolean;
  leExtendedCreateConnection:                             boolean;
  lePeriodicAdvertisingCreateSync:                        boolean;
  lePeriodicAdvertisingCreateSyncCancel:                  boolean;
  lePeriodicAdvertisingTerminateSync:                     boolean;
  leAddDeviceToPeriodicAdvertiserList:                    boolean;
  leRemoveDeviceFromPeriodicAdvertiserList:               boolean;
  leClearPeriodicAdvertiserList:                          boolean;
  leReadPeriodicAdvertiserListSize:                       boolean;
  leReadTransmitPower:                                    boolean;
  leReadRfPathCompensation:                               boolean;
  leWriteRfPathCompensation:                              boolean;
  leSetPrivacyMode:                                       boolean;
  leReceiverTestV3:                                       boolean;
  leTransmitterTestV3:                                    boolean;
  leSetConnectionlessCteTransmitParameters:               boolean;
  leSetConnectionlessCteTransmitEnable:                   boolean;
  leSetConnectionlessIqSamplingEnable:                    boolean;
  leSetConnectionCteReceiveParameters:                    boolean;
  leSetConnectionCteTransmitParameters:                   boolean;
  leConnectionCteRequestEnable:                           boolean;
  leConnectionCteResponseEnable:                          boolean;
  leReadAntennaInformation:                               boolean;
  leSetPeriodicAdvertisingReceiveEnable:                  boolean;
  lePeriodicAdvertisingSyncTransfer:                      boolean;
  lePeriodicAdvertisingSetInfoTransfer:                   boolean;
  leSetPeriodicAdvertisingSyncTransferParameters:         boolean;
  leSetDefaultPeriodicAdvertisingSyncTransferParameters:  boolean;
  leGenerateDhKeyV2:                                      boolean;
  readLocalSimplePairingOptions:                          boolean;
  leModifySleepClockAccuracy:                             boolean;
  leReadBufferSizeV2:                                     boolean;
  leReadIsoTxSync:                                        boolean;
  leSetCigParameters:                                     boolean;
  leSetCigParametersTest:                                 boolean;
  leCreateCis:                                            boolean;
  leRemoveCig:                                            boolean;
  leAcceptCisRequest:                                     boolean;
  leRejectCisRequest:                                     boolean;
  leCreateBig:                                            boolean;
  leCreateBigTest:                                        boolean;
  leTerminateBig:                                         boolean;
  leBigCreateSync:                                        boolean;
  leBigTerminateSync:                                     boolean;
  leRequestPeerSca:                                       boolean;
  leSetupIsoDataPath:                                     boolean;
  leRemoveIsoDataPath:                                    boolean;
  leIsoTransmitTest:                                      boolean;
  leIsoReceiveTest:                                       boolean;
  leIsoReadTestCounters:                                  boolean;
  leIsoTestEnd:                                           boolean;
  leSetHostFeature:                                       boolean;
  leReadIsoLinkQuality:                                   boolean;
  leEnhancedReadTransmitPowerLevel:                       boolean;
  leReadRemoteTransmitPowerLevel:                         boolean;
  leSetPathLossReportingParameters:                       boolean;
  leSetPathLossReportingEnable:                           boolean;
  leSetTransmitPowerReportingEnable:                      boolean;
  leTransmitterTestV4:                                    boolean;
  setEcosystemBaseInterval:                               boolean;
  readLocalSupportedCodecsV2:                             boolean;
  readLocalSupportedCodecCapabilities:                    boolean;
  readLocalSupportedControllerDelay:                      boolean;
  configureDataPath:                                      boolean;
}

export class ReadLocalSupportedCommands {
  static outParams(params?: Buffer): LocalSupportedCommands {
    if (!params || params.length < 64) {
      throw makeParserError(HciParserError.InvalidPayloadSize);
    }
    return {
      inquiry:                                                bitGet(params[0], 0),
      inquiryCancel:                                          bitGet(params[0], 1),
      periodicInquiryMode:                                    bitGet(params[0], 2),
      exitPeriodicInquiryMode:                                bitGet(params[0], 3),
      createConnection:                                       bitGet(params[0], 4),
      disconnect:                                             bitGet(params[0], 5),
      addScoConnection:                                       bitGet(params[0], 6),
      createConnectionCancel:                                 bitGet(params[0], 7),
      acceptConnectionRequest:                                bitGet(params[1], 0),
      rejectConnectionRequest:                                bitGet(params[1], 1),
      linkKeyRequestReply:                                    bitGet(params[1], 2),
      linkKeyRequestNegativeReply:                            bitGet(params[1], 3),
      pinCodeRequestReply:                                    bitGet(params[1], 4),
      pinCodeRequestNegativeReply:                            bitGet(params[1], 5),
      changeConnectionPacketType:                             bitGet(params[1], 6),
      authenticationRequested:                                bitGet(params[1], 7),
      setConnectionEncryption:                                bitGet(params[2], 0),
      changeConnectionLinkKey:                                bitGet(params[2], 1),
      masterLinkKey:                                          bitGet(params[2], 2),
      remoteNameRequest:                                      bitGet(params[2], 3),
      remoteNameRequestCancel:                                bitGet(params[2], 4),
      readRemoteSupportedFeatures:                            bitGet(params[2], 5),
      readRemoteExtendedFeatures:                             bitGet(params[2], 6),
      readRemoteVersionInformation:                           bitGet(params[2], 7),
      readClockOffset:                                        bitGet(params[3], 0),
      readLmpHandle:                                          bitGet(params[3], 1),
      holdMode:                                               bitGet(params[4], 1),
      sniffMode:                                              bitGet(params[4], 2),
      exitSniffMode:                                          bitGet(params[4], 3),
      qosSetup:                                               bitGet(params[4], 6),
      roleDiscovery:                                          bitGet(params[4], 7),
      switchRole:                                             bitGet(params[5], 0),
      readLinkPolicySettings:                                 bitGet(params[5], 1),
      writeLinkPolicySettings:                                bitGet(params[5], 2),
      readDefaultLinkPolicySettings:                          bitGet(params[5], 3),
      writeDefaultLinkPolicySettings:                         bitGet(params[5], 4),
      flowSpecification:                                      bitGet(params[5], 5),
      setEventMask:                                           bitGet(params[5], 6),
      reset:                                                  bitGet(params[5], 7),
      setEventFilter:                                         bitGet(params[6], 0),
      flush:                                                  bitGet(params[6], 1),
      readPinType:                                            bitGet(params[6], 2),
      writePinType:                                           bitGet(params[6], 3),
      readStoredLinkKey:                                      bitGet(params[6], 5),
      writeStoredLinkKey:                                     bitGet(params[6], 6),
      deleteStoredLinkKey:                                    bitGet(params[6], 7),
      writeLocalName:                                         bitGet(params[7], 0),
      readLocalName:                                          bitGet(params[7], 1),
      readConnectionAcceptTimeout:                            bitGet(params[7], 2),
      writeConnectionAcceptTimeout:                           bitGet(params[7], 3),
      readPageTimeout:                                        bitGet(params[7], 4),
      writePageTimeout:                                       bitGet(params[7], 5),
      readScanEnable:                                         bitGet(params[7], 6),
      writeScanEnable:                                        bitGet(params[7], 7),
      readPageScanActivity:                                   bitGet(params[8], 0),
      writePageScanActivity:                                  bitGet(params[8], 1),
      readInquiryScanActivity:                                bitGet(params[8], 2),
      writeInquiryScanActivity:                               bitGet(params[8], 3),
      readAuthenticationEnable:                               bitGet(params[8], 4),
      writeAuthenticationEnable:                              bitGet(params[8], 5),
      readEncryptionMode:                                     bitGet(params[8], 6),
      writeEncryptionMode:                                    bitGet(params[8], 7),
      readClassOfDevice:                                      bitGet(params[9], 0),
      writeClassOfDevice:                                     bitGet(params[9], 1),
      readVoiceSetting:                                       bitGet(params[9], 2),
      writeVoiceSetting:                                      bitGet(params[9], 3),
      readAutomaticFlushTimeout:                              bitGet(params[9], 4),
      writeAutomaticFlushTimeout:                             bitGet(params[9], 5),
      readNumBroadcastRetransmissions:                        bitGet(params[9], 6),
      writeNumBroadcastRetransmissions:                       bitGet(params[9], 7),
      readHoldModeActivity:                                   bitGet(params[10], 0),
      writeHoldModeActivity:                                  bitGet(params[10], 1),
      readTransmitPowerLevel:                                 bitGet(params[10], 2),
      readSynchronousFlowControlEnable:                       bitGet(params[10], 3),
      writeSynchronousFlowControlEnable:                      bitGet(params[10], 4),
      setControllerToHostFlowControl:                         bitGet(params[10], 5),
      hostBufferSize:                                         bitGet(params[10], 6),
      hostNumberOfCompletedPackets:                           bitGet(params[10], 7),
      readLinkSupervisionTimeout:                             bitGet(params[11], 0),
      writeLinkSupervisionTimeout:                            bitGet(params[11], 1),
      readNumberOfSupportedIac:                               bitGet(params[11], 2),
      readCurrentIacLap:                                      bitGet(params[11], 3),
      writeCurrentIacLap:                                     bitGet(params[11], 4),
      readPageScanModePeriod:                                 bitGet(params[11], 5),
      writePageScanModePeriod:                                bitGet(params[11], 6),
      readPageScanMode:                                       bitGet(params[11], 7),
      writePageScanMode:                                      bitGet(params[12], 0),
      setAfhHostChannelClassification:                        bitGet(params[12], 1),
      readInquiryScanType:                                    bitGet(params[12], 4),
      writeInquiryScanType:                                   bitGet(params[12], 5),
      readInquiryMode:                                        bitGet(params[12], 6),
      writeInquiryMode:                                       bitGet(params[12], 7),
      readPageScanType:                                       bitGet(params[13], 0),
      writePageScanType:                                      bitGet(params[13], 1),
      readAfhChannelAssessmentMode:                           bitGet(params[13], 2),
      writeAfhChannelAssessmentMode:                          bitGet(params[13], 3),
      readLocalVersionInformation:                            bitGet(params[14], 3),
      readLocalSupportedFeatures:                             bitGet(params[14], 5),
      readLocalExtendedFeatures:                              bitGet(params[14], 6),
      readBufferSize:                                         bitGet(params[14], 7),
      readCountryCode:                                        bitGet(params[15], 0),
      readBdAddr:                                             bitGet(params[15], 1),
      readFailedContactCounter:                               bitGet(params[15], 2),
      resetFailedContactCounter:                              bitGet(params[15], 3),
      readLinkQuality:                                        bitGet(params[15], 4),
      readRssi:                                               bitGet(params[15], 5),
      readAfhChannelMap:                                      bitGet(params[15], 6),
      readClock:                                              bitGet(params[15], 7),
      readLoopbackMode:                                       bitGet(params[16], 0),
      writeLoopbackMode:                                      bitGet(params[16], 1),
      enableDeviceUnderTestMode:                              bitGet(params[16], 2),
      setupSynchronousConnectionRequest:                      bitGet(params[16], 3),
      acceptSynchronousConnectionRequest:                     bitGet(params[16], 4),
      rejectSynchronousConnectionRequest:                     bitGet(params[16], 5),
      readExtendedInquiryResponse:                            bitGet(params[17], 0),
      writeExtendedInquiryResponse:                           bitGet(params[17], 1),
      refreshEncryptionKey:                                   bitGet(params[17], 2),
      sniffSubrating:                                         bitGet(params[17], 4),
      readSimplePairingMode:                                  bitGet(params[17], 5),
      writeSimplePairingMode:                                 bitGet(params[17], 6),
      readLocalOobData:                                       bitGet(params[17], 7),
      readInquiryResponseTransmitPowerLevel:                  bitGet(params[18], 0),
      writeInquiryTransmitPowerLevel:                         bitGet(params[18], 1),
      readDefaultErroneousDataReporting:                      bitGet(params[18], 2),
      writeDefaultErroneousDataReporting:                     bitGet(params[18], 3),
      ioCapabilityRequestReply:                               bitGet(params[18], 7),
      userConfirmationRequestReply:                           bitGet(params[19], 0),
      userConfirmationRequestNegativeReply:                   bitGet(params[19], 1),
      userPasskeyRequestReply:                                bitGet(params[19], 2),
      userPasskeyRequestNegativeReply:                        bitGet(params[19], 3),
      remoteOobDataRequestReply:                              bitGet(params[19], 4),
      writeSimplePairingDebugMode:                            bitGet(params[19], 5),
      enhancedFlush:                                          bitGet(params[19], 6),
      remoteOobDataRequestNegativeReply:                      bitGet(params[19], 7),
      sendKeypressNotification:                               bitGet(params[20], 2),
      ioCapabilityRequestNegativeReply:                       bitGet(params[20], 3),
      readEncryptionKeySize:                                  bitGet(params[20], 4),
      createPhysicalLink:                                     bitGet(params[21], 0),
      acceptPhysicalLink:                                     bitGet(params[21], 1),
      disconnectPhysicalLink:                                 bitGet(params[21], 2),
      createLogicalLink:                                      bitGet(params[21], 3),
      acceptLogicalLink:                                      bitGet(params[21], 4),
      disconnectLogicalLink:                                  bitGet(params[21], 5),
      logicalLinkCancel:                                      bitGet(params[21], 6),
      flowSpecModify:                                         bitGet(params[21], 7),
      readLogicalLinkAcceptTimeout:                           bitGet(params[22], 0),
      writeLogicalLinkAcceptTimeout:                          bitGet(params[22], 1),
      setEventMaskPage2:                                      bitGet(params[22], 2),
      readLocationData:                                       bitGet(params[22], 3),
      writeLocationData:                                      bitGet(params[22], 4),
      readLocalAmpInfo:                                       bitGet(params[22], 5),
      readLocalAmpAassoc:                                     bitGet(params[22], 6),
      writeRemoteAmpAssoc:                                    bitGet(params[22], 7),
      readFlowControlMode:                                    bitGet(params[23], 0),
      writeFlowControlMode:                                   bitGet(params[23], 1),
      readDataBlockSize:                                      bitGet(params[23], 2),
      enableAmpReceiverReports:                               bitGet(params[23], 5),
      ampTestEnd:                                             bitGet(params[23], 6),
      ampTest:                                                bitGet(params[23], 7),
      readEnhancedTransmitPowerLevel:                         bitGet(params[24], 0),
      readBestEffortFlushTimeout:                             bitGet(params[24], 2),
      writeBestEffortFlushTimeout:                            bitGet(params[24], 3),
      shortRangeMode:                                         bitGet(params[24], 4),
      readLeHostSupport:                                      bitGet(params[24], 5),
      writeLeHostSupport:                                     bitGet(params[24], 6),
      leSetEventMask:                                         bitGet(params[25], 0),
      leReadBufferSizeV1:                                     bitGet(params[25], 1),
      leReadLocalSupportedFeatures:                           bitGet(params[25], 2),
      leSetRandomAddress:                                     bitGet(params[25], 4),
      leSetAdvertisingParameters:                             bitGet(params[25], 5),
      leReadAdvertisingPhysicalChannelTxPower:                bitGet(params[25], 6),
      leSetAdvertisingData:                                   bitGet(params[25], 7),
      leSetScanResponseData:                                  bitGet(params[26], 0),
      leSetAdvertisingEnable:                                 bitGet(params[26], 1),
      leSetScanParameters:                                    bitGet(params[26], 2),
      leSetScanEnable:                                        bitGet(params[26], 3),
      leCreateConnection:                                     bitGet(params[26], 4),
      leCreateConnectionCancel:                               bitGet(params[26], 5),
      leReadWhiteListSize:                                    bitGet(params[26], 6),
      leClearWhiteList:                                       bitGet(params[26], 7),
      leAddDeviceToWhiteList:                                 bitGet(params[27], 0),
      leRemoveDeviceFromWhiteList:                            bitGet(params[27], 1),
      leConnectionUpdate:                                     bitGet(params[27], 2),
      leSetHostChannelClassification:                         bitGet(params[27], 3),
      leReadChannelMap:                                       bitGet(params[27], 4),
      leReadRemoteFeatures:                                   bitGet(params[27], 5),
      leEncrypt:                                              bitGet(params[27], 6),
      leRand:                                                 bitGet(params[27], 7),
      leEnableEncryption:                                     bitGet(params[28], 0),
      leLongTermKeyRequestReply:                              bitGet(params[28], 1),
      leLongTermKeyRequestNegativeReply:                      bitGet(params[28], 2),
      leReadSupportedStates:                                  bitGet(params[28], 3),
      leReceiverTestV1:                                       bitGet(params[28], 4),
      leTransmitterTestV1:                                    bitGet(params[28], 5),
      leTestEnd:                                              bitGet(params[28], 6),
      enhancedSetupSynchronousConnection:                     bitGet(params[29], 3),
      enhancedAcceptSynchronousConnection:                    bitGet(params[29], 4),
      readLocalSupportedCodecs:                               bitGet(params[29], 5),
      setMWSChannelParameters:                                bitGet(params[29], 6),
      setExternalFrameConfiguration:                          bitGet(params[29], 7),
      setMwsSignaling:                                        bitGet(params[30], 0),
      setMwsTransportLayer:                                   bitGet(params[30], 1),
      setMwsScanFrequencyTable:                               bitGet(params[30], 2),
      getMwsTransportLayerConfiguration:                      bitGet(params[30], 3),
      setMwsPatternConfiguration:                             bitGet(params[30], 4),
      setTriggeredClockCapture:                               bitGet(params[30], 5),
      truncatedPage:                                          bitGet(params[30], 6),
      truncatedPageCancel:                                    bitGet(params[30], 7),
      setConnectionlessSlaveBroadcast:                        bitGet(params[31], 0),
      setConnectionlessSlaveBroadcastReceive:                 bitGet(params[31], 1),
      startSynchronizationTrain:                              bitGet(params[31], 2),
      receiveSynchronizationTrain:                            bitGet(params[31], 3),
      setReservedLtAddr:                                      bitGet(params[31], 4),
      deleteReservedLtAddr:                                   bitGet(params[31], 5),
      setConnectionlessSlaveBroadcastData:                    bitGet(params[31], 6),
      readSynchronizationTrainParameters:                     bitGet(params[31], 7),
      writeSynchronizationTrainParameters:                    bitGet(params[32], 0),
      remoteOobExtendedDataRequestReply:                      bitGet(params[32], 1),
      readSecureConnectionsHostSupport:                       bitGet(params[32], 2),
      writeSecureConnectionsHostSupport:                      bitGet(params[32], 3),
      readAuthenticatedPayloadTimeout:                        bitGet(params[32], 4),
      writeAuthenticatedPayloadTimeout:                       bitGet(params[32], 5),
      readLocalOobExtendedData:                               bitGet(params[32], 6),
      writeSecureConnectionsTestMode:                         bitGet(params[32], 7),
      readExtendedPageTimeout:                                bitGet(params[33], 0),
      writeExtendedPageTimeout:                               bitGet(params[33], 1),
      readExtendedInquiryLength:                              bitGet(params[33], 2),
      writeExtendedInquiryLength:                             bitGet(params[33], 3),
      leRemoteConnectionParameterRequestReply:                bitGet(params[33], 4),
      leRemoteConnectionParameterRequestNegativeReply:        bitGet(params[33], 5),
      leSetDataLength:                                        bitGet(params[33], 6),
      leReadSuggestedDefaultDataLength:                       bitGet(params[33], 7),
      leWriteSuggestedDefaultDataLength:                      bitGet(params[34], 0),
      leReadLocalP256PublicKey:                               bitGet(params[34], 1),
      leGenerateDhKeyV1:                                      bitGet(params[34], 2),
      leAddDeviceToResolvingList:                             bitGet(params[34], 3),
      leRemoveDeviceFromResolvingList:                        bitGet(params[34], 4),
      leClearResolvingList:                                   bitGet(params[34], 5),
      leReadResolvingListSize:                                bitGet(params[34], 6),
      leReadPeerResolvableAddress:                            bitGet(params[34], 7),
      leReadLocalResolvableAddress:                           bitGet(params[35], 0),
      leSetAddressResolutionEnable:                           bitGet(params[35], 1),
      leSetResolvablePrivateAddressTimeout:                   bitGet(params[35], 2),
      leReadMaximumDataLength:                                bitGet(params[35], 3),
      leReadPhy:                                              bitGet(params[35], 4),
      leSetDefaultPhy:                                        bitGet(params[35], 5),
      leSetPhy:                                               bitGet(params[35], 6),
      leReceiverTestV2:                                       bitGet(params[35], 7),
      leTransmitterTestV2:                                    bitGet(params[36], 0),
      leSetAdvertisingSetRandomAddress:                       bitGet(params[36], 1),
      leSetExtendedAdvertisingParameters:                     bitGet(params[36], 2),
      leSetExtendedAdvertisingData:                           bitGet(params[36], 3),
      leSetExtendedScanResponseData:                          bitGet(params[36], 4),
      leSetExtendedAdvertisingEnable:                         bitGet(params[36], 5),
      leReadMaximumAdvertisingDataLength:                     bitGet(params[36], 6),
      leReadNumberOfSupportedAdvertisingSets:                 bitGet(params[36], 7),
      leRemoveAdvertisingSet:                                 bitGet(params[37], 0),
      leClearAdvertisingSets:                                 bitGet(params[37], 1),
      leSetPeriodicAdvertisingParameters:                     bitGet(params[37], 2),
      leSetPeriodicAdvertisingData:                           bitGet(params[37], 3),
      leSetPeriodicAdvertisingEnable:                         bitGet(params[37], 4),
      leSetExtendedScanParameters:                            bitGet(params[37], 5),
      leSetExtendedScanEnable:                                bitGet(params[37], 6),
      leExtendedCreateConnection:                             bitGet(params[37], 7),
      lePeriodicAdvertisingCreateSync:                        bitGet(params[38], 0),
      lePeriodicAdvertisingCreateSyncCancel:                  bitGet(params[38], 1),
      lePeriodicAdvertisingTerminateSync:                     bitGet(params[38], 2),
      leAddDeviceToPeriodicAdvertiserList:                    bitGet(params[38], 3),
      leRemoveDeviceFromPeriodicAdvertiserList:               bitGet(params[38], 4),
      leClearPeriodicAdvertiserList:                          bitGet(params[38], 5),
      leReadPeriodicAdvertiserListSize:                       bitGet(params[38], 6),
      leReadTransmitPower:                                    bitGet(params[38], 7),
      leReadRfPathCompensation:                               bitGet(params[39], 0),
      leWriteRfPathCompensation:                              bitGet(params[39], 1),
      leSetPrivacyMode:                                       bitGet(params[39], 2),
      leReceiverTestV3:                                       bitGet(params[39], 3),
      leTransmitterTestV3:                                    bitGet(params[39], 4),
      leSetConnectionlessCteTransmitParameters:               bitGet(params[39], 5),
      leSetConnectionlessCteTransmitEnable:                   bitGet(params[39], 6),
      leSetConnectionlessIqSamplingEnable:                    bitGet(params[39], 7),
      leSetConnectionCteReceiveParameters:                    bitGet(params[40], 0),
      leSetConnectionCteTransmitParameters:                   bitGet(params[40], 1),
      leConnectionCteRequestEnable:                           bitGet(params[40], 2),
      leConnectionCteResponseEnable:                          bitGet(params[40], 3),
      leReadAntennaInformation:                               bitGet(params[40], 4),
      leSetPeriodicAdvertisingReceiveEnable:                  bitGet(params[40], 5),
      lePeriodicAdvertisingSyncTransfer:                      bitGet(params[40], 6),
      lePeriodicAdvertisingSetInfoTransfer:                   bitGet(params[40], 7),
      leSetPeriodicAdvertisingSyncTransferParameters:         bitGet(params[41], 0),
      leSetDefaultPeriodicAdvertisingSyncTransferParameters:  bitGet(params[41], 1),
      leGenerateDhKeyV2:                                      bitGet(params[41], 2),
      readLocalSimplePairingOptions:                          bitGet(params[41], 3),
      leModifySleepClockAccuracy:                             bitGet(params[41], 4),
      leReadBufferSizeV2:                                     bitGet(params[41], 5),
      leReadIsoTxSync:                                        bitGet(params[41], 6),
      leSetCigParameters:                                     bitGet(params[41], 7),
      leSetCigParametersTest:                                 bitGet(params[42], 0),
      leCreateCis:                                            bitGet(params[42], 1),
      leRemoveCig:                                            bitGet(params[42], 2),
      leAcceptCisRequest:                                     bitGet(params[42], 3),
      leRejectCisRequest:                                     bitGet(params[42], 4),
      leCreateBig:                                            bitGet(params[42], 5),
      leCreateBigTest:                                        bitGet(params[42], 6),
      leTerminateBig:                                         bitGet(params[42], 7),
      leBigCreateSync:                                        bitGet(params[43], 0),
      leBigTerminateSync:                                     bitGet(params[43], 1),
      leRequestPeerSca:                                       bitGet(params[43], 2),
      leSetupIsoDataPath:                                     bitGet(params[43], 3),
      leRemoveIsoDataPath:                                    bitGet(params[43], 4),
      leIsoTransmitTest:                                      bitGet(params[43], 5),
      leIsoReceiveTest:                                       bitGet(params[43], 6),
      leIsoReadTestCounters:                                  bitGet(params[43], 7),
      leIsoTestEnd:                                           bitGet(params[44], 0),
      leSetHostFeature:                                       bitGet(params[44], 1),
      leReadIsoLinkQuality:                                   bitGet(params[44], 2),
      leEnhancedReadTransmitPowerLevel:                       bitGet(params[44], 3),
      leReadRemoteTransmitPowerLevel:                         bitGet(params[44], 4),
      leSetPathLossReportingParameters:                       bitGet(params[44], 5),
      leSetPathLossReportingEnable:                           bitGet(params[44], 6),
      leSetTransmitPowerReportingEnable:                      bitGet(params[44], 7),
      leTransmitterTestV4:                                    bitGet(params[45], 0),
      setEcosystemBaseInterval:                               bitGet(params[45], 1),
      readLocalSupportedCodecsV2:                             bitGet(params[45], 2),
      readLocalSupportedCodecCapabilities:                    bitGet(params[45], 3),
      readLocalSupportedControllerDelay:                      bitGet(params[45], 4),
      configureDataPath:                                      bitGet(params[45], 5),
    };
  }
}


export class ReadRssi {
  static inParams(connectionHandle: number): Buffer {
    const payload = Buffer.alloc(2);
    payload.writeUInt16LE(connectionHandle, 0);
    return payload;
  }

  static outParams(params?: Buffer): number {
    if (!params || params.length < 3) {
      throw makeParserError(HciParserError.InvalidPayloadSize);
    }
    const rssi = params.readInt8(2);
    return rssi;
  }
}
