export interface RoomInfo {
  locator: string;
  ownerId: string;
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

export interface Message {
  type:
    | 'HELO'
    | 'BYE'
    | 'CREA'
    | 'CACK'
    | 'ENRO'
    | 'DLTE'
    | 'ADD'
    | 'ERR'
    | 'OK';
  ts: string; // iso-8601
}

export interface HeloMessage extends Message {
  type: 'HELO';
  clientId: string;
  userId: string;
  token?: string;
  /** version of the protocol */
  version: string;
}

export interface ByeMessage extends Message {
  type: 'BYE';
  clientId: string;
  userId: string;
}

export interface CreateMessage extends Message {
  type: 'CREA';
  clientId: string;
  userId: string;
  /** Correlation id for the client */
  refId: string;
}
export interface CreateAckMessage extends Message {
  type: 'CACK';
  clientId: string;
  userId: string;
  /** Correlation id for the client */
  refId: string;
  locator: string;
}
export interface EnrollMessage extends Message {
  type: 'ENRO';
  clientId: string;
  userId: string;
  locator: string;
}
export interface DeleteMessage extends Message {
  type: 'DLTE';
  clientId: string;
  userId: string;
  locator: string;
}
export interface AddMessage extends Message {
  type: 'ADD';
  clientId: string;
  userId: string;
  locator: string;
  payload: unknown;
}
export interface ErrorMessage extends Message {
  type: 'ERR';
  clientId: string;
  userId: string;
  locator: string;
  status: number;
  description: string;
}
export interface OkMessage extends Message {
  type: 'OK';
  clientId: string;
  userId: string;
}
