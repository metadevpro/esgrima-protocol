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
5. **Collaborative Session**. (room/space, _there is margin for a better name_) A session open by an user (model owner) to invite others to collaborate in a model.
6. **Collaborative Sesion Server**. Track changes and provides resources to allow collaboration. (this PoC)
   This piece serves as a broadcast services to avoid clients to know each others, as a security checkpoint and model persistance in the long term.

## Use Cases

### Imagined Colaboration A

1. Alice shares a model on the Collaborative Sesion Server, opening a "room/space" for collaboration and provides a first version of the model.
2. The tool provides a Room ID (or token/locator) that can be shared with other to innitiate collaboration.
3. Alice share the token with friends to start the concurrent editing experience.
4. Bob & Cris receives the code and open their editors (or join via URL).
5. Now they share a synchronized view of the model.
6. They edit concurently and CRDTs and Collaborative Session Server add the magic to distribute changes and keep things synchronized.
7. Cris take a plane and goes offline, he keeps adding changes.
8. Alice and Bob continues editing in paralel.
9. When Cris recover connection, synchronizes work.
10. Alice review it all, declares version 1 is good enough and closes the "room/space".
11. No more changes are allowed to Cris and Bob over version 1.

## The Protocol: `esgrima`

The protocol is described by the messages interchaged between the parties with the central **Collaborative Sesion Server**.

### Message Type

The messages has the following base form:

```typescript
interface Message {
  type: 'HELO' | 'BYE' | 'CREA' | 'CACK' | 'ENRO' | 'DLTE' | 'ADD' | 'ERR';
  ts: Date;
  clientId: string;
  userId: string;
}
```

**Message types:**

1. `HELO` Connects a client.
2. `BYE` Disconnects a client.
3. `CREA` Creation request for a new room for collaboration.
4. `CACK` Confirmation of creation of the room providing a locator.
5. `ENRO` Enrolls a client into a room using a locator.
6. `DLTE` Deletes a collaboration room.
7. `ADD` Adds data to a collaboration space.
8. `ERR` Error returned by the server: AuthN, AuthZ, lack of space, malfunction, etc.
9. `OK` Explicit ACK response of the last command.

### 1. `HELO` Message

Describes the connection of a new client/user to the server. The version indicates the version of the protocol supported for content negotiation. Optional token can be provided to authenticate the userId.

```typescript
interface HeloMessage extends Message {
  type: 'HELO';
  clientId: string;
  token?: string;
  userId: string;
  version: string;
}
```

**Example:**

```typescript
{
    type: 'HELO',
    ts: '2024-03-25T14:06:01.23Z'
    clientId: 'sa32jks093',
    userId: 'u42',
    version: '0.1'
}

```

### 2. `BYE` Message

Describes the closing of a session between client and server.
This close (implicit or explicit) do not removes rooms/spaces/sessions for collaborations.

```typescript
interface ByeMessage extends Message {
  type: 'BYE';
  clientId: string;
  userId: string;
}
```

**Example:**

```typescript
{
    type: 'BYE',
    ts: '2024-03-25T14:06:01.23Z'
    clientId: 'sa32jks093',
    userId: 'u42',
}

```

### 3. `CREA` Message

Describes the creation of a room/space/session for collaboration. It will be owned by the user creating it. Only owner or admintrators can delete it later.

```typescript
interface ByeMessage extends Message {
  type: 'CREA';
  clientId: string;
  userId: string;
  refId: string;
}
```

**Example:**

```typescript
{
    type: 'CREA',
    ts: '2024-03-25T14:06:01.23Z',
    clientId: 'sa32jks093',
    userId: 'u42',
    refId: 'doc1234-rev-session-1'
}
```

### 4. `CACK` Message

Confirms the creation of a room for collaboration providing its unique locator.

```typescript
interface ByeMessage extends Message {
  type: 'CACK';
  clientId: string;
  userId: string;
  refId: string;
  locator: string;
}
```

**Example:**

```typescript
{
    type: 'CACK',
    ts: '2024-03-25T14:06:01.23Z',
    clientId: 'sa32jks093',
    userId: 'u42',
    refId: 'doc1234-rev-session-1',
    locator: 'ABC3456ZB',
}
```

### 5. `ENRO` Message

Enrolls into a room/space/session for collaboration via a locator.

```typescript
interface EnrollMessage extends Message {
  type: 'DLTE';
  clientId: string;
  userId: string;
  locator: string;
}
```

**Example:**

```typescript
{
    type: 'ENRO',
    ts: '2024-03-25T14:06:01.23Z'
    clientId: 'device34',
    userId: 'u43',
    locator: 'locatorABDC1234'
}
```

### 6. `DLTE` Message

Describes the deletion of a room/space/session for collaboration.

```typescript
interface DeleteMessage extends Message {
  type: 'DLTE';
  clientId: string;
  userId: string;
  locator: string;
}
```

**Example:**

```typescript
{
    type: 'DLTE',
    ts: '2024-03-25T14:06:01.23Z'
    clientId: 'sa32jks093',
    userId: 'u42',
    locator: 'locatorABDC1234'
}
```

### 7. `ADD` Message

Adds a new command with changes to the shared model to be broadcasted to all interested parties.

```typescript
interface AddMessage extends Message {
  type: 'ADD';
  clientId: string;
  userId: string;
  locator: string;
  payload: unknown;
}
```

**Example:**

```typescript
{
    type: 'ADD',
    ts: '2024-03-25T14:06:01.23Z'
    clientId: 'sa32jks093',
    userId: 'u42',
    locator: 'locatorABDC1234',
    payload: {
        ...add node...
    }
}
```

### 8. `ERR` Message

Returns an error from server. Some applications: AuthN, AuthZ, lack of space, malfunction, etc.

```typescript
interface AddMessage extends Message {
  type: 'ERR';
  clientId: string;
  userId: string;
  locator: string;
  status: number;
  description: string;
}
```

### 9. `OK` Message

Returns OK form server as ACK.

```typescript
interface OkMessage extends Message {
  type: 'OK';
}
```

**Example:**

```typescript
{
    type: 'OK',
    ts: '2024-03-25T14:06:01.23Z'
}
```

## Usage

1. Install dependencies with `npm i`.
2. Launch the server with `npm start`.
3. Open two tabs ina browser of `index.html`.
4. Log as Alice, create a room, send some changes.
5. In the other tab, log as Bob, enroll a room with a locator, see changes comming.
6. Colab...

## TO DO

- Reconnection pending
- AuthN & AuthZ
- Hibernate space state on innactivity
- Rehidrate on connection

## Licence

Unlicensed. &copy; 2024 [Metadev](https://metadev.pro).
