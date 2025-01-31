import { ObjectReverse } from "../utils/Utils.ts";

export const AclDataBoundary = Object.freeze({
  FirstNoFlushFrag: 0,
  NextFrag: 1,
  FirstFrag: 2,
  Complete: 3,
} as const);

export type AclDataBoundary = (typeof AclDataBoundary)[keyof typeof AclDataBoundary];

export const AclDataBoundaryToName = ObjectReverse(AclDataBoundary);

export function isAclDataBoundary(value: number): value is AclDataBoundary {
  return value in AclDataBoundaryToName;
}

export function numberToAclDataBoundary(value: number): AclDataBoundary {
  if (!isAclDataBoundary(value)) {
    throw new Error(`Invalid AclDataBoundary value: ${value}`);
  }
  return value;
}

export const AclDataBroadcast = Object.freeze({
  PointToPoint: 0,
  Broadcast: 1,
} as const);

export type AclDataBroadcast = (typeof AclDataBroadcast)[keyof typeof AclDataBroadcast];

export const AclDataBroadcastToName = ObjectReverse(AclDataBroadcast);

export function isAclDataBroadcast(value: number): value is AclDataBroadcast {
  return value in AclDataBroadcastToName;
}

export function numberToAclDataBroadcast(value: number): AclDataBroadcast {
  if (!isAclDataBroadcast(value)) {
    throw new Error(`Invalid AclDataBroadcast value: ${value}`);
  }
  return value;
}

export interface AclDataPacket {
  boundary: AclDataBoundary;
  broadcast: AclDataBroadcast;
  data: Buffer;
}
