import {
  Message,
  ClientInfo,
  RoomInfo,
  HeloMessage,
  ErrorMessage,
  AddMessage,
  DeleteMessage,
  CreateMessage,
  ByeMessage,
  OkMessage,
  EnrollMessage,
  CreateAckMessage
} from './types';
var WebSocketServer = require('websocket').server;
var http = require('http');

// State management
const clients: { [key: string]: ClientInfo } = {};
const rooms: { [key: string]: RoomInfo } = {};

var server = http.createServer((request: any, response: any) => {
  console.log(new Date() + ' Received request for ' + request.url);
  response.writeHead(404);
  response.end();
});
server.listen(8080, function () {
  console.log(new Date() + ' Server is listening on port 8080');
});

const wsServer = new WebSocketServer({
  httpServer: server,
  // You should not use autoAcceptConnections for production
  // applications, as it defeats all standard cross-origin protection
  // facilities built into the protocol and the browser.  You should
  // *always* verify the connection's origin and decide whether or not
  // to accept it.
  autoAcceptConnections: false
});

function originIsAllowed(origin: string) {
  // put logic here to detect whether the specified origin is allowed.
  return true;
}

wsServer.on('request', (request: any) => {
  if (!originIsAllowed(request.origin)) {
    // Make sure we only accept requests from an allowed origin
    request.reject();
    console.log(
      new Date() + ' Connection from origin ' + request.origin + ' rejected.'
    );
    return;
  }
  const connection = request.accept('esgrima', request.origin);
  console.log(new Date() + ' Connection accepted.');

  // Manage connections (enroll / subscribe)
  const key = request.key;
  clients[key] = {
    connection,
    key,
    user: { id: '', username: '' },
    ts: new Date().toISOString()
  };

  connection.on('message', (message: any) => {
    const content = JSON.parse(message.utf8Data) as Message;
    processMessage(key, content);
  });

  connection.on('close', (reasonCode: string, description: string): void => {
    console.log(
      new Date() +
        ' Peer ' +
        connection.remoteAddress +
        ' disconnected. Reason:' +
        reasonCode +
        ' Description: ' +
        description
    );

    // unsubscribe
    // const clientId = clients[key].key;
    // const userId = clients[key].user.id;
    const username = clients[key].user.username;
    const usersCount = Object.keys(clients).length - 1;
    console.log(
      `${username} was disconected. There are still ${usersCount} + users connected.`
    );
    delete clients[key];
  });
  connection.on('error', (reasonCode: string, description: string): void => {
    console.log(
      new Date() +
        ' Peer ' +
        connection.remoteAddress +
        ' error. Reason:' +
        reasonCode +
        ' Description: ' +
        description
    );
    // delete clients[key]
  });
});

const processMessage = (key: string, msg: Message): void => {
  switch (msg.type.toUpperCase()) {
    case 'HELO':
      return processHelo(key, msg as HeloMessage);
    case 'BYE':
      return processBye(key, msg as ByeMessage);
    case 'CREA':
      return processCreateRoom(key, msg as CreateMessage);
    case 'ENRO':
      return processEnrollToRoom(key, msg as EnrollMessage);
    case 'DLTE':
      return processDeleteRoom(key, msg as DeleteMessage);
    case 'ADD':
      return processAddData(key, msg as AddMessage);
    case 'ERR':
      return processError(msg as ErrorMessage);
    default:
      return processOtherError(msg);
  }
};

const processHelo = (key: string, msg: HeloMessage): void => {
  const userName = msg.clientId;
  clients[key].user.username = userName;

  addClient(key, msg.clientId, userName);
  sendOk(key);
};
const processBye = (key: string, msg: ByeMessage): void => {
  removeClient(key);
  sendOk(key);
};
const processCreateRoom = (key: string, msg: CreateMessage): void => {
  const locator = createLocator(msg);
  createRoom(key, locator);
  sendCack(key, locator);
};
const processEnrollToRoom = (key: string, msg: EnrollMessage): void => {
  enroll(key, msg.locator);
};
const processDeleteRoom = (key: string, msg: DeleteMessage): void => {
  deleteRoom(key, msg.locator);
};
const processAddData = (key: string, msg: AddMessage): void => {
  addToRoom(msg);
  broadcastToOthers(key, msg);
};
const processError = (msg: ErrorMessage): void => {
  console.error(msg);
};
const processOtherError = (msg: Message): void => {
  console.error(msg);
};

const addClient = (key: string, clientId: string, username: string): void => {
  clients[key].user.id = clientId;
  clients[key].user.username = username;
};
const removeClient = (key: string): void => {
  delete clients[key];
};

const addToRoom = (msg: AddMessage): void => {
  let room = rooms[msg.locator];
  if (!room) {
    room = {
      locator: msg.locator,
      ownerId: msg.clientId,
      messages: []
    };
    rooms[msg.locator] = room;
  }
  room.messages.push({
    ts: msg.ts,
    data: msg.payload
  });
};

const sendTo = (clientId: string, msg: Message): void => {
  const payload = JSON.stringify(msg);
  console.log('Sending to ', clientId, ' Payload: ', payload);
  const client = clients[clientId];
  (client.connection as any).send(payload);
};

const sendOk = (clientId: string): void => {
  const client = clients[clientId];
  const userId = client?.user?.id ?? '';
  const okMsg = {
    clientId,
    userId,
    ts: new Date().toISOString()
  } as OkMessage;
  sendTo(clientId, okMsg);
};

const deleteRoom = (key: string, locator: string): void => {
  const client = clients[key];
  const room = rooms[locator];
  if (client?.user.id == room?.ownerId) {
    delete rooms[locator];
  }
};

const createRoom = (key: string, locator: string): void => {
  const client = clients[key];
  const room = {
    locator,
    messages: [],
    ownerId: client?.user.id
  } as RoomInfo;
  rooms[locator] = room;
};

const enroll = (key: string, locator: string): void => {
  const ch = rooms[locator];
  const clientId = clients[key].key;
  const userId = clients[key].user.id;

  ch.messages.forEach((m) => {
    sendTo(clientId, {
      type: 'ADD',
      clientId,
      userId,
      ts: m.ts,
      payload: m.data
    } as AddMessage);
  });
};

const sendCack = (key: string, locator: string): void => {
  const ch = rooms[locator];
  const clientId = clients[key].key;
  const userId = clients[key].user.id;
  sendTo(clientId, {
    type: 'CACK',
    clientId,
    userId,
    ts: new Date().toISOString(),
    locator
  } as CreateAckMessage);
};

const broadcastToOthers = (key: string, msg: Message): void => {
  const payload = JSON.stringify(msg);
  console.log(
    `Broadcasting to others: ${
      Object.keys(clients).length - 1
    } clients. ${payload}`
  );

  Object.values(clients).forEach((v) => {
    if (v.key !== key) {
      (v.connection as any).send(payload);
    }
  });
};

const broadcast = (msg: Message): void => {
  const payload = JSON.stringify(msg);
  console.log(
    `Broadcasting to all: ${Object.keys(clients).length} clients. ${payload}`
  );

  Object.values(clients).forEach((v: any) => {
    v.connection.send(payload);
  });
};

const createLocator = (msg: CreateMessage, size: number = 8): string => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTVWXYZ0123456789';
  let res = '';
  if (size <= 0) {
    size = 8;
  }
  const array = new Uint32Array(size);
  crypto.getRandomValues(array);

  let i = 0;
  while (size > 0) {
    const index = array[i++] % alphabet.length;
    res += alphabet[index];
    size--;
  }
  return res;
};
