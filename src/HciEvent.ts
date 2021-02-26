import { HciError, HciErrorCode } from "./HciError";

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
  ReadRemoteVersionInformationComplete                = 0x0C, // Read Remote Version Information Complete
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
  LEMeta                                              = 0x3E, // * LE Meta
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

export interface DisconnectionCompleteEvent {
  connectionHandle: number;
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

export interface EncryptionChangeEvent {
  connectionHandle: number;
  encEnabled: EncryptionEnabled;
}

export enum HciLeEvent {
  ConnectionComplete                                  = 0x01, // * LE Connection Complete
  AdvertisingReport                                   = 0x02, // * LE Advertising Report
  ConnectionUpdateComplete                            = 0x03, // * LE Connection Update Complete
  ReadRemoteFeaturesComplete                          = 0x04, // * LE Read Remote Features Complete
  LongTermKeyRequest                                  = 0x05, // LE Long Term Key Request
  RemoteConnectionParameterRequest                    = 0x06, // LE Remote Connection Parameter Request
  DataLengthChange                                    = 0x07, // LE Data Length Change
  ReadLocalP256PublicKeyComplete                      = 0x08, // LE Read Local P-256 Public Key Complete
  GenerateDhKeyComplete                               = 0x09, // LE Generate DHKey Complete
  EnhancedConnectionComplete                          = 0x0A, // * LE Enhanced Connection Complete
  DirectedAdvertisingReport                           = 0x0B, // LE Directed Advertising Report
  PhyUpdateComplete                                   = 0x0C, // LE PHY Update Complete
  ExtendedAdvertisingReport                           = 0x0D, // * LE Extended Advertising Report
  PeriodicAdvertisingSyncEstablished                  = 0x0E, // LE Periodic Advertising Sync Established
  PeriodicAdvertisingReport                           = 0x0F, // LE Periodic Advertising Report
  PeriodicAdvertisingSyncLost                         = 0x10, // LE Periodic Advertising Sync Lost
  ScanTimeout                                         = 0x11, // LE Scan Timeout
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
