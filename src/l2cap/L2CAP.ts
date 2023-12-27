import Debug from "debug";
import { EventEmitter } from "events";

import { L2capChannelId } from "./L2capChannelId.js";

import { Hci } from "../hci/Hci.js";
import { HciError } from "../hci/HciError.js";
import { DisconnectionCompleteEvent, NumberOfCompletedPacketsEntry } from "../hci/HciEvent.js";
import { LeBufferSize } from "../hci/HciLeController.js";
import { AclDataBoundary, AclDataBroadcast, AclDataPacket } from "../acl/Acl.js";

const debug = Debug("bt-hci-l2cap");

interface AclQueueEntry {
  connectionHandle: number;
  fragment: Buffer;
  boundary: AclDataBoundary;
  broadcast: AclDataBroadcast;
}

interface AclFragments {
  channelId: L2capChannelId;
  length: number;
  payload: Buffer;
}

export declare interface L2CAP {
  on(event: "AttData", listener: (connectionHandle: number, payload: Buffer) => void): this;
  on(event: "SmpData", listener: (connectionHandle: number, payload: Buffer) => void): this;
  on(event: "Disconnected", listener: (connectionHandle: number, reason: number) => void): this;
}

export class L2CAP extends EventEmitter {
  private readonly l2capHeader = 4;

  private aclSize: LeBufferSize = {
    leAclDataPacketLength: 0,
    totalNumLeAclDataPackets: 0,
  };
  private aclQueue: AclQueueEntry[] = [];
  private aclConnections: Map<number, { pending: number }> = new Map();
  private aclFragments: Map<number, AclFragments> = new Map();

  constructor(private hci: Hci) {
    super();
  }

  public async init(): Promise<void> {
    const aclSize = await this.hci.leReadBufferSize();

    if (aclSize.leAclDataPacketLength === 0 || aclSize.totalNumLeAclDataPackets === 0) {
      // No dedicated LE Buffer exists. Use the HCI_Read_Buffer_Size command.
      const bufferSize = await this.hci.readBufferSize();

      aclSize.leAclDataPacketLength = bufferSize.aclDataPacketLength;
      aclSize.totalNumLeAclDataPackets = bufferSize.totalNumAclDataPackets;
    }

    this.aclSize = aclSize;

    debug(`ACL Size: ${JSON.stringify(aclSize)}`);

    this.hci.on("LeEnhancedConnectionComplete", this.onLeConnectionComplete);
    this.hci.on("LeConnectionComplete", this.onLeConnectionComplete);
    this.hci.on("DisconnectionComplete", this.onDisconnectionComplete);
    this.hci.on("NumberOfCompletedPackets", this.onNumberOfCompletedPackets);
    this.hci.on("AclData", this.onAclData);
  }

  public destroy(): void {
    this.hci.removeListener("LeEnhancedConnectionComplete", this.onLeConnectionComplete);
    this.hci.removeListener("LeConnectionComplete", this.onLeConnectionComplete);
    this.hci.removeListener("DisconnectionComplete", this.onDisconnectionComplete);
    this.hci.removeListener("NumberOfCompletedPackets", this.onNumberOfCompletedPackets);
    this.hci.removeListener("AclData", this.onAclData);
  }

  public async writeAclData(connectionHandle: number, channelId: L2capChannelId, payload: Buffer): Promise<void> {
    const l2capLength = this.l2capHeader + payload.length;

    const aclLength = Math.min(l2capLength, this.aclSize.leAclDataPacketLength);

    const fragment = Buffer.alloc(aclLength);
    fragment.writeUIntLE(payload.length, 0, 2);
    fragment.writeUIntLE(channelId, 2, 2);
    payload.copy(fragment, 4);

    payload = payload.subarray(fragment.length - 4);

    this.aclQueue.push({
      connectionHandle,
      fragment,
      boundary: AclDataBoundary.FirstNoFlushFrag,
      broadcast: AclDataBroadcast.PointToPoint,
    });

    while (payload.length > 0) {
      const aclLength = Math.min(payload.length, this.aclSize.leAclDataPacketLength);

      const fragment = Buffer.alloc(aclLength);
      payload.copy(fragment, 0);

      payload = payload.subarray(fragment.length);

      this.aclQueue.push({
        connectionHandle,
        fragment,
        boundary: AclDataBoundary.NextFrag,
        broadcast: AclDataBroadcast.PointToPoint,
      });
    }

    await this.flushAcl();
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
        boundary: AclDataBoundary.FirstNoFlushFrag,
        broadcast: AclDataBroadcast.PointToPoint,
        data: fragment,
      });

      debug(`Write ACL fragment, pending ${connection.pending}`);
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

  private onLeConnectionComplete = (err: HciError | null, event: { connectionHandle: number }): void => {
    if (err !== null) {
      debug(`Can't connect ${err.code}`);
      return;
    }

    this.aclConnections.set(event.connectionHandle, { pending: 0 });
  };

  private onDisconnectionComplete = (err: HciError | null, event: DisconnectionCompleteEvent): void => {
    if (err !== null) {
      debug(`Can't disconnect ${err.code}`);
      return;
    }

    const connectionHandle = event.connectionHandle;

    this.aclQueue = this.aclQueue.filter((acl) => acl.connectionHandle !== connectionHandle);
    this.aclConnections.delete(connectionHandle);
    this.flushAcl();

    this.emit("Disconnected", connectionHandle, event.reason);
  };

  private onNumberOfCompletedPackets = (_: Error | null, event: NumberOfCompletedPacketsEntry): void => {
    const { connectionHandle, numCompletedPackets } = event;

    const connection = this.aclConnections.get(connectionHandle);
    if (!connection) {
      return;
    }

    connection.pending -= numCompletedPackets;

    if (connection.pending < 0) {
      connection.pending = 0;
    }

    this.flushAcl();
  };

  private onAclData = (connectionHandle: number, event: AclDataPacket): void => {
    debug("acl-data", connectionHandle, event);

    if (event.boundary === AclDataBoundary.FirstFrag) {
      const length = event.data.readUIntLE(0, 2);
      const channelId = event.data.readUIntLE(2, 2);
      const payload = event.data.subarray(4);

      if (length === payload.length) {
        this.onAclDataComplete(connectionHandle, channelId, payload);
      } else {
        if (length < payload.length) {
          return debug("acl: data length error");
        }

        this.aclFragments.set(connectionHandle, {
          length,
          channelId,
          payload,
        });
      }
      return;
    }
    if (event.boundary === AclDataBoundary.NextFrag) {
      const fragments = this.aclFragments.get(connectionHandle);
      if (!fragments) {
        return;
      }

      fragments.payload = Buffer.concat([fragments.payload, event.data]);

      if (fragments.payload.length === fragments.length) {
        const { channelId, payload } = fragments;
        this.onAclDataComplete(connectionHandle, channelId, payload);
        this.aclFragments.delete(connectionHandle);
      }
      if (fragments.payload.length > fragments.length) {
        this.aclFragments.delete(connectionHandle);
      }
    }
  };

  private onAclDataComplete(connectionHandle: number, channelId: L2capChannelId, payload: Buffer): void {
    debug("acl", connectionHandle, L2capChannelId[channelId], payload);

    if (channelId === L2capChannelId.LeAttributeProtocol) {
      this.emit("AttData", connectionHandle, payload);
    }
    if (channelId === L2capChannelId.LeSecurityManagerProtocol) {
      this.emit("SmpData", connectionHandle, payload);
    }

    console.log("onAclDataComplete", connectionHandle, channelId, payload);
  }
}
