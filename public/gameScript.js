// game variables + constants
var wiggles = [];
var nWiggles = 0;
var timeToNextWiggle = (Math.random() * 2) + 1;
var wigglesLetThrough = 0;
var mouseTrails = [];
var curveTime = 3;
var endWigglinessFactor = 10;
var baseNumberWiggleSegments = 8;
var baseSpawnFrequency = 1;
var spawnFrequencyVariation = 2;
var wiggleWidth = 3;
var initialFallDelta = 0.4;
var wiggleFallSpeed = 0.6;
var wiggleFallRotation = 10;
var outerPadding = 16;
var innerCircleRadius = 20;
var mouseTrailFadeTime = 2;
var mousePath;

// create inner circle
var innerCirclePath = new Path.Circle(view.center, innerCircleRadius);
innerCirclePath.strokeColor = 'black';
innerCirclePath.fillColor = 'black';

// create outer circle
var outerCircleRadius = window.innerWidth > window.innerHeight 
  ? (window.innerHeight / 2) - outerPadding 
  : (window.innerWidth / 2) - outerPadding;
var outerCirclePath = new Path.Circle(view.center, outerCircleRadius);
outerCirclePath.strokeColor = 'black';

// create a new wiggling path
function createWiggle(timeCreated) {
  // set start & end
  var circleOffset = Math.random();
  var startPoint = innerCirclePath.getPointAt(circleOffset * innerCirclePath.length);
  var endPoint = outerCirclePath.getPointAt(circleOffset * outerCirclePath.length);
  var path = new Path.Line(startPoint, endPoint);

  // randomize all in-between points on the wiggle
  var numWiggleSections = (Math.random() + 0.5) * baseNumberWiggleSegments;
  var wigglePoints = [];
  for (var i = 1; i < numWiggleSections - 1; i++) {
    var linePoint = path.getPointAt((i / numWiggleSections) * path.length)
    var variation = (2 * (Math.random() - 0.5)) * (endWigglinessFactor * i);
    var randomizedLinePoint = linePoint + { x: variation, y: variation };
    wigglePoints.push(randomizedLinePoint);
  }
  path.insertSegments(1, wigglePoints);
  path.smooth({ type: 'continuous' });
  addNewWiggle(path, timeCreated);
}

// progressively fill or drop wiggles
function onFrame(event) {
  // spawn new wiggles
  if (event.time > timeToNextWiggle) {
    createWiggle(event.time);
    timeToNextWiggle = event.time + ((Math.random() * spawnFrequencyVariation) + baseSpawnFrequency);
  }
    
  // animate mouse trails
  for (var i = 0; i < mouseTrails.length; i++) {
    if (event.time - mouseTrails[i].timeCreated > mouseTrailFadeTime) {
      mouseTrails[i].path.remove();
      mouseTrails.splice(i, 1);
    } else {
      mouseTrails[i].path.opacity -= 0.1;
    }
  }
  
  // animate growing & falling wiggles
  for (var i = 0; i < wiggles.length; i++) {
    var wiggle = wiggles[i];
    if (!wiggle.isFalling) {
      animateGrowingWiggle(wiggle, event, i);
    } else {
      animateFallingWiggle(wiggle);
    }
  }
}

function animateGrowingWiggle(wiggle, event, i) {
  // remove wiggle if it reached outer circle
  if (event.time - wiggle.timeCreated > curveTime) {
    wiggle.currentPath.remove();
    wiggle.fullPath.remove();
    wiggles.splice(i, 1);
    wigglesLetThrough += 1;
    // console.log(`Let through: ${wigglesLetThrough}`);
  } else {
    // otherwise, redraw wiggle further along path
    wiggle.currentPath.remove();
    var fullPath = wiggle.fullPath.clone();
    var phase = (event.time - wiggle.timeCreated) % curveTime;
    // wiggle speeds up as it gets closer to outer circle
    var progress = (Math.pow(phase, 3) / Math.pow(curveTime, 3)) * fullPath.length;
    var splitPath = fullPath.splitAt(progress);
    var pathToDraw = fullPath.subtract(splitPath, { trace: false });
    pathToDraw.strokeColor = 'black';
    pathToDraw.strokeWidth = wiggleWidth;
    wiggle.currentPath = pathToDraw;
    fullPath.remove();
    splitPath.remove();
  }

}

function animateFallingWiggle(wiggle) {
  if (wiggle.fullPath.internalBounds.center.y < view.center.y * 2) {
    // animate falling paths if within scene
    var multiplier = wiggle.fullPath.strokeColor == 'red' ? 1 : -1;
    wiggle.fullPath.translate(new Point(4 * multiplier, wiggle.delta));
    wiggle.delta += wiggleFallSpeed;
    wiggle.fullPath.rotate(wiggleFallRotation, wiggle.fullPath.internalBounds.center);
  } else {
    // remove falling paths from scene if below scene
    for (var i = 0; i < wiggles.length; i++) {
      if (wiggles[i].isFalling) wiggles[i].fullPath.remove();
    }
    wiggles = wiggles.filter(function(w) { 
      return !w.isFalling 
    });
  }
}

function onMouseUp(event) {
  // add mouse trail to global array so it can be animated
  var mousePathClone = mousePath.clone();
  var mouseTrail = {
    path: mousePathClone,
    timeCreated: event.timeStamp / 1000
  };
  mouseTrails.push(mouseTrail);
  mousePath.remove();
}

function onMouseDown() {
  mousePath = new Path();
  mousePath.strokeColor = '#00000';
}

function onMouseDrag(event) {
  // add latest mouse location
  mousePath.add(event.point);

  // trim back end of mouse trail
  if (mousePath.segments.length > 30) {
    mousePath.removeSegments(0, mousePath.segments.length - 30);
  }

  // set mouse trail color
  mousePath.strokeColor = {
    gradient: {
      stops: ['white', 'blue']
    },
    origin: mousePath.firstSegment.point,
    destination: mousePath.lastSegment.point
  }

  // get most recent segment of mouse movement
  var mousePathLength = mousePath.segments.length;
  var lastMouseMovement = new Path(
    [
      mousePath.segments[mousePathLength - 2], 
      mousePath.segments[mousePathLength - 1]
    ]
  );

  // check each wiggle to see if latest mouse movement hit it,
  // and if so, save the offset of the intersection on that wiggle
  var wiggleIntersectionOffsets = {};
  wiggles.forEach(function(wiggle) {
    if (!wiggle.isFalling && !(wiggle.id in wiggleIntersectionOffsets)) {
      var ixns = wiggle.currentPath.getIntersections(lastMouseMovement);
      if (ixns.length > 0) {
        var offset = wiggle.currentPath.getOffsetOf(ixns[0].point);
        wiggleIntersectionOffsets[wiggle.id] = offset;
      }
    }
  });
  lastMouseMovement.remove();
  
  // drop any wiggles that were hit
  Object.keys(wiggleIntersectionOffsets).forEach(function(id) {
    var wiggleHit = wiggles.find(function(w) { 
      return w.id == id 
    })
    dropWiggle(wiggleHit, wiggleIntersectionOffsets[id]);
  });
}

function dropWiggle(wiggleHit, offset) {
  var wiggleHitPath = wiggleHit.currentPath.clone();
    
  // remove hit wiggle from scene
  wiggleHit.fullPath.remove();
  wiggleHit.currentPath.remove();
  var indexToRemove = wiggles.findIndex(function(w) { 
    return w.id == wiggleHit.id 
  })
  wiggles.splice(indexToRemove, 1);

  // split wiggle that was hit at intersection point & create falling wiggles
  var fallingWiggle1 = wiggleHitPath.splitAt(offset);
  var fallingWiggle2 = wiggleHitPath.subtract(fallingWiggle1, { trace: false });
  addFallingWiggle(fallingWiggle1, 'red');
  addFallingWiggle(fallingWiggle2, 'blue');

  wiggleHitPath.remove();
}

function addFallingWiggle(wigglePath, strokeColor) {
  wigglePath.strokeColor = strokeColor;    
  var wiggleData = {
    id: 'w' + nWiggles.toString(), 
    fullPath: wigglePath,
    delta: initialFallDelta,
    isFalling: true
  };
  wiggles.push(wiggleData);
  nWiggles += 1;
}

function addNewWiggle(wigglePath, timeCreated) {
  var wiggleData = {
    id: 'w' + nWiggles.toString(), 
    fullPath: wigglePath,
    currentPath: new Path(),
    timeCreated: timeCreated,
    isFalling: false
  };
  wiggles.push(wiggleData);
  nWiggles += 1;
}