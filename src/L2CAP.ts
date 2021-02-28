export enum L2capChannelId {
  NullId                    = 0x00,
  L2capSignalingChannel     = 0x01,
  ConnectionlessChannel     = 0x02,
  AmpManagerProtocol        = 0x03,
  LeAttributeProtocol       = 0x04,
  LeL2capSignalingChannel   = 0x05,
  LeSecurityManagerProtocol = 0x06,
  BrEdrSecurityManager      = 0x07,
  AmpTestManager            = 0x3F,
  DynamicallyAllocatedStart = 0x40,
}

export enum L2capSignalingCommand {
  L2CAP_COMMAND_REJECT_RSP               = 0x01, // 0x0001 and 0x0005
  L2CAP_CONNECTION_REQ                   = 0x02, // 0x0001
  L2CAP_CONNECTION_RSP                   = 0x03, // 0x0001
  L2CAP_CONFIGURATION_REQ                = 0x04, // 0x0001
  L2CAP_CONFIGURATION_RSP                = 0x05, // 0x0001
  L2CAP_DISCONNECTION_REQ                = 0x06, // 0x0001 and 0x0005
  L2CAP_DISCONNECTION_RSP                = 0x07, // 0x0001 and 0x0005
  L2CAP_ECHO_REQ                         = 0x08, // 0x0001
  L2CAP_ECHO_RSP                         = 0x09, // 0x0001
  L2CAP_INFORMATION_REQ                  = 0x0A, // 0x0001
  L2CAP_INFORMATION_RSP                  = 0x0B, // 0x0001
  L2CAP_CREATE_CHANNEL_REQ               = 0x0C, // 0x0001
  L2CAP_CREATE_CHANNEL_RSP               = 0x0D, // 0x0001
  L2CAP_MOVE_CHANNEL_REQ                 = 0x0E, // 0x0001
  L2CAP_MOVE_CHANNEL_RSP                 = 0x0F, // 0x0001
  L2CAP_MOVE_CHANNEL_CONFIRMATION_REQ    = 0x10, // 0x0001
  L2CAP_MOVE_CHANNEL_CONFIRMATION_RSP    = 0x11, // 0x0001
  L2CAP_CONNECTION_PARAMETER_UPDATE_REQ  = 0x12, // 0x0005
  L2CAP_CONNECTION_PARAMETER_UPDATE_RSP  = 0x13, // 0x0005
  L2CAP_LE_CREDIT_BASED_CONNECTION_REQ   = 0x14, // 0x0005
  L2CAP_LE_CREDIT_BASED_CONNECTION_RSP   = 0x15, // 0x0005
  L2CAP_FLOW_CONTROL_CREDIT_IND          = 0x16, // 0x0001 and 0x0005
  L2CAP_CREDIT_BASED_CONNECTION_REQ      = 0x17, // 0x0001 and 0x0005
  L2CAP_CREDIT_BASED_CONNECTION_RSP      = 0x18, // 0x0001 and 0x0005
  L2CAP_CREDIT_BASED_RECONFIGURE_REQ     = 0x19, // 0x0001 and 0x0005
  L2CAP_CREDIT_BASED_RECONFIGURE_RSP     = 0x1A, // 0x0001 and 0x0005
}

export class L2CAP {

  public send(channelId: L2capChannelId, payload: Buffer): void {
    const buffer = Buffer.allocUnsafe(4 + payload.length);
    buffer.writeUIntLE(channelId,       0, 2);
    buffer.writeUIntLE(payload.length,  2, 2);
    payload.copy(buffer, 4);


  }
}