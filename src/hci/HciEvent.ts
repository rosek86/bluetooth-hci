import Debug from "debug";

import { Address } from "../utils/Address.ts";
import { ObjectReverse } from "../utils/Utils.ts";

import { HciErrorErrno, numberToHciErrorErrno } from "./HciError.ts";
import { LePhy, LeSupportedFeatures, numberToLePhy } from "./HciLeController.ts";

const debug = Debug("bt-hci-hci-event");

// prettier-ignore
export const HciEvent = Object.freeze({
  InquiryComplete:                                      0x01, //   Inquiry Complete
  InquiryResult:                                        0x02, //   Inquiry Result
  ConnectionComplete:                                   0x03, //   Connection Complete
  ConnectionRequest:                                    0x04, //   Connection Request
  DisconnectionComplete:                                0x05, // * Disconnection Complete
  AuthenticationComplete:                               0x06, //   Authentication Complete
  RemoteNameRequestComplete:                            0x07, //   Remote Name Request Complete
  EncryptionChange:                                     0x08, // * Encryption Change
  ChangeConnectionLinkKeyComplete:                      0x09, //   Change Connection Link Key Complete
  MasterLinkKeyComplete:                                0x0A, //   Master Link Key Complete
  ReadRemoteSupportedFeaturesComplete:                  0x0B, // * Read Remote Supported Features Complete
  ReadRemoteVersionInformationComplete:                 0x0C, // * Read Remote Version Information Complete
  QosSetupComplete:                                     0x0D, //   QoS Setup Complete
  CommandComplete:                                      0x0E, // * Command Complete
  CommandStatus:                                        0x0F, // * Command Status
  HardwareError:                                        0x10, //   Hardware Error
  FlushOccurred:                                        0x11, //   Flush Occurred
  RoleChange:                                           0x12, //   Role Change
  NumberOfCompletedPackets:                             0x13, // * Number Of Completed Packets
  ModeChange:                                           0x14, //   Mode Change
  ReturnLinkKeys:                                       0x15, //   Return Link Keys
  PinCodeRequest:                                       0x16, //   Pin Code Request
  LinkKeyRequest:                                       0x17, //   Link Key Request
  LinkKeyNotification:                                  0x18, //   Link Key Notification
  LoopbackCommand:                                      0x19, //   Loopback Command
  DataBufferOverflow:                                   0x1A, //   Data Buffer Overflow
  MaxSlotsChange:                                       0x1B, //   Max Slots Change
  ReadClockOffsetComplete:                              0x1C, //   Read Clock Offset Complete
  ConnectionPacketTypeChanged:                          0x1D, //   Connection Packet Type Changed
  QosViolation:                                         0x1E, //   QoS Violation
  PageScanModeChange:                                   0x1F, // x Page Scan Mode Change (removed)
  PageScanRepetitionModeChange:                         0x20, //   Page Scan Repetition Mode Change
  FlowSpecificationComplete:                            0x21, //   Flow Specification Complete
  InquiryResultWithRssi:                                0x22, //   Inquiry Result With RSSI
  ReadRemoteExtendedFeaturesComplete:                   0x23, //   Read Remote Extended Features Complete
  SynchronousConnectionComplete:                        0x2C, //   Synchronous Connection Complete
  SynchronousConnectionChanged:                         0x2D, //   Synchronous Connection Changed
  SniffSubrating:                                       0x2E, //   Sniff Subrating
  ExtendedInquiryResult:                                0x2F, //   Extended Inquiry Result
  EncryptionKeyRefreshComplete:                         0x30, // * Encryption Key Refresh Complete
  IoCapabilityRequest:                                  0x31, //   IO Capability Request
  IoCapabilityResponse:                                 0x32, //   IO Capability Response
  UserConfirmationRequest:                              0x33, //   User Confirmation Request
  UserPasskeyRequest:                                   0x34, //   User Passkey Request
  RemoteOobDataRequest:                                 0x35, //   Remote OOB Data Request
  SimplePairingComplete:                                0x36, //   Simple Pairing Complete
  LinkSupervisionTimeoutChanged:                        0x38, //   Link Supervision Timeout Changed
  EnhancedFlushComplete:                                0x39, //   Enhanced Flush Complete
  UserPasskeyNotification:                              0x3B, //   User Passkey Notification
  KeypressNotification:                                 0x3C, //   Keypress Notification
  RemoteHostSupportedFeaturesNotification:              0x3D, //   Remote Host Supported Features Notification
  LeMeta:                                               0x3E, // * LE Meta
  PhysicalLinkComplete:                                 0x40, // x Physical Link Complete (removed)
  ChannelSelected:                                      0x41, // x Channel Selected (removed)
  DisconnectionPhysicalLinkComplete:                    0x42, // x Disconnection Physical Link Complete (removed)
  PhysicalLinkLossEarlyWarning:                         0x43, // x Physical Link Loss Early Warning (removed)
  PhysicalLinkRecovery:                                 0x44, // x Physical Link Recovery (removed)
  LogicalLinkComplete:                                  0x45, // x Logical Link Complete (removed)
  DisconnectionLogicalLinkComplete:                     0x46, // x Disconnection Logical Link Complete (removed)
  FlowSpecModifyComplete:                               0x47, // x Flow Spec Modify Complete (removed)
  NumberOfCompletedDataBlocks:                          0x48, //   Number Of Completed Data Blocks
  AmpStartTest:                                         0x49, // x AMP Start Test (removed)
  AmpTestEnd:                                           0x4A, // x AMP Test End (removed)
  AmpReceiverReport:                                    0x4B, // x AMP Receiver Report (removed)
  ShortRangeModeChangeComplete:                         0x4C, // x Short Range Mode Change Complete (removed)
  AmpStatusChange:                                      0x4D, //   AMP Status Change
  TriggeredClockCapture:                                0x4E, //   Triggered Clock Capture
  SynchronizationTrainComplete:                         0x4F, //   Synchronization Train Complete
  SynchronizationTrainReceived:                         0x50, //   Synchronization Train Received
  ConnectionlessSlaveBroadcastReceive:                  0x51, //   Connectionless Slave Broadcast Receive
  ConnectionlessSlaveBroadcastTimeout:                  0x52, //   Connectionless Slave Broadcast Timeout
  TruncatedPageComplete:                                0x53, //   Truncated Page Complete
  SlavePageResponseTimeout:                             0x54, //   Slave Page Response Timeout
  ConnectionlessSlaveBroadcastChannelMapChange:         0x55, //   Connectionless Slave Broadcast Channel Map Change
  InquiryResponseNotification:                          0x56, //   Inquiry Response Notification
  AuthenticatedPayloadTimeoutExpired:                   0x57, //   Authenticated Payload Timeout Expired
  SamStatusChange:                                      0x58, //   SAM Status Change
} as const);

export type HciEvent = (typeof HciEvent)[keyof typeof HciEvent];

export const HciEventToName = ObjectReverse(HciEvent);

export function isHciEvent(value: number): value is HciEvent {
  return value in HciEventToName;
}

export function numberToHciEvent(value: number): HciEvent {
  if (!isHciEvent(value)) {
    throw new Error(`Invalid HciEvent value: ${value}`);
  }
  return value;
}

export function HciEventGetName(event: HciEvent): string {
  return HciEventToName[event] ?? `Unknown(${event})`;
}

export interface ConnEvent {
  connectionHandle: number;
}

export interface DisconnectionCompleteEvent extends ConnEvent {
  reason: {
    code: HciErrorErrno;
    message: string;
  };
}

export const EncryptionEnabled = Object.freeze({
  Off: 0,
  On: 1,
  OnBrEdrAesCcm: 2,
} as const);

export type EncryptionEnabled = (typeof EncryptionEnabled)[keyof typeof EncryptionEnabled];

export const EncryptionEnabledToName = ObjectReverse(EncryptionEnabled);

export function isEncryptionEnabled(value: number): value is EncryptionEnabled {
  return value in EncryptionEnabledToName;
}

export function numberToEncryptionEnabled(value: number): EncryptionEnabled {
  if (!isEncryptionEnabled(value)) {
    throw new Error(`Invalid EncryptionEnabled value: ${value}`);
  }
  return value;
}

export interface EncryptionChangeEvent extends ConnEvent {
  encEnabled: EncryptionEnabled;
}

/* eslint-disable @typescript-eslint/no-empty-object-type */
export interface EncryptionKeyRefreshComplete extends ConnEvent {}

export interface NumberOfCompletedPacketsEntry extends ConnEvent {
  numCompletedPackets: number;
}

export interface ReadRemoteVersionInformationCompleteEvent extends ConnEvent {
  version: number;
  manufacturerName: number;
  subversion: number;
}

export class ReadRemoteVersionInformationComplete {
  static parse(data: Buffer): {
    status: HciErrorErrno;
    event: ReadRemoteVersionInformationCompleteEvent;
  } {
    if (data.length !== 8) {
      debug(`ReadRemoteVersionInformationComplete: invalid size ${data.length}`);
    }

    const status = numberToHciErrorErrno(data.readUInt8(0));
    const connectionHandle = data.readUInt16LE(1);
    const version = data.readUInt8(3);
    const manufacturerName = data.readUInt16LE(4);
    const subversion = data.readUInt16LE(6);

    const event: ReadRemoteVersionInformationCompleteEvent = {
      connectionHandle,
      version,
      manufacturerName,
      subversion,
    };

    return { status, event };
  }
}

export interface ReadRemoteSupportedFeaturesCompleteEvent extends ConnEvent {
  lpmFeatures: Buffer;
}

export class ReadRemoteSupportedFeaturesComplete {
  static parse(data: Buffer): {
    status: HciErrorErrno;
    event: ReadRemoteSupportedFeaturesCompleteEvent;
  } {
    if (data.length !== 11) {
      debug(`ReadRemoteSupportedFeaturesComplete: invalid size ${data.length}`);
    }

    const status = numberToHciErrorErrno(data.readUInt8(0));
    const connectionHandle = data.readUInt16LE(1);
    const lpmFeatures = data.subarray(3, 3 + 8);

    const event: ReadRemoteSupportedFeaturesCompleteEvent = {
      connectionHandle,
      lpmFeatures,
    };

    return { status, event };
  }
}

// prettier-ignore
export const HciLeEvent = Object.freeze({
  ConnectionComplete:                                   0x01, // * LE Connection Complete
  AdvertisingReport:                                    0x02, // * LE Advertising Report
  ConnectionUpdateComplete:                             0x03, // * LE Connection Update Complete
  ReadRemoteFeaturesComplete:                           0x04, // * LE Read Remote Features Complete
  LongTermKeyRequest:                                   0x05, // * LE Long Term Key Request
  RemoteConnectionParameterRequest:                     0x06, // * LE Remote Connection Parameter Request
  DataLengthChange:                                     0x07, // * LE Data Length Change
  ReadLocalP256PublicKeyComplete:                       0x08, // * LE Read Local P-256 Public Key Complete
  GenerateDhKeyComplete:                                0x09, // * LE Generate DHKey Complete
  EnhancedConnectionCompleteV1:                         0x0A, // * LE Enhanced Connection Complete V1
  DirectedAdvertisingReport:                            0x0B, // * LE Directed Advertising Report
  PhyUpdateComplete:                                    0x0C, // * LE PHY Update Complete
  ExtendedAdvertisingReport:                            0x0D, // * LE Extended Advertising Report
  PeriodicAdvertisingSyncEstablishedV1:                 0x0E, // * LE Periodic Advertising Sync Established V1
  PeriodicAdvertisingReportV1:                          0x0F, //   LE Periodic Advertising Report V1
  PeriodicAdvertisingSyncLost:                          0x10, //   LE Periodic Advertising Sync Lost
  ScanTimeout:                                          0x11, // * LE Scan Timeout
  AdvertisingSetTerminated:                             0x12, // * LE Advertising Set Terminated
  ScanRequestReceived:                                  0x13, //   LE Scan Request Received
  ChannelSelectionAlgorithm:                            0x14, // * LE Channel Selection Algorithm
  ConnectionlessIqReport:                               0x15, //   LE Connectionless IQ Report
  ConnectionIqReport:                                   0x16, //   LE Connection IQ Report
  CteRequestFailed:                                     0x17, //   LE CTE Request Failed
  PeriodicAdvertisingSyncTransferReceivedV1:            0x18, //   LE Periodic Advertising Sync Transfer Received V1
  CisEstablishedV1:                                     0x19, //   LE CIS Established V1
  CisRequest:                                           0x1A, //   LE CIS Request
  CreateBigComplete:                                    0x1B, //   LE Create BIG Complete
  TerminateBigComplete:                                 0x1C, //   LE Terminate BIG Complete
  BigSyncEstablished:                                   0x1D, //   LE BIG Sync Established
  BigSyncLost:                                          0x1E, //   LE BIG Sync Lost
  RequestPeerScaComplete:                               0x1F, //   LE Request Peer SCA Complete
  PathLossThreshold:                                    0x20, //   LE Path Loss Threshold
  TransmitPowerReporting:                               0x21, //   LE Transmit Power Reporting
  BigInfoAdvertisingReport:                             0x22, //   LE BIGInfo Advertising Report
  SubrateChange:                                        0x23, //   LE Subrate Change
  PeriodicAdvertisingSyncEstablishedV2:                 0x24, //   LE Periodic Advertising Sync Established V2
  PeriodicAdvertisingReportV2:                          0x25, //   LE Periodic Advertising Report V2
  PeriodicAdvertisingSyncTransferReceivedV2:            0x26, //   LE Periodic Advertising Sync Transfer Received V2
  PeriodicAdvertisingSubeventDataRequest:               0x27, //   LE Periodic Advertising Subevent Data Request
  PeriodicAdvertisingResponseReport:                    0x28, //   LE Periodic Advertising Response Report
  EnhancedConnectionCompleteV2:                         0x29, //   LE Enhanced Connection Complete V2
  CisEstablishedV2:                                     0x2A, //   LE CIS Established V2
  RreadAllRemoteFeaturesComplete:                       0x2B, //   LE Read All Remote Features Complete
  CsReadRemoteSupportedCapabilitiesComplete:            0x2C, //   LE CS Read Remote Supported Capabilities Complete
  CsReadRemoteFAETableComplete:                         0x2D, //   LE CS Read Remote FAE Table Complete
  CsSecurityEnableComplete:                             0x2E, //   LE CS Security Enable Complete
  CsConfigComplete:                                     0x2F, //   LE CS Config Complete
  CsProcedureEnableComplete:                            0x30, //   LE CS Procedure Enable Complete
  CsSubeventResult:                                     0x31, //   LE CS Subevent Result
  CsSubeventResultContinue:                             0x32, //   LE CS Subevent Result Continue
  CsTestEndComplete:                                    0x33, //   LE CS Test End Complete
  MonitoredAdvertisersReport:                           0x34, //   LE Monitored Advertisers Report
  FrameSpaceUpdateComplete:                             0x35, //   LE Frame Space Update Complete
} as const);

export type HciLeEvent = (typeof HciLeEvent)[keyof typeof HciLeEvent];

export const HciLeEventToName = ObjectReverse(HciLeEvent);

export function isHciLeEvent(value: number): value is HciLeEvent {
  return value in HciLeEventToName;
}

export function numberToHciLeEvent(value: number): HciLeEvent {
  if (!isHciLeEvent(value)) {
    throw new Error(`Invalid HciLeEvent value: ${value}`);
  }
  return value;
}

export const LeExtAdvEventTypeDataStatus = Object.freeze({
  Complete: 0,
  IncompleteMoreData: 1,
  IncompleteTruncated: 2,
  Reserved: 3,
} as const);

export type LeExtAdvEventTypeDataStatus =
  (typeof LeExtAdvEventTypeDataStatus)[keyof typeof LeExtAdvEventTypeDataStatus];

export const LeExtAdvEventTypeDataStatusToName = ObjectReverse(LeExtAdvEventTypeDataStatus);

export function isLeExtAdvEventTypeDataStatus(value: number): value is LeExtAdvEventTypeDataStatus {
  return value in LeExtAdvEventTypeDataStatusToName;
}

export function numberToLeExtAdvEventTypeDataStatus(value: number): LeExtAdvEventTypeDataStatus {
  if (!isLeExtAdvEventTypeDataStatus(value)) {
    throw new Error(`Invalid LeExtAdvEventTypeDataStatus value: ${value}`);
  }
  return value;
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
  private static readonly offsets = [0, 1, 2, 3, 4, 5];
  private static readonly masks = [1, 1, 1, 1, 1, 3];

  public static parse(type: number): LeExtAdvEventType {
    const fields = [];
    for (let i = 0; i < this.offsets.length; i++) {
      fields.push((type >> this.offsets[i]) & this.masks[i]);
    }

    // prettier-ignore
    return {
      ConnectableAdvertising: fields[0] ? true : false,
      ScannableAdvertising:   fields[1] ? true : false,
      DirectedAdvertising:    fields[2] ? true : false,
      ScanResponse:           fields[3] ? true : false,
      LegacyAdvertisingPDUs:  fields[4] ? true : false,
      DataStatus:             numberToLeExtAdvEventTypeDataStatus(fields[5]),
    };
  }
}

// prettier-ignore
export const LeExtAdvReportAddrType = Object.freeze({
  PublicDeviceAddress:   0x00, // Public Device Address
  RandomDeviceAddress:   0x01, // Random Device Address
  PublicIdentityAddress: 0x02, // Public Identity Address
  RandomIdentityAddress: 0x03, // Random (static) Identity Address
  Anonymous:             0xFF, // No address provided (anonymous advertisement)
} as const);

export type LeExtAdvReportAddrType = (typeof LeExtAdvReportAddrType)[keyof typeof LeExtAdvReportAddrType];

export const LeExtAdvReportAddrTypeToName = ObjectReverse(LeExtAdvReportAddrType);

export function isLeExtAdvReportAddrType(value: number): value is LeExtAdvReportAddrType {
  return value in LeExtAdvReportAddrTypeToName;
}

export function numberToLeExtAdvReportAddrType(value: number): LeExtAdvReportAddrType {
  if (!isLeExtAdvReportAddrType(value)) {
    throw new Error(`Invalid LeExtAdvReportAddrType value: ${value}`);
  }
  return value;
}

// prettier-ignore
export const LePrimaryAdvertiserPhy = Object.freeze({
  Phy1M:    0x01, // Advertiser PHY is LE 1M
  PhyCoded: 0x03, // Advertiser PHY is LE Coded
} as const);

export type LePrimaryAdvertiserPhy = (typeof LePrimaryAdvertiserPhy)[keyof typeof LePrimaryAdvertiserPhy];

export const LePrimaryAdvertiserPhyToName = ObjectReverse(LePrimaryAdvertiserPhy);

export function isLePrimaryAdvertiserPhy(value: number): value is LePrimaryAdvertiserPhy {
  return value in LePrimaryAdvertiserPhyToName;
}

export function numberToLePrimaryAdvertiserPhy(value: number): LePrimaryAdvertiserPhy {
  if (!isLePrimaryAdvertiserPhy(value)) {
    throw new Error(`Invalid LePrimaryAdvertiserPhy value: ${value}`);
  }
  return value;
}

// prettier-ignore
export const LeSecondaryAdvertiserPhy = Object.freeze({
  NotUsed:  0x00, // No packets on the secondary advertising physical channel
  Phy1M:    0x01, // Advertiser PHY is LE 1M
  Phy2M:    0x02, // Advertiser PHY is LE 2M
  PhyCoded: 0x03, // Advertiser PHY is LE Coded
} as const);

export type LeSecondaryAdvertiserPhy = (typeof LeSecondaryAdvertiserPhy)[keyof typeof LeSecondaryAdvertiserPhy];

export const LeSecondaryAdvertiserPhyToName = ObjectReverse(LeSecondaryAdvertiserPhy);

export function isLeSecondaryAdvertiserPhy(value: number): value is LeSecondaryAdvertiserPhy {
  return value in LeSecondaryAdvertiserPhyToName;
}

export function numberToLeSecondaryAdvertiserPhy(value: number): LeSecondaryAdvertiserPhy {
  if (!isLeSecondaryAdvertiserPhy(value)) {
    throw new Error(`Invalid LeSecondaryAdvertiserPhy value: ${value}`);
  }
  return value;
}

// prettier-ignore
export const LeAdvEventType = Object.freeze({
  Undirected:     0, // Connectable and scannable undirected advertising (ADV_IND)
  Directed:       1, // Connectable directed advertising (ADV_DIRECT_IND)
  Scannable:      2, // Scannable undirected advertising (ADV_SCAN_IND)
  NonConnectable: 3, // Non connectable undirected advertising (ADV_NONCONN_IND)
  ScanResponse:   4, // Scan Response (SCAN_RSP)
} as const);

export type LeAdvEventType = (typeof LeAdvEventType)[keyof typeof LeAdvEventType];

export const LeAdvEventTypeToName = ObjectReverse(LeAdvEventType);

export function isLeAdvEventType(value: number): value is LeAdvEventType {
  return value in LeAdvEventTypeToName;
}

export function numberToLeAdvEventType(value: number): LeAdvEventType {
  if (!isLeAdvEventType(value)) {
    throw new Error(`Invalid LeAdvEventType value: ${value}`);
  }
  return value;
}

// prettier-ignore
export const LeAdvReportAddrType = Object.freeze({
  PublicDeviceAddress:   0x00, // Public Device Address
  RandomDeviceAddress:   0x01, // Random Device Address
  PublicIdentityAddress: 0x02, // Public Identity Address
  RandomIdentityAddress: 0x03, // Random (static) Identity Address
} as const);

export type LeAdvReportAddrType = (typeof LeAdvReportAddrType)[keyof typeof LeAdvReportAddrType];

export const LeAdvReportAddrTypeToName = ObjectReverse(LeAdvReportAddrType);

export function isLeAdvReportAddrType(value: number): value is LeAdvReportAddrType {
  return value in LeAdvReportAddrTypeToName;
}

export function numberToLeAdvReportAddrType(value: number): LeAdvReportAddrType {
  if (!isLeAdvReportAddrType(value)) {
    throw new Error(`Invalid LeAdvReportAddrType value: ${value}`);
  }
  return value;
}

export interface LeAdvReport {
  eventType: LeAdvEventType;
  addressType: LeAdvReportAddrType;
  address: Address;
  rssi: number | null;
  data: Buffer | null;
}

export class LeAdvReport {
  static parse(data: Buffer): LeAdvReport[] {
    const reports: LeAdvReport[] = [];

    const numReports = data[0];
    for (let i = 0, o = 1; i < numReports; i++) {
      const eventType = numberToLeAdvEventType(data.readUInt8(o + 0));
      const addressType = numberToLeAdvReportAddrType(data.readUInt8(o + 1));
      const address = data.readUIntLE(o + 2, 6);
      const dataLength = data.readUInt8(o + 8);
      o += 9;

      let advData: Buffer | null = null;
      if (dataLength > 0) {
        advData = data.subarray(o, o + dataLength);
        o += dataLength;
      }

      const rssi = data.readIntLE(o, 1);
      o += 1;

      reports.push({
        eventType,
        addressType,
        address: Address.from(address, addressType),
        rssi: LeAdvReport.powerOrNull(rssi),
        data: advData,
      });
    }

    return reports;
  }

  private static powerOrNull = (v: number): number | null => (v !== 0x7f ? v : null);
}

export interface LeExtAdvReport {
  eventType: LeExtAdvEventType;
  addressType: LeExtAdvReportAddrType;
  address: Address;
  primaryPhy: LePrimaryAdvertiserPhy;
  secondaryPhy: LeSecondaryAdvertiserPhy;
  advertisingSid: number;
  txPower: number | null;
  rssi: number | null;
  periodicAdvIntervalMs: number;
  directAddressType: number;
  directAddress: number;
  data: Buffer | null;
}

export class LeExtAdvReport {
  static parse(data: Buffer): LeExtAdvReport[] {
    const numReports = data[0];
    let o = 1;

    const reports: LeExtAdvReport[] = [];
    const powerOrNull = (v: number): number | null => (v !== 0x7f ? v : null);

    for (let i = 0; i < numReports; i++) {
      const eventType = data.readUInt16LE(o);
      o += 2;
      const addressType = numberToLeExtAdvReportAddrType(data.readUInt8(o));
      o += 1;
      const address = data.readUIntLE(o, 6);
      o += 6;
      const primaryPhy = numberToLePrimaryAdvertiserPhy(data.readUInt8(o));
      o += 1;
      const secondaryPhy = numberToLeSecondaryAdvertiserPhy(data.readUInt8(o));
      o += 1;
      const advertisingSid = data.readUInt8(o);
      o += 1;
      const txPower = data.readIntLE(o, 1);
      o += 1;
      const rssi = data.readIntLE(o, 1);
      o += 1;
      const periodicAdvInterval = data.readUInt16LE(o);
      o += 2;
      const directAddressType = data.readUInt8(o);
      o += 1;
      const directAddress = data.readUIntLE(o, 6);
      o += 6;
      const dataLength = data.readUInt8(o);
      o += 1;

      let advData: Buffer | null = null;
      if (dataLength > 0) {
        advData = data.subarray(o, o + dataLength);
        o += dataLength;
      }

      reports.push({
        eventType: LeExtAdvEventTypeParser.parse(eventType),
        addressType,
        address: Address.from(address, addressType),
        primaryPhy,
        secondaryPhy,
        advertisingSid,
        txPower: powerOrNull(txPower),
        rssi: powerOrNull(rssi),
        periodicAdvIntervalMs: periodicAdvInterval * 1.25,
        directAddressType,
        directAddress,
        data: advData,
      });
    }

    return reports;
  }
}

export const LeAdvertiserClockAccuracy = Object.freeze({
  ppm500: 0x00,
  ppm250: 0x01,
  ppm150: 0x02,
  ppm100: 0x03,
  ppm75: 0x04,
  ppm50: 0x05,
  ppm30: 0x06,
  ppm20: 0x07,
} as const);

export type LeAdvertiserClockAccuracy = (typeof LeAdvertiserClockAccuracy)[keyof typeof LeAdvertiserClockAccuracy];

export const LeAdvertiserClockAccuracyToName = ObjectReverse(LeAdvertiserClockAccuracy);

export function isLeAdvertiserClockAccuracy(value: number): value is LeAdvertiserClockAccuracy {
  return value in LeAdvertiserClockAccuracyToName;
}

export function numberToLeAdvertiserClockAccuracy(value: number): LeAdvertiserClockAccuracy {
  if (!isLeAdvertiserClockAccuracy(value)) {
    throw new Error(`Invalid LeAdvertiserClockAccuracy value: ${value}`);
  }
  return value;
}

export interface LePeriodicAdvertisingSyncEstablishedV1 {
  syncHandle: number;
  advertisingSid: number;
  advertiserAddress: Address;
  advertiserPhy: LePhy;
  periodicAdvertisingIntervalMs: number;
  advertiserClockAccuracy: LeAdvertiserClockAccuracy;
}

export class LePeriodicAdvertisingSyncEstablishedV1 {
  static parse(data: Buffer): { error: HciErrorErrno } | LePeriodicAdvertisingSyncEstablishedV1 {
    // Status 1
    // Sync_Handle 2
    // Advertising_SID 1
    // Advertiser_Address_Type 1
    // Advertiser_Address 6
    // Advertiser_PHY 1
    // Periodic_Advertising_Interval 2
    // Advertiser_Clock_Accuracy 1

    const status = numberToHciErrorErrno(data.readUInt8(0));
    if (status !== HciErrorErrno.Success) {
      return { error: status };
    }

    if (data.length !== 15) {
      throw new Error(`LePeriodicAdvertisingSyncEstablishedV1: invalid size ${data.length}`);
    }

    const syncHandle = data.readUInt16LE(1);
    const advertisingSid = data.readUInt8(3);
    const advertiserAddressType = numberToLeAdvReportAddrType(data.readUInt8(4));
    const advertiserAddress = data.readUIntLE(5, 6);
    const advertiserPhy = numberToLePhy(data.readUInt8(11));
    const periodicAdvertisingIntervalMs = data.readUInt16LE(12) * 1.25;
    const advertiserClockAccuracy = numberToLeAdvertiserClockAccuracy(data.readUInt8(14));

    return {
      syncHandle,
      advertisingSid,
      advertiserAddress: Address.from(advertiserAddress, advertiserAddressType),
      advertiserPhy,
      periodicAdvertisingIntervalMs,
      advertiserClockAccuracy,
    };
  }
}

export const LeConnPeerAddressType = Object.freeze({
  PublicDeviceAddress: 0,
  RandomDeviceAddress: 1,
  PublicIdentityAddress: 2,
  RandomIdentityAddress: 3,
} as const);

export type LeConnPeerAddressType = (typeof LeConnPeerAddressType)[keyof typeof LeConnPeerAddressType];

export const LeConnPeerAddressTypeToName = ObjectReverse(LeConnPeerAddressType);

export function isLeConnPeerAddressType(value: number): value is LeConnPeerAddressType {
  return value in LeConnPeerAddressTypeToName;
}

export function numberToLeConnPeerAddressType(value: number): LeConnPeerAddressType {
  if (!isLeConnPeerAddressType(value)) {
    throw new Error(`Invalid LeConnPeerAddressType value: ${value}`);
  }
  return value;
}

export const LeMasterClockAccuracy = Object.freeze({
  ppm500: 0x00,
  ppm250: 0x01,
  ppm150: 0x02,
  ppm100: 0x03,
  ppm75: 0x04,
  ppm50: 0x05,
  ppm30: 0x06,
  ppm20: 0x07,
} as const);

export type LeMasterClockAccuracy = (typeof LeMasterClockAccuracy)[keyof typeof LeMasterClockAccuracy];

export const LeMasterClockAccuracyToName = ObjectReverse(LeMasterClockAccuracy);

export function isLeMasterClockAccuracy(value: number): value is LeMasterClockAccuracy {
  return value in LeMasterClockAccuracyToName;
}

export function numberToLeMasterClockAccuracy(value: number): LeMasterClockAccuracy {
  if (!isLeMasterClockAccuracy(value)) {
    throw new Error(`Invalid LeMasterClockAccuracy value: ${value}`);
  }
  return value;
}

export const LeConnectionRole = Object.freeze({
  Master: 0,
  Slave: 1,
} as const);

export type LeConnectionRole = (typeof LeConnectionRole)[keyof typeof LeConnectionRole];

export const LeConnectionRoleToName = ObjectReverse(LeConnectionRole);

export function isLeConnectionRole(value: number): value is LeConnectionRole {
  return value in LeConnectionRoleToName;
}

export function numberToLeConnectionRole(value: number): LeConnectionRole {
  if (!isLeConnectionRole(value)) {
    throw new Error(`Invalid LeConnectionRole value: ${value}`);
  }
  return value;
}

export interface LeConnectionCompleteEvent extends ConnEvent {
  type: "standard";
  role: LeConnectionRole;
  peerAddressType: LeConnPeerAddressType;
  peerAddress: Address;
  connectionIntervalMs: number;
  connectionLatency: number;
  supervisionTimeoutMs: number;
  masterClockAccuracy: LeMasterClockAccuracy;
}

export class LeConnectionComplete {
  static parse(data: Buffer): { status: HciErrorErrno; event: LeConnectionCompleteEvent } {
    if (data.length !== 18) {
      debug(`LeConnectionComplete: invalid size ${data.length}`);
    }

    let o = 0;
    const status = numberToHciErrorErrno(data.readUInt8(o));
    o += 1;
    const connectionHandle = data.readUInt16LE(o);
    o += 2;
    const role = numberToLeConnectionRole(data.readUInt8(o));
    o += 1;
    const peerAddressType = numberToLeConnPeerAddressType(data.readUInt8(o));
    o += 1;
    const peerAddress = data.readUIntLE(o, 6);
    o += 6;
    const connectionInterval = data.readUInt16LE(o);
    o += 2;
    const connectionLatency = data.readUInt16LE(o);
    o += 2;
    const supervisionTimeout = data.readUInt16LE(o);
    o += 2;
    const masterClockAccuracy = numberToLeMasterClockAccuracy(data.readUInt8(o));
    o += 1;

    const event: LeConnectionCompleteEvent = {
      type: "standard",
      connectionHandle,
      role,
      peerAddressType,
      peerAddress: Address.from(peerAddress, peerAddressType),
      connectionIntervalMs: connectionInterval * 1.25,
      connectionLatency,
      supervisionTimeoutMs: supervisionTimeout * 10,
      masterClockAccuracy,
    };

    return { status, event };
  }
}

export interface LeEnhConnectionCompleteEvent extends Omit<LeConnectionCompleteEvent, "type"> {
  type: "enhanced";
  localResolvablePrivateAddress: Address;
  peerResolvablePrivateAddress: Address;
}

export class LeEnhConnectionComplete {
  static parse(data: Buffer): { status: HciErrorErrno; event: LeEnhConnectionCompleteEvent } {
    if (data.length !== 30) {
      debug(`LeEnhConnectionComplete: invalid size ${data.length}`);
    }

    let o = 0;
    const status = numberToHciErrorErrno(data.readUInt8(o));
    o += 1;
    const connectionHandle = data.readUInt16LE(o);
    o += 2;
    const role = numberToLeConnectionRole(data.readUInt8(o));
    o += 1;
    const peerAddressType = numberToLeConnPeerAddressType(data.readUInt8(o));
    o += 1;
    const peerAddress = data.readUIntLE(o, 6);
    o += 6;
    const localResolvablePrivateAddress = data.readUIntLE(o, 6);
    o += 6;
    const peerResolvablePrivateAddress = data.readUIntLE(o, 6);
    o += 6;
    const connectionInterval = data.readUInt16LE(o);
    o += 2;
    const connectionLatency = data.readUInt16LE(o);
    o += 2;
    const supervisionTimeout = data.readUInt16LE(o);
    o += 2;
    const masterClockAccuracy = numberToLeMasterClockAccuracy(data.readUInt8(o));
    o += 1;

    const event: LeEnhConnectionCompleteEvent = {
      type: "enhanced",
      connectionHandle,
      role,
      peerAddressType,
      peerAddress: Address.from(peerAddress, peerAddressType),
      localResolvablePrivateAddress: Address.from(localResolvablePrivateAddress, peerAddressType),
      peerResolvablePrivateAddress: Address.from(peerResolvablePrivateAddress, peerAddressType),
      connectionIntervalMs: connectionInterval * 1.25,
      connectionLatency,
      supervisionTimeoutMs: supervisionTimeout * 10,
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
    status: HciErrorErrno;
    event: LeAdvertisingSetTerminatedEvent;
  } {
    if (data.length !== 5) {
      debug(`LeAdvertisingSetTerminated: invalid size ${data.length}`);
    }

    const status = numberToHciErrorErrno(data.readUInt8(0));
    const advertisingHandle = data.readUInt8(1);
    const connectionHandle = data.readUInt16LE(2);
    const numEvents = data.readUInt8(4);

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
      connectionHandle: data.readUInt16LE(0),
      algorithm: data.readUInt8(2),
    };
  }
}

export interface LeConnectionUpdateCompleteEvent extends ConnEvent {
  connectionIntervalMs: number;
  connectionLatency: number;
  supervisionTimeoutMs: number;
}

export class LeConnectionUpdateComplete {
  static parse(data: Buffer): { status: HciErrorErrno; event: LeConnectionUpdateCompleteEvent } {
    if (data.length !== 9) {
      debug(`LeConnectionUpdateComplete: invalid size ${data.length}`);
    }

    const status = numberToHciErrorErrno(data.readUInt8(0));
    const connectionHandle = data.readUInt16LE(1);
    const connectionInterval = data.readUInt16LE(3);
    const connectionLatency = data.readUInt16LE(5);
    const supervisionTimeout = data.readUInt16LE(7);

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
  leFeatures: LeSupportedFeatures;
}

export class LeReadRemoteFeaturesComplete {
  static parse(data: Buffer): { status: HciErrorErrno; event: LeReadRemoteFeaturesCompleteEvent } {
    if (data.length !== 11) {
      debug(`LeReadRemoteFeaturesComplete: invalid size ${data.length}`);
    }

    const status = numberToHciErrorErrno(data.readUInt8(0));
    const connectionHandle = data.readUInt16LE(1);
    const leFeatures = data.readBigInt64LE(3);

    const event: LeReadRemoteFeaturesCompleteEvent = {
      connectionHandle,
      leFeatures: LeSupportedFeatures.from(leFeatures),
    };

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

    const connectionHandle = data.readUInt16LE(0);
    const randomNumber = data.readBigUInt64LE(2);
    const encryptedDiversifier = data.readUInt16LE(10);

    return { connectionHandle, randomNumber, encryptedDiversifier };
  }
}

export interface LeRemoteConnectionParameterRequestEvent extends ConnEvent {
  connectionIntervalMinMs: number;
  connectionIntervalMaxMs: number;
  connectionLatency: number;
  supervisionTimeoutMs: number;
}

export class LeRemoteConnectionParameterRequest {
  static parse(data: Buffer): LeRemoteConnectionParameterRequestEvent {
    if (data.length !== 10) {
      debug(`LeRemoteConnectionParameterRequest: invalid size ${data.length}`);
    }

    const connectionHandle = data.readUInt16LE(0);
    const connectionIntervalMin = data.readUInt16LE(2);
    const connectionIntervalMax = data.readUInt16LE(4);
    const connectionLatency = data.readUInt16LE(6);
    const supervisionTimeout = data.readUInt16LE(8);

    return {
      connectionHandle,
      connectionIntervalMinMs: connectionIntervalMin * 1.25,
      connectionIntervalMaxMs: connectionIntervalMax * 1.25,
      connectionLatency,
      supervisionTimeoutMs: supervisionTimeout * 10,
    };
  }
}

export interface LeDataLengthChangeEvent extends ConnEvent {
  maxTxOctets: number;
  maxTxTime: number;
  maxRxOctets: number;
  maxRxTime: number;
}

export class LeDataLengthChange {
  static parse(data: Buffer): LeDataLengthChangeEvent {
    if (data.length !== 10) {
      debug(`LeDataLengthChange: invalid size ${data.length}`);
    }

    const connectionHandle = data.readUInt16LE(0);
    const maxTxOctets = data.readUInt16LE(2);
    const maxTxTime = data.readUInt16LE(4);
    const maxRxOctets = data.readUInt16LE(6);
    const maxRxTime = data.readUInt16LE(8);

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
    status: HciErrorErrno;
    event: LeReadLocalP256PublicKeyCompleteEvent;
  } {
    if (data.length !== 65) {
      debug(`LeReadLocalP256PublicKeyComplete: invalid size ${data.length}`);
    }

    const status = numberToHciErrorErrno(data.readUInt8(0));
    const localP256PublicKey = data.subarray(1, 1 + 64).reverse();

    return { status, event: { localP256PublicKey } };
  }
}

export interface LeGenerateDhKeyCompleteEvent {
  dhKey: Buffer;
}

export class LeGenerateDhKeyComplete {
  static parse(data: Buffer): {
    status: HciErrorErrno;
    event: LeGenerateDhKeyCompleteEvent;
  } {
    if (data.length !== 33) {
      debug(`LeGenerateDhKeyComplete: invalid size ${data.length}`);
    }

    const status = numberToHciErrorErrno(data.readUInt8(0));
    const dhKey = data.subarray(1, 1 + 32).reverse();

    return { status, event: { dhKey } };
  }
}

export const LeDirectedAdvEventType = Object.freeze({
  Directed: 1, // Connectable directed advertising (ADV_DIRECT_IND)
} as const);

export type LeDirectedAdvEventType = (typeof LeDirectedAdvEventType)[keyof typeof LeDirectedAdvEventType];

export const LeDirectedAdvEventTypeToName = ObjectReverse(LeDirectedAdvEventType);

export function isLeDirectedAdvEventType(value: number): value is LeDirectedAdvEventType {
  return value in LeDirectedAdvEventTypeToName;
}

export function numberToLeDirectedAdvEventType(value: number): LeDirectedAdvEventType {
  if (!isLeDirectedAdvEventType(value)) {
    throw new Error(`Invalid LeDirectedAdvEventType value: ${value}`);
  }
  return value;
}

export const LeDirectedAdvReportAddrType = Object.freeze({
  RandomDeviceAddress: 0x01, // Random Device Address
} as const);

export type LeDirectedAdvReportAddrType =
  (typeof LeDirectedAdvReportAddrType)[keyof typeof LeDirectedAdvReportAddrType];

export const LeDirectedAdvReportAddrTypeToName = ObjectReverse(LeDirectedAdvReportAddrType);

export function isLeDirectedAdvReportAddrType(value: number): value is LeDirectedAdvReportAddrType {
  return value in LeDirectedAdvReportAddrTypeToName;
}

export function numberToLeDirectedAdvReportAddrType(value: number): LeDirectedAdvReportAddrType {
  if (!isLeDirectedAdvReportAddrType(value)) {
    throw new Error(`Invalid LeDirectedAdvReportAddrType value: ${value}`);
  }
  return value;
}

export interface LeDirectedAdvertisingReportEvent {
  eventType: LeDirectedAdvEventType;
  addressType: LeAdvReportAddrType;
  address: Address;
  directAddressType: LeDirectedAdvReportAddrType;
  directAddress: Address;
  rssi: number | null;
}

export class LeDirectedAdvertisingReport {
  static parse(data: Buffer): LeDirectedAdvertisingReportEvent[] {
    const reports: LeDirectedAdvertisingReportEvent[] = [];

    const numReports = data[0];
    for (let i = 0, o = 1; i < numReports; i++) {
      const eventType = numberToLeDirectedAdvEventType(data.readUInt8(o + 0));
      const addressType = numberToLeAdvReportAddrType(data.readUInt8(o + 1));
      const address = data.readUIntLE(o + 2, 6);
      const directAddressType = numberToLeDirectedAdvReportAddrType(data.readUInt8(o + 8));
      const directAddress = data.readUIntLE(o + 9, 6);
      const rssi = data.readUInt8(o + 15);
      o += 16;

      reports.push({
        eventType,
        addressType,
        address: Address.from(address, addressType),
        directAddressType,
        directAddress: Address.from(directAddress, directAddressType),
        rssi: LeDirectedAdvertisingReport.powerOrNull(rssi),
      });
    }

    return reports;
  }

  private static powerOrNull = (v: number): number | null => (v !== 0x7f ? v : null);
}

export interface LePhyUpdateCompleteEvent extends ConnEvent {
  txPhy: number;
  rxPhy: number;
}

export class LePhyUpdateComplete {
  static parse(data: Buffer): {
    status: HciErrorErrno;
    event: LePhyUpdateCompleteEvent;
  } {
    if (data.length !== 5) {
      debug(`LePhyUpdateComplete: invalid size ${data.length}`);
    }

    const status = numberToHciErrorErrno(data.readUInt8(0));
    const connectionHandle = data.readUInt16LE(1);
    const txPhy = data.readUInt8(3);
    const rxPhy = data.readUInt8(4);

    return {
      status,
      event: {
        connectionHandle,
        txPhy,
        rxPhy,
      },
    };
  }
}
