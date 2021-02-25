// HCI Command Errors  [Ver5.2 | Vol1, Part F, 1.3]
export enum HciErrorCode {
  Success                     = 0x00, // Success
  UnknownCommand              = 0x01, // Unknown HCI Command
  UnknownConnectionId         = 0x02, // Unknown Connection Identifier
  HardwareFailure             = 0x03, // Hardware Failure
  PageTimeout                 = 0x04, // Page Timeout
  AuthFailure                 = 0x05, // Authentication Failure
  PinOrKeyMissing             = 0x06, // PIN or Key Missing
  MemoryCapacityExceeded      = 0x07, // Memory Capacity Exceeded
  ConnectionTimeout           = 0x08, // Connection Timeout
  ConnectionLimit             = 0x09, // Connection Limit Exceeded
  SyncConnLimitExceeded       = 0x0A, // Synchronous Connection Limit To A Device Exceeded
  ConnectionExists            = 0x0B, // Connection Already Exists
  CommandDisallowed           = 0x0C, // Command Disallowed
  ConnectedRejectedResources  = 0x0D, // Connection Rejected due to Limited Resources
  ConnectedRejectedSecurity   = 0x0E, // Connection Rejected Due To Security Reasons
  ConnectionRejectedBdAddr    = 0x0F, // Connection Rejected due to Unacceptable BD_ADDR
  ConnectionAcceptTimeout     = 0x10, // Connection Accept Timeout Exceeded
  UnsupportedFeatureOrValue   = 0x11, // Unsupported Feature or Parameter Value
  InvalidCommandParameter     = 0x12, // Invalid HCI Command Parameters
  ConnTerminatedByRemoteUser  = 0x13, // Remote User Terminated Connection
  ConnTerminatedLowResources  = 0x14, // Remote Device Terminated Connection due to Low Resources
  ConnTerminatedPowerOff      = 0x15, // Remote Device Terminated Connection due to Power Off
  ConnTerminatedByHost        = 0x16, // Connection Terminated By Local Host
  RepeatedAttempts            = 0x17, // Repeated Attempts
  PairingNotAllowed           = 0x18, // Pairing Not Allowed
  UnknownLmpPdu               = 0x19, // Unknown LMP PDU
  UnsupportedFeature          = 0x1A, // Unsupported Remote Feature / Unsupported LMP Feature
  ScoOffsetRejected           = 0x1B, // SCO Offset Rejected
  ScoIntervalRejected         = 0x1C, // SCO Interval Rejected
  ScoAirModeRejected          = 0x1D, // SCO Air Mode Rejected
  LmpLlInvalidParams          = 0x1E, // Invalid LMP Parameters / Invalid LL Parameters
  UnspecifiedError            = 0x1F, // Unspecified Error
  LmpLlUnsupportedParam       = 0x20, // Unsupported LMP Parameter Value / Unsupported LL Parameter Value
  RoleChangeNotAllowed        = 0x21, // Role Change Not Allowed
  LmpLlResponseTimeout        = 0x22, // LMP Response Timeout / LL Response Timeout
  LmpLlCollision              = 0x23, // LMP Error Transaction Collision / LL Procedure Collision
  PduNotAllowed               = 0x24, // LMP PDU Not Allowed
  EncNotAccepted              = 0x25, // Encryption Mode Not Acceptable
  LinkKey                     = 0x26, // Link Key cannot be Changed
  QoSNotSupported             = 0x27, // Requested QoS Not Supported
  InstantPassed               = 0x28, // Instant Passed
  UnitKeyNotSupported         = 0x29, // Pairing With Unit Key Not Supported
  DifTransactonsCollision     = 0x2A, // Different Transaction Collision
  Reserved0                   = 0x2B, // Reserved for future use
  QoSParameter                = 0x2C, // QoS Unacceptable Parameter
  QoSRejected                 = 0x2D, // QoS Rejected
  ChannelClass                = 0x2E, // Channel Classification Not Supported
  InsufficientSecurity        = 0x2F, // Insufficient Security
  ParameterOutOfRange         = 0x30, // Parameter Out Of Mandatory Range
  Reserved1                   = 0x31, // Reserved for future use
  RoleSwitchPending           = 0x32, // Role Switch Pending
  Reserved2                   = 0x33, // Reserved for future use
  ReservedSlotViolation       = 0x34, // Reserved Slot Violation
  RoleSwitchFailed            = 0x35, // Role Switch Failed
  ExtendedInqResponseTooLarge = 0x36, // Extended Inquiry Response Too Large
  SecureSimplePairing         = 0x37, // Secure Simple Pairing Not Supported By Host
  HostBusyPairing             = 0x38, // Host Busy - Pairing
  ConnectonRejectedNoChannel  = 0x39, // Connection Rejected due to No Suitable Channel Found
  ControllerBusy              = 0x3A, // Controller Busy
  ConnectionParameters        = 0x3B, // Unacceptable Connection Parameters
  AdvertisingTimeout          = 0x3C, // Advertising Timeout
  ConnectionTerminatedMic     = 0x3D, // Connection Terminated due to MIC Failure
  ConnectionNotEstablished    = 0x3E, // Connection Failed to be Established / Synchronization Timeout
  MacConnectionFailed         = 0x3F, // MAC Connection Failed
  CoarseClock                 = 0x40, // Coarse Clock Adjustment Rejected but Will Try to Adjust Using Clock Dragging
  Type0SubmapNotDefined       = 0x41, // Type0 Submap Not Defined
  UnknownAdvertId             = 0x42, // Unknown Advertising Identifier
  LimitReached                = 0x43, // Limit Reached
  OperationCancelled          = 0x44, // Operation Cancelled by Host
  PacketTooLong               = 0x45, // Packet Too Long
};

export enum HciDisconnectReason {
  AuthFailure                 = HciErrorCode.AuthFailure,
  ConnTerminatedByRemoteUser  = HciErrorCode.ConnTerminatedByRemoteUser,
  ConnTerminatedLowResources  = HciErrorCode.ConnTerminatedLowResources,
  ConnTerminatedPowerOff      = HciErrorCode.ConnTerminatedPowerOff,
  UnsupportedFeature          = HciErrorCode.UnsupportedFeature,
  UnitKeyNotSupported         = HciErrorCode.UnitKeyNotSupported,
  ConnectionParameters        = HciErrorCode.ConnectionParameters,
}

const HciErrorCodeToString: { [id: number]: string } = {
  0x00: "Success",
  0x01: "Unknown HCI Command",
  0x02: "Unknown Connection Identifier",
  0x03: "Hardware Failure",
  0x04: "Page Timeout",
  0x05: "Authentication Failure",
  0x06: "PIN or Key Missing",
  0x07: "Memory Capacity Exceeded",
  0x08: "Connection Timeout",
  0x09: "Connection Limit Exceeded",
  0x0A: "Synchronous Connection Limit To A Device Exceeded",
  0x0B: "Connection Already Exists",
  0x0C: "Command Disallowed",
  0x0D: "Connection Rejected due to Limited Resources",
  0x0E: "Connection Rejected Due To Security Reasons",
  0x0F: "Connection Rejected due to Unacceptable BD_ADDR",
  0x10: "Connection Accept Timeout Exceeded",
  0x11: "Unsupported Feature or Parameter Value",
  0x12: "Invalid HCI Command Parameters",
  0x13: "Remote User Terminated Connection",
  0x14: "Remote Device Terminated Connection due to Low Resources",
  0x15: "Remote Device Terminated Connection due to Power Off",
  0x16: "Connection Terminated By Local Host",
  0x17: "Repeated Attempts",
  0x18: "Pairing Not Allowed",
  0x19: "Unknown LMP PDU",
  0x1A: "Unsupported Remote Feature / Unsupported LMP Feature",
  0x1B: "SCO Offset Rejected",
  0x1C: "SCO Interval Rejected",
  0x1D: "SCO Air Mode Rejected",
  0x1E: "Invalid LMP Parameters / Invalid LL Parameters",
  0x1F: "Unspecified Error",
  0x20: "Unsupported LMP Parameter Value / Unsupported LL Parameter Value",
  0x21: "Role Change Not Allowed",
  0x22: "LMP Response Timeout / LL Response Timeout",
  0x23: "LMP Error Transaction Collision / LL Procedure Collision",
  0x24: "LMP PDU Not Allowed",
  0x25: "Encryption Mode Not Acceptable",
  0x26: "Link Key cannot be Changed",
  0x27: "Requested QoS Not Supported",
  0x28: "Instant Passed",
  0x29: "Pairing With Unit Key Not Supported",
  0x2A: "Different Transaction Collision",
  0x2B: "Reserved for future use",
  0x2C: "QoS Unacceptable Parameter",
  0x2D: "QoS Rejected",
  0x2E: "Channel Classification Not Supported",
  0x2F: "Insufficient Security",
  0x30: "Parameter Out Of Mandatory Range",
  0x31: "Reserved for future use",
  0x32: "Role Switch Pending",
  0x33: "Reserved for future use",
  0x34: "Reserved Slot Violation",
  0x35: "Role Switch Failed",
  0x36: "Extended Inquiry Response Too Large",
  0x37: "Secure Simple Pairing Not Supported By Host",
  0x38: "Host Busy - Pairing",
  0x39: "Connection Rejected due to No Suitable Channel Found",
  0x3A: "Controller Busy",
  0x3B: "Unacceptable Connection Parameters",
  0x3C: "Advertising Timeout",
  0x3D: "Connection Terminated due to MIC Failure",
  0x3E: "Connection Failed to be Established / Synchronization Timeout",
  0x3F: "MAC Connection Failed",
  0x40: "Coarse Clock Adjustment Rejected but Will Try to Adjust Using Clock Dragging",
  0x41: "Type0 Submap Not Defined",
  0x42: "Unknown Advertising Identifier",
  0x43: "Limit Reached",
  0x44: "Operation Cancelled by Host",
  0x45: "Packet Too Long",
};

export class HciError extends Error implements NodeJS.ErrnoException {
  public errno?: number;
  public code?: string;
  public path?: string;
  public syscall?: string;
  public stack?: string;

  constructor(errno: HciErrorCode, path?: string) {
    super()

    this.name = this.constructor.name;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    this.errno = errno;
    this.code = HciError.codeToString(errno);
    this.path = path;

    this.message = `Error: ${this.code}${this.path ? `, '${this.path}'` : ''}`;
  }

  public static codeToString(code: HciErrorCode): string {
    const error = HciErrorCodeToString[code];

    if (error === undefined) {
      // A Host shall consider any error
      // code that it does not explicitly understand equivalent to the error code
      // Unspecified Error (0x1F).
      return HciErrorCodeToString[0x1F];
    }

    return error;
  }
}

export enum HciParserError {
  InvalidPayloadSize,
  Busy,
  Timeout,
}

export function makeHciError(code: HciErrorCode): HciError {
  return new HciError(code);
}

export function makeParserError(code: HciParserError): Error {
  if (code === HciParserError.InvalidPayloadSize) {
    return new Error(`Cannot parse payload, invalid size`);
  }
  if (code === HciParserError.Busy) {
    return new Error(`Busy, command in progress.`)
  }
  if (code === HciParserError.Timeout) {
    return new Error(`Command timeout`);
  }
  return new Error(`Unexpected error`);
}

export function getHciErrorMessage(code: HciErrorCode): string {
  return HciErrorCodeToString[code];
}
