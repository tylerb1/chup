// game variables + constants
var outerPadding = 8;
var innerCircleRadius = 25;

var wiggles = [];
var nWiggles = 0;
var wigglesChopped = 0;
var progressToNextPowerUp = 0;
var timeToNextWiggle = (Math.random() * 2) + 1;
var wigglesLetThrough = 0;

var wiggleCurveTime = 3;
var endWigglinessFactor = 10;
var baseNumberWiggleSegments = 8;
var baseTimeBetweenSpawns = 0.5;
var spawnFrequencyVariation = 0.5;
var wiggleWidth = 3;

var initialFallDelta = 0.3;
var wiggleFallSpeed = 0.4;
var wiggleFallRotation = 10;

var mouseTrails = [];
var mousePath;
var mouseTrailFadeTime = 2;

var clearingCircle = null;
var clearingCircleCurveTime = 0.6;
var clearingCircleRadius = innerCircleRadius + 25;
var canClear = false;
var isClearing = false;

// create inner circle
var innerCirclePath = new Path.Circle(view.center, innerCircleRadius);
innerCirclePath.strokeColor = 'black';
innerCirclePath.fillColor = 'black';
innerCirclePath.onClick = function() {
  if (canClear) {
    clearAtCenter()
  }
}

// create outer circle
var outerCircleRadius = window.innerWidth > window.innerHeight 
  ? (window.innerHeight / 2) - outerPadding 
  : (window.innerWidth / 2) - outerPadding;
var outerCirclePath = new Path.Circle(view.center, outerCircleRadius);
outerCirclePath.strokeColor = 'black';

// ANIMATE GAME

function onFrame(event) {
  // spawn new wiggles
  if (event.time > timeToNextWiggle) {
    createWiggle(event.time);
    timeToNextWiggle = event.time + ((Math.random() * spawnFrequencyVariation) + baseTimeBetweenSpawns);
  }

  // show that clearing circle is available, if needed
  if (progressToNextPowerUp >= 5) {
    canClear = true;
    innerCirclePath.strokeColor = 'blue';
    innerCirclePath.fillColor = 'blue';
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
      animateGrowingWiggle(wiggle, event.time, i, 3, wiggleCurveTime);
    } else {
      animateFallingWiggle(wiggle);
    }
  }

  // animate clearing circle, if active
  if (isClearing) {
    if (!clearingCircle.timeCreated) {
      clearingCircle.timeCreated = event.time;
    }
    dropIntersectedWiggles(clearingCircle.currentPath);
    animateGrowingWiggle(clearingCircle, event.time, -1, 1, clearingCircleCurveTime);
  }
}

// MOUSE EVENTS

function onMouseDown() {
  mousePath = new Path();
  mousePath.strokeColor = '#000000';
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

  // 1. get most recent segment of mouse movement
  // 2. check each wiggle to see if latest mouse movement hit it
  // 3. if so, save the offset of the intersection on that wiggle
  var mousePathLength = mousePath.segments.length;
  var lastMouseMovement = new Path(
    [
      mousePath.segments[mousePathLength - 2], 
      mousePath.segments[mousePathLength - 1]
    ]
  );
  dropIntersectedWiggles(lastMouseMovement);
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

// GROWING WIGGLE FUNCTIONS

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

function animateGrowingWiggle(wiggle, time, i, speedUp, curveTime) {
  // remove wiggle if it reached outer circle
  if (time - wiggle.timeCreated > curveTime) {
    wiggle.currentPath.remove();
    wiggle.fullPath.remove();
    if (i > -1) {
      wiggles.splice(i, 1);
      wigglesLetThrough += 1;
    } else {
      innerCirclePath.strokeColor = 'black';
      innerCirclePath.fillColor = 'black';
      canClear = false;
      clearingCircle = null;
      isClearing = false;
    }
  } else {
    // otherwise, redraw wiggle further along path
    wiggle.currentPath.remove();
    var fullPath = wiggle.fullPath.clone();
    var phase = (time - wiggle.timeCreated) % curveTime;
    // wiggle speeds up as it gets closer to outer circle
    var progress = (Math.pow(phase, speedUp) / Math.pow(curveTime, speedUp)) * fullPath.length;
    var splitPath = fullPath.splitAt(progress);
    var pathToDraw = fullPath.subtract(splitPath, { trace: false });
    if (i > -1) {
      pathToDraw.strokeColor = 'black';
    } else {
      pathToDraw.strokeColor = {
        gradient: {
          stops: ['white', 'blue']
        },
        origin: pathToDraw.firstSegment.point,
        destination: pathToDraw.lastSegment.point
      }
    }
    pathToDraw.strokeWidth = wiggleWidth;
    wiggle.currentPath = pathToDraw;
    fullPath.remove();
    splitPath.remove();
  }
}

// FALLING WIGGLE FUNCTIONS

function dropIntersectedWiggles(path) {
  var wiggleIntersectionOffsets = {};
  wiggles.forEach(function(wiggle) {
    if (!wiggle.isFalling && !(wiggle.id in wiggleIntersectionOffsets)) {
      var ixns = wiggle.currentPath.getIntersections(path);
      if (ixns.length > 0) {
        var offset = wiggle.currentPath.getOffsetOf(ixns[0].point);
        wiggleIntersectionOffsets[wiggle.id] = offset;
      }
    }
  });
  path.remove();
  
  // drop any wiggles that were hit
  Object.keys(wiggleIntersectionOffsets).forEach(function(id) {
    dropWiggle(id, wiggleIntersectionOffsets[id]);
  });
}

function dropWiggle(id, offset) {
  var wiggleHit = wiggles.find(function(w) { 
    return w.id == id 
  })
  if (!wiggleHit) return;
  wigglesChopped += 1;
  progressToNextPowerUp += 1;
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

function animateFallingWiggle(wiggle) {
  if (wiggle.fullPath.internalBounds.center.y < view.center.y * 2) {
    // animate falling paths if within scene
    var multiplier = wiggle.fullPath.strokeColor == 'red' ? 1 : -1;
    wiggle.fullPath.translate(new Point(4 * multiplier, wiggle.delta));
    wiggle.delta += wiggleFallSpeed;
    wiggle.fullPath.rotate(wiggleFallRotation, wiggle.fullPath.internalBounds.center);
  } else {
    // remove falling paths from scene if below scene
    wiggle.fullPath.remove();
    wiggles = wiggles.filter(function(w) { 
      return w.id !== wiggle.id
    });
  }
}

// POWERUPS

function clearAtCenter() {
  progressToNextPowerUp = 0;
  var clearingCirclePath = new Path.Arc(
    view.center + { x: 0, y: -1 * clearingCircleRadius },
    view.center + { x: clearingCircleRadius, y: 0 },
    view.center + { x: 0, y: clearingCircleRadius }
  );
  clearingCirclePath.arcTo(
    view.center + { x: -1 * clearingCircleRadius, y: 0},
    view.center + { x: 0, y: -1 * clearingCircleRadius}
  );
  clearingCircle = {
    fullPath: clearingCirclePath,
    currentPath: new Path()
  };
  isClearing = true;
}