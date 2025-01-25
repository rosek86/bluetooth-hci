export const L2capChannelId = Object.freeze({
  NullId: 0x00,
  L2capSignalingChannel: 0x01,
  ConnectionlessChannel: 0x02,
  AmpManagerProtocol: 0x03,
  LeAttributeProtocol: 0x04,
  LeL2capSignalingChannel: 0x05,
  LeSecurityManagerProtocol: 0x06,
  BrEdrSecurityManager: 0x07,
  AmpTestManager: 0x3f,
  DynamicallyAllocatedStart: 0x40,
} as const);

export type L2capChannelId = (typeof L2capChannelId)[keyof typeof L2capChannelId];

export function isL2capChannelId(value: number): value is L2capChannelId {
  return value in L2capChannelId;
}

export function numberToL2capChannelId(value: number): L2capChannelId {
  if (!isL2capChannelId(value)) {
    throw new Error(`Invalid L2capChannelId value: ${value}`);
  }
  return value;
}

export function L2capChannelIdGetName(channelId: L2capChannelId): string {
  const entry = Object.entries(L2capChannelId).find(([, value]) => value === channelId)?.[0];
  return entry ?? `Unknown(${channelId})`;
}
