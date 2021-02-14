export enum HciPacketType {
  Ack             = 0,  // Acknowledgment packets
  HciCommand      = 1,  // HCI Command packet
  HciAclData      = 2,  // HCI ACL Data packet
  HciSyncData     = 3,  // HCI Synchronous Data packet
  HciEvent        = 4,  // HCI Event packet
  HciIsoData      = 5,  // HCI ISO Data packet
  VendorSpecific  = 14, // Vendor Specific
  LinkControl     = 15, // Link Control packet
}
