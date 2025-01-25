// prettier-ignore
export const HciPacketType = Object.freeze({
  Ack:            0,  // Acknowledgment packets
  HciCommand:     1,  // HCI Command packet
  HciAclData:     2,  // HCI ACL Data packet
  HciSyncData:    3,  // HCI Synchronous Data packet
  HciEvent:       4,  // HCI Event packet
  HciIsoData:     5,  // HCI ISO Data packet
  VendorSpecific: 14, // Vendor Specific
  LinkControl:    15, // Link Control packet
} as const);

export type HciPacketType = (typeof HciPacketType)[keyof typeof HciPacketType];

export function isHciPacketType(type: number): type is HciPacketType {
  return type in HciPacketType;
}

export function numberToHciPacketType(type: number): HciPacketType {
  if (!isHciPacketType(type)) {
    throw new Error(`Invalid HCI packet type: ${type}`);
  }
  return type;
}
