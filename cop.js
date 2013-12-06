// utility functions
function round(x, f) {
  if (!f) f = 1;
  return Math.round(x * f)/f;
}
function percent(x, f) {
  if (!f) f = 1;
  return Math.round(x * 100 * f) / f;
}
function floor(x, y) { return Math.floor(x, y); }
function max(x, y) { return Math.max.apply(null, arguments); }
function min(x, y) { return Math.min.apply(null, arguments); }
function swap(arr, x, y) { var t = arr[x]; arr[x] = arr[y]; arr[y] = t; }
function random() { return Math.random(); }

// heap
function heapify(arr, cmp) {
  if (!cmp) throw "missing cmp";
  var len = arr.length;
  for (i = floor(len/2); 0 <= i; i--) {
    heapshift(arr, cmp, i);
  }
  return arr;
}
function heapshift(arr, cmp, i){
  if (!cmp) throw "missing cmp";
  var len = arr.length;
  var x; // holds index to swap
  while (i <= floor((len-1)/2)) {
    var left = 2*i+1, right = left + 1;
    x = left >= len ? null
      : right >= len ? left
      : cmp(arr[left], arr[right]) <= 0? left
      : right;

    if (x && cmp(arr[i], arr[x]) > 0) {
      swap(arr, i, x);
      i = x;
    }
    else break;
  }
}
function heappop(arr, cmp) {
  if (!cmp) throw "missing cmp";
  var len = arr.length;
  if (!len) throw "empty heap";
  if (len == 1){
    return arr.shift();
  }
  var x = arr[0];
  arr[0] = arr.pop();
  heapshift(arr, cmp, 0);
  return x;
}
function heappush(arr, x, cmp) {
  if (!cmp) throw "missing cmp";
  arr.push(x);
  var i = arr.length-1;
  while (i > 0) {
    var parent = floor((i-1) / 2);
    if (0 < cmp(arr[parent], arr[i])) {
      swap(arr, parent, i);
      i = parent;
    }
    else break;
  }
  return arr;
}
// heap class
function Heap(cmp) {
  this.cmp = cmp || function(a, b) {return a - b;};
  this.arr = [];
}
Heap.prototype = {
  heapify: function(){ return heapify(this.arr, this.cmp); },
  push: function(x) { return heappush(this.arr, x, this.cmp); },
  pop: function() { return heappop(this.arr, this.cmp); },
  len: function() { return this.arr.length; },
  clear: function() { this.arr = []; },
  peek: function() { return this.arr[0]; },
  popif: function(cond, then) { if (this.len() && cond(this.peek())) return then(this.pop()); },
  popwhile: function(cond, then) {
    while(this.len() && cond(this.peek()))
      var r = then(this.pop());
    return r;
  }
}

// limited-size set: creates a limited-size set.
// interface:
// > s = LimitedSizeSet(3); // create a set limited to 3 items.
// > s(1); s(2); s(3); // push 3 numbers into the set.
// > if (s(1) == true && s(2) == true && s(3)
function LimitedSizeSet(n){
  this.n = n;
  this.s = {};
  this.a=new Array(n);
  this.i=0;
}
LimitedSizeSet.prototype = {
  add: function(el) {
    if (el in this.s) return false;
    this.s[el] = 1;
    if (this.a[this.i] !== undefined) delete this.s[this.a[this.i]];
    this.a[this.i] = el;
    this.i = (this.i + 1) % this.n;
    return true;
  },
  contains: function(el) {
    return el in this.s;
  }
}
// features
// toggle cop inclusisn
// toggle collisions
// toggle show routes
// include hops
// include probabilities

function timecmp(a, b) { return a.time - b.time; }
var time=0; // global time
var eventQ = new Heap(timecmp);

function runEventQ() {
  // run at least one event, stop when you reach a move event
  do {
    var event = eventQ.pop();
    time = event.time;
    event.action();
  } while (!event.isMove)
  return isStopped();
}

function moveParticles(){
  return function () {
    // reschedule the next process
    eventQ.push({
      time:   time + 1,
      action: moveParticles(),
      isMove: true,
      name: "moveParticles"
    });
    step();
  }
}

function sendSnapshots(p) {
  return function () {

    // this may be a phantom particle, if the particles variable has been recalculated.
    if (particles[p.i] != p) { return; }
    // reschedule the next process
    nexttime =  time + random() + 0.5;
    /*
    console.log("sendSnapshots "+p.i
                +" at time "+time
                +" and rescheduling for time "+nexttime
               );
    */
    eventQ.push({time: nexttime,
                 name: "sendSnapshots",
                 action: sendSnapshots(p)});

    // maybe generate our own message
    if (!traceMessage() && topoSend > 0 && Math.random() < topoSend) {
      // console.log("generating a new message");
      var m = generateMessage(p);
      if (m) {
        p.msgsOut[m.msgid] = m;
        // receivePackets(p, 1/messagesPerCycle);
      };
    }
    p.sendSnapshots();

  };
}

function receivePackets(p, deltaTime) {
  // console.log("At time "+time+" receivingMessage in "+deltaTime);
  var name = "receivePackets "+random();
  eventQ.push({
    time: time + deltaTime,
    name: name,
    action: function() {
      // console.log("receivingMessage");
      // this may be a phantom particle, if the particles variable has been recalculated.
      if (particles[p.i] != p) {
        console.log("receivingMessage: phantom particle in "+p.i);
        return;
      }
      p.emptyPacketQ();
      if (0 && p.msgsOut) { // immediately forward messages
        eventQ.push({
          time: time + random(),
          name: "send messages",
          action: function() { p.sendMessages(); }
        });
      }
    }
  });
  //if (!eventQ.arr.some(function(x) {return x.name === name; })) {
  //  throw "EventQ does not contain receivePackets "+ name;
  //}
}



function drawMessage(p, msg) {
  drawCircle(p, 8, "red"); // destination
  drawCircle(particles[msg.src], 8, "green"); // source
  drawLink("message", particles[msg.via], p);
  /*
  for (var dest in msg.paths)
    for (var src in msg.paths[dest]) {
      // console.log("drawing ", msg, " from ", src, " to ", dest);
      drawLink("message", particles[src], particles[dest]);
    }
  */
}

/*
tk distribution of successes given hops and time difference
tk var messages
tk p.messaging
tk msgsOut
*/
var drawnLinks = {}, oldDrawnLinks;
var linkInfo = {
  message: {color: "green", precedence: 10},
  cop: {color: "purple", precedence: 2},
  snapshot: {color: "rgba(100,100,100,.5)" /* light gray*/, precedence: 1}
};
function drawLink(type, p1, p2) {
  if (!(type in linkInfo)) throw "unknown link type";
  var k = p1.x+","+p1.y+","+p2.x+","+p2.y;
  var existingLink = drawnLinks[k];
  if (existingLink && linkInfo[existingLink].precedence > linkInfo[type].precedence)
    return;
  drawnLinks[k] = type;
  drawLine(p1, p2, linkInfo[type].color);
}
function clearLinks() { oldDrawnLinks = drawnLinks; drawnLinks = {}; }

function receiveMsgs(p, msgs) {
  // msgs = [{dest, src, hops, ts, msgid, via}]
  // console.log("receiveMsgs for "+p.i);
  msgs.forEach(
    function(m) {
      if (m.src == p.i) return; // from here
      var accept = p.msgFilter(m);
      console.log(accept, m);
      if (!accept) return; // already done with this
      if (m.expiration < time) return; // already expired
      if (!(m.dest in p.cop)) return; // unknown destination
      if (m.dest == p.i) {  // one way or round trip
        if ( m.ack ) { // round trip
          // we sent this message
          console.log("ROUND TRIP COMPLETE! ", m, m.msgid, " message paths", m.paths, "expiration", m.expiration, "time", time);
        }
        else { // one-way; return the message (reply)
          console.log("ONE WAY COMPLETE", m, m.msgid, " message paths", m.paths, "expiration", m.expiration, "time", time);
          p.msgsOut[m.msgid] = m = copyo2(m);
          if (!m.paths[p.i]) m.paths[p.i] = {};
          m.paths[p.i][m.via] = 1;
          m.ack = true;
          var x = m.src; m.src = m.dest; m.dest = x;
          m.hops = p.cop[m.dest]? p.cop[m.dest].hops + surplusHops: maxHops;
          m.hops_ts = p.cop[m.dest]? p.cop[m.dest].ts: 0;
          m.expiration = time + m.hops;
          return;
        }
      }
      // add message m to msgOut
      p.msgsOutAdd(m);
      // if (m.traced || showMsgPaths) {
        // console.log("Traced message", m,"at",p.i, p);
        // drawMessage(p, m);
      // }
      // if (0 && showMsgPaths) addPath(p.i, m.via, (m.dest != 0? {msgReturn: 1}: {msgSend: 1}), m.via_x, m.via_y );
    });
  // for (var dummy in p.msgsOut) { p.sendMessages(); break; } // immediately forward messages
}



function getSnapshots(p) {
  // update self
  // p.cop[p.i]={i:p.i, x:p.x, y:p.y, ts:p.ts++, seen:0, hops:0};
  p.updateOwnCop();

  var snapshots = [];
  var copTableSize = 0;
  for (var i in p.cop) {
  	copTableSize++;
    c = p.cop[i];
    if (c.seen < 3 &&
        (distance(c, p) * Math.random() / p.radioDistance * distanceSensitivity < 1
         || (randomCutoff && c.passed_over >= p.radioDistance * distanceSensitivity))) {
	    snapshots.push(p.snapshot(i));
      c.passed_over = 0;
  	}
    else {
      c.passed_over++;
    }
  }
  if (p.i == 0) {
	  randomCopTableSize = copTableSize;
  }
  return snapshots;
}

// creates a function which will increment a path.
// Use as: msg.paths = msg.paths.map(incrementPathf(p))
function incrementPathf(p) {
  return function(path) {
    return path[path.length-1] == p.i? path: path.concat([p.i]);
  }
}

// group an array by key function and
// then apply a group function each  group
// return the groups (an object with keys
function groupBy (arr, key, group) {
  var groups = {};
  arr.forEach(
    function(v, i, arr){
      var k = key(v, i, arr);
      if (!(k in groups)) groups[k] = [];
      groups[k].push(v);
    });
  if (group) {
    for (var i in groups) {
      groups[i] = group(groups[i], i);
    }
  }
  return groups;
}

/*
function push(arr, el) {
  // proper push, does not concat like the std array method
  for (var i=1; i < arguments.length; i++)
    arr[arr.length] = arguments[i];
  return arr;
}
*/

function getMsgs(p) {
  var notEmpty = false;
  for (var msgid in p.msgsOut) {
    var m = p.msgsOut[msgid];
    // drawMessage(p, m);
    if (!p.msgFilter(p.msgsOut[msgid])) delete p.msgsOut[msgid];
    else notEmpty = true;
  }
  // if (notEmpty) console.log("getMsgs returning ", p.msgsOut);
  return p.msgsOut;
}

function generateMessage(p) {
  if (particles[0].cop[p.i]) console.log("generateMessage");
  // create a unique message
  // if (!p.cop[0]) return 0; // don't send to unknown dest
  var msgid;
  // a random msgid should be unique, but verify it anyway.
  // do {
  msgid = Math.random();
  // } while ( msgid in messages.src);
  var msg = {
    msgid: msgid, src: p.i, via: p.i, dest: 0, ts: time,
    paths: {}, // paths normally contain sets,
    // eg paths[dest][src] = 1 for each link in the path.
    hops: p.cop[0]? p.cop[0].hops + surplusHops: 0,
    hops_ts: p.cop[0]? p.cop[0].ts: 0
  };

  /*
  // track when we should expect a reply (now + max_return_trip + trip)
  var returnHops;
  try {
    returnHops = particles[0].cop[p.i].hops + surplusHops;
  }
  catch (err) {
    returnHops = 0;
  }
  */
  msg.expiration = time + msg.hops;
  registerMsgStart(msg);
  p.messaging[0] = true;
  return msg;
}


var canvas = document.createElement("canvas"); // document.getElementById("canvas");
var ctx = canvas.getContext("2d");
var canvas2 = document.getElementById("canvas2");
var ctx2 = canvas2.getContext("2d");
var snapshotsPerCycle = 200; // number of transmission slots per time period.
var messagesPerCycle = 200; // number of transmission slots per time period.
var num = 200, motionModel;
var topoSend = 0; // percentage of time to send to node 0 by topo routing
var stinky; // percentage of nodes that are stinky
var width=100, height=100;
var particles = [];
var distanceSensitivity = 1;
var randomCutoff = true;
var avgNeighbors;
var neighborhoods = [];
var neighborhoodsInRow, neighborhoodsInColumn;
var maxHops, surplusHops = 0;
var density, radioDistance, dynamicRadioDistance, showCop, showMsgPaths, showPaths=false;
var showCapacity, showCollisons, visualizeMotionModel, visualizeCapacity;
var maxRepeats, repeatCycle;

var closedWorld = true;

var randomCopTable, randomCopTableSize; // from the first (it's random) particle

// create a message filter
// A message filter is passed every message that is received and sent
// and it has returns true if that message can be passed on
function messageFilter(p) {
  var messages = {};
  var expiredHeap = new Heap(function(a, b) {return a.expiration - b.expiration;});
  function messageExpired(m) { return m && m.expiration < time; }
  return function (m) {
    // clean the filter
    expiredHeap.popwhile( messageExpired,
      function(m) { if (messageExpired( m = messages[m.msgid] )) delete messages[m.msgid]; }
    );

    // filter out messages that are going too far, or that we don't know where they are going
    if (messageExpired(m)) {
      console.log("rejecting expired message ", m, time, m.expiration);
      return false;
    }
    // console.log(m, "not expired");
    var best = messages[m.msgid]; // the existing record is the best we have
    // accept the new message and replace the existing record if ...
    if (!best // we don't have anything yet
        || !best.ack && m.ack // or the best was going and now we're returning
        || best.ack == m.ack // or the messages are going in the same direction
        && best.dest != p.i // the destination has not already been reached
        && (best.hops > m.hops // and the best allowed more hops
            || best.hops == m.hops // or the hops are the same
            && best.via == p.i)) { // and the best was one of our own.
      messages[m.msgid] = m;
      expiredHeap.push(m);
      var r = p.i == m.src || p.cop[m.dest] && p.cop[m.dest].hops < m.hops;
      console.log(p, "replaced best with ", m, " returning ", r);
      return r;
    }
    // reject the new message if ...
    if (best // we already have a record
        && (best.ack && !m.ack // and it was returning while the new message is still going
            || best.ack == m.ack // or they were going in the same direction
            && (best.dest == p.i // the destination has already been reached
                || best.hops < m.hops // and the new message allows more hops
                || best.hops == m.hops // or hops are the same
                && best.via != p.i))) { // and we've already seen a foreign message with these hops
      return false;
    }
    // we should have caught all the cases by now
    console.log(p, messages, messages[m.msgid], m);
    throw "bad case";
  }
}

function randomParticle(notZero) {
  if (!particles.length) throw "No particles!";
  if (particles.length < 2) throw "Not enough particles!";
  do {
    var i = Math.floor( Math.random() * particles.length );
  } while (notZero && i == 0);
  // console.log("picked randomParticle ", i, particles[i]);
  return particles[i];
}
var _tracingMessage, _tracedMessage;
function traceMessage(start) {
  // if start is passed, set tracing according to start's value.
  // Return true if tracing is going on.
  // console.log(time, "traceMessage ", start, _tracingMessage, _tracedMessage);
  if (start || _tracingMessage && _tracedMessage.expiration < time) {
    _tracingMessage = true;
    var p = randomParticle(1);
    if (!p) {
      console.log(p);
      throw "bad randomParticle";
    }
    _tracedMessage = generateMessage(p);
    _tracedMessage.traced = true;
    p.msgsOutAdd(_tracedMessage);
    // console.log("traceMessage started ", p, _tracedMessage);

  }
  if (start !== undefined && !start) {
    _tracingMessage = false;
  }
  return _tracingMessage;
}

// Messages are tracked from the time that they are generated until they expire.
// The global variable "messages" stores the current aggregate information.
// messages.msg stores information on each individual message.
// When a message expires, it's contribution to the aggregate is removed.
var messages = {
  n: 0, // total messages being tracked
  src: {}, // msgid -> src
  sent: 0, // number of times sent
  oneWay: 0, // number of times reaching destination
  roundTrip: 0, // number of times returned to src
  oneWayElapsedTime: 0, // number of times reaching destination
  roundTripElapsedTime: 0, // number of times returned to src
  msg: {} // individual records
};
function registerMsgStart(m) {
  // console.log("registerMsgStart ", m);
  messages.n++;
  messages.src[m.msgid] = m.src;
  messages.msg[m.msgid] = {
    src: m.src, // helpful for diagnostics
    sent: 0, // number of times this message has been sent
    oneWay: false, // whether the message has reached its destination at least once
    roundTrip: false, // whether the message has been returned at least once
    ts: m.ts, // timestamp
    count: 0 // time to live
  };
}
function checkMsg(m) {
  if (isNaN(m.ts)) {
    console.log(m);
    throw "message ts is NaN";
  }
}
function registerMsgTransit(m) {
  if (!messages.msg[m.msgid]) return;
  //console.log(m, messages);
  messages.msg[m.msgid].count += 1;
  messages.msg[m.msgid].sent += 1;
  messages.msg[m.msgid].ts = m.ts;
  checkMsg(m);
  messages.sent += 1;
}
function registerMsgOneWay(m) {
  if (!messages.msg[m.msgid]) return;
  var k = "oneWay";
  if (messages.msg[m.msgid][k]) return;
  messages.msg[m.msgid][k] = true;
  messages[k] += 1;
  k += "ElapsedTime";
  var elapsedTime = time - m.ts;
  // console.log("oneWayElapsedTime", elapsedTime);
  messages.msg[m.msgid][k] = elapsedTime;
  messages[k] += elapsedTime;
}
function registerMsgRoundTrip(m) {
  if (!messages.msg[m.msgid]) return;
  var k = "roundTrip";
  if (messages.msg[m.msgid][k]) return;
  messages.msg[m.msgid][k] = true;
  messages[k] += 1;
  k += "ElapsedTime";
  var elapsedTime = time - m.ts;
  console.log("roundTripElapsedTime", elapsedTime, messages.msg[m.msgid]);
  messages.msg[m.msgid][k] = elapsedTime;
  messages[k] += elapsedTime;
}
function registerMsgAging() {
  var something = false;
  for (var msgid in messages.msg) {
    something = true;
    messages.msg[msgid].count--;
    // console.log(msgid, messages.msg[msgid].count);
    if (messages.msg[msgid].count <= 0) purgeMsg(msgid);
  }
  // if (!something) console.log(messages);
}
function purgeMsg(msgid){
  if (!messages.msg[msgid]) return;
  var k = "oneWay";
  if (messages.msg[msgid][k]) messages[k]--;
  k += "ElapsedTime";
  if (messages.msg[msgid][k]) messages[k] -= messages.msg[msgid][k];
  k = "roundTrip";
  if (messages.msg[msgid][k]) messages[k]--;
  k += "ElapsedTime";
  if (messages.msg[msgid][k]) messages[k] -= messages.msg[msgid][k];
  k = "sent";
  if (messages.msg[msgid][k]) messages[k] -= messages.msg[msgid][k];
  messages.n--;
  delete messages.src[msgid];
  var m = messages.msg[msgid]
  if (m.roundTrip == false) {
    // console.log("unsuccessful", m);
  };
  delete messages.msg[msgid];
}
function drawMsgStatus() {
  el = document.getElementById('msgStatus');
  var oneWayET = "", roundTripET = "";
  try {
    oneWayET = messages.oneWay? "(with " + round(messages.oneWayElapsedTime / messages.oneWay, 10) + " average elapsed time, messages.oneway = " + messages.oneWay+ ")": "";
    roundTripET = messages.roundTrip? "(with " + round(messages.roundTripElapsedTime / messages.roundTrip, 10) + " average elapsed time, messages.roundTrip = " + messages.roundTrip + ")": "";
  }
  catch (err) {};

  el.value =  messages.n == 0? "0 messages tracked."
    : "Of the last "+ messages.n + " messages, "
    + percent(messages.oneWay / messages.n, 10) + "% reached their destination "+ oneWayET +" and "
    + percent(messages.roundTrip / messages.n, 10) + "% were returned " + roundTripET + " and "
    + round(messages.sent / messages.n, 10) + " average transmissions per message.";

}

function point2neighborhoodi(p){
    var i = Math.floor(p.x/radioDistance)
       + neighborhoodsInRow * Math.floor(p.y/radioDistance);
    if (isNaN(i)) {
	console.log("maxSpeed="+maxSpeed);
	console.log("p="+JSON.stringify(p));
	console.log("radioDistance="+radioDistance);
	console.log("neighborhood="+i);
	console.log("width="+width);
	console.log("height="+height);
	throw "bad neighborhood";
    }
    return i;
}

function setNeighborhoodParameters () {
  // console.log("setNeighborhoodParameters")
    density = num / width / height; // nodes per pixel
    radioDistance = Math.round(
           Math.sqrt((avgNeighbors + 1) / density / Math.PI));
    neighborhoodsInRow = Math.ceil(width/radioDistance);
    neighborhoodsInColumn = Math.ceil(height/radioDistance);
    maxHops = Math.round(Math.sqrt(
	    Math.pow(neighborhoodsInRow, 2),
	    Math.pow(neighborhoodsInColumn, 2)));

    // console.log("num "+num);
    // console.log("width "+width);
    // console.log("height "+height);
    // console.log("avgNeighbors "+avgNeighbors);
    // console.log("density "+density);
    // console.log("radioDistance "+radioDistance);
    // console.log("neighborhoodsInRow "+neighborhoodsInRow);
    // console.log("neighborhoodsInColumn "+neighborhoodsInColumn);
}


function setNeighborhoods () {
    neighborhoods = new Array(neighborhoodsInColumn * neighborhoodsInRow);
    particles.forEach(function(p, j){
      p.setNeighborhood();
      return;
      var i = p.neighborhood = point2neighborhoodi(p);
      if (!neighborhoods[i]) neighborhoods[i] = {}
      neighborhoods[i][j] = true;
    });
    // dumpparticles);
    // dump(neighborhoods);
}

function ptIsNaN(p){
  return Array.prototype.slice.call(arguments).some(function(p) {
    return !p || isNaN(p.x) || isNaN(p.y);
  });
}

var maxSpeed;
var motionModels = { // moves particle according to various motion models
  randomVelocity: function(p){ // pick a destination and velocity and go
    if (maxSpeed <= 0) return;
    if (ptIsNaN(p.dest) || isNaN(p.speed) || distance(p, p.dest) < p.speed ) {
      randomPt(p.dest);
      p.speed = random() * maxSpeed;
    }
    p.moveTo(p.dest);
    motionModels.repel(p);
    checkBounds(p);
  },
  randomWalk: function(p){
    if (maxSpeed <= 0) return;
    p.move(randomVelocity());
    motionModels.repel(p);
    checkBounds(p);
  },
  mostlyStraight: function(p){
    if (maxSpeed <= 0) return;
    if (ptIsNaN(p.dest) || p.distance(p.dest) < radioDistance) {
      p.dest = getNewDest(p);
    }
    if (ptIsNaN(p.v)) {
      p.speed = random() * maxSpeed;
      var d = distance(p, {x:p.dest.x, y:p.dest.y});
      p.v.x = (p.dest.x - p.x) / d * p.speed;
      p.v.y = (p.dest.y - p.y) / d * p.speed;
    }
    // move
    p.v.x  += Math.round(1.5*(Math.random()-.5)) * p.speed;
    p.v.y += Math.round(1.5*(Math.random()-.5)) * p.speed;
    p.move();

    motionModels.repel(p);
    checkBounds(p);
  },
  flock: function(p){
    if (maxSpeed <= 0) return;
    var p_original = { x: p.x, y: p.y };
    // choose a new destination if needed
    if (isNaN(p.x) ) p.x = random() * width;
    if (isNaN(p.y) ) p.y = random() * height;
    if (p.x < 0 || p.y < 0) {
      console.log(p, p.v, p.dest);
      throw "flock: got point with negative.";
    }
    if (ptIsNaN(p.v)) p.v = randomVelocity();
    while (ptIsNaN(p.dest) || distance(p.dest, p) < 2 * radioDistance) {
      p.dest = getNewDest(p);
    }
    var a = addv(scalev(avoidVector(p), 3),
                 scalev(avoidVector(p, p.getRadioDistance()), -1));

    var n=avgNeighbors, dest={x:n*p.dest.x, y:n*p.dest.y};
    p.getNeighbors().forEach(function(p2) {
      if (!ptIsNaN(p2.dest)) {
        var dscale = closeness(p, p.dest, p2.dest);
        dest = addv(dest, scalev(p2, dscale));
        n += dscale;
      }
    });
    p.v = normalizev(fromto(p,
                            scalev(dest, 1/n)),
                     maxSpeed);

    // scale velocity
    if (random() < .1) {
      p.v = normalizev(addv(p.v, randomVelocity(maxSpeed)),
                       maxSpeed);
      //console.log(p);
    }
    else {
      p.v = normalizev(addv(p.v, normalizev(a, maxSpeed / 3)),
                       maxSpeed);
    }

    // move
    if (distance(p.v) > maxSpeed + 1) {
      console.log(p.v, distance(p.v));
      throw "bad move in flock";
    }
    p.move();
    if (distance(p_original, p) > maxSpeed + 1) {
      console.log(p_original, p, distance(p_original, p));
      throw "bad move in flock";
    }
    // motionModels.repel(p);
    if (checkBounds(p)) return motionModels[motionModel];
    if (distance(p_original, p) > maxSpeed + 1) {
      console.log(p_original, p, distance(p_original, p));
      throw "bad move in flock";
    }
  },
  follow: function(p) {
    if (maxSpeed <= 0) return;
    var p_original = { x: p.x, y: p.y };
    // choose a new destination if needed
    if (ptIsNaN(p) ) p.x = random() * width, p.y = random() * height;
    if (ptIsNaN(p.dest) || p.distance(p.dest) < radioDistance) {
      //  || p.x < 3 || p.x > width - 4
      //  || p.y < 3 || p.y > height - 4
      // ) {
      p.dest = getNewDest(p);
    }

    var ns = p.getNeighbors();
    var nlen = ns.length;
    var p2 = nlen && ns[Math.floor(random() * nlen)];
    if (random() < .5) { p.motionState = getMotionState(p, p2); }
    if (!p.motionState) { // } || !nlen || random() < .1) {
      p.v = limitlen(fromto(p, p.dest), maxSpeed);
    }
    else { // follow
      var personal_distance = Math.sqrt(height * width / num / Math.PI);
      if (distance(p.motionState, p2) >= distance(p.motionState, p)) p2 = p.motionState;
      if (!p2) throw "p2 undefined";
      p.v = addv(
        fromto(p, p2, bound(-maxSpeed, distance(p, p2) - personal_distance, maxSpeed)),
        avoidVector(p));
      if (p.distance(p.v) > maxSpeed) p.v = normalizev(p.v, maxSpeed);
    }
    // move
    p.move(); //normalizev(addv(p.v, avoidVector(p)),  maxSpeed));
    // p.move();
    motionModels.repel(p);
    if (checkBounds(p)) return motionModels[motionModel];
    if (0 && distance(p_original, p) > maxSpeed + 1) {
      console.log(p_original, p, distance(p_original, p));
      throw "bad move in follow";
    }
  },
  flockSimple: function(p) {
    if (maxSpeed <= 0) return;
    var p_original = { x: p.x, y: p.y };
    // choose a new destination if needed
    if (ptIsNaN(p) ) p.x = random() * width, p.y = random() * height;
    if (ptIsNaN(p.dest) || p.distance(p.dest) < radioDistance) {
      p.dest = getNewDest(p);
    }
    else {
      var ns = p.getNeighbors();
      var nlen = ns.length;
      var p2 = nlen && ns[Math.floor(random() * nlen)];
      if (!ptIsNaN(p2.dest)) p.dest = copyo(p2.dest);
    }
    p.move(bound(-maxSpeed,
                 addv(bound(-maxSpeed, avoidVector(p), maxSpeed),
                      bound(-2*maxSpeed, fromto(p, p.dest), 2*maxSpeed)),
                 maxSpeed));
    motionModels.repel(p);
    if (checkBounds(p)) return motionModels[motionModel];
    if (0 && distance(p_original, p) > maxSpeed + 1) {
      console.log(p_original, p, distance(p_original, p));
      throw "bad move in follow";
    }
  },
  repel: function(p) {
    if (p.stinky) {
      var ns = p.getNeighbors();
	    for (var i in ns) {
	      var n = ns[i];
	      var force=radioDistance - distance(n, p);
	      n.v.x += (n.x - p.x) * force/3;
	      n.v.y += (n.y - p.y) * force/3;
	    }
    }
  }
};

// add to an object and return it
function addo(obj, k, v) {
  if (!obj) obj = {};
  obj[k] = v;
  return obj;
}

// follow the leader
function getMotionState(me, other, seen) {
  return !other || other === me || seen && other.i in seen? null  // no neighbors
    : !other.motionState? other
    : getMotionState(other, other.motionState, addo(seen, me.i, 1));
}

function limitlen(p, maxlen) {
  if (distance(p) > maxlen) {
    var limited = normalizev(p, maxlen);
    p.x = limited.x;
    p.y = limited.y;
  }
  return p;
}
function getRandomPt(){
  return {
    x: Math.floor(width * Math.random()),
    y: Math.floor(height * Math.random())
  };
}
function getNewDest(p) {
  if (height < 4 * radioDistance || width < 4 * radioDistance) {
    throw "radioDistance too big";
  }
  var d = randomPt(), dist = p.distance(d), d2, dist2;
  do {
    d3.range(5).forEach(function() {
      d2 = randomPt();
      dist2 = p.distance(d2);
      if (dist2 > dist) {
        d = d2, dist = dist2;
      }
    });
  } while (ptIsNaN(d) || p.distance(d) < 2 * radioDistance );
  return d;
}

function bound(lower, v, higher) {
  if (isNaN(v)) {
    x = distance(v);
    if (isNaN(lower) || isNaN(x) || isNaN(higher)) {
      console.log(lower, v, higher);
      throw "bound: bad arguments";
    }
    return x < lower? normalizev(v, lower)
      : x > higher? normalizev(v, higher)
      : v;
  }
  else {
    if (isNaN(lower) || isNaN(v) || isNaN(higher)) {
      console.log(lower, v, higher);
      throw "bound: bad arguments";
    }
    return max(lower, min(v, higher));
  }
}
function fromto(p1, p2, len) {
  if (ptIsNaN(p1, p2)) {
    console.log(p1, p2);
    throw "fromto: bad arguments";
  }
  var p = {x: p2.x-p1.x, y: p2.y-p1.y};
  if (!isNaN(len)) p = normalizev(p, len);
  return p;
}

function checkBounds(p) {
  var orig_p = {x:p.x, y:p.y};
  // check and adjust bounds
  if (isNaN(p.x) || isNaN(p.y)) return true;
  if (closedWorld) {

    if (p.x < 0) { p.x = 0; p.v.x = p.dest.x = undefined; }
    if (p.y < 0) { p.y = 0; p.v.y = p.dest.y = undefined; }
    if (p.x >= width) { p.x = width-1; p.v.x = p.dest.x = undefined; }
    if (p.y >= height) { p.y = height-1; p.v.y = p.dest.y = undefined; }
  }
  else { // no edges, wrap around
	  if (p.x < 0)      { p.x += width; }
	  if (p.x > width)  { p.x -= width; }
	  if (p.y < 0)      { p.y += height; }
	  if (p.y > height) { p.y -= height; }
  }

  p.setNeighborhood();
  if (p.x != orig_p.x || p.y != orig_p.y) {
    // console.log("checkBounds changed p from ", orig_p, " to ", p);
  }
}

// place a point placed randomly on the field
function randomPt(p) {
  var loc = { x: random() * width,
              y: random() * height };
  if (p) { p.x = loc.x; p.y = loc.y; return p; }
  return loc;
}

function randomVelocity(speed) {
  var dir = (random() - .5) * 2 * Math.PI ;
  if (isNaN(speed)) speed = random() * maxSpeed;
  var v = {
    x: Math.cos(dir) * speed,
    y: Math.sin(dir) * speed
  };
  return v;
}

function scalev(v, f) {
  var x = {x:v.x, y:v.y};
  x.x *= f;
  x.y *= f;
  return x;
}

function normalizev (x, len) {
  var v = {x: x.x, y: x.y};
  if (isNaN(v.x) || isNaN(v.y)) {
    console.log(v);
    throw "normalizev: bad argument v";
  }
  if (isNaN(len)) len = 1;
  var d = distance(v);
  if (!isNaN(d)) {
    if (d < .001) {
      v.x = 0;
      v.y = 0;
    }
    else {
      // if (v.x < 0) v.x *= -1;
      // if (v.y < 0) v.y *= -1;
      v.x *= len / d;
      v.y *= len / d;

      // check
      if (distance(v) > Math.abs(len) + .001) {
        console.log(v, len, d, distance(v));
        throw "bad normalization";
      }
    }
  }
  return v;
}

function angle (p1, p2, p3) {
  // return angle at p1.
  return Math.acos(closeness (p1, p2, p3));
}
function closeness(p1, p2, p3) {
  var l1 = distance(p2, p3);
  var l2 = distance(p1, p3);
  var l3 = distance(p1, p2);
  return (l3*l3 + l2*l2 - l1*l1)/ 2 / l3 / l2;
}

function Particle(i) {
  if (width < 0 || height < 0) {
    console.log(width, height);
    throw "Particle: width and height must both be positive.";
  }
  this.x = Math.floor(width*Math.random());
  this.y = Math.floor(height*Math.random());
  this.v = {x:undefined, y:undefined};      // velocity
  this.dest = {x:undefined, y:undefined};   // destination
  this.cop = {};
  this.i = i;
  // this.ts = 0;
  this.collisions = 0;
  this.collisions2 = 0;
	this.radioDistance = radioDistance;
  this.stinky = false;
  this.packets = []; // packets received waiting to be processed
  this.msgsOut = {};
  this.msgFilter = messageFilter(this);
  this.messaging = {};
  this.setNeighborhood();
  this.capacity = new Capacity(10);
  eventQ.push({time: time + .5 + random(), name: "sendSnapshots", action: sendSnapshots(this)});
  // console.log("creating particle "+i);
  return this;
};
Particle.prototype = {};

Particle.prototype.msgsOutAdd = function(m) {
  var p = this;
  var m2 = p.msgsOut[m.msgid] = copyo2(m, p.msgsOut[m.msgid]);
  m2.via = p.i;
  if (p.i != m.via) {
    if (!m2.paths[p.i]) m2.paths[p.i] = {};
    m2.paths[p.i][m.via] = 1;
  }
};

Particle.prototype.getNeighbors = function(){
  var p = this;
  // check cache
  if (p.neighborsts == time) return p.neighbors;
  p.getRadioDistance();
  var d = p.radioDistance;
  if (d > radioDistance) throw "bad p.radioDistance";
  var neighbors = [], distances = {};
  for (var col = -1; col < 2; col++) {
    for (var row = -1; row < 2; row++) {
      var x = p.neighborhood + col*neighborhoodsInRow + row;
	      if (x < 0 || x >= neighborhoods.length) continue;
	      for (var i in neighborhoods[x]) {
		      var p2 = particles[i];
          var d2 = distance(p, p2);
		      if (d2 > d) continue;
		      if (p == p2) continue;
		      neighbors.push(p2);
          distances[p2.i] = d2;
        }
    }
  }
  neighbors.sort(function(a, b) {return distances[a.i] - distances[b.i]; });
  // cache
  p.neighbors = neighbors;
  p.neighborsts = time;
  p.distances = distances;
  return neighbors;
};

Particle.prototype.getRadioDistance = function(){
  var p = this;
  if (p.radioDistancets != time) {
    p.radioDistance = dynamicRadioDistance? customRadioDistance(p): radioDistance;
    p.radioDistancets = time;
  }
  return p.radioDistance;
};

Particle.prototype.distance = function(p) {
  return distance(this, p);
}

Particle.prototype.setNeighborhood = function () {
  var p = this;
  if (p.neighborhoodts == time) return;

  // set new neighborhood
  var new_neighborhood = point2neighborhoodi(p);
  if (p.neighborhood != new_neighborhood
      && neighborhoods[p.neighborhood]
      && neighborhoods[p.neighborhood][p.i]) {
	  delete neighborhoods[p.neighborhood][p.i];
  }
	if (!neighborhoods[new_neighborhood]) {
	  neighborhoods[new_neighborhood]={};
	}
	neighborhoods[new_neighborhood][p.i]=true;
	p.neighborhood = new_neighborhood;
  p.neighborhoodts = time;
};

Particle.prototype.move = function(v) {
  var p = this;
  if (v) p.v = {x:v.x, y:v.y};
  var d = distance(p.v);
  if (d > maxSpeed) {
    p.v.x *= (.9 * maxSpeed) / d;
    p.v.y *= (.9 * maxSpeed) / d;
  }
  if (distance(p.v) > maxSpeed) {
    throw "move: moving too fast " + distance(p.v) + " when maxSpeed is " + maxSpeed;
  }
  p.x += p.v.x;
  p.y += p.v.y;
};

Particle.prototype.moveTo = function (dest) {
  var p = this;
  p.move({ x: dest.x - p.x, y: dest.y - p.y });
}

Particle.prototype.toJSON = function() {
  var p = this;
  return "Particle "+p.i
    + "{ x:"+p.x
    + ", y:"+p.y
    + ", v: {x:"+p.v.x+",y:"+p.v.y+"}"
    + "}"
  ;
};

Particle.prototype.emptyPacketQ = function (){
  var p = this;
  // console.log("emptyPacketQ");
  // read packets
  while (p.packets.length && p.packets[0].ts + p.packets[0].len < time) {
    var m = p.packets.shift(); // this message completed in the past
    if (m.skip) { // remove this if it's not used
      throw "used skip";
      continue;
    }
    var collidedLen = 0;
    while (p.packets.length) { // check for collisions
      if (p.packets[0].ts >= m.ts + (collidedLen || m.len)) break; // next message begins after this one ends
      p.collisions += 1;
      var m2 = p.packets.shift(); // this pkt is lost
      collidedLen = Math.max( m.len, m2.ts - m.ts + m2.len, collidedLen );
    }
    if (collidedLen) {
      if (!m.collided) m = copyo(m); // writing to a pkt requires a copy, but only copy fresh packets
      m.collided = true;
      m.len = collidedLen;
    }
    if (m.ts + m.len > time) {
      // current message spans messages still unfinished, put it back on the pkt queue
      p.packets.unshift(m);
      return;
    }
    registerCapacity(p, m);
    if ( m.collided ) continue;
    if ( m.src == p.i ) continue;
    // processMessage(p, m); // reproduced below
    // console.log(p.i+ " processing message from "+m.src);
    if (m.snapshots && m.snapshots.length) {
      // console.log("emptyPacketQ: receiving snapshots");
      p.receiveSnapshots(m.snapshots);
    }
    if (m.msgs && m.msgs.length) {
      // console.log("emptyPacketQ: receiving msg");
      receiveMsgs(p, m.msgs);
    }
  }
};

Particle.prototype.updateOwnCop = function () {
  var p = this;
  // p.cop[p.i]={i:p.i, x:p.x, y:p.y, ts:p.ts++, seen:0, hops:0}; // keep time at each node separately
  p.cop[p.i]={i:p.i, x:p.x, y:p.y, ts:time, seen:0, hops:0};
}

Particle.prototype.snapshot = function (i, ideal) {
  var p = this;
  if (ideal) {
    pi = particles[i];
    return {i:i, x:pi.x, y:pi.y, ts:time, hops:distance(p, pi)/radioDistance};
  }
  if (i == p.i) p.updateOwnCop();
  var c = p.cop[i];
  return c ? {i:i, x:c.x, y:c.y, ts:c.ts, hops:c.hops}
    : {i:i, x:null, y:null, ts:null, hops:null};
};

Particle.prototype.receiveSnapshots = function(snapshots) {
  var p = this;
  // if (p.i == 0) console.log(snapshots);
  snapshots.forEach(
    function(s){
      if (!p.cop[s.i] || p.cop[s.i].ts < s.ts) {
        // not in cop table (we just throw away stale data, this is probably suboptimal)
		    p.cop[s.i] = {
          i:s.i, x:s.x, y:s.y, ts:s.ts,
          seen:1, hops:s.hops+1, passed_over:0
        };
      }
      else if (p.cop[s.i].ts > s.ts) { // stale, ignore, also suboptimal
	  	  return;
	    }
  	  else {
	  	  p.cop[s.i].seen += 1;
		    p.cop[s.i].hops = Math.min(p.cop[s.i].hops, s.hops+1);
	    }
    });
}

// return the next time that it looks like it's safe the transmit.
Particle.prototype.nextOpenTransmissionTime = function() {
  var p = this;
  if (p.packets.length == 0) return true;
  var t = 0; // the latest time the channel is busy
  p.packets.forEach(function(m) {
    var t2 = m.ts + m.len;
    if (t2 > t) t = t2;
  });
  return t <= time? time: t;
};

Particle.prototype.sendSnapshots = function () {
  // console.log("sending snapshots");
  var p = this;
  var pkt = {
    ts: time,
    src: p.i,
    snapshots: getSnapshots(p),
    msgs: getMsgs(p)
  };
  var msglen = 0; for (var dummy in pkt.msgs) msglen++;
  pkt.len = pkt.snapshots.length / snapshotsPerCycle + msglen / messagesPerCycle;
  return p.broadcast(pkt);
};

Particle.prototype.broadcast = function (pkt) {
  // return 0 if successful, otherwise the next open transmission time
  var p = this;
  var nextTime = p.nextOpenTransmissionTime();
  if (nextTime > time) {
    return nextTime;
  }
  p.getNeighbors().forEach(function(n){
    // if (n.i == 0) console.log(p.i," sending to ",n.i, "pkt", pkt);
    if (distance(n, p) > radioDistance) {
      throw "path too long";
    }
    n.packets.push(pkt);
    receivePackets(n, pkt.len);
    if (showPaths) {
      drawLink("snapshot", p, n);
      // addPath(p.i, n.i, {snapshots: 1});
    }
  });
  p.packets.push(pkt);
  receivePackets(p, pkt.len);
  return 0;
};

Particle.prototype.sendMessages = function() {
  var p = this;
  // console.log("sendMessages for "+p.i+" at time "+time);
  var msgs = getMsgs(p);
  var len = 0;
  for (var i in msgs) len++;
  if (len == 0) return false;
  var pkt = {
    ts: time,
    src: p.i,
    msgs: msgs
  };
  pkt.len = len / messagesPerCycle;
  for (var m in pkt.msgs) registerMsgTransit(m);
  var nextTime = p.broadcast(pkt);
  if (0 && nextTime) { // retry
    var r = random();
    console.log("sendMessages: for "+p.i+" at time "+time+": resending at "+nextTime+"+"+r);
    receivePackets(p, nextTime - time + r);
  }
};


function copWarmup() {
  console.log("warming up Cop");
  particles.forEach(function (p) {
    var snapshots = particles.map(function(p2){return p.snapshot(p2.i, true);});
    p.receiveSnapshots(snapshots);
  });
}

function makeParticles () {
  // console.log("makeParticles");
  var ps = d3.range(num).map(function(i) {
    var p = new Particle(i);
    return p;
  });

  randomCopTable = ps[0].cop;
  randomCopTableSize = 0;
  //ps.forEach(function(n){ console.log(n.i); });
  //throw "done initializing";

  return ps;
}

function avoidVector(p, dist) {
  if (!dist) { dist = Math.sqrt(width * height / num / Math.PI)/2; }
  var ns = p.getNeighbors();
  var a = {x:0, y:0};
  ns.forEach(function(p2){
    var d = distance(p, p2);
    if (d >= dist) return;
    a = addv(a, fromto(p2, p, dist - d));
  });
  return a;
}

function addv(v1, v2) {
  var v = { x: v1.x + v2.x, y: v1.y + v2.y };
  return v;
}

function stink() {
    particles.forEach(function(p, i){
	if (i==0) return;
	p.stinky = Math.random() < stinky;
    });
}

// function to handle integer form inputs.
function handleInt(cb, parser){
    if (!parser) parser=parseInt;
    return function() {
        var n = parser(this.value);
        if (isNaN(n) || cb(n)) { this.style.color = "red"; return; }
        this.style.color = "black";
        this.value = ""+n;
     };
}

function dump(p) {
    // return document.write(
    // 	"<pre style='position:absolute; z-index:100;'>"
    // 	    +JSON.stringify(p)
    // 	    +"</pre>"
    // );
    console.log(JSON.stringify(p, null, " "));
}



function distance(p1, p2) {
  if (!p1 || isNaN(p1.x) || isNaN(p1.y)) {
    console.log("p1", p1, "p2", p2);
    throw "distance: bad p1 ";
  }
  if (!p2) p2 = { x: 0, y: 0 };
  else if (isNaN(p2.x) || isNaN(p2.y)) {
    console.log(p1, p2);
    throw "distance: bad p2 "+p2;
  }
  var dx = p1.x - p2.x, dy = p1.y - p2.y;
  return Math.sqrt(dx*dx + dy*dy);
}



function otoa(o) {
    var a = [];
    for (var k in o) a.push(o[k]);
    return a;
}

function customRadioDistance(p) {
  var a = otoa(p.cop);
  var n = Math.ceil(avgNeighbors);
  if (n <= 0 || a.length < n) return radioDistance;
  a.forEach(function(p2){
	  p2.distance = distance(p, p2);
    });
  a.sort(function(p1, p2){
	  return p1.distance - p2.distance;
    });
  return Math.min(radioDistance, a[n-1].distance);
}

// shallow copy object
function copyo(src, dest) {
  if (dest === undefined) dest = {};
  for (var k in src)
    if (src.hasOwnProperty(k))
        dest[k] = src[k];
  return dest;
}

// deep copy object
function copyo2(src, dest) {
  if (dest === undefined) dest = {};
  for (var k in src) {
    if (src.hasOwnProperty(k)) {
      dest[k] = typeof src[k] == "object"? copyo2(src[k]): src[k];
    }
  }
  return dest;
}



function counto(o) {
    var c = 0;
    for (var i in o) c++;
    return c;
}

function getAllNeighbors(p) {
    var ns = {};
    particles.forEach(function(p2, i) {
	if (i != p.i && distance(p, p2) <= radioDistance) ns[i]=true;
    });
    return ns;
}


function checkNeighbors(p) {
  // test function to see if the efficent neighbor function is working.
  var nso = getAllNeighbors(p);
  var ns = p.getNeighbors();
  var err = false;
  var allerrs = [];
  var errs = [];
  ns.forEach(
    function(n) {
      if (n.i in nso) delete nso[n.i];
      else {
        err = true;
        allerrs.push(n.i);
      }
    });
  for (var n in nso) {
    err = true;
    errs.push(n);
  }
  if (err) {

    throw  "missed in getNeigbors: "+errs.join(", ")
      + "\nmissed in getAllNeighbors: "+allerrs.join(", ")+"."
      + "\nnot equal "
	    + JSON.stringify(p.getNeighbors()) +"\n"
	    + JSON.stringify(getAllNeighbors(p)) + "\n";
  }
}

function updateForm() {
    //    ["num","avgNeighbors","maxSpeed", "maxRepeats", "repeatCycle"]
    ["topoSend", "stinky"]
	.forEach(function(v){
	    document.getElementById(v+"Out").value =
		document.getElementById(v).value;
	});
  return false;
}

function setup() {
  ctx.canvas.width = ctx2.canvas.width = width = window.innerWidth;
  ctx.canvas.height = ctx2.canvas.height = height = window.innerHeight;

  (function() {
    var el = document.getElementById("topoSend");
    var v = parseInt(el.value);
    el.value = ""+v;
    topoSend = v/1000;
    el.onchange = handleInt(function (n) {
	    topoSend = n/1000;
	    updateForm();
	    return false;
    });
  }) ();

  (function() {
  var el = document.getElementById("stinky");
  var v = parseInt(el.value);
  el.value = ""+v;
  stinky = v/1000;
  el.onchange = handleInt(function (n) {
	  stinky = n/1000;
	  updateForm();
	  stink();
	  return false;
  });
  }) ();

  (function() {
    var el = document.getElementById("num"), v;
    num = v = parseInt(el.value);
    el.value = ""+v;
    el.onchange = handleInt(function (n) {
      num = n;
      setup();
      return false;
    });
  })();

  (function() {
    var el = document.getElementById("motionModel");
    var v;
    motionModel = el.value;
    el.onchange = function () {
      motionModel = el.value;
      return false;
    };
  })();

  (function() {
  var el = document.getElementById("avgNeighbors"), v;
  avgNeighbors = v = parseFloat(el.value);
  el.value = ""+v;
  el.onchange = handleInt(function (n) {
    avgNeighbors = n;
	  setNeighborhoodParameters();
	  setNeighborhoods();
  }, parseFloat);
  }) ();

  (function() {
  var el = document.getElementById("maxSpeed"), v;
  maxSpeed = v = parseFloat(el.value);
  el.value = ""+v;
  el.onchange = handleInt(function (n) {
    maxSpeed = n;
    return false;
  }, parseFloat);
  }) ();

  (function() {
  var el = document.getElementById("surplusHops"), v;
  surplusHops = v = parseInt(el.value);
  el.value = ""+v;
  el.onchange = handleInt(function (n) {
    surplusHops = n;
    return false;
  });
  }) ();

  (function() {
  var el = document.getElementById("distanceSensitivity"), v;
  distanceSensitivity = v = parseFloat(el.value);
  el.value = ""+v;
  el.onchange = handleInt(function (n) {
    distanceSensitivity = n;
    return false;
  }, parseFloat);
  }) ();

  (function() {
  var el = document.getElementById("randomCutoff");
  randomCutoff = el.checked;
  el.onchange = function (){
    randomCutoff = el.checked;
    return false;
  }
  }) ();

  (function() {
    var el = document.getElementById("snapshots"), v;
    snapshotsPerCycle = v = parseFloat(el.value);
    el.value = ""+v;
    el.onchange = handleInt(function (n) {
      snapshotsPerCycle = n;
      return false;
    }, parseFloat);
  }) ();

  (function() {
    var el = document.getElementById("messages"), v;
    messagesPerCycle = v = parseFloat(el.value);
    el.value = ""+v;
    el.onchange = handleInt(function (n) {
      messagesPerCycle = n;
      return false;
    }, parseFloat);
  }) ();

  (function() {
  var el = document.getElementById("dynamicRadioDistance"), v;
  dynamicRadioDistance = el.checked;
  el.onchange = function (){
    dynamicRadioDistance = el.checked;
    return false;
  };
  }) ();

  (function() {
  var el = document.getElementById("showCop");
  showCop = el.checked;
  el.onchange = function (){
    showCop = el.checked;
    return false;
  }
  }) ();

  (function() {
  var el = document.getElementById("startCopKnown");
  startCopKnown = el.checked;
  el.onchange = function (){
    startCopKnown = el.checked;
    return false;
  }
  }) ();

  (function() {
  var el = document.getElementById("visualizeMotionModel");
  visualizeMotionModel = el.checked;
  el.onchange = function (){
    visualizeMotionModel = el.checked;
    return false;
  }
  }) ();

  (function() {
    var el = document.getElementById("traceMessage");
    window.setTimeout(function() {traceMessage(el.checked);}, 0);
    el.onchange = function (){
      traceMessage(el.checked);
      return false;
    };
  }) ();

  (function() {
  var el = document.getElementById("visualizeCapacity");
  visualizeCapacity = el.checked;
  el.onchange = function (){
    visualizeCapacity = el.checked;
    return false;
  }
  }) ();

  (function() {
  var el = document.getElementById("showMsgPaths");
  showMsgPaths = el.checked;
  el.onchange = function (){
    showMsgPaths = el.checked;
    return false;
  }
  }) ();

    (function() {
  var el = document.getElementById("showCapacity");
  showCapacity = el.checked;
  el.onchange = function (){
    showCapacity = el.checked;
    return false;
  }
  }) ();

  (function() {
  var el = document.getElementById("showCollisions");
  showCollisions = el.checked;
  el.onchange = function (){
    showCollisions = el.checked;
    return false;
  }
  }) ();

  (function() {
  var el = document.getElementById("showPaths");
  showPaths = el.checked;
  el.onchange = function (){
    showPaths = el.checked;
    // console.log("showPaths = "+showPaths);
    return false;
  }
  }) ();

  (function() {
  var el = document.getElementById("maxRepeats"), v;
  maxRepeats = v = parseInt(el.value);
  el.value = ""+v;
  el.onchange = handleInt(function (n) {
    maxRepeats = n;
    return false;
  });
  }) ();

  (function() {
  var el = document.getElementById("repeatCycle"), v;
  repeatCycle = v = parseFloat(el.value);
  el.value = ""+v;
  el.onchange = handleInt(function (n) {
    repeatCycle = n;
    return false;
  }, parseFloat);
  }) ();

  (function() {
  var el = document.getElementById("stop"), v;
  el.onchange = function () {
    if (!isStopped()) start();
  };
  })();

  updateForm();


  time = 0;
  eventQ.clear();
  eventQ.push({time: 2, name: "moveParticles", action: moveParticles() });

  setNeighborhoodParameters();
  particles = makeParticles();
  setNeighborhoods();
  if (startCopKnown) {
    copWarmup();
  }

  stink();

  start();
}

//window.setTimeout(step, 1);

function start() { d3.timer(runEventQ); }
function isStopped() { return document.getElementById("stop").checked; }
function fillBlack() { ctx.fillStyle = "rgba(0,0,0,0.5)"; }
function fillWhite() { ctx.fillStyle = "rgba(255,255,255,0.3)"; }
function fillGreen() { ctx.fillStyle = "rgba(0,255,0,1)"; }
function fillRed() { ctx.fillStyle = "rgba(255,0,0,1)"; }
function drawLine(p1, p2, style, c) {
  if (!p1) {
    console.log(p1);
    throw "p1";
  }
  if (!p2) {
    console.log(p2);
    throw "p2";
  }
  if (!c) c = ctx;
  c.save();
  c.beginPath();
  c.lineWidth = 1;
  c.moveTo(p1.x, p1.y);
  c.lineTo(p2.x, p2.y);
  c.strokeStyle = style || "#00ff00";
  c.stroke();
  c.restore()
}
function drawCircle(p1,r, style) {
  ctx.save();
   ctx.beginPath();
   ctx.arc(p1.x, p1.y, r, 0, 2*Math.PI);
   ctx.lineWidth = 1;
   ctx.strokeStyle = style || "#505050";
   ctx.stroke();
  ctx.restore();
}
function drawFilledCircle(p1,r, style) {
  ctx.save();
  ctx.beginPath();
   ctx.arc(p1.x, p1.y, r, 0, 2*Math.PI);
   ctx.lineWidth = 1;
   ctx.fillStyle = style || "#f09090";
   ctx.fill();
  ctx.restore();
}
function drawPieChart(p, r /*, style1, percentage1, style2, percentage2, ... */ ) {
  ctx.save();
  var angle = 1.5 * Math.PI;
  // var ctx = ctx2; // for testing
  for (var i = 2; i < arguments.length; i += 2) {
    var percentage = arguments[i];
    var style = arguments[i+1] || "#009090";
    ctx.beginPath();
    ctx.lineWidth = r;
    ctx.strokeStyle = style;
    var angle2 = percentage * 2*Math.PI;
    ctx.arc(p.x, p.y, r, angle, angle+angle2);
    ctx.stroke();
    angle += angle2;
    //ctx.lineWidth = 1;
    //ctx.fillStyle = style;
    //ctx.fill();
  }
  ctx.restore();
}


function drawMessagePaths(m) {
  // change this to track paths as a graph.
  // path[dest] = [sources]
  // path["src"] = src
  // path["dest"] = dest // although this may be passed in separately

  // ultimately, we probably want a different measure of "distance" than mere hop count.
  // Probability sounds nice, but it's unclear how to measure it.
  // Maybe a partial order that uses timestamps and then hop count would work.
  // Or maybe, we can use the mean plus stddev of the last n timestamps.
  // What we want is to maximize the chance to delivery of a message while minimizing cost (or energy).

  // console.log("drawing paths ", m.paths, m);
  for (var dest in m.paths)
    if (dest != "src")
      for (var src in m.paths[dest])
        drawLine(particles[src], particles[dest], "green");
  drawCircle(particles[m.paths.src], 5, "green");
  drawCircle(particles[m.via], 5, "red");
  paths.forEach(function drawMessagePath(path) {
    if (path.length < 2) return;
    // console.log("drawing ", path);
    var ps = path.map(function(i){return particles[i];});
    // drawSplines(ps, "rgba(0,0,255,.2)");
  });
}

function nub(arr) {
  return arr.filter(function(x, i, arr){return i == arr.indexOf(x); });
}

Particle.prototype.draw = function () {
  var p = this;
  // draw particle itself
  if (1 && visualizeCapacity) {
    drawPieChart(p, 6,
                 p.capacity.used(), "rgba(0, 255, 0, .5)",
                 p.capacity.collided(), "rgba(255, 0, 0, .5)"
                );
  }

  if (p.messaging[4])      drawFilledCircle(p, 4, "rgba(255,0,0,.5)");   // round trip = red
  else if (0 && p.messaging[3]) drawFilledCircle(p, 4, "rgba(128,0,0,.5)");  // returning = dark red
  else if (0 && p.messaging[2]) drawFilledCircle(p, 4, "rgba(255,255,0,.5)"); // destination = yellow
  else if (0 && p.messaging[1]) drawFilledCircle(p, 4, "rgba(0, 128,.5)"); // forwarding = darker green
  else if (0 && p.messaging[0]) drawFilledCircle(p, 4, "rgba(0,255,0,.5)");   // sending = green
  else if (p.i == 0)       drawFilledCircle(p, 4, "rgba(255,150,0,.5)"); // special node = orange
  else if (p.i in particles[0].cop) drawFilledCircle(p, 3, "rgba(0,0,255,.5)"); // in cop table = blue
  else                     drawFilledCircle(p, 2, "rgba(100,100,100,.5)");     // not in cop table = gray
  p.messaging = {}; // clear messaging records

  // special stuff associated with particle 0
  if (p.i == 0) {
	  drawCircle(p, p.radioDistance);

	  el = document.getElementById('copTableSize');
	  el.value = counto(p.cop);

	  if (showCop) {
	    for (var i in p.cop) {
		    if (particles[i].stinky) continue; // don't draw stinky
		    drawLink("cop", p.cop[i], particles[i]);
	    }
	  }
  }

  if (showCollisions && p.collisions) {
	  drawCircle(p, p.collisions * 3, "#f00");
  }

  if (p.stinky) {
	  // drawCircle(p, 5, "#5C4033");
  }

  if (0 && visualizeMotionModel) {
    if (motionModel == "follow") {
      if (!p.motionState) {
        drawCircle(p, 4, "#ff0");
        drawLine(p, p.dest, "rgba(100,0,0,.1)");
      }
      else {
        drawLine(p, p.motionState, "rgba(0,0,100,.1)");
      }
    }
    else if (motionModel == "flockSimple") {
      if (!ptIsNaN(p)) {
        drawLine(p, p.dest, "rgba(100,0,0,.1)");
      }
    }
    else if (motionModel == "flock") {
      if (!ptIsNaN(p)) {
        drawLine(p, p.dest, "rgba(100,0,0,.1)");
      }
    }
  }

  for (var msgid in p.msgsOut) {
    var m = p.msgsOut[msgid];
    if (m.traced || showMsgPaths) {
      // if (m.traced) console.log("Traced message", m,"at",p.i, p);
      drawMessage(p, m);
    }
  }

  // update text outputs


  el = document.getElementById('collisions');
  //el.value = (parseInt(el.value) || 0) + p.collisions - old_collisions;
  var newCollisions =  (parseInt(el.value) || 0)
    + p.collisions - p.collisions2;
  if (newCollisions < 0) throw "negative collisions!";
  el.value = newCollisions;
  if (Math.random() < 0) {
	  console.log("collisions for "+p.i+"\t"+p.collisions+"\t"
		    +p.collisions2+"\t"+newCollisions);
  }

  el = document.getElementById("collisionsPerNode");
  var newavg = newCollisions / num;
  if (isNaN(newavg)) console.log(p.collisions, p.collisions2, newCollisions, num);
  el.value = round(avgCollisions(newavg), 10);
  p.collisions2 = p.collisions;
  p.collisions = 0;
};


function runningAvg(N) {
  // Return a function that returns the average of the last N of its arguments.
  // eg.
  // >>> var f = runningAvg(2);
  // >>> f(3) == 3
  // >>> f(4) == 3.5 == (3 + 4)/2
  // >>> f(5) == 4.5 == (4 + 5)/2
  // >>> f() == 4.5 // repeat last avg if called with no arguments

  // >>> var g = runningAvg(); // no argument
  // >>> g(3) == 3
  // >>> g(4) == 3.5 == (3 + 4)/2
  // >>> g(5) == 4 == (3 + 4 + 5)/3
  // >>> g() == 4 // repeat last avg if called with no arguments
  if (isNaN(N)){
    var avg = 0, n = 0;
    return function unlimited_average(x) {
      if (!isNaN(x)) {
        avg = (n * avg + x) / (n + 1);
        n++;
      }
      return avg;
    }
  }
  // limited running average
  var i, arr=new Array(N), s=0, n=0;
  for(i=0; i < N; i++) arr[i]=0;
  i=0;
  return function limited_avg (x) {
	  if (!isNaN(x)) {
      s+=x-arr[i]; // adjust the sum
	    arr[i] = x; // remember this value
	    if (n < N) n++; // advance actual len of arr if needed
	    i += 1; // advance memory (+1 mod n)
	    i %= n;
    }
	  return s/n;
  };
}

// used to track the capacity of a single node
function Capacity(timeWindow) {
  this.pkts = [];
  this._collided = 0;
  this._used = 0;
  this.startTime = 0;
  this.timeWindow = timeWindow;
}

Capacity.prototype = {};

Capacity.prototype.register = function(pkt) {
  var newestPkt = this.pkts.length && this.pkts[this.pkts.length - 1];
  if (pkt.ts < this.startTime || newestPkt && pkt.ts < newestPkt.ts + newestPkt.len) {
    console.log(this, pkt);
    throw "Capacity: Packets are out of order";
  }
  this.pkts.push(pkt);
  this[pkt.collided? "_collided": "_used"] += pkt.len;
  while (time - this.startTime > this.timeWindow) {
    if (this.pkts.length == 0)
      this.startTime = time - this.timeWindow;
    else if (this.startTime < this.pkts[0].ts)
      this.startTime = this.pkts[0].ts;
    else if (this.startTime == this.pkts[0].ts) {
      var oldestPkt = this.pkts.shift();
      this.startTime += oldestPkt.len;
      this[oldestPkt.collided? "_collided": "_used"] -= oldestPkt.len;
    }
    else {
      console.log(this, pkt);
      throw "capacity is out of sync";
    }
  }

};

Capacity.prototype.collided = function () {
  var elapsedTime = time - this.startTime;
  var x = elapsedTime == 0? 0: this._collided / elapsedTime;
  if (x > .5) console.log(x);
  return x;
};

Capacity.prototype.used = function () {
  var elapsedTime = time - this.startTime;
  var x = elapsedTime == 0? 0: this._used / elapsedTime;
  // console.log(x);
  return x;
};

// record the capacity of the network.
// Each node calls register capacity for each packet it recieves.
var capacity;
function registerCapacity(p, pkt) {
  p.capacity.register(pkt);

  if (!showCapacity) return;
  if (!capacity) capacity = {good: 0, bad: 0, n: 0, reporting: {}};
  if (pkt) {
    if (!capacity.reporting[p.i]) {
      capacity.reporting[p.i] = true;
      capacity.n++;
    }
    // pkt.len = seconds that the packet uses
    //         = percentage of bandwidth, since cycle time averages 1 second
    capacity[pkt.collided? "bad": "good"] += pkt.len;
  }
  return capacity;
}

function drawCapacity (cvs) {
  if (!showCapacity) return;
  if (!capacity) return;
  var barWidth = 10;
  var w = cvs.width, h = cvs.height;
  var x = (Math.floor(time) * barWidth) % w;
  var ctx = cvs.getContext('2d');
  ctx.fillStyle = "rgba(0,0,0,.5)";
  var good = Math.round(h * capacity.good / capacity.n );
  var bad = Math.round(h * capacity.bad / capacity.n);
  ctx.fillRect(x, h - good, barWidth, good);
  ctx.fillStyle = "rgba(255, 0, 0, .5)";
  ctx.fillRect(x, h - bad - good, barWidth, bad);
  capacity = undefined; // reset
}


var avgCollisions=runningAvg(1000);


var paths = {};
function addPath(src, dest, category, x, y) {
  // return;
  // console.log("adding path");
  if (src > dest) return addPath(dest, src, category);
  if (!paths[src]) paths[src] = {};
  if (!paths[src][dest]) paths[src][dest] = {type:{}};
  for (var c in category) paths[src][dest].type[c] = category[c];
  var p1 = particles[src];
  var p2 = particles[dest];
  paths[src][dest].src = {x: p1.x, y: p1.y};
  paths[src][dest].dest = {x: p2.x, y: p2.y};
  var d = distance(p1, p2);
  if (0 && d > radioDistance + 2*maxSpeed ) {
     console.log("p1", p1, "p2", p2, "radioDistance", radioDistance, "distance", d, "category", c, "path description", paths[src][dest]);
     drawLine(p1, p2, "red", ctx2);
    throw "addPath: path too long, p1("+p1.x+","+p1.y+"), p2("+p2.x+","+p2.y+"), old p2("+x+","+y+").";
  }


}
function pathColor(v) {
  var o = maxSpeed*0.02;
  return 'msgReturn' in v? "rgba(255,0,0,o)" // red
    : 'msgSend' in v? "rgba(0,255,0,o)" // green
    : 'snapshots' in v? "rgba(100,100,100,o)" // gray
    : "rgb(255,255,0)"; // purple: something's wrong!
}
function drawPaths() {
  // return;
  for (var src in paths) {
    for (var dest in paths[src]) {
      var p1 = particles[src], p2 = particles[dest]
      var c = pathColor(paths[src][dest].type);
      drawLine(p1, p2, c);
      var d = distance(p1, p2);
      if (0 && d > radioDistance + 2*maxSpeed) {
        console.log(p1, p2, radioDistance, d, c, paths[src][dest]);
        drawLine(p1, p2, "red", ctx2);
        throw "drawPaths: path too long "+d+" > radioDistance ("+radioDistance+") + 2*maxSpeed ("+maxSpeed+")";
      }

    }
  }
  paths = {};

}

function opacity(x) {
  return .85 - Math.exp(-1 * max(x, 1) / 3);
}

function updateLocations() {
  var el;
  el = document.getElementById('time');
  el.value = time;
  var o = .5; // opacity(maxSpeed); // .2; // 1 - Math.exp(-1 * max(maxSpeed, 1) / 2);
  ctx.fillStyle = "rgba(255,255,255,"+o+")"; // clear screen
  ctx.fillRect(0,0,width,height);
  clearLinks();
  particles.forEach(function(p, i) {
	  motionModels[motionModel](p);
    // if (p.x < 0 || p.y < 0) throw "neg point";
	  p.draw();
    // if (p.x < 0 || p.y < 0) throw "neg point";
  });
  // testNegParticles();
  // drawPaths();
  // testNegParticles();
  drawCapacity(canvas);
  // testNegParticles();
  drawMsgStatus();
  // testNegParticles();
  registerMsgAging();
  // testNegParticles();
}

function testNegParticles(){
  particles.forEach(function(p) {
    if (p.x >= 0 && p.y >= 0) return;
    console.log(p, p.x, p.y, p.i);
    throw "neg point";
  })
}

function step() {
  updateLocations();
  ctx2.drawImage(canvas, 0, 0);
};

function drawPoint(p, size) {
  ctx.fillRect(p.x,p.y,size || 1,size || 1);
};




// test
function testheap() {
  var arr = [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
  var h = new Heap;
  arr.forEach(function(x) {h.push(x);});
  console.log(h);
  console.log(h.pop(),h.pop(),h.pop(),h.pop(),h.pop(),
              h.pop(),h.pop(),h.pop(),h.pop(),h.pop(),
              h.pop(),h.pop(),h.pop(),h.pop(),h.pop());
  try {h.pop();}
  catch(e) { console.log(e); }
  console.log("done with object testing");

  function testcmp (x, y){return x-y;}
  console.log(
    heapify(arr, testcmp));
  console.log(
    heappush(arr, 16, testcmp));
  console.log(
    heappop(arr, testcmp),
    heappop(arr, testcmp),
    heappop(arr, testcmp),
    heappop(arr, testcmp),
    heappop(arr, testcmp),
    heappop(arr, testcmp),
    heappop(arr, testcmp),
    heappop(arr, testcmp),
    heappop(arr, testcmp),
    heappop(arr, testcmp),
    heappop(arr, testcmp),
    heappop(arr, testcmp),
    heappop(arr, testcmp),
    heappop(arr, testcmp),
    heappop(arr, testcmp)
  );
}




