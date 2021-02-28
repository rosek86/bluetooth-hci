import { HciError, HciErrorCode } from "./HciError";
import Debug from 'debug';
import { Address } from "./Address";
import { Hci } from "./Hci";

const debug = Debug('nble-hci-event');

export enum HciEvent {
  InquiryComplete                                     = 0x01, // Inquiry Complete
  InquiryResult                                       = 0x02, // Inquiry Result
  ConnectionComplete                                  = 0x03, // Connection Complete
  ConnectionRequest                                   = 0x04, // Connection Request
  DisconnectionComplete                               = 0x05, // * Disconnection Complete
  AuthenticationComplete                              = 0x06, // Authentication Complete
  RemoteNameRequestComplete                           = 0x07, // Remote Name Request Complete
  EncryptionChange                                    = 0x08, // * Encryption Change
  ChangeConnectionLinkKeyComplete                     = 0x09, // Change Connection Link Key Complete
  MasterLinkKeyComplete                               = 0x0A, // Master Link Key Complete
  ReadRemoteSupportedFeaturesComplete                 = 0x0B, // Read Remote Supported Features Complete
  ReadRemoteVersionInformationComplete                = 0x0C, // * Read Remote Version Information Complete
  QosSetupComplete                                    = 0x0D, // QoS Setup Complete
  CommandComplete                                     = 0x0E, // * Command Complete
  CommandStatus                                       = 0x0F, // * Command Status
  HardwareError                                       = 0x10, // Hardware Error
  FlushOccurred                                       = 0x11, // Flush Occurred
  RoleChange                                          = 0x12, // Role Change
  NumberOfCompletedPackets                            = 0x13, // * Number Of Completed Packets
  ModeChange                                          = 0x14, // Mode Change
  ReturnLinkKeys                                      = 0x15, // Return Link Keys
  PinCodeRequest                                      = 0x16, // Pin Code Request
  LinkKeyRequest                                      = 0x17, // Link Key Request
  LinkKeyNotification                                 = 0x18, // Link Key Notification
  LoopbackCommand                                     = 0x19, // Loopback Command
  DataBufferOverflow                                  = 0x1A, // Data Buffer Overflow
  MaxSlotsChange                                      = 0x1B, // Max Slots Change
  ReadClockOffsetComplete                             = 0x1C, // Read Clock Offset Complete
  ConnectionPacketTypeChanged                         = 0x1D, // Connection Packet Type Changed
  QosViolation                                        = 0x1E, // QoS Violation
  PageScanRepetitionModeChange                        = 0x20, // Page Scan Repetition Mode Change
  FlowSpecificationComplete                           = 0x21, // Flow Specification Complete
  InquiryResultWithRssi                               = 0x22, // Inquiry Result With RSSI
  ReadRemoteExtendedFeaturesComplete                  = 0x23, // Read Remote Extended Features Complete
  SynchronousConnectionComplete                       = 0x2C, // Synchronous Connection Complete
  SynchronousConnectionChanged                        = 0x2D, // Synchronous Connection Changed
  SniffSubrating                                      = 0x2E, // Sniff Subrating
  ExtendedInquiryResult                               = 0x2F, // Extended Inquiry Result
  EncryptionKeyRefreshComplete                        = 0x30, // Encryption Key Refresh Complete
  IoCapabilityRequest                                 = 0x31, // IO Capability Request
  IoCapabilityResponse                                = 0x32, // IO Capability Response
  UserConfirmationRequest                             = 0x33, // User Confirmation Request
  UserPasskeyRequest                                  = 0x34, // User Passkey Request
  RemoteOobDataRequest                                = 0x35, // Remote OOB Data Request
  SimplePairingComplete                               = 0x36, // Simple Pairing Complete
  LinkSupervisionTimeoutChanged                       = 0x38, // Link Supervision Timeout Changed
  EnhancedFlushComplete                               = 0x39, // Enhanced Flush Complete
  UserPasskeyNotification                             = 0x3B, // User Passkey Notification
  KeypressNotification                                = 0x3C, // Keypress Notification
  RemoteHostSupportedFeaturesNotification             = 0x3D, // Remote Host Supported Features Notification
  LeMeta                                              = 0x3E, // * LE Meta
  PhysicalLinkComplete                                = 0x40, // Physical Link Complete
  ChannelSelected                                     = 0x41, // Channel Selected
  DisconnectionPhysicalLinkComplete                   = 0x42, // Disconnection Physical Link Complete
  PhysicalLinkLossEarlyWarning                        = 0x43, // Physical Link Loss Early Warning
  PhysicalLinkRecovery                                = 0x44, // Physical Link Recovery
  LogicalLinkComplete                                 = 0x45, // Logical Link Complete
  DisconnectionLogicalLinkComplete                    = 0x46, // Disconnection Logical Link Complete
  FlowSpecModifyComplete                              = 0x47, // Flow Spec Modify Complete
  NumberOfCompletedDataBlocks                         = 0x48, // Number Of Completed Data Blocks
  ShortRangeModeChangeComplete                        = 0x4C, // Short Range Mode Change Complete
  AmpStatusChange                                     = 0x4D, // AMP Status Change
  AmpStartTest                                        = 0x49, // AMP Start Test
  AmpTestEnd                                          = 0x4A, // AMP Test End
  AmpReceiverReport                                   = 0x4B, // AMP Receiver Report
  TriggeredClockCapture                               = 0x4E, // Triggered Clock Capture
  SynchronizationTrainComplete                        = 0x4F, // Synchronization Train Complete
  SynchronizationTrainReceived                        = 0x50, // Synchronization Train Received
  ConnectionlessSlaveBroadcastReceive                 = 0x51, // Connectionless Slave Broadcast Receive
  ConnectionlessSlaveBroadcastTimeout                 = 0x52, // Connectionless Slave Broadcast Timeout
  TruncatedPageComplete                               = 0x53, // Truncated Page Complete
  SlavePageResponseTimeout                            = 0x54, // Slave Page Response Timeout
  ConnectionlessSlaveBroadcastChannelMapChange        = 0x55, // Connectionless Slave Broadcast Channel Map Change
  InquiryResponseNotification                         = 0x56, // Inquiry Response Notification
  AuthenticatedPayloadTimeoutExpired                  = 0x57, // Authenticated Payload Timeout Expired
  SamStatusChange                                     = 0x58, // SAM Status Change
}

interface ConnEvent {
  connectionHandle: number;
}

export interface DisconnectionCompleteEvent extends ConnEvent {
  reason: {
    code: number;
    message: string;
  };
}

export enum EncryptionEnabled {
  Off           = 0,
  On            = 1,
  OnBrEdrAesCcm = 2,
}

export interface EncryptionChangeEvent extends ConnEvent {
  encEnabled: EncryptionEnabled;
}

export interface ReadRemoteVersionInformationCompleteEvent extends ConnEvent {
  version: number;
  manufacturerName: number;
  subversion: number;
}

export class ReadRemoteVersionInformationComplete {
  static parse(data: Buffer): {
    status: HciErrorCode,
    event: ReadRemoteVersionInformationCompleteEvent,
  } {
    if (data.length !== 8) {
      debug(`ReadRemoteVersionInformationComplete: invalid size ${data.length}`);
    }

    let o = 0;
    const status            = data.readUIntLE(o, 1); o += 1;
    const connectionHandle  = data.readUIntLE(o, 2); o += 2;
    const version           = data.readUIntLE(o, 1); o += 1;
    const manufacturerName  = data.readUIntLE(o, 2); o += 2;
    const subversion        = data.readUIntLE(o, 2); o += 2;

    const event: ReadRemoteVersionInformationCompleteEvent = {
      connectionHandle, version, manufacturerName, subversion,
    };

    return { status, event };
  }
}

export enum HciLeEvent {
  ConnectionComplete                                  = 0x01, // * LE Connection Complete
  AdvertisingReport                                   = 0x02, // * LE Advertising Report
  ConnectionUpdateComplete                            = 0x03, // * LE Connection Update Complete
  ReadRemoteFeaturesComplete                          = 0x04, // * LE Read Remote Features Complete
  LongTermKeyRequest                                  = 0x05, // * LE Long Term Key Request
  RemoteConnectionParameterRequest                    = 0x06, // * LE Remote Connection Parameter Request
  DataLengthChange                                    = 0x07, // * LE Data Length Change
  ReadLocalP256PublicKeyComplete                      = 0x08, // * LE Read Local P-256 Public Key Complete
  GenerateDhKeyComplete                               = 0x09, // * LE Generate DHKey Complete
  EnhancedConnectionComplete                          = 0x0A, // * LE Enhanced Connection Complete
  DirectedAdvertisingReport                           = 0x0B, // * LE Directed Advertising Report
  PhyUpdateComplete                                   = 0x0C, // * LE PHY Update Complete
  ExtendedAdvertisingReport                           = 0x0D, // * LE Extended Advertising Report
  PeriodicAdvertisingSyncEstablished                  = 0x0E, // LE Periodic Advertising Sync Established
  PeriodicAdvertisingReport                           = 0x0F, // LE Periodic Advertising Report
  PeriodicAdvertisingSyncLost                         = 0x10, // LE Periodic Advertising Sync Lost
  ScanTimeout                                         = 0x11, // * LE Scan Timeout
  AdvertisingSetTerminated                            = 0x12, // LE Advertising Set Terminated
  ScanRequestReceived                                 = 0x13, // LE Scan Request Received
  ChannelSelectionAlgorithm                           = 0x14, // * LE Channel Selection Algorithm
  ConnectionlessIqReport                              = 0x15, // LE Connectionless IQ Report
  ConnectionIqReport                                  = 0x16, // LE Connection IQ Report
  CteRequestFailed                                    = 0x17, // LE CTE Request Failed
  PeriodicAdvertisingSyncTransferReceived             = 0x18, // LE Periodic Advertising Sync Transfer Received
  CisEstablished                                      = 0x19, // LE CIS Established
  CisRequest                                          = 0x1A, // LE CIS Request
  CreateBigComplete                                   = 0x1B, // LE Create BIG Complete
  TerminateBigComplete                                = 0x1C, // LE Terminate BIG Complete
  BigSyncEstablished                                  = 0x1D, // LE BIG Sync Established
  BigSyncLost                                         = 0x1E, // LE BIG Sync Lost
  RequestPeerScaComplete                              = 0x1F, // LE Request Peer SCA Complete
  PathLossThreshold                                   = 0x20, // LE Path Loss Threshold
  TransmitPowerReporting                              = 0x21, // LE Transmit Power Reporting
  BigInfoAdvertisingReport                            = 0x22, // LE BIGInfo Advertising Report
}


export enum LeExtAdvEventTypeDataStatus {
  Complete            = 0,
  IncompleteMoreData  = 1,
  IncompleteTruncated = 2,
  Reserved            = 3,
}

export interface LeExtAdvEventType {
  ConnectableAdvertising: boolean;
  ScannableAdvertising: boolean;
  DirectedAdvertising: boolean;
  ScanResponse: boolean;
  LegacyAdvertisingPDUs: boolean;
  DataStatus: LeExtAdvEventTypeDataStatus;
}

export class LeExtAdvEventTypeParser {
  private static readonly offsets = [0,1,2,3,4,5];
  private static readonly masks   = [1,1,1,1,1,3];

  public static parse(type: number): LeExtAdvEventType {
    const fields = [];
    for (let i = 0; i < this.offsets.length; i++) {
      fields.push(
        (type >> this.offsets[i]) & this.masks[i]
      );
    }

    return {
      ConnectableAdvertising: fields[0] ? true : false,
      ScannableAdvertising:   fields[1] ? true : false,
      DirectedAdvertising:    fields[2] ? true : false,
      ScanResponse:           fields[3] ? true : false,
      LegacyAdvertisingPDUs:  fields[4] ? true : false,
      DataStatus:             fields[5],
    };
  }
}

export enum LeExtAdvReportAddrType {
  PublicDeviceAddress   = 0x00, // Public Device Address
  RandomDeviceAddress   = 0x01, // Random Device Address
  PublicIdentityAddress = 0x02, // Public Identity Address
  RandomIdentityAddress = 0x03, // Random (static) Identity Address
  Anonymous             = 0xFF, // No address provided (anonymous advertisement)
}

export enum LePrimaryAdvertiserPhy {
  Phy1M    = 0x01, // Advertiser PHY is LE 1M
  PhyCoded = 0x03, // Advertiser PHY is LE Coded
}

export enum LeSecondaryAdvertiserPhy {
  NotUsed  = 0x00, // No packets on the secondary advertising physical channel
  Phy1M    = 0x01, // Advertiser PHY is LE 1M
  Phy2M    = 0x02, // Advertiser PHY is LE 2M
  PhyCoded = 0x03, // Advertiser PHY is LE Coded
}

export enum LeAdvEventType {
  Undirected      = 0, // Connectable and scannable undirected advertising (ADV_IND)
  Directed        = 1, // Connectable directed advertising (ADV_DIRECT_IND)
  Scannable       = 2, // Scannable undirected advertising (ADV_SCAN_IND)
  NonConnectable  = 3, // Non connectable undirected advertising (ADV_NONCONN_IND)
}

export enum LeAdvReportAddrType {
  PublicDeviceAddress   = 0x00, // Public Device Address
  RandomDeviceAddress   = 0x01, // Random Device Address
  PublicIdentityAddress = 0x02, // Public Identity Address
  RandomIdentityAddress = 0x03, // Random (static) Identity Address
}

export interface LeAdvReportEvent {
  eventType: LeAdvEventType;
  addressType: LeAdvReportAddrType;
  address: Address;
  rssi: number|null;
  data: Buffer|null;
}

export class LeAdvReport {
  static parse(data: Buffer): LeAdvReportEvent[] {
    const numReports = data[0];

    const reportsRaw: Partial<{
      eventType:            number;
      addressType:          number;
      address:              number;
      dataLength:           number;
      data:                 Buffer;
      rssi:                 number;
    }>[] = [];

    let o = 1;

    for (let i = 0; i < numReports; i++) {
      reportsRaw.push({});
    }
    for (let i = 0; i < numReports; i++, o += 1) {
      reportsRaw[i].eventType = data.readUIntLE(o, 1);
    }
    for (let i = 0; i < numReports; i++, o += 1) {
      reportsRaw[i].addressType = data.readUIntLE(o, 1);
    }
    for (let i = 0; i < numReports; i++, o += 6) {
      reportsRaw[i].address = data.readUIntLE(o, 6);
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
    for (let i = 0; i < numReports; i++, o += 1) {
      reportsRaw[i].rssi = data.readIntLE(o, 1);
    }

    const powerOrNull = (v: number): number|null => v !== 0x7F ? v : null;

    return reportsRaw.map<LeAdvReportEvent>((reportRaw) => ({
      eventType:              reportRaw.eventType!,
      addressType:            reportRaw.addressType!,
      address:                Address.from(reportRaw.address!),
      rssi:                   powerOrNull(reportRaw.rssi!),
      data:                   reportRaw.data ?? null,
    }));
  }
}

export interface LeExtAdvReport {
  eventType: LeExtAdvEventType;
  addressType: LeExtAdvReportAddrType;
  address: Address;
  primaryPhy: LePrimaryAdvertiserPhy;
  secondaryPhy: LeSecondaryAdvertiserPhy;
  advertisingSid: number;
  txPower: number|null;
  rssi: number|null;
  periodicAdvIntervalMs: number;
  directAddressType: number;
  directAddress: number;
  data: Buffer|null;
}

export class LeExtAdvReport {
  static parse(data: Buffer): LeExtAdvReport[] {
    const numReports = data[0];

    const reportsRaw: Partial<{
      eventType:            number;
      addressType:          number;
      address:              number;
      primaryPhy:           number;
      secondaryPhy:         number;
      advertisingSid:       number;
      txPower:              number;
      rssi:                 number;
      periodicAdvInterval:  number;
      directAddressType:    number;
      directAddress:        number;
      dataLength:           number;
      data:                 Buffer;
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

    const powerOrNull = (v: number): number|null => v !== 0x7F ? v : null;

    return reportsRaw.map<LeExtAdvReport>((reportRaw) => ({
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
    }));
  }
}

export enum LePeerAddressType {
  PublicDeviceAddress,
  RandomDeviceAddress,
  PublicIdentityAddress,
  RandomIdentyAddress,
}

export enum LeMasterClockAccuracy {
  ppm500 = 0x00,
  ppm250 = 0x01,
  ppm150 = 0x02,
  ppm100 = 0x03,
  ppm75  = 0x04,
  ppm50  = 0x05,
  ppm30  = 0x06,
  ppm20  = 0x07,
}

export enum LeConnectionRole {
  Master,
  Slave
}

export interface LeConnectionCompleteEvent extends ConnEvent {
  role: LeConnectionRole;
  peerAddressType: LePeerAddressType;
  peerAddress: Address;
  connectionIntervalMs: number;
  connectionLatency: number;
  supervisionTimeoutMs: number;
  masterClockAccuracy: LeMasterClockAccuracy;
}

export class LeConnectionComplete {
  static parse(data: Buffer): { status: HciErrorCode, event: LeConnectionCompleteEvent } {
    if (data.length !== 18) {
      debug(`LeConnectionComplete: invalid size ${data.length}`);
    }

    let o = 0;
    const status              = data.readUIntLE(o, 1); o += 1;
    const connectionHandle    = data.readUIntLE(o, 2); o += 2;
    const role                = data.readUIntLE(o, 1); o += 1;
    const peerAddressType     = data.readUIntLE(o, 1); o += 1;
    const peerAddress         = data.readUIntLE(o, 6); o += 6;
    const connectionInterval  = data.readUIntLE(o, 2); o += 2;
    const connectionLatency   = data.readUIntLE(o, 2); o += 2;
    const supervisionTimeout  = data.readUIntLE(o, 2); o += 2;
    const masterClockAccuracy = data.readUIntLE(o, 1); o += 1;

    const event: LeConnectionCompleteEvent = {
      connectionHandle,
      role,
      peerAddressType,
      peerAddress:          Address.from(peerAddress),
      connectionIntervalMs: connectionInterval * 1.25,
      connectionLatency,
      supervisionTimeoutMs: supervisionTimeout * 10,
      masterClockAccuracy,
    };

    return { status, event };
  }
}

export interface LeEnhConnectionCompleteEvent extends LeConnectionCompleteEvent {
  localResolvablePrivateAddress: Address;
  peerResolvablePrivateAddress: Address;
}

export class LeEnhConnectionComplete {
  static parse(data: Buffer): { status: HciErrorCode, event: LeEnhConnectionCompleteEvent } {
    if (data.length !== 30) {
      debug(`LeEnhConnectionComplete: invalid size ${data.length}`);
    }

    let o = 0;
    const status                        = data.readUIntLE(o, 1); o += 1;
    const connectionHandle              = data.readUIntLE(o, 2); o += 2;
    const role                          = data.readUIntLE(o, 1); o += 1;
    const peerAddressType               = data.readUIntLE(o, 1); o += 1;
    const peerAddress                   = data.readUIntLE(o, 6); o += 6;
    const localResolvablePrivateAddress = data.readUIntLE(o, 6); o += 6;
    const peerResolvablePrivateAddress  = data.readUIntLE(o, 6); o += 6;
    const connectionInterval            = data.readUIntLE(o, 2); o += 2;
    const connectionLatency             = data.readUIntLE(o, 2); o += 2;
    const supervisionTimeout            = data.readUIntLE(o, 2); o += 2;
    const masterClockAccuracy           = data.readUIntLE(o, 1); o += 1;

    const event: LeEnhConnectionCompleteEvent = {
      connectionHandle,
      role,
      peerAddressType,
      peerAddress:                    Address.from(peerAddress),
      localResolvablePrivateAddress:  Address.from(localResolvablePrivateAddress),
      peerResolvablePrivateAddress:   Address.from(peerResolvablePrivateAddress),
      connectionIntervalMs:           connectionInterval * 1.25,
      connectionLatency,
      supervisionTimeoutMs:           supervisionTimeout * 10,
      masterClockAccuracy,
    };

    return { status, event };
  }
}

export interface LeAdvertisingSetTerminatedEvent {
  advertisingHandle: number;
  connectionHandle: number;
  numCompletedExtendedAdvertisingEvents: number;
}

export class LeAdvertisingSetTerminated {
  static parse(data: Buffer): {
    status: HciErrorCode,
    event: LeAdvertisingSetTerminatedEvent,
  } {
    if (data.length !== 5) {
      debug(`LeAdvertisingSetTerminated: invalid size ${data.length}`);
    }

    let o = 0;
    const status            = data.readUIntLE(o, 1); o += 1;
    const advertisingHandle = data.readUIntLE(o, 1); o += 1;
    const connectionHandle  = data.readUIntLE(o, 2); o += 2;
    const numEvents         = data.readUIntLE(o, 1); o += 1;

    return {
      status,
      event: {
        advertisingHandle,
        connectionHandle,
        numCompletedExtendedAdvertisingEvents: numEvents,
      },
    };
  }
}

export interface LeChannelSelAlgoEvent extends ConnEvent {
  algorithm: number;
}

export class LeChannelSelAlgo {
  static parse(data: Buffer): LeChannelSelAlgoEvent {
    if (data.length !== 3) {
      debug(`LeChannelSelAlgo: invalid size ${data.length}`);
    }

    return {
      connectionHandle: data.readUIntLE(0, 2),
      algorithm:        data.readUIntLE(2, 1),
    };
  }
}

export interface LeConnectionUpdateCompleteEvent extends ConnEvent {
  connectionIntervalMs: number;
  connectionLatency:    number;
  supervisionTimeoutMs: number;
}

export class LeConnectionUpdateComplete {
  static parse(data: Buffer): { status: HciErrorCode, event: LeConnectionUpdateCompleteEvent } {
    if (data.length !== 9) {
      debug(`LeConnectionUpdateComplete: invalid size ${data.length}`);
    }

    let o = 0;
    const status             = data.readUIntLE(o, 1); o += 1;
    const connectionHandle   = data.readUIntLE(o, 2); o += 2;
    const connectionInterval = data.readUIntLE(o, 2); o += 2;
    const connectionLatency  = data.readUIntLE(o, 2); o += 2;
    const supervisionTimeout = data.readUIntLE(o, 2); o += 2;

    const event: LeConnectionUpdateCompleteEvent = {
      connectionHandle,
      connectionIntervalMs: connectionInterval * 1.25,
      connectionLatency,
      supervisionTimeoutMs: supervisionTimeout * 10,
    };

    return { status, event };
  }
}

export interface LeReadRemoteFeaturesCompleteEvent extends ConnEvent {
  leFeatures: bigint;
}

export class LeReadRemoteFeaturesComplete {
  static parse(data: Buffer): { status: HciErrorCode, event: LeReadRemoteFeaturesCompleteEvent } {
    if (data.length !== 11) {
      debug(`LeReadRemoteFeaturesComplete: invalid size ${data.length}`);
    }

    let o = 0;
    const status            = data.readUIntLE(o, 1);  o += 1;
    const connectionHandle  = data.readUIntLE(o, 2);  o += 2;
    const leFeatures        = data.readBigInt64LE(o); o += 8;

    const event: LeReadRemoteFeaturesCompleteEvent = {
      connectionHandle,
      leFeatures,
    };

    // TODO: Parse le features

    return { status, event };
  }
}

export interface LeLongTermKeyRequestEvent extends ConnEvent {
  randomNumber: bigint;
  encryptedDiversifier: number;
}

export class LeLongTermKeyRequest {
  static parse(data: Buffer): LeLongTermKeyRequestEvent {
    if (data.length !== 12) {
      debug(`LeLongTermKeyRequest: invalid size ${data.length}`);
    }

    let o = 0;
    const connectionHandle      = data.readUIntLE(o, 2);    o += 2;
    const randomNumber          = data.readBigUInt64LE(o);  o += 8;
    const encryptedDiversifier  = data.readUIntLE(o, 2);    o += 2;

    return { connectionHandle, randomNumber, encryptedDiversifier };
  }
}

export interface LeRemoteConnectionParameterRequestEvent extends ConnEvent {
  connectionIntervalMinMs: number;
  connectionIntervalMaxMs: number;
  connectionLatency:       number;
  supervisionTimeoutMs:    number;
}

export class LeRemoteConnectionParameterRequest {
  static parse(data: Buffer): LeRemoteConnectionParameterRequestEvent {
    if (data.length !== 10) {
      debug(`LeRemoteConnectionParameterRequest: invalid size ${data.length}`);
    }

    let o = 0;
    const connectionHandle      = data.readUIntLE(o, 2); o += 2;
    const connectionIntervalMin = data.readUIntLE(o, 2); o += 2;
    const connectionIntervalMax = data.readUIntLE(o, 2); o += 2;
    const connectionLatency     = data.readUIntLE(o, 2); o += 2;
    const supervisionTimeout    = data.readUIntLE(o, 2); o += 2;

    return {
      connectionHandle,
      connectionIntervalMinMs:  connectionIntervalMin * 1.25,
      connectionIntervalMaxMs:  connectionIntervalMax * 1.25,
      connectionLatency,
      supervisionTimeoutMs:     supervisionTimeout * 10,
    };
  }
}

export interface LeDataLengthChangeEvent extends ConnEvent {
  maxTxOctets:  number;
  maxTxTime:    number;
  maxRxOctets:  number;
  maxRxTime:    number;
}

export class LeDataLengthChange {
  static parse(data: Buffer): LeDataLengthChangeEvent {
    if (data.length !== 10) {
      debug(`LeDataLengthChange: invalid size ${data.length}`);
    }

    let o = 0;
    const connectionHandle  = data.readUIntLE(o, 2); o += 2;
    const maxTxOctets       = data.readUIntLE(o, 2); o += 2;
    const maxTxTime         = data.readUIntLE(o, 2); o += 2;
    const maxRxOctets       = data.readUIntLE(o, 2); o += 2;
    const maxRxTime         = data.readUIntLE(o, 2); o += 2;

    return {
      connectionHandle,
      maxTxOctets,
      maxTxTime,
      maxRxOctets,
      maxRxTime,
    };
  }
}

export interface LeReadLocalP256PublicKeyCompleteEvent {
  localP256PublicKey: Buffer;
}

export class LeReadLocalP256PublicKeyComplete {
  static parse(data: Buffer): {
    status: HciErrorCode,
    event: LeReadLocalP256PublicKeyCompleteEvent,
  } {
    if (data.length !== 65) {
      debug(`LeReadLocalP256PublicKeyComplete: invalid size ${data.length}`);
    }

    const status = data.readUIntLE(0, 1);
    const localP256PublicKey = data.slice(1, 1 + 64).reverse();

    return { status, event: { localP256PublicKey } };
  }
}

export interface LeGenerateDhKeyCompleteEvent {
  dhKey: Buffer;
}

export class LeGenerateDhKeyComplete {
  static parse(data: Buffer): {
    status: HciErrorCode,
    event: LeGenerateDhKeyCompleteEvent,
   } {
    if (data.length !== 33) {
      debug(`LeGenerateDhKeyComplete: invalid size ${data.length}`);
    }

    const status = data.readUIntLE(0, 1);
    const dhKey = data.slice(1, 1 + 32).reverse();

    return { status, event: { dhKey } };
  }
}

export enum LeDirectedAdvEventType {
  Directed = 1, // Connectable directed advertising (ADV_DIRECT_IND)
}

export enum LeDirectedAdvReportAddrType {
  RandomDeviceAddress   = 0x01, // Random Device Address
}

export interface LeDirectedAdvertisingReportEvent {
  eventType: LeDirectedAdvEventType;
  addressType: LeAdvReportAddrType;
  address: Address;
  directAddressType: LeDirectedAdvReportAddrType;
  directAddress: Address;
  rssi: number|null;
}

export class LeDirectedAdvertisingReport {
  static parse(data: Buffer): LeDirectedAdvertisingReportEvent[] {
    const numReports = data[0];

    const reportsRaw: Partial<{
      eventType:          number;
      addressType:        number;
      address:            number;
      directAddressType:  number;
      directAddress:      number;
      rssi:               number;
    }>[] = [];

    let o = 1;

    for (let i = 0; i < numReports; i++) {
      reportsRaw.push({});
    }
    for (let i = 0; i < numReports; i++, o += 1) {
      reportsRaw[i].eventType = data.readUIntLE(o, 1);
    }
    for (let i = 0; i < numReports; i++, o += 1) {
      reportsRaw[i].addressType = data.readUIntLE(o, 1);
    }
    for (let i = 0; i < numReports; i++, o += 6) {
      reportsRaw[i].address = data.readUIntLE(o, 6);
    }
    for (let i = 0; i < numReports; i++, o += 1) {
      reportsRaw[i].directAddressType = data.readUIntLE(o, 1);
    }
    for (let i = 0; i < numReports; i++, o += 6) {
      reportsRaw[i].directAddress = data.readUIntLE(o, 6);
    }
    for (let i = 0; i < numReports; i++, o += 1) {
      reportsRaw[i].rssi = data.readIntLE(o, 1);
    }

    const powerOrNull = (v: number): number|null => v !== 0x7F ? v : null;

    return reportsRaw.map<LeDirectedAdvertisingReportEvent>((reportRaw) => ({
      eventType:              reportRaw.eventType!,
      addressType:            reportRaw.addressType!,
      address:                Address.from(reportRaw.address!),
      directAddressType:      reportRaw.directAddressType!,
      directAddress:          Address.from(reportRaw.directAddress!),
      rssi:                   powerOrNull(reportRaw.rssi!),
    }));
  }
}



export interface LePhyUpdateCompleteEvent extends ConnEvent {
  txPhy: number;
  rxPhy: number;
}

export class LePhyUpdateComplete {
  static parse(data: Buffer): {
    status: HciErrorCode,
    event: LePhyUpdateCompleteEvent,
   } {
    if (data.length !== 5) {
      debug(`LePhyUpdateComplete: invalid size ${data.length}`);
    }

    let o = 0;
    const status            = data.readUIntLE(o, 1); o += 1;
    const connectionHandle  = data.readUIntLE(o, 2); o += 2;
    const txPhy             = data.readUIntLE(o, 1); o += 1;
    const rxPhy             = data.readUIntLE(o, 1); o += 1;

    return {
      status, event: {
        connectionHandle, txPhy, rxPhy,
      }
    };
  }
}
