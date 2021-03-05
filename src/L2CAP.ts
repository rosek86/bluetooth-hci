import Debug from 'debug';

import { Hci } from "./Hci";
import { HciError } from './HciError';
import { DisconnectionCompleteEvent } from './HciEvent';
import { LeBufferSize } from "./HciLeController";
import { AclDataBoundary, AclDataBroadcast, NumberOfCompletedPacketsEntry } from "./Hci";

const debug = Debug('nble-l2cap');

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

interface AclQueueEntry {
  connectionHandle: number;
  fragment: Buffer;
  boundary: AclDataBoundary;
  broadcast: AclDataBroadcast;
}

export class L2CAP {
  private readonly l2capHeader = 4;

  private aclSize: LeBufferSize = {
    leAclDataPacketLength: 0,
    totalNumLeAclDataPackets: 0,
  };
  private aclQueue: AclQueueEntry[] = [];
  private aclConnections: Map<number, { pending: number }> = new Map();

  constructor(private hci: Hci) {
  }

  public async init(): Promise<void> {
    const aclSize = await this.hci.leReadBufferSize();

    if (aclSize.leAclDataPacketLength === 0 || aclSize.totalNumLeAclDataPackets === 0) {
      // No dedicated LE Buffer exists. Use the HCI_Read_Buffer_Size command.
      const bufferSize = await this.hci.readBufferSize();

      aclSize.leAclDataPacketLength    = bufferSize.aclDataPacketLength;
      aclSize.totalNumLeAclDataPackets = bufferSize.totalNumAclDataPackets;
    }

    this.aclSize = aclSize;

    this.hci.on('LeEnhancedConnectionComplete',   this.onLeConnectionComplete);
    this.hci.on('LeConnectionComplete',           this.onLeConnectionComplete);
    this.hci.on('DisconnectionComplete',          this.onDisconnectionComplete);
    this.hci.on('NumberOfCompletedPacketsEntry',  this.onNumberOfCompletedPackets);
  }

  public destroy(): void {
    this.hci.removeListener('LeEnhancedConnectionComplete',   this.onLeConnectionComplete);
    this.hci.removeListener('LeConnectionComplete',           this.onLeConnectionComplete);
    this.hci.removeListener('DisconnectionComplete',          this.onDisconnectionComplete);
    this.hci.removeListener('NumberOfCompletedPacketsEntry',  this.onNumberOfCompletedPackets);
  }

  public async writeAclData(connectionHandle: number, channelId: number, payload: Buffer): Promise<void> {
    const l2capLength = this.l2capHeader + payload.length;

    const aclLength = Math.min(l2capLength, this.aclSize.leAclDataPacketLength);

    const fragment = Buffer.allocUnsafe(aclLength);
    fragment.writeUIntLE(payload.length,  0, 2);
    fragment.writeUIntLE(channelId,       2, 2);
    payload.copy(fragment, 4);

    payload = payload.slice(fragment.length - 4);

    this.aclQueue.push({
      connectionHandle, fragment,
      boundary: AclDataBoundary.FirstNoFlushFrag,
      broadcast: AclDataBroadcast.PointToPoint,
    });

    while (payload.length > 0) {
      const aclLength = Math.min(payload.length, this.aclSize.leAclDataPacketLength);

      const fragment = Buffer.alloc(aclLength);
      payload.copy(fragment, 0);

      payload = payload.slice(fragment.length);

      this.aclQueue.push({
        connectionHandle, fragment,
        boundary: AclDataBoundary.NextFrag,
        broadcast: AclDataBroadcast.PointToPoint,
      });
    }

    this.flushAcl();
  }

  private async flushAcl(): Promise<void> {
    debug(`flush - pending: ${this.pendingPackets()}, queue length: ${this.aclQueue.length}`);

    while (this.aclQueue.length > 0 && !this.isControllerBusy()) {
      const aclEntry = this.aclQueue.shift();
      if (!aclEntry) {
        continue;
      }

      const { connectionHandle, fragment } = aclEntry;

      const connection = this.aclConnections.get(connectionHandle);
      if (!connection) {
        continue;
      }

      connection.pending++;

      await this.hci.writeAclData(connectionHandle, {
        boundary:   AclDataBoundary.FirstNoFlushFrag,
        broadcast:  AclDataBroadcast.PointToPoint,
        data:       fragment,
      });
    }
  }

  private isControllerBusy(): boolean {
    return this.pendingPackets() === this.aclSize.totalNumLeAclDataPackets;
  }

  private pendingPackets(): number {
    let totalPending = 0;
    for (const { pending } of this.aclConnections.values()) {
      totalPending += pending;
    }
    return totalPending;
  }

  private onLeConnectionComplete = (err: HciError|null, event: { connectionHandle: number }): void => {
    if (err !== null) {
      debug(`Can't connect ${err.code}`);
      return;
    }

    this.aclConnections.set(event.connectionHandle, { pending: 0 });
  }

  private onDisconnectionComplete = (err: HciError|null, event: DisconnectionCompleteEvent): void => {
    if (err !== null) {
      debug(`Can't disconnect ${err.code}`);
      return;
    }

    this.aclQueue = this.aclQueue.filter(acl => acl.connectionHandle !== event.connectionHandle);
    this.aclConnections.delete(event.connectionHandle);
    this.flushAcl();
  }

  private onNumberOfCompletedPackets = (event: NumberOfCompletedPacketsEntry[]): void => {
    for (const { connectionHandle, numCompletedPackets } of event) {
      const connection = this.aclConnections.get(connectionHandle);
      if (!connection) {
        continue;
      }

      connection.pending -= numCompletedPackets;

      if (connection.pending < 0) {
        connection.pending = 0;
      }
    }

    this.flushAcl();
  }
}
