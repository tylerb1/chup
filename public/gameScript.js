// game variables + constants
var outerPadding = 8;
var innerCircleRadius = 25;

var wiggles = [];
var nWiggles = 0;
var wigglesChopped = 0;
var progressToNextPowerUp = 0;
var timeToNextWiggle = (Math.random() * 2) + 1;
var wigglesLetThrough = 0;
var wigglesCleared = 0;

var wiggleCurveTime = 3;
var wiggleCurveSpeedupFactor = 0.5;
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
var clearingCircleCurveTime = 1;
var clearingCircleSpeedupFactor = 0.5;
var canClear = false;
var clearingStage = '';
var clearingCircleHead = null;

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
outerCirclePath.strokeWidth = 4;
var clearingCircleRadius = outerCircleRadius / 2;

// show game info
var clearedText = new PointText({
	point: new Point(view.center.x - outerCircleRadius + 20, 20),
	justification: 'center',
	fontSize: 20,
	fillColor: 'black',
  content: '0'
});
var missedText = new PointText({
	point: new Point(view.center.x + outerCircleRadius - 20, 20),
	justification: 'center',
	fontSize: 20,
	fillColor: 'black',
  content: '0'
});

// ANIMATE GAME

function onFrame(event) {
  // animate inner circle
  for (var i = 0; i < innerCirclePath.segments.length; i++) {
    var offset = innerCirclePath.getOffsetOf(innerCirclePath.segments[i].point);
    var normalAtPoint = innerCirclePath.getNormalAt(offset);
    innerCirclePath.segments[i].point = innerCirclePath.segments[i].point + normalAtPoint * 0.08 * Math.sin(event.time * 3 + i * 4);
  }

  // spawn new wiggles
  if (event.time > timeToNextWiggle && clearingStage === '') {
    createWiggle(event.time);
    timeToNextWiggle = event.time + ((Math.random() * spawnFrequencyVariation) + baseTimeBetweenSpawns);
  }

  // show that clearing circle is available, if needed
  if (progressToNextPowerUp >= 5) {
    canClear = true;
    innerCirclePath.strokeColor = 'green';
    innerCirclePath.fillColor = 'green';
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
    if (wiggle.type !== 'falling') {
      if (clearingStage === '') {
        wiggle.progress += event.delta;
        animateGrowingWiggle(
          wiggle,
          wiggleCurveSpeedupFactor, 
          wiggleCurveTime
        );
      }
    } else {
      animateFallingWiggle(wiggle);
    }
  }

  // animate clearing circle, if active
  if (clearingStage === 'clearing') {
    dropIntersectedWiggles(clearingCircle.currentPath);
    clearingCircle.progress += event.delta;
    animateGrowingWiggle(
      clearingCircle, 
      clearingCircleSpeedupFactor, 
      clearingCircleCurveTime
    );
    clearingCircleHead.position = clearingCircle.currentPath.getPointAt(clearingCircle.currentPath.length);
  } else if (clearingStage === 'end') {
    innerCirclePath.strokeColor = 'black';
    innerCirclePath.fillColor = 'black';
    canClear = false;
    clearingCircle = null;
    clearingCircleHead.remove();
    clearingCircleHead = null;
    clearingStage = '';
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

function createWiggle() {
  // set start & end
  var circleOffset = Math.random();
  var startPoint = innerCirclePath.getPointAt(circleOffset * innerCirclePath.length);
  var endPoint = outerCirclePath.getPointAt(circleOffset * outerCirclePath.length);
  // randomize direction of wiggle
  if (Math.random() > 0.5) {
    var startPlaceholder = startPoint;
    startPoint = endPoint;
    endPoint = startPlaceholder;
  }
  var path = new Path.Line(startPoint, endPoint);

  // randomize all in-between points on the wiggle
  var numWiggleSections = (Math.random() + 0.5) * baseNumberWiggleSegments;
  var wigglePoints = [];
  for (var i = 1; i < numWiggleSections - 1; i++) {
    var offset = (i / numWiggleSections) * path.length;
    var linePoint = path.getPointAt(offset);
    var normalAtPoint = path.getNormalAt(offset) * i * endWigglinessFactor * (2 * (Math.random() - 0.5));
    var randomizedLinePoint = linePoint + normalAtPoint;
    wigglePoints.push(randomizedLinePoint);
  }
  path.insertSegments(1, wigglePoints);
  path.smooth({ type: 'continuous' });
  addNewWiggle(path);
}

function addNewWiggle(wigglePath) {
  var wiggleData = {
    id: 'w' + nWiggles.toString(), 
    fullPath: wigglePath,
    currentPath: new Path(),
    progress: 0,
    type: 'growing'
  };
  wiggles.push(wiggleData);
  nWiggles += 1;
}

function animateGrowingWiggle(wiggle, speedUp, curveTime) {
  // remove wiggle if it reached outer circle
  if (wiggle.progress >= curveTime) {
    wiggle.currentPath.remove();
    wiggle.fullPath.remove();
    if (wiggle.type == 'growing') {
      var i = wiggles.findIndex(function (w) {
        return wiggle.id == w.id;
      });
      wiggles.splice(i, 1);
      wigglesLetThrough += 1;
      missedText.content = wigglesLetThrough.toString();
    } else {
      clearingStage = 'shrink';
      var shrinkTween = clearingCircleHead.tweenTo(
        { scaling: 1 },
        500
      );
      shrinkTween.then(function() {
        clearingStage = 'end';
      });
    }
  } else {
    // otherwise, redraw wiggle further along path
    wiggle.currentPath.remove();
    var fullPath = wiggle.fullPath.clone();
    var progress = (Math.pow(wiggle.progress, speedUp) / Math.pow(curveTime, speedUp)) * fullPath.length;
    var splitPath = fullPath.splitAt(progress);
    var pathToDraw = fullPath.subtract(splitPath, { trace: false });
    if (wiggle.type === 'growing') {
      pathToDraw.strokeColor = 'black';
     } else {
      pathToDraw.strokeColor = 'green';
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
    if (wiggle.type !== 'falling' && !(wiggle.id in wiggleIntersectionOffsets)) {
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
    wigglesCleared += 1;
    clearedText.content = wigglesCleared.toString();
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
  addFallingWiggle(fallingWiggle1, 'red', 'left');
  addFallingWiggle(fallingWiggle2, 'red', 'right');

  wiggleHitPath.remove();
}

function addFallingWiggle(wigglePath, strokeColor, direction) {
  wigglePath.strokeColor = strokeColor;    
  var wiggleData = {
    id: 'w' + nWiggles.toString(), 
    fullPath: wigglePath,
    delta: initialFallDelta,
    type: 'falling',
    fallingDirection: direction
  };
  wiggles.push(wiggleData);
  nWiggles += 1;
}

function animateFallingWiggle(wiggle) {
  if (wiggle.fullPath.internalBounds.center.y < view.center.y * 2) {
    // animate falling paths if within scene
    var multiplier = wiggle.fallingDirection == 'left' ? 1 : -1;
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
    currentPath: new Path(),
    progress: 0,
    type: 'clearing'
  };
  clearingStage = 'grow';
  clearingCircleHead = new Path.Circle({
    center: view.center + { x: 0, y: -1 * clearingCircleRadius },
    radius: 2,
    fillColor: 'green',
    applyMatrix: false
  });
  var growTween = clearingCircleHead.tweenTo(
    { scaling: 5 },
    500
  );
  growTween.then(function() {
    clearingStage = 'clearing';
  });
}