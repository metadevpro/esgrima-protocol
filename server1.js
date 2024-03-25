var WebSocketServer = require('websocket').server;
const { channel } = require('diagnostics_channel');
var http = require('http');

// State management
const clients = {};
const channels = {};

var server = http.createServer(function (request, response) {
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

function originIsAllowed(origin) {
  // put logic here to detect whether the specified origin is allowed.
  return true;
}

wsServer.on('request', function (request) {
  if (!originIsAllowed(request.origin)) {
    // Make sure we only accept requests from an allowed origin
    request.reject();
    console.log(
      new Date() + ' Connection from origin ' + request.origin + ' rejected.'
    );
    return;
  }
  var connection = request.accept('esgrima', request.origin);
  console.log(new Date() + ' Connection accepted.');

  // Manage connections (enroll / subscribe)
  const key = request.key;
  clients[key] = { connection, key, nick: null };

  connection.on('message', function (message) {
    var content = JSON.parse(message.utf8Data);
    if (content.channel === 'commands' && content.message === '#HELO#') {
      var nick = content.clientId;
      clients[key].nick = nick;

      content = {
        channel: 'general',
        clientId: 'system',
        message:
          nick +
          ' is connected. There are ' +
          Object.keys(clients).length +
          ' users connected.'
      };
      addToChannel(content);
      enroll(key, content.channel);
      broadcast(content);
    } else {
      addToChannel(content);
      broadcast(content);
    }
  });

  connection.on('close', function (reasonCode, description) {
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
    const nick = clients[key].nick;
    broadcast({
      channel: 'general',
      clientId: 'system',
      message:
        nick +
        ' was disconected. There are still ' +
        (Object.keys(clients).length - 1) +
        ' users connected.'
    });

    delete clients[key];
  });
  connection.on('error', function (reasonCode, description) {
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

function addToChannel(msg) {
  let ch = channels[msg.channel];
  if (!ch) {
    ch = {
      name: msg.channel,
      messages: []
    };
    channels[msg.channel] = ch;
  }
  ch.messages.push(msg.message);
}

function sentTo(clientId, msg) {
  const payload = JSON.stringify(msg);
  console.log('Sending to ', clientId, ' Payload: ', payload);
  const client = clients[clientId];
  client.connection.send(payload);
}

function enroll(clientId, channelName) {
  const ch = channels[channelName];
  ch.messages.forEach((m) => {
    sentTo(clientId, {
      channel: channelName,
      clientId,
      message: m
    });
  });
}

function broadcast(msg) {
  const payload = JSON.stringify(msg);
  console.log(
    'Broadcasting to ',
    Object.keys(clients).length,
    ' clients.',
    payload
  );

  Object.values(clients).forEach((v) => {
    v.connection.send(payload);
  });
}
