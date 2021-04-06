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
