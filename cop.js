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
function max(x, y) { return Math.max(x, y); }
function min(x, y) { return Math.min(x, y); }
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
  while (i <= floor(len/2)) {
    var left = 2*i+1, right = left + 1;
    x = left >= len ? null
      : right >= len ? left
      : cmp(arr[left], arr[right]) <= 0? left
      : right;

    if (x && 0 < cmp(arr[i], arr[x])) {
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
  peek: function() { return this.arr[0]; }
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
    if (topoSend > 0 && Math.random() < topoSend) {
      // console.log("generating a new message");
      p.msgsOut.push(generateMessage(p));
      receiveMessages(p, 1/messagesPerCycle);
    }
    p.emptyMessageQ();
    p.sendSnapshots();

  };
}

function receiveMessages(p, deltaTime) {
  // console.log("At time "+time+" receivingMessage in "+deltaTime);
  var name = "receiveMessages "+random();
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
      p.emptyMessageQ();
      p.sendMessages();
    }
  });
  //if (!eventQ.arr.some(function(x) {return x.name === name; })) {
  //  throw "EventQ does not contain receiveMessages "+ name;
  //}

}


function receiveSnapshots(p, snapshots) {
  // console.log(snapshots);
  snapshots.forEach(
    function(s){
      if (!p.cop[s.i] || p.cop[s.i].ts < s.ts) {
        // not in cop table (we just throw away stale data, this is probably suboptimal)
		    p.cop[s.i] = {
          i:s.i, x:s.x, y:s.y, ts:s.ts,
		      seen:1, hops:s.hops+1
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

function receiveMsgs(p, msgs) {
  // msgs = [{dest, src, hops, ts, msgid, via}]
  // console.log("receiveMsgs for "+p.i);
  msgs.forEach(
    function(m) {
      if (!(m.dest in p.cop)) return; // unknown destination
      if (m.dest == p.i) {  // one way or round trip
        if ( messages.src[m.msgid] == m.dest ) { // round trip
          // we sent this message
          p.messaging[4] = true;
          registerMsgRoundTrip(m);
          // console.log("roundTrip ", m, messages);
        }
        else { // one-way; return the message (reply)
          m = copyo(m);
          var x = m.src; m.src = m.dest; m.dest = x;
          m.hops = p.cop[m.dest]? p.cop[m.dest].hops + surplusHops: maxHops;
          p.msgsOut.push(m);
          p.messaging[2] = true;
          registerMsgOneWay(m);
          // console.log("oneWay ", m, messages);
        }
      }
      else if ( p.cop[m.dest].hops < m.hops && !p.messagesSeen.contains(m.msgid) ) { // this node can help forward
        m = copyo(m);
        m.hops -= 1;
        if (m.hops < 0) return;

        // if (m.src) {
        //  //console.log("forwarding ", m);
        // }
        // else console.log("returning ", m);

        p.msgsOut.push(m);
        p.messaging[m.dest? 1: 3] = true;
      }
      else if ( p.cop[m.dest].hops >= m.hops ) { // track this message so that we don't rebroadcast it.
        p.messagesSeen.add(m.msgid);
      }
      else { // don't process this message
        // if (!m.src) { console.log(p, " not processing return message ", m); }
        return;
      }

      if (showMsgPaths) addPath(p.i, m.via, (m.dest != 0? {msgReturn: 1}: {msgSend: 1}), m.via_x, m.via_y );
    });
  if (p.msgsOut.length > 0) p.sendMessages(); // immediately forward messages
}


function getSnapshots(p) {
  // update self
  p.cop[p.i]={i:p.i, x:p.x, y:p.y, ts:p.ts++, seen:0, hops:0};

  var snapshots = [];
  var copTableSize = 0;
  for (var i in p.cop) {
  	copTableSize++;
    c = p.cop[i];
    if (c.seen < 3 &&
        distance(c, p) * Math.random() / p.radioDistance * distanceSensitivity < 1) {
	    snapshots.push({i:i, x:c.x, y:c.y, ts:c.ts, hops:c.hops});
  	}
  }
  if (p.i == 0) {
	  randomCopTableSize = copTableSize;
  }
  return snapshots;
}

function getMsgs(p) {
  // only send out one copy, therefore use an dict/obj to track unique objects and then populate an array of messages where each msgid is represented only once.
  var o = {};
  p.msgsOut.forEach(
    function(m){
      // if (!o[m.msgid] || o[m.msgid].hops > m.hops ) { // favor closer msgs
      if (!o[m.msgid] || o[m.msgid].hops < m.hops ) { // favor farther msgs
        o[m.msgid] = m = copyo(m);
        m.via = p.i;
        m.via_x = p.x; m.via_y = p.y;
      }
    });
  var msgs = [];
  for (var msgid in o) {
    msgs.push(o[msgid]);
  }
  return msgs;
}


function generateMessage(p) {
  // console.log("generateMessage");
  // create a unique message
  var msgid;
  // a random msgid should be unique, but verify it anyway.
  do { msgid = Math.random(); } while ( msgid in messages.src);
  var msg = {
    msgid: msgid, src: p.i, via: p.i, dest: 0, ts: time,
    hops: p.cop[0]? p.cop[0].hops + surplusHops: maxHops
  };

  // track when we should expect a reply (now + max_return_trip + trip)
  var expiration = p.ts + maxHops + msg.hops;
  registerMsgStart(msg, expiration);
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
var avgNeighbors;
var neighborhoods = [];
var neighborhoodsInRow, neighborhoodsInColumn;
var maxHops, surplusHops = 0;
var density, radioDistance, dynamicRadioDistance, showCop, showMsgPaths, showPaths=false, showCapacity, showCollisons, visualizeMotionModel;
var maxRepeats, repeatCycle;

var closedWorld = true;

var randomCopTable, randomCopTableSize; // from the first (it's random) particle


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
    sent:0, // number of times this message has been sent
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
  console.log("oneWayElapsedTime", elapsedTime);
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
  console.log("roundTripElapsedTime", elapsedTime);
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
  delete messages.msg[msgid];
}
function drawMsgStatus() {
  el = document.getElementById('msgStatus');
  var oneWayET = "", roundTripET = "";
  try {
    oneWayET = messages.oneWay? "(with " + round(messages.oneWayElapsedTime / messages.oneWay, 10) + " average elapsed time, messages.oneway = " + messages.oneWay+ ")": "";
    roundTripET = messages.roundTrip? "(with " + round(messages.RoundTripElapsedTime / messages.roundTrip, 10) + " average elapsed time, messages.roundTrip = " + messages.roundTrip + ")": "";
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
  this.ts = 0;
  this.collisions = 0;
  this.collisions2 = 0;
	this.radioDistance = radioDistance;
  this.stinky = false;
  this.messages = [];
  this.msgsOut = [];
  this.messaging = {};
  this.setNeighborhood();
  this.messagesSeen = new LimitedSizeSet(1000);
  eventQ.push({time: time + .5 + random(), name: "sendSnapshots", action: sendSnapshots(this)});

  // console.log("creating particle "+i);


  return this;
};
Particle.prototype = {};

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

Particle.prototype.emptyMessageQ = function (){
  var p = this;
  // console.log("emptyMessageQ");
  // read packets
  while (p.messages.length && p.messages[0].ts + p.messages[0].len < time) {
    var m = p.messages.shift(); // this message completed in the past
    if (m.skip) continue;
    while (p.messages.length) { // check for collisions
      if (p.messages[0].ts >= m.ts + m.len) break; // next message begins after this one ends
      m.collided = true;
      p.collisions += 1;
      var m2 = p.messages.shift();
      m.len = max( m.len, m2.ts - m.ts + m2.len);
    }
    registerCapacity(p, m);
    if ( m.collided ) continue;
    if ( m.src == p.i ) continue;
    // processMessage(p, m); // reproduced below
    // console.log(p.i+ " processing message from "+m.src);
    if (m.snapshots && m.snapshots.length) {
      // console.log("emptyMessageQ: receiving snapshots");
      receiveSnapshots(p, m.snapshots);
    }
    if (m.msgs && m.msgs.length) {
      // console.log("emptyMessageQ: receiving msg");
      receiveMsgs(p, m.msgs);
    }
  }
};

// return the next time that it looks like it's safe the transmit.
Particle.prototype.nextOpenTransmissionTime = function() {
  var p = this;
  if (p.messages.length == 0) return true;
  var t = 0; // the latest time the channel is busy
  p.messages.forEach(function(m) {
    var t2 = m.ts + m.len;
    if (t2 > t) t = t2;
  });
  return t <= time? time: t;
};

Particle.prototype.sendSnapshots = function () {
  var p = this;
  if (p.nextOpenTransmissionTime() > time) {
    // no retry
    return false;
  }
  var pkt = {
    ts: time,
    src: p.i,
    snapshots: getSnapshots(p)
  };
  pkt.len = (pkt.snapshots.length) / snapshotsPerCycle;
  p.getNeighbors().forEach(function(n){
    // console.log(p.i+" sending message to "+n.i);
    if (distance(n, p) > radioDistance) {
      throw "path too long";
    }
    n.messages.push(pkt);
    if (showPaths) {
      addPath(p.i, n.i, {snapshots: 1});
    }
  });
  p.messages.push(pkt);
  return true;
};

Particle.prototype.sendMessages = function() {
  var p = this;
  // console.log("sendMessages for "+p.i);
  var msgs = getMsgs(p);
  if (msgs.length == 0) return false;
  var nextTime = p.nextOpenTransmissionTime();
  if (nextTime > time) {
    // retry
    console.log("retrying sendMessages for "+p.i);
    receiveMessages(p, nextTime - time + random() * .1);
    return false;
  }
  var pkt = {
    ts: time,
    src: p.i,
    msgs: msgs
  };
  pkt.len = (pkt.msgs.length) / messagesPerCycle;
  pkt.msgs.forEach(registerMsgTransit);
  p.msgsOut = []; // reset messages
  var ns = p.getNeighbors();
  // console.log(p.i+" sending message to "+ns.length+" neighbors.");
  p.getNeighbors().forEach(function(n){
    // console.log(p.i+" sending message to "+n.i);
    n.messages.push(pkt);
    receiveMessages(n, pkt.len); // schedule a receiving node to receive the message
  });
  p.messages.push(pkt);
};


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
    console.log(p1, p2);
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

// copy object
function copyo(o) {
    var o2 = {};
    for (var k in o) o2[k] = o[k];
    return o2;
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
  var el = document.getElementById("visualizeMotionModel");
  visualizeMotionModel = el.checked;
  el.onchange = function (){
    visualizeMotionModel = el.checked;
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
function drawLine(p1,p2, style, c) {
  if (!c) c = ctx;
  c.beginPath();
  c.lineWidth = 1;
  c.moveTo(p1.x, p1.y);
  c.lineTo(p2.x, p2.y);
  c.strokeStyle = style || "#00ff00";
  c.stroke();
}
function drawCircle(p1,r, style) {
   ctx.beginPath();
   ctx.arc(p1.x, p1.y, r, 0, 2*Math.PI);
   ctx.lineWidth = 1;
   ctx.strokeStyle = style || "#505050";
   ctx.stroke();
}
function drawFilledCircle(p1,r, style) {
   ctx.beginPath();
   ctx.arc(p1.x, p1.y, r, 0, 2*Math.PI);
   //ctx.lineWidth = 1;
   ctx.fillStyle = style || "#f09090";
   ctx.fill();
}


function drawParticle(p) {

  // draw particle itself
  if (p.messaging[4])      drawFilledCircle(p, 3, "rgba(255,0,0,.5)");   // round trip = red
  else if (p.messaging[3]) drawFilledCircle(p, 3, "rgba(128,0,0,.5)");  // returning = dark red
  else if (p.messaging[2]) drawFilledCircle(p, 3, "rgba(255,255,0,.5)"); // destination = yellow
  else if (p.messaging[1]) drawFilledCircle(p, 3, "rgba(0, 128,.5)"); // forwarding = darker green
  else if (p.messaging[0]) drawFilledCircle(p, 3, "rgba(0,255,0,.5)");   // sending = green
  else if (p.i == 0)       drawFilledCircle(p, 3, "rgba(255,150,0,.5)"); // special node = orange
  else if (p.i in particles[0].cop) drawFilledCircle(p, 3, "rgba(0,0,255,.5)"); // in cop table = blue
  else                     drawFilledCircle(p, 3, "rgba(100,100,100,.5)");     // not in cop table = gray
  p.messaging = {}; // clear messaging records

  // special stuff associated with particle 0
  if (p.i == 0) {
	  drawCircle(p, p.radioDistance);

	  el = document.getElementById('copTableSize');
	  el.value = counto(p.cop);

	  if (showCop) {
	    for (var i in p.cop) {
		    if (particles[i].stinky) continue; // don't draw stinky
		    drawLine(p.cop[i], particles[i]);
	    }
	  }
  }

  if (showCollisions && p.collisions) {
	  drawCircle(p, p.collisions * 3, "#f00");
  }

  if (p.stinky) {
	  // drawCircle(p, 5, "#5C4033");
  }

  if (visualizeMotionModel) {
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
}


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


// record the capacity of the network.
// Each node calls register capacity for each packet it recieves.
var capacity;
function registerCapacity(p, pkt) {
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
  if (d > radioDistance + 2*maxSpeed && 0) {
     console.log("p1", p1, "p2", p2, "radioDistance", radioDistance, "distance", d, "category", c, "path description", paths[src][dest]);
     drawLine(p1, p2, "red", ctx2);
    throw "addPath: path too long, p1("+p1.x+","+p1.y+"), p2("+p2.x+","+p2.y+"), old p2("+x+","+y+").";
  }


}
function pathColor(v) {
  return 'msgReturn' in v? "rgba(255,0,0,0.5)" // red
    : 'msgSend' in v? "rgba(0,255,0,0.5)" // green
    : 'snapshots' in v? "rgba(100,100,100,.5)" // gray
    : "rgb(255,255,0)"; // purple: something's wrong!
}
function drawPaths() {
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
  var o = opacity(maxSpeed); // .2; // 1 - Math.exp(-1 * max(maxSpeed, 1) / 2);
  ctx.fillStyle = "rgba(255,255,255,"+o+")"; // clear screen
  ctx.fillRect(0,0,width,height);
  particles.forEach(function(p, i) {
	  motionModels[motionModel](p);
    if (p.x < 0 || p.y < 0) throw "neg point";
	  drawParticle(p);
    if (p.x < 0 || p.y < 0) throw "neg point";
  });
  testNegParticles();
  drawPaths();
  testNegParticles();
  drawCapacity(canvas);
  testNegParticles();
  drawMsgStatus();
  testNegParticles();
  registerMsgAging();
  testNegParticles();
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


