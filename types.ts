/**
 * Message types for communicating with the daga server.
 *
 * Duplicated between https://github.com/metadevpro/daga-server/blob/dev/types.ts and
 * https://github.com/metadevpro/daga/blob/dev/libs/daga/src/lib/diagram-editor/diagram/collab/message-types.ts
 */

/**
 * Stand-in for the DagaModel type on the server.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DagaModel {}
/**
 * Stand-in for the CollabActionSerialized type on the server.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CollabActionSerialized {}

export interface RoomInfo {
  locator: string;
  ownerId: string;
  initialModel: DagaModel;
  messages: EsgrimaAddMessage[];
}

export interface UserInfo {
  id: string;
  username: string;
}

export interface ClientInfo {
  key: string;
  connection: unknown;
  user: UserInfo;
  ts: string; // iso-8601
}

// MESSAGE TYPES

export enum EsgrimaMessageType {
  ADD = 'ADD',
  BYE = 'BYE',
  CREATE = 'CREA',
  CREATE_ACK = 'CACK',
  DELETE = 'DLTE',
  ENROLL = 'ENRO',
  ENROLL_ACK = 'EACK',
  ERROR = 'ERR',
  HELLO = 'HELO',
  OK = 'OK'
}

export interface ModelChange {
  data: CollabActionSerialized;
  ts: string;
  userId: string;
}

export interface EsgrimaMessage {
  /**
   * The type of the message.
   * @see EsgrimaMessageType
   */
  type: EsgrimaMessageType;
  /**
   * Client ID.
   */
  clientId: string;
  /**
   * User ID.
   */
  userId: string;
  /**
   * Timestamp in an ISO-8601 format.
   */
  ts: string;
}

export interface EsgrimaResponseMessage extends EsgrimaMessage {
  /**
   * The hash of the message that this message is a response to.
   */
  responseTo: string;
}

export interface EsgrimaHelloMessage extends EsgrimaMessage {
  type: EsgrimaMessageType.HELLO;
  token?: string;
  /**
   * Protocol version.
   */
  version: string;
}

export interface EsgrimaByeMessage extends EsgrimaMessage {
  type: EsgrimaMessageType.BYE;
}

export interface EsgrimaCreateMessage extends EsgrimaMessage {
  type: EsgrimaMessageType.CREATE;
  initialModel?: DagaModel;
}

export interface EsgrimaCreateAckMessage extends EsgrimaResponseMessage {
  type: EsgrimaMessageType.CREATE_ACK;
  locator: string;
}

export interface EsgrimaEnrollMessage extends EsgrimaMessage {
  type: EsgrimaMessageType.ENROLL;
  locator: string;
}

export interface EsgrimaEnrollAckMessage extends EsgrimaResponseMessage {
  type: EsgrimaMessageType.ENROLL_ACK;
  locator: string;
  initialModel?: DagaModel;
  changes: ModelChange[];
  userIds: string[];
}

export interface EsgrimaDeleteMessage extends EsgrimaMessage {
  type: EsgrimaMessageType.DELETE;
  locator: string;
}

export interface EsgrimaAddMessage extends EsgrimaMessage {
  type: EsgrimaMessageType.ADD;
  locator: string;
  payload: CollabActionSerialized;
}

export interface EsgrimaErrorMessage extends EsgrimaResponseMessage {
  type: EsgrimaMessageType.ERROR;
  locator: string;
  status: number;
  description: string;
}

export interface EsgrimaOkMessage extends EsgrimaResponseMessage {
  type: EsgrimaMessageType.OK;
}

export const hashMessage = (message: EsgrimaMessage): string => {
  return `${message.clientId}${message.userId}${message.ts}`;
};
