var clientName = 'Alice';
var client;

var deviceId = 'deviceId' + Math.floor(Math.random() * 1000);

function logToPage(message) {
  var board = document.getElementById('board');
  board.innerHTML += message + '<br/>';
}
function disconnect() {
  if (client) {
    client.close();
    logToPage('Closed connection.');
    client = null;
  }
}

function createRoom() {
  var refId = document.getElementById('refId').value;
  if (client) {
    sendCreateMessage(refId);
    logToPage('Request create room ' + refId);
  }
}
function enrollRoom() {
  var locator = document.getElementById('locator').value;
  if (client) {
    sendEnrollMessage(locator);
    logToPage('Request enroll to room ' + locator);
  }
}

function connect() {
  clientName = document.getElementById('name').value;
  var server = document.getElementById('server').value;
  var protocol = document.getElementById('protocol').value;

  // client = new WebSocket('ws://localhost:8080/', 'esgrima');
  client = new WebSocket(server, protocol);

  client.onerror = function () {
    logToPage('Connection Error');
  };

  client.onopen = function () {
    logToPage('WebSocket Client Connected. ID: ' + clientName);

    var payload = JSON.stringify({
      type: 'HELO',
      ts: new Date().toISOString(),
      clientId: deviceId,
      userId: clientName
    });
    client.send(payload);
  };

  client.onclose = function () {
    let message = 'esgrima-protocol Client Closed. ID: ' + clientName;
    console.log(message);
    logToPage(message);
  };

  client.onmessage = function (e) {
    if (typeof e.data === 'string') {
      console.log("Received: '" + e.data + "'");
      const c = JSON.parse(e.data);
      const pretty = `${c.ts} ${c.clientId}: from ${c.userId}: ${
        c?.locator || ''
      } ${c.type || ''} ${c?.payload || ''}`;
      logToPage(pretty);

      if (c.type == 'CACK') {
        document.getElementById('locator').value = c.locator;
      }
    }
  };
}

function sendAddMessage() {
  var message = document.getElementById('message').value;
  var locator = document.getElementById('locator').value;
  logToPage('Local Addition to locator: ' + locator + ' data: ' + message);
  var msg = {
    type: 'ADD',
    ts: new Date().toISOString(),
    clientId: deviceId,
    userId: clientName,
    locator,
    payload: message
  };
  sendMessage(msg);
}
function sendCreateMessage(refId) {
  var msg = {
    type: 'CREA',
    ts: new Date().toISOString(),
    clientId: deviceId,
    userId: clientName,
    refId
  };
  sendMessage(msg);
}
function sendEnrollMessage(locator) {
  var msg = {
    type: 'ENRO',
    ts: new Date().toISOString(),
    clientId: deviceId,
    userId: clientName,
    locator
  };
  sendMessage(msg);
}
function sendMessage(msg) {
  if (client) {
    client.send(JSON.stringify(msg));
  }
}
