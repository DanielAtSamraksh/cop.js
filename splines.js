var splineTension = .4;
function drawSplines(points, color) {
  //console.log("drawSplines begin");
  function ctlpts(p0, p1, p2) {
    var t = splineTension;
    var v = {x: p2.x - p0.x, y: p2.y - p0.y};
    var d01 = distance(p0, p1);
    var d12 = distance(p1, p2);
    var d012 = d01 + d12;
    return [{x: p1.x - v.x * t * d01 / d012, y: p1.y - v.y * t * d01 / d012},
            {x: p1.x + v.x * t * d12 / d012, y: p1.y + v.y * t * d12 / d012}];
  };
  cps = []; // There will be two control points for each "middle" point, 1 ... len-2e
  for (var i = 0; i < points.length - 2; i += 1) {
    cps = cps.concat(ctlpts(points[i], points[i+1], points[i+2]));
  }
  var len = points.length; // number of points
  if (len < 2) {
    //console.log("drawSplines end");
    return;
  }
  ctx.save();
  ctx.strokeStyle = color;
  if (len == 2) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[1].x, points[1].y);
    ctx.stroke();
  }
  else {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    // from point 0 to point 1 is a quadratic
    ctx.quadraticCurveTo(cps[0].x, cps[0].y, points[1].x, points[1].y);
    // for all middle points, connect with bezier
    for (var i = 2; i < len-1; i += 1) {
      var j = 2*(i-1)-1; // 1st control point for point i
      /*console.log(i, j, len-1,
                  cps[j].x, cps[j].y,
                  cps[j+1].x, cps[j+1].y,
                  points[i].x, points[i].y);
      */
      ctx.bezierCurveTo(cps[j].x, cps[j].y,
                        cps[j+1].x, cps[j+1].y,
                        points[i].x, points[i].y);
    }
    var j = 2*(i-1)-1; // 1st control point for point i
    if (j >= cps.length) console.log("j too long", cps, j);
    if (i >= points.length) console.log("i too long", points, i);

    ctx.quadraticCurveTo(cps[j].x, cps[j].y,
                         points[i].x, points[i].y);
    ctx.stroke();
  }
  ctx.restore();
  // console.log("drawSplines end");
}


function drawMessagePaths(paths) {
  console.log("drawing ", paths.length, " ( ", paths.join('  '), " ) ");
  paths.forEach(function drawMessagePath(path) {
    if (path.length < 2) return;
    // console.log("drawing ", path);
    var ps = path.map(function(i){return particles[i];});
    // drawSplines(ps, "rgba(0,0,255,.2)");
    drawCircle(ps[0], 5, "green");
    drawCircle(ps[ps.length-1], 5, "red");
  });
}

function drawMessagePath1(path, tail) {
  if (!tail) tail = [];
  var p = path[0];
  if (p instanceof Array) {
    var ps = path.slice(1).concat(tail);
    return p.forEach(function (p) { drawMessagePath(p, ps); });
  }
  var ps = nub(path.concat(tail));
  if (ps.length < 2) return;
  console.log("drawing ", ps);
  ps = ps.map(function(i){return particles[i];});
  drawSplines(ps, "rgba(0,0,255,.2)");
  drawCircle(ps[0], 5, "green");
  drawCircle(ps[ps.length-1], 5, "red");
}
