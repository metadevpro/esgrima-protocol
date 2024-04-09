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
export interface DagaModelStub {}

export interface RoomInfo {
  locator: string;
  ownerId: string;
  initialModel: DagaModelStub;
  messages: AddMessage[];
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

export interface IMessage {
  ts: string; // iso-8601
}

export type Message =
  | HeloMessage
  | ByeMessage
  | CreateMessage
  | CreateAckMessage
  | EnrollMessage
  | EnrollAckMessage
  | DeleteMessage
  | AddMessage
  | ErrorMessage
  | OkMessage;

export interface HeloMessage extends IMessage {
  type: 'HELO';
  clientId: string;
  userId: string;
  token?: string;
  /** version of the protocol */
  version: string;
}

export interface ByeMessage extends IMessage {
  type: 'BYE';
  clientId: string;
  userId: string;
}

export interface CreateMessage extends IMessage {
  type: 'CREA';
  clientId: string;
  userId: string;
  /** Correlation id for the client */
  refId: string;
  initialModel: DagaModelStub;
}
export interface CreateAckMessage extends IMessage {
  type: 'CACK';
  clientId: string;
  userId: string;
  /** Correlation id for the client */
  refId: string;
  locator: string;
}
export interface EnrollMessage extends IMessage {
  type: 'ENRO';
  clientId: string;
  userId: string;
  locator: string;
}
export interface EnrollAckMessage extends IMessage {
  type: 'EACK';
  locator: string;
  initialModel: DagaModelStub;
}
export interface DeleteMessage extends IMessage {
  type: 'DLTE';
  clientId: string;
  userId: string;
  locator: string;
}
export interface AddMessage extends IMessage {
  type: 'ADD';
  clientId: string;
  userId: string;
  locator: string;
  payload: unknown;
}
export interface ErrorMessage extends IMessage {
  type: 'ERR';
  clientId: string;
  userId: string;
  locator: string;
  status: number;
  description: string;
}
export interface OkMessage extends IMessage {
  type: 'OK';
  clientId: string;
  userId: string;
}
