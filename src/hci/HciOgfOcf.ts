// [Core Appendix B Removed commands and events]
// [Core 5.4 Exchange of HCI-specific information]
// [Core 7 HCI COMMANDS AND EVENTS]

// prettier-ignore
export const HciOgf = Object.freeze({
  LinkControlCommands:                                  0x01,
  LinkPolicyCommands:                                   0x02,
  ControlAndBasebandCommands:                           0x03,
  InformationParameters:                                0x04,
  StatusParameters:                                     0x05,
  TestingCommands:                                      0x06,
  LeControllerCommands:                                 0x08,
  // The OGF value 0x3E is reserved for specification development purposes.
  SpecificationDevelopment:                             0x3E,
  // The OGF of 0x3F is reserved for vendor-specific debug commands.
  VendorSpecificDebugCommands:                          0x3F,
} as const);

export type HciOgf = (typeof HciOgf)[keyof typeof HciOgf];

export function HciOgfGetName(ogf: number): string {
  const entry = Object.entries(HciOgf).find(([, value]) => value === ogf)?.[0];
  return entry ?? `Unknown(${ogf})`;
}

// prettier-ignore
export const HciOcfLinkControlCommands = Object.freeze({
  Inquiry:                                              0x0001, //   Inquiry
  InquiryCancel:                                        0x0002, //   Inquiry Cancel
  PeriodicInquiryMode:                                  0x0003, //   Periodic Inquiry Mode
  ExitPeriodicInquiryMode:                              0x0004, //   Exit Periodic Inquiry Mode
  CreateConnection:                                     0x0005, //   Create Connection
  Disconnect:                                           0x0006, // * Disconnect
  AddScoConnection:                                     0x0007, // x Add SCO Connection (removed)
  CreateConnectionCancel:                               0x0008, //   Create Connection Cancel
  AcceptConnectionRequest:                              0x0009, //   Accept Connection Request
  RejectConnectionRequest:                              0x000A, //   Reject Connection Request
  LinkKeyRequestReply:                                  0x000B, //   Link Key Request Reply
  LinkKeyRequestNegativeReply:                          0x000C, //   Link Key Request Negative Reply
  PinCodeRequestReply:                                  0x000D, //   PIN Code Request Reply
  PinCodeRequestNegativeReply:                          0x000E, //   PIN Code Request Negative Reply
  ChangeConnectionPacketType:                           0x000F, //   Change Connection Packet Type
  AuthenticationRequested:                              0x0011, //   Authentication Requested
  SetConnectionEncryption:                              0x0013, //   Set Connection Encryption
  ChangeConnectionLinkKey:                              0x0015, //   Change Connection Link Key
  MasterLinkKey:                                        0x0017, //   Master Link Key
  RemoteNameRequest:                                    0x0019, //   Remote Name Request
  RemoteNameRequestCancel:                              0x001A, //   Remote Name Request Cancel
  ReadRemoteSupportedFeatures:                          0x001B, //   Read Remote Supported Features
  ReadRemoteExtendedFeatures:                           0x001C, //   Read Remote Extended Features
  ReadRemoteVersionInformation:                         0x001D, // * Read Remote Version Information
  ReadClockOffset:                                      0x001F, //   Read Clock Offset
  ReadLmpHandle:                                        0x0020, //   Read LMP Handle
  SetupSynchronousConnection:                           0x0028, //   Setup Synchronous Connection
  AcceptSynchronousConnectionRequest:                   0x0029, //   Accept Synchronous Connection Request
  RejectSynchronousConnectionRequest:                   0x002A, //   Reject Synchronous Connection Request
  IoCapabilityRequestReply:                             0x002B, //   IO Capability Request Reply
  UserConfirmationRequestReply:                         0x002C, //   User Confirmation Request Reply
  UserConfirmationRequestNegativeReply:                 0x002D, //   User Confirmation Request Negative Reply
  UserPasskeyRequestReply:                              0x002E, //   User Passkey Request Reply
  UserPasskeyRequestNegativeReply:                      0x002F, //   User Passkey Request Negative Reply
  RemoteOobDataRequestReply:                            0x0030, //   Remote OOB Data Request Reply
  RemoteOobDataRequestNegativeReply:                    0x0033, //   Remote OOB Data Request Negative Reply
  IoCapabilityRequestNegativeReply:                     0x0034, //   IO Capability Request Negative Reply
  CreatePhysicalLink:                                   0x0035, // x Create Physical Link (removed)
  AcceptPhysicalLink:                                   0x0036, // x Accept Physical Link (removed)
  DisconnectPhysicalLink:                               0x0037, // x Disconnect Physical Link (removed)
  CreateLogicalLink:                                    0x0038, // x Create Logical Link (removed)
  AcceptLogicalLink:                                    0x0039, // x Accept Logical Link (removed)
  DisconnectLogicalLink:                                0x003A, // x Disconnect Logical Link (removed)
  LogicalLinkCancel:                                    0x003B, // x Logical Link Cancel (removed)
  FlowSpecModify:                                       0x003C, // x Flow Spec Modify (removed)
  EnhancedSetupSynchronousConnection:                   0x003D, //   Enhanced Setup Synchronous Connection
  EnhancedAcceptSynchronousConnectionRequest:           0x003E, //   Enhanced Accept Synchronous Connection Request
  TruncatedPage:                                        0x003F, //   Truncated Page
  TruncatedPageCancel:                                  0x0040, //   Truncated Page Cancel
  SetConnectionlessSlaveBroadcast:                      0x0041, //   Set Connectionless Slave Broadcast
  SetConnectionlessSlaveBroadcastReceive:               0x0042, //   Set Connectionless Slave Broadcast Receive
  StartSynchronizationTrain:                            0x0043, //   Start Synchronization Train
  ReceiveSynchronizationTrain:                          0x0044, //   Receive Synchronization Train
  RemoteOobExtendedDataRequestReply:                    0x0045, //   Remote OOB Extended Data Request Reply
} as const);

export type HciOcfLinkControlCommands = (typeof HciOcfLinkControlCommands)[keyof typeof HciOcfLinkControlCommands];

export function HciOcfLinkControlCommandsGetName(ocf: number): string {
  const entry = Object.entries(HciOcfLinkControlCommands).find(([, value]) => value === ocf)?.[0];
  return entry ?? `Unknown(${ocf})`;
}

// prettier-ignore
export const HciOcfLinkPolicyCommands = Object.freeze({
  HoldMode:                                             0x0001, //   Hold Mode
  SniffMode:                                            0x0003, //   Sniff Mode
  ExitSniffMode:                                        0x0004, //   Exit Sniff Mode
  ParkState:                                            0x0005, // x Park State (removed)
  ExitParkState:                                        0x0006, // x Exit Park State (removed)
  QosSetup:                                             0x0007, //   QoS Setup
  RoleDiscovery:                                        0x0009, //   Role Discovery
  SwitchRole:                                           0x000B, //   Switch Role
  ReadLinkPolicySettings:                               0x000C, //   Read Link Policy Settings
  WriteLinkPolicySettings:                              0x000D, //   Write Link Policy Settings
  ReadDefaultLinkPolicySettings:                        0x000E, //   Read Default Link Policy Settings
  WriteDefaultLinkPolicySettings:                       0x000F, //   Write Default Link Policy Settings
  FlowSpecification:                                    0x0010, //   Flow Specification
  SniffSubrating:                                       0x0011, //   Sniff Subrating
} as const);

export type HciOcfLinkPolicyCommands = (typeof HciOcfLinkPolicyCommands)[keyof typeof HciOcfLinkPolicyCommands];

export function HciOcfLinkPolicyCommandsGetName(ocf: number): string {
  const entry = Object.entries(HciOcfLinkPolicyCommands).find(([, value]) => value === ocf)?.[0];
  return entry ?? `Unknown(${ocf})`;
}

// prettier-ignore
export const HciOcfControlAndBasebandCommands = Object.freeze({
  SetEventMask:                                         0x0001, // * Set Event Mask
  Reset:                                                0x0003, // * Reset
  SetEventFilter:                                       0x0005, //   Set Event Filter
  Flush:                                                0x0008, //   Flush
  ReadPinType:                                          0x0009, //   Read PIN Type
  WritePinType:                                         0x000A, //   Write PIN Type
  CreateNewUnitKey:                                     0x000B, // x Create New Unit Key (removed)
  ReadStoredLinkKey:                                    0x000D, //   Read Stored Link Key
  WriteStoredLinkKey:                                   0x0011, //   Write Stored Link Key
  DeleteStoredLinkKey:                                  0x0012, //   Delete Stored Link Key
  WriteLocalName:                                       0x0013, //   Write Local Name
  ReadLocalName:                                        0x0014, //   Read Local Name
  ReadConnectionAcceptTimeout:                          0x0015, //   Read Connection Accept Timeout
  WriteConnectionAcceptTimeout:                         0x0016, //   Write Connection Accept Timeout
  ReadPageTimeout:                                      0x0017, //   Read Page Timeout
  WritePageTimeout:                                     0x0018, //   Write Page Timeout
  ReadScanEnable:                                       0x0019, //   Read Scan Enable
  WriteScanEnable:                                      0x001A, //   Write Scan Enable
  ReadPageScanActivity:                                 0x001B, //   Read Page Scan Activity
  WritePageScanActivity:                                0x001C, //   Write Page Scan Activity
  ReadInquiryScanActivity:                              0x001D, //   Read Inquiry Scan Activity
  WriteInquiryScanActivity:                             0x001E, //   Write Inquiry Scan Activity
  ReadAuthenticationEnable:                             0x001F, //   Read Authentication Enable
  WriteAuthenticationEnable:                            0x0020, //   Write Authentication Enable
  ReadEncryptionMode:                                   0x0021, // x Read Encryption Mode (removed)
  WriteEncryptionMode:                                  0x0022, // x Write Encryption Mode (removed)
  ReadClassOfDevice:                                    0x0023, //   Read Class of Device
  WriteClassOfDevice:                                   0x0024, //   Write Class of Device
  ReadVoiceSetting:                                     0x0025, //   Read Voice Setting
  WriteVoiceSetting:                                    0x0026, //   Write Voice Setting
  ReadAutomaticFlushTimeout:                            0x0027, //   Read Automatic Flush Timeout
  WriteAutomaticFlushTimeout:                           0x0028, //   Write Automatic Flush Timeout
  ReadNumBroadcastRetransmissions:                      0x0029, //   Read Num Broadcast Retransmissions
  WriteNumBroadcastRetransmissions:                     0x002A, //   Write Num Broadcast Retransmissions
  ReadHoldModeActivity:                                 0x002B, //   Read Hold Mode Activity
  WriteHoldModeActivity:                                0x002C, //   Write Hold Mode Activity
  ReadTransmitPowerLevel:                               0x002D, // * Read Transmit Power Level
  ReadSynchronousFlowControlEnable:                     0x002E, //   Read Synchronous Flow Control Enable
  WriteSynchronousFlowControlEnable:                    0x002F, //   Write Synchronous Flow Control Enable
  SetControllerToHostFlowControl:                       0x0031, // * Set Controller To Host Flow Control
  HostBufferSize:                                       0x0033, // * Host Buffer Size
  HostNumberOfCompletedPackets:                         0x0035, // * Host Number of Completed Packets
  ReadLinkSupervisionTimeout:                           0x0036, //   Read Link Supervision Timeout
  WriteLinkSupervisionTimeout:                          0x0037, //   Write Link Supervision Timeout
  ReadNumberOfSupportedIac:                             0x0038, //   Read Number of Supported IAC
  ReadCurrentIacLap:                                    0x0039, //   Read Current IAC LAP
  WriteCurrentIacLap:                                   0x003A, //   Write Current IAC LAP
  ReadPageScanPeriodMode:                               0x003B, // x Read Page Scan Period Mode (removed)
  WritePageScanPeriodMode:                              0x003C, // x Write Page Scan Period Mode (removed)
  ReadPageScanMode:                                     0x003D, // x Read Page Scan Mode (removed)
  WritePageScanMode:                                    0x003E, // x Write Page Scan Mode (removed)
  SetAfhHostChannelClassification:                      0x003F, //   Set AFH Host Channel Classification
  ReadInquiryScanType:                                  0x0042, //   Read Inquiry Scan Type
  WriteInquiryScanType:                                 0x0043, //   Write Inquiry Scan Type
  ReadInquiryMode:                                      0x0044, //   Read Inquiry Mode
  WriteInquiryMode:                                     0x0045, //   Write Inquiry Mode
  ReadPageScanType:                                     0x0046, //   Read Page Scan Type
  WritePageScanType:                                    0x0047, //   Write Page Scan Type
  ReadAfhChannelAssessmentMode:                         0x0048, //   Read AFH Channel Assessment Mode
  WriteAfhChannelAssessmentMode:                        0x0049, //   Write AFH Channel Assessment Mode
  ReadExtendedInquiryResponse:                          0x0051, //   Read Extended Inquiry Response
  WriteExtendedInquiryResponse:                         0x0052, //   Write Extended Inquiry Response
  RefreshEncryptionKey:                                 0x0053, //   Refresh Encryption Key
  ReadSimplePairingMode:                                0x0055, //   Read Simple Pairing Mode
  WriteSimplePairingMode:                               0x0056, //   Write Simple Pairing Mode
  ReadLocalOOBData:                                     0x0057, //   Read Local OOB Data
  ReadInquiryResponseTransmitPowerLevel:                0x0058, //   Read Inquiry Response Transmit Power Level
  WriteInquiryTransmitPowerLevel:                       0x0059, //   Write Inquiry Transmit Power Level
  SendKeypressNotification:                             0x0060, //   Send Keypress Notification
  ReadDefaultErroneousDataReporting:                    0x005A, //   Read Default Erroneous Data Reporting
  WriteDefaultErroneousDataReporting:                   0x005B, //   Write Default Erroneous Data Reporting
  EnhancedFlush:                                        0x005F, //   Enhanced Flush
  ReadLogicalLinkAcceptTimeout:                         0x0061, // x Read Logical Link Accept Timeout (removed)
  WriteLogicalLinkAcceptTimeout:                        0x0062, // x Write Logical Link Accept Timeout (removed)
  SetEventMaskPage2:                                    0x0063, // * Set Event Mask Page 2
  ReadLocationData:                                     0x0064, // x Read Location Data (removed)
  WriteLocationData:                                    0x0065, // x Write Location Data (removed)
  ReadFlowControlMode:                                  0x0066, //   Read Flow Control Mode
  WriteFlowControlMode:                                 0x0067, //   Write Flow Control Mode
  ReadEnhancedTransmitPowerLevel:                       0x0068, //   Read Enhanced Transmit Power Level
  ReadBestEffortFlushTimeout:                           0x0069, // x Read Best Effort Flush Timeout (removed)
  WriteBestEffortFlushTimeout:                          0x006A, // x Write Best Effort Flush Timeout (removed)
  ShortRangeMode:                                       0x006B, // x Short Range Mode (removed)
  ReadLeHostSupport:                                    0x006C, // * Read LE Host Support
  WriteLeHostSupport:                                   0x006D, // * Write LE Host Support
  SetMwsChannelParameters:                              0x006E, //   Set MWS Channel Parameters
  SetExternalFrameConfiguration:                        0x006F, //   Set External Frame Configuration
  SetMwsSignaling:                                      0x0070, //   Set MWS Signaling
  SetMwsTransportLayer:                                 0x0071, //   Set MWS Transport Layer
  SetMwsScanFrequencyTable:                             0x0072, //   Set MWS Scan Frequency Table
  SetMwsPatternConfiguration:                           0x0073, //   Set MWS Pattern Configuration
  SetReservedLtAddr:                                    0x0074, //   Set Reserved LT_ADDR
  DeleteReservedLtAddr:                                 0x0075, //   Delete Reserved LT_ADDR
  SetConnectionlessSlaveBroadcastData:                  0x0076, //   Set Connectionless Slave Broadcast Data
  ReadSynchronizationTrainParameters:                   0x0077, //   Read Synchronization Train Parameters
  WriteSynchronizationTrainParameters:                  0x0078, //   Write Synchronization Train Parameters
  ReadSecureConnectionsHostSupport:                     0x0079, //   Read Secure Connections Host Support
  WriteSecureConnectionsHostSupport:                    0x007A, //   Write Secure Connections Host Support
  ReadAuthenticatedPayloadTimeout:                      0x007B, // * Read Authenticated Payload Timeout
  WriteAuthenticatedPayloadTimeout:                     0x007C, // * Write Authenticated Payload Timeout
  ReadLocalOobExtendedData:                             0x007D, //   Read Local OOB Extended Data
  ReadExtendedPageTimeout:                              0x007E, //   Read Extended Page Timeout
  WriteExtendedPageTimeout:                             0x007F, //   Write Extended Page Timeout
  ReadExtendedInquiryLength:                            0x0080, //   Read Extended Inquiry Length
  WriteExtendedInquiryLength:                           0x0081, //   Write Extended Inquiry Length
  SetEcosystemBaseInterval:                             0x0082, //   Set Ecosystem Base Interval
  ConfigureDataPath:                                    0x0083, //   Configure Data Path
  SetMinEncryptionKeySize:                              0x0084, //   Set Min Encryption Key Size
} as const);

export type HciOcfControlAndBasebandCommands =
  (typeof HciOcfControlAndBasebandCommands)[keyof typeof HciOcfControlAndBasebandCommands];

export function HciOcfControlAndBasebandCommandsGetName(ocf: number): string {
  const entry = Object.entries(HciOcfControlAndBasebandCommands).find(([, value]) => value === ocf)?.[0];
  return entry ?? `Unknown(${ocf})`;
}

// prettier-ignore
export const HciOcfInformationParameters = Object.freeze({
  ReadLocalVersionInformation:                          0x0001, // * Read Local Version Information
  ReadLocalSupportedCommands:                           0x0002, // * Read Local Supported Commands
  ReadLocalSupportedFeatures:                           0x0003, // * Read Local Supported Features
  ReadLocalExtendedFeatures:                            0x0004, //   Read Local Extended Features
  ReadBufferSize:                                       0x0005, // * Read Buffer Size
  ReadCountryCode:                                      0x0007, // x Read Country Code (removed)
  ReadBdAddr:                                           0x0009, // * Read BD_ADDR
  ReadDataBlockSize:                                    0x000A, //   Read Data Block Size
  ReadLocalSupportedCodecsV1:                           0x000B, //   Read Local Supported Codecs V1
  ReadLocalSimplePairingOptions:                        0x000C, //   Read Local Simple Pairing Options
  ReadLocalSupportedCodecsV2:                           0x000D, //   Read Local Supported Codecs V2
  ReadLocalSupportedCodecCapabilities:                  0x000E, //   Read Local Supported Codec Capabilities
  ReadLocalSupportedControllerDelay:                    0x000F, //   Read Local Supported Controller Delay
} as const);

export type HciOcfInformationParameters =
  (typeof HciOcfInformationParameters)[keyof typeof HciOcfInformationParameters];

export function HciOcfInformationParametersGetName(ocf: number): string {
  const entry = Object.entries(HciOcfInformationParameters).find(([, value]) => value === ocf)?.[0];
  return entry ?? `Unknown(${ocf})`;
}

// prettier-ignore
export const HciOcfStatusParameters = Object.freeze({
  ReadFailedContactCounter:                             0x0001, //   Read Failed Contact Counter
  ResetFailedContactCounter:                            0x0002, //   Reset Failed Contact Counter
  ReadLinkQuality:                                      0x0003, //   Read Link Quality
  ReadRssi:                                             0x0005, // * Read RSSI
  ReadAfhChannelMap:                                    0x0006, //   Read AFH Channel Map
  ReadClock:                                            0x0007, //   Read Clock
  ReadEncryptionKeySize:                                0x0008, //   Read Encryption Key Size
  ReadLocalAmpInfo:                                     0x0009, // x Read Local AMP Info (removed)
  ReadLocalAmpAssoc:                                    0x000A, // x Read Local AMP ASSOC (removed)
  WriteRemoteAmpAssoc:                                  0x000B, // x Write Remote AMP ASSOC (removed)
  GetMwsTransportLayerConfiguration:                    0x000C, //   Get MWS Transport Layer Configuration
  SetTriggeredClockCapture:                             0x000D, //   Set Triggered Clock Capture
} as const);

export type HciOcfStatusParameters = (typeof HciOcfStatusParameters)[keyof typeof HciOcfStatusParameters];

export function HciOcfStatusParametersGetName(ocf: number): string {
  const entry = Object.entries(HciOcfStatusParameters).find(([, value]) => value === ocf)?.[0];
  return entry ?? `Unknown(${ocf})`;
}

// prettier-ignore
export const HciOcfTestingCommands = Object.freeze({
  ReadLoopbackMode:                                     0x0001, //   Read Loopback Mode
  WriteLoopbackMode:                                    0x0002, //   Write Loopback Mode
  EnableDeviceUnderTestMode:                            0x0003, //   Enable Device Under Test Mode
  WriteSimplePairingDebugMode:                          0x0004, //   Write Simple Pairing Debug Mode
  EnableAmpReceiverReports:                             0x0007, // x Enable AMP Receiver Reports (removed)
  AmpTestEnd:                                           0x0008, // x AMP Test End (removed)
  AmpTest:                                              0x0009, // x AMP Test (removed)
  WriteSecureConnectionsTestMode:                       0x000A, //   Write Secure Connections Test Mode
} as const);

export type HciOcfTestingCommands = (typeof HciOcfTestingCommands)[keyof typeof HciOcfTestingCommands];

export function HciOcfTestingCommandsGetName(ocf: number): string {
  const entry = Object.entries(HciOcfTestingCommands).find(([, value]) => value === ocf)?.[0];
  return entry ?? `Unknown(${ocf})`;
}

// prettier-ignore
export const HciOcfLeControllerCommands = Object.freeze({
  SetEventMask:                                         0x0001, // * LE Set Event Mask
  ReadBufferSizeV1:                                     0x0002, // * LE Read Buffer Size
  ReadLocalSupportedFeatures:                           0x0003, // * LE Read Local Supported Features
  // Reserved
  SetRandomAddress:                                     0x0005, // * LE Set Random Address
  SetAdvertisingParameters:                             0x0006, // * LE Set Advertising Parameters
  ReadAdvertisingPhysicalChannelTxPower:                0x0007, // * LE Read Advertising Physical Channel Tx Power
  SetAdvertisingData:                                   0x0008, // * LE Set Advertising Data
  SetScanResponseData:                                  0x0009, // * LE Set Scan Response Data
  SetAdvertisingEnable:                                 0x000A, // * LE Set Advertising Enable
  SetScanParameters:                                    0x000B, // * LE Set Scan Parameters
  SetScanEnable:                                        0x000C, // * LE Set Scan Enable
  CreateConnection:                                     0x000D, // * LE Create Connection
  CreateConnectionCancel:                               0x000E, // * LE Create Connection Cancel
  ReadWhiteListSize:                                    0x000F, // * LE Read White List Size
  ClearWhiteList:                                       0x0010, // * LE Clear White List
  AddDeviceToWhiteList:                                 0x0011, // * LE Add Device To White List
  RemoveDeviceFromWhiteList:                            0x0012, // * LE Remove Device From White List
  ConnectionUpdate:                                     0x0013, // * LE Connection Update
  SetHostChannelClassification:                         0x0014, // * LE Set Host Channel Classification
  ReadChannelMap:                                       0x0015, // * LE Read Channel Map
  ReadRemoteFeatures:                                   0x0016, // * LE Read Remote Features
  Encrypt:                                              0x0017, // * LE Encrypt
  Rand:                                                 0x0018, // * LE Rand
  EnableEncryption:                                     0x0019, // * LE Enable Encryption
  LongTermKeyRequestReply:                              0x001A, // * LE Long Term Key Request Reply
  LongTermKeyRequestNegativeReply:                      0x001B, // * LE Long Term Key Request Negative Reply
  ReadSupportedStates:                                  0x001C, // * LE Read Supported States
  ReceiverTestV1:                                       0x001D, // * LE Receiver Test
  TransmitterTestV1:                                    0x001E, // * LE Transmitter Test
  TestEnd:                                              0x001F, // * LE Test End
  RemoteConnectionParameterRequestReply:                0x0020, // * LE Remote Connection Parameter Request Reply
  RemoteConnectionParameterRequestNegativeReply:        0x0021, // * LE Remote Connection Parameter Request Negative Reply
  SetDataLength:                                        0x0022, // * LE Set Data Length
  ReadSuggestedDefaultDataLength:                       0x0023, // * LE Read Suggested Default Data Length
  WriteSuggestedDefaultDataLength:                      0x0024, // * LE Write Suggested Default Data Length
  ReadLocalP256PublicKey:                               0x0025, // * LE Read Local P-256 Public Key
  GenerateDhKeyV1:                                      0x0026, // * LE Generate DHKey
  AddDeviceToResolvingList:                             0x0027, // * LE Add Device To Resolving List
  RemoveDeviceFromResolvingList:                        0x0028, // * LE Remove Device From Resolving List
  ClearResolvingList:                                   0x0029, // * LE Clear Resolving List
  ReadResolvingListSize:                                0x002A, // * LE Read Resolving List Size
  ReadPeerResolvableAddress:                            0x002B, // * LE Read Peer Resolvable Address
  ReadLocalResolvableAddress:                           0x002C, // * LE Read Local Resolvable Address
  SetAddressResolutionEnable:                           0x002D, // * LE Set Address Resolution Enable
  SetResolvablePrivateAddressTimeout:                   0x002E, // * LE Set Resolvable Private Address Timeout
  ReadMaximumDataLength:                                0x002F, // * LE Read Maximum Data Length
  ReadPhy:                                              0x0030, // * LE Read PHY
  SetDefaultPhy:                                        0x0031, // * LE Set Default PHY
  SetPhy:                                               0x0032, // * LE Set PHY
  ReceiverTestV2:                                       0x0033, // * LE Receiver Test
  TransmitterTestV2:                                    0x0034, // * LE Transmitter Test
  SetAdvertisingSetRandomAddress:                       0x0035, // * LE Set Advertising Set Random Address
  SetExtendedAdvertisingParameters:                     0x0036, // * LE Set Extended Advertising Parameters
  SetExtendedAdvertisingData:                           0x0037, // * LE Set Extended Advertising Data
  SetExtendedScanResponseData:                          0x0038, // * LE Set Extended Scan Response Data
  SetExtendedAdvertisingEnable:                         0x0039, // * LE Set Extended Advertising Enable
  ReadMaximumAdvertisingDataLength:                     0x003A, // * LE Read Maximum Advertising Data Length
  ReadNumberOfSupportedAdvertisingSets:                 0x003B, // * LE Read Number of Supported Advertising Sets
  RemoveAdvertisingSet:                                 0x003C, // * LE Remove Advertising Set
  ClearAdvertisingSets:                                 0x003D, // * LE Clear Advertising Sets
  SetPeriodicAdvertisingParametersV1:                   0x003E, // * LE Set Periodic Advertising Parameters
  SetPeriodicAdvertisingData:                           0x003F, // * LE Set Periodic Advertising Data
  SetPeriodicAdvertisingEnable:                         0x0040, // * LE Set Periodic Advertising Enable
  SetExtendedScanParameters:                            0x0041, // * LE Set Extended Scan Parameters
  SetExtendedScanEnable:                                0x0042, // * LE Set Extended Scan Enable
  ExtendedCreateConnection:                             0x0043, // * LE Extended Create Connection
  PeriodicAdvertisingCreateSync:                        0x0044, // * LE Periodic Advertising Create Sync
  PeriodicAdvertisingCreateSyncCancel:                  0x0045, // * LE Periodic Advertising Create Sync Cancel
  PeriodicAdvertisingTerminateSync:                     0x0046, // * LE Periodic Advertising Terminate Sync
  AddDeviceToPeriodicAdvertiserList:                    0x0047, // * LE Add Device To Periodic Advertiser List
  RemoveDeviceFromPeriodicAdvertiserList:               0x0048, // * LE Remove Device From Periodic Advertiser List
  ClearPeriodicAdvertiserList:                          0x0049, // * LE Clear Periodic Advertiser List
  ReadPeriodicAdvertiserListSize:                       0x004A, // * LE Read Periodic Advertiser List Size
  ReadTransmitPower:                                    0x004B, // * LE Read Transmit Power
  ReadRfPathCompensation:                               0x004C, //   LE Read RF Path Compensation
  WriteRfPathCompensation:                              0x004D, //   LE Write RF Path Compensation
  SetPrivacyMode:                                       0x004E, // * LE Set Privacy Mode
  ReceiverTestV3:                                       0x004F, // * LE Receiver Test
  TransmitterTestV3:                                    0x0050, // * LE Transmitter Test
  SetConnectionlessCteTransmitParameters:               0x0051, //   LE Set Connectionless CTE Transmit Parameters
  SetConnectionlessCteTransmitEnable:                   0x0052, //   LE Set Connectionless CTE Transmit Enable
  SetConnectionlessIqSamplingEnable:                    0x0053, //   LE Set Connectionless IQ Sampling Enable
  SetConnectionCteReceiveParameters:                    0x0054, //   LE Set Connection CTE Receive Parameters
  SetConnectionCteTransmitParameters:                   0x0055, //   LE Set Connection CTE Transmit Parameters
  ConnectionCteRequestEnable:                           0x0056, //   LE Connection CTE Request Enable
  ConnectionCteResponseEnable:                          0x0057, //   LE Connection CTE Response Enable
  ReadAntennaInformation:                               0x0058, //   LE Read Antenna Information
  SetPeriodicAdvertisingReceiveEnable:                  0x0059, //   LE Set Periodic Advertising Receive Enable
  PeriodicAdvertisingSyncTransfer:                      0x005A, //   LE Periodic Advertising Sync Transfer
  PeriodicAdvertisingSetInfoTransfer:                   0x005B, //   LE Periodic Advertising Set Info Transfer
  SetPeriodicAdvertisingSyncTransferParameters:         0x005C, //   LE Set Periodic Advertising Sync Transfer Parameters
  SetDefaultPeriodicAdvertisingSyncTransferParameters:  0x005D, //   LE Set Default Periodic Advertising Sync Transfer Parameters
  GenerateDhKeyV2:                                      0x005E, // * LE Generate DHKey
  ModifySleepClockAccuracy:                             0x005F, //   LE Modify Sleep Clock Accuracy
  ReadBufferSizeV2:                                     0x0060, // * LE Read Buffer Size
  ReadIsoTxSync:                                        0x0061, //   LE Read ISO TX Sync
  SetCigParameters:                                     0x0062, //   LE Set CIG Parameters
  SetCigParametersTest:                                 0x0063, //   LE Set CIG Parameters Test
  CreateCis:                                            0x0064, //   LE Create CIS
  RemoveCig:                                            0x0065, //   LE Remove CIG
  AcceptCisRequest:                                     0x0066, //   LE Accept CIS Request
  RejectCisRequest:                                     0x0067, //   LE Reject CIS Request
  CreateBig:                                            0x0068, //   LE Create BIG
  CreateBigTest:                                        0x0069, //   LE Create BIG Test
  TerminateBig:                                         0x006A, //   LE Terminate BIG
  BigCreateSync:                                        0x006B, //   LE BIG Create Sync
  BigTerminateSync:                                     0x006C, //   LE BIG Terminate Sync
  RequestPeerSca:                                       0x006D, //   LE Request Peer SCA (Sleep Clock Accuracy)
  SetupIsoDataPath:                                     0x006E, //   LE Setup ISO Data Path
  RemoveIsoDataPath:                                    0x006F, //   LE Remove ISO Data Path
  IsoTransmitTest:                                      0x0070, //   LE ISO Transmit Test
  IsoReceiveTest:                                       0x0071, //   LE ISO Receive Test
  IsoReadTestCounters:                                  0x0072, //   LE ISO Read Test Counters
  IsoTestEnd:                                           0x0073, //   LE ISO Test End
  SetHostFeature:                                       0x0074, //   LE Set Host Feature
  ReadIsoLinkQuality:                                   0x0075, //   LE Read ISO Link Quality
  EnhancedReadTransmitPowerLevel:                       0x0076, //   LE Enhanced Read Transmit Power Level
  ReadRemoteTransmitPowerLevel:                         0x0077, //   LE Read Remote Transmit Power Level
  SetPathLossReportingParameters:                       0x0078, //   LE Set Path Loss Reporting Parameters
  SetPathLossReportingEnable:                           0x0079, //   LE Set Path Loss Reporting Enable
  SetTransmitPowerReportingEnable:                      0x007A, //   LE Set Transmit Power
  TransmitterTestV4:                                    0x007B, // * LE Transmitter Test Reporting Enable
  SetDataRelatedAddressChanges:                         0x007C, //   LE Set Data Related Address Changes
  SetDefaultSubrate:                                    0x007D, //   LE Set Default Subrate
  SubrateRequest:                                       0x007E, //   LE Subrate Request
  SetExtendedAdvertisingParametersV2:                   0x007F, // * LE Set Extended Advertising Parameters
  SetDecisionData:                                      0x0080, //   LE Set Decision Data
  SetDecisionInstructions:                              0x0081, //   LE Set Decision Instructions
  SetPeriodicAdvertisingSubeventData:                   0x0082, //   LE Set Periodic Advertising Subevent Data
  SetPeriodicAdvertisingResponseData:                   0x0083, //   LE Set Periodic Advertising Response Data
  SetPeriodicSyncSubevent:                              0x0084, //   LE Set Periodic Sync Transfer Subevent
  ExtendedCreateConnectionV2:                           0x0085, // * LE Extended Create Connection V2
  SetPeriodicAdvertisingParametersV2:                   0x0086, // * LE Set Periodic Advertising Parameters V2
  ReadAllLocalSupportedFeatures:                        0x0087, //   LE Read All Local Supported Features
  ReadAllRemoteFeatures:                                0x0088, //   LE Read All Remote Features
  CsReadLocalSupportedCapabilities:                     0x0089, //   LE CS Read Local Supported Capabilities
  CsReadRemoteSupportedCapabilities:                    0x008A, //   LE CS Read Remote Supported Capabilities
  CsWriteCachedRemoteSupportedCapabilities:             0x008B, //   LE CS Write Cached Remote Supported Capabilities
  CsSecurityEnable:                                     0x008C, //   LE CS Security Enable
  CsSetDefaultSettings:                                 0x008D, //   LE CS Set Default Settings
  CsReadRemoteFaeTable:                                 0x008E, //   LE CS Read Remote FAE Table
  CsWriteCachedRemoteFaeTable:                          0x008F, //   LE CS Write Cached Remote FAE Table
  CsCreateConfig:                                       0x0090, //   LE CS Create Config
  CsRemoveConfig:                                       0x0091, //   LE CS Remove Config
  CsSetChannelClassification:                           0x0092, //   LE CS Set Channel Classification
  CsSetProcedureParameters:                             0x0093, //   LE CS Set Procedure Parameters
  CsProcedureEnable:                                    0x0094, //   LE CS Procedure Enable
  CsTest:                                               0x0095, //   LE CS Test
  CsTestEnd:                                            0x0096, //   LE CS Test End
  SetHostFeatureV2:                                     0x0097, //   LE Set Host Feature V2
  AddDeviceToMonitoredAdvertisersList:                  0x0098, //   LE Add Device To Monitored Advertisers List
  RemoveDeviceFromMonitoredAdvertisersList:             0x0099, //   LE Remove Device From Monitored Advertisers List
  ClearMonitoredAdvertisersList:                        0x009A, //   LE Clear Monitored Advertisers List
  ReadMonitoredAdvertisersListSize:                     0x009B, //   LE Read Monitored Advertisers List Size
  EnableMonitoringAdvertisers:                          0x009C, //   LE Enable Monitoring Advertisers
  FrameSpaceUpdate:                                     0x009D, //   LE Frame Space Update
} as const);

export type HciOcfLeControllerCommands = (typeof HciOcfLeControllerCommands)[keyof typeof HciOcfLeControllerCommands];

export function HciOcfLeControllerCommandsGetName(ocf: number): string {
  const entry = Object.entries(HciOcfLeControllerCommands).find(([, value]) => value === ocf)?.[0];
  return entry ?? `Unknown(${ocf})`;
}

export function ocfOgfToString(ocf: number, ogf: number) {
  let s = `${HciOgfGetName(ogf)}.`;
  switch (ogf) {
    case HciOgf.LinkControlCommands:
      s += HciOcfLinkControlCommandsGetName(ocf);
      break;
    case HciOgf.LinkPolicyCommands:
      s += HciOcfLinkPolicyCommandsGetName(ocf);
      break;
    case HciOgf.ControlAndBasebandCommands:
      s += HciOcfControlAndBasebandCommandsGetName(ocf);
      break;
    case HciOgf.InformationParameters:
      s += HciOcfInformationParametersGetName(ocf);
      break;
    case HciOgf.StatusParameters:
      s += HciOcfStatusParametersGetName(ocf);
      break;
    case HciOgf.TestingCommands:
      s += HciOcfTestingCommandsGetName(ocf);
      break;
    case HciOgf.LeControllerCommands:
      s += HciOcfLeControllerCommandsGetName(ocf);
      break;
    default:
      s += "Unknown";
  }

  return s;
}
