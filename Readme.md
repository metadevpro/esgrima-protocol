# DAGA Server

## Abstract

_Proof of Concept_
Minimal backend server & protocol to support collaborative edition of models based on Daga or Essential.

## Stack

- TypeScript
- NodeJS
- WebSockets

## Key Concepts

1. **Model or Document**: the model or document under edition.
2. **User**: Any authenticate user connected to the system.
3. **Client**: A program joining the colaborative editing experience serving a user. Provides the tooling for model edition.
4. **Model Respository**. Central point to store models and to manage access permissions.
5. **Collaborative Session**. Also known as **Room** or **Space**, a session created by an user (model owner) to invite others to collaborate in a model. A room is uniquely identified by a locator.
6. **Collaborative Sesion Server**. Track changes and provides resources to allow collaboration. (this PoC) This piece serves as a broadcast service to avoid clients knowing each others and as a security checkpoint and model persistance in the long term.

## Use Cases

### Imagined Colaboration A

1. Alice shares a model on the Collaborative Sesion Server, opening a room for collaboration and provides a first version of the model.
2. The tool provides a Room ID (or token/locator) that can be shared with other to innitiate collaboration.
3. Alice share the token with friends to start the concurrent editing experience.
4. Bob & Cris receives the code and open their editors (or join via URL).
5. Now they share a synchronized view of the model.
6. They edit concurently and CRDTs and Collaborative Session Server add the magic to distribute changes and keep things synchronized.
7. Cris take a plane and goes offline, he keeps adding changes.
8. Alice and Bob continues editing in paralel.
9. When Cris recover connection, synchronizes work.
10. Alice review it all, declares version 1 is good enough and closes the room.
11. No more changes are allowed to Cris and Bob over version 1.

## The Protocol: `esgrima`

The protocol is described by the messages interchaged between the parties with the central **Collaborative Sesion Server**.

### Message Types

The messages have the following base form:

```ts
enum EsgrimaMessageType {
  HELLO = 'HELO',
  BYE = 'BYE',
  CREATE = 'CREA',
  CREATE_ACK = 'CACK',
  ENROLL = 'ENRO',
  ENROLL_ACK = 'EACK',
  DELETE = 'DLTE',
  ADD = 'ADD',
  OK = 'OK'
  ERROR = 'ERR',
}

interface EsgrimaMessage {
  type: EsgrimaMessageType;
  clientId: string;
  userId: string;
  ts: Date;
}
```

The types of message have the following meaning:

1. `HELO` Connects a client.
2. `BYE` Disconnects a client.
3. `CREA` Creation request for a new room for collaboration.
4. `CACK` Confirmation of creation of the room providing a locator.
5. `ENRO` Enrolls a client into a room using a locator.
6. `EACK` Confirmation of enrollment of a client into a room.
7. `DLTE` Deletes a collaboration room.
8. `ADD` Adds a change to the model in a collaboration space.
9. `OK` Acknowledges that a message has been received successfully.
10. `ERR` Error returned by the server: AuthN, AuthZ, lack of space, malfunction, etc.

#### 1. `HELO` Message

Describes the connection of a new client/user to the server. The `version` indicates the version of the protocol supported for content negotiation. An optional `token` can be provided to authenticate the userId.

```ts
interface HeloMessage extends Message {
  type: EsgrimaMessageType.HELLO;
  token?: string;
  version: string;
}
```

**Example:**

```ts
{
  type: 'HELO',
  ts: '2024-03-25T14:06:01.23Z'
  clientId: 'sa32jks093',
  userId: 'u42',
  version: '0.1'
}
```

#### 2. `BYE` Message

Describes the closing of a session between client and server. This message doesn't remove rooms implicitly or explicitly.

```ts
export interface EsgrimaByeMessage extends EsgrimaMessage {
  type: EsgrimaMessageType.BYE;
}
```

**Example:**

```ts
{
  type: 'BYE',
  ts: '2024-03-25T14:06:01.23Z'
  clientId: 'sa32jks093',
  userId: 'u42'
}
```

#### 3. `CREA` Message

Describes the creation of a room for collaboration. It will be owned by the user creating it. Only owner or admintrators can delete a room.

This message may include an optional `initialModel` which indicates the state of the model at the moment of the room's creation.

```ts
export interface EsgrimaCreateMessage extends EsgrimaMessage {
  type: EsgrimaMessageType.CREATE;
  initialModel?: DagaModel;
}
```

**Example:**

```ts
{
  type: 'CREA',
  ts: '2024-03-25T14:06:01.23Z',
  clientId: 'sa32jks093',
  userId: 'u42',
  initialModel: {
    // ...
  }
}
```

#### 4. `CACK` Message

Confirms the successful creation of a room in response to a `CREA` message. This message includes the `locator` of the room that has been created as well as a `responseTo` field which contains the hash of the message it is responding to. The `responseTo` field can be calculated in any way as long as it is consistent between client and server and distinctive across messages.

```ts
export interface EsgrimaCreateAckMessage extends EsgrimaMessage {
  type: EsgrimaMessageType.CREATE_ACK;
  responseTo: string;
  locator: string;
}
```

**Example:**

```ts
{
  type: 'CACK',
  ts: '2024-03-25T14:06:01.23Z',
  clientId: 'sa32jks093',
  userId: 'u42',
  responseTo: '08ada046e213ed9eeab06d0083a1b898f3dbafd390f87d4d1614b5ac88796e4a',
  locator: 'ABC3456ZB'
}
```

#### 5. `ENRO` Message

Describes the enrollment of an user into a room via a locator.

```ts
export interface EsgrimaEnrollMessage extends EsgrimaMessage {
  type: EsgrimaMessageType.ENROLL;
  locator: string;
}
```

**Example:**

```ts
{
  type: 'ENRO',
  ts: '2024-03-25T14:06:01.23Z'
  clientId: 'device34',
  userId: 'u43',
  locator: 'locatorABDC1234'
}
```

#### 6. `EACK` Message

Confirms the successful enrollment of a user into a room in response to a `ENRO` message. This message includes the `locator` of the room that has been created.

This message can optionally include the `initialModel` and a list of `changes` so that the enrolled user can reconstruct the current state of the model, as well as a list of `userIds` so that the enrolled user can know which other users are present in the room and an `ownerId` so that the enrolled user can know which user is the owner of the room.

Similar to `CACK` messages, `EACK` messages include a `responseTo` field which works in the same way.

```ts
export interface EsgrimaEnrollAckMessage extends EsgrimaMessage {
  type: EsgrimaMessageType.ENROLL_ACK;
  responseTo: string;
  locator: string;
  ownerId?: string;
  initialModel?: DagaModel;
  changes: ModelChange[];
  userIds: string[];
}
```

**Example:**

```ts
{
  type: 'EACK',
  ts: '2024-03-25T14:06:01.23Z',
  clientId: 'sa32jks093',
  userId: 'u42',
  responseTo: '08ada046e213ed9eeab06d0083a1b898f3dbafd390f87d4d1614b5ac88796e4a',
  locator: 'ABC3456ZB',
  ownerId: 'u43',
  initialModel: {
    // ...
  },
  changes: [
    // ...
  ],
  userIds: [
    // ...
  ]
}
```

#### 7. `DLTE` Message

Describes the deletion of a room via a `locator`.

```ts
export interface EsgrimaDeleteMessage extends EsgrimaMessage {
  type: EsgrimaMessageType.DELETE;
  locator: string;
}
```

**Example:**

```ts
{
  type: 'DLTE',
  ts: '2024-03-25T14:06:01.23Z'
  clientId: 'sa32jks093',
  userId: 'u42',
  locator: 'locatorABDC1234'
}
```

#### 8. `ADD` Message

Describes performing changes to the model in a room.

```ts
export interface EsgrimaAddMessage extends EsgrimaMessage {
  type: EsgrimaMessageType.ADD;
  locator: string;
  payload: CollabActionSerialized;
}
```

**Example:**

```ts
{
  type: 'ADD',
  ts: '2024-03-25T14:06:01.23Z'
  clientId: 'sa32jks093',
  userId: 'u42',
  locator: 'locatorABDC1234',
  payload: {
    // ...
  }
}
```

#### 9. `OK` Message

Describes an acknowledgement that a message has been received correctly.

Similar to `CACK` and `EACK` messages, `OK` messages include a `responseTo` field which works in the same way.

```ts
export interface EsgrimaOkMessage extends EsgrimaMessage {
  type: EsgrimaMessageType.OK;
  responseTo: string;
}
```

**Example:**

```ts
{
  type: 'OK',
  ts: '2024-03-25T14:06:01.23Z'
  clientId: 'sa32jks093',
  userId: 'u42',
  responseTo: '08ada046e213ed9eeab06d0083a1b898f3dbafd390f87d4d1614b5ac88796e4a'
}
```

#### 10. `ERR` Message

Describes an error.

If an error occurs while processing a specific message, `ERR` messages can include a `responseTo` field which works in the same way as the `responseTo` field of `CACK`, `EACK` and `OK` messages.

```ts
export interface EsgrimaErrorMessage extends EsgrimaMessage {
  type: EsgrimaMessageType.ERROR;
  responseTo: string;
  locator: string;
  status: number;
  description: string;
}
```

**Example:**

```ts
{
  type: 'ERR',
  ts: '2024-03-25T14:06:01.23Z'
  clientId: 'sa32jks093',
  userId: 'u42',
  responseTo: '',
  locator: 'locatorABDC1234',
  status: '500',
  description: 'Internal Server Error'
}
```

## Usage

1. Install dependencies with `npm i`.
2. Launch the server with `npm start`.
3. Open two tabs in a browser of `client.html`.
4. Log as Alice, create a room, send some changes.
5. In the other tab, log as Bob, enroll into a room with a locator, see changes comming.
6. Collaborate...

## TO DO

- Reconnection pending
- AuthN & AuthZ
- Hibernate space state on innactivity
- Rehidrate on connection

## Licence

Unlicensed. &copy; 2024 [Metadev](https://metadev.pro).
