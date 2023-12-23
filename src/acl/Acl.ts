export enum AclDataBoundary {
  FirstNoFlushFrag,
  NextFrag,
  FirstFrag,
  Complete,
}

export enum AclDataBroadcast {
  PointToPoint,
  Broadcast,
}

export interface AclDataPacket {
  boundary: AclDataBoundary;
  broadcast: AclDataBroadcast;
  data: Buffer;
}
