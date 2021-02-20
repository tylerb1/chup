// game state variables
var wiggles = [];
var nWiggles = 0;
var wigglesChopped = 0;
var progressToNextPowerUp = 0;
var wigglesLetThrough = 0;
var wigglesCleared = 0;

// inner circle
var innerCircleRadius = 25;
var innerCircleColor = '#AFD0BF';

// outer circle
var outerPadding = 8;
var outerCircleColor = '#000000';

// wiggle params
var wiggleWidth = 3;
var wiggleCurveTime = 3;
var endWigglinessFactor = 10;
var baseNumberWiggleSegments = 8;
var baseTimeBetweenSpawns = 0.5;
var spawnFrequencyVariation = 0.5;
var timeToNextWiggle = (Math.random() * spawnFrequencyVariation) + baseTimeBetweenSpawns;

// main wiggles
var initialFallDelta = 0.5;
var wiggleFallSpeed = 0.4;
var wiggleFallRotation = 10;
var clearingColor = '#5171A5';
var wiggleFallColor = '#B33951';
var confettiColor = '#F0A202';
var confettiDuration = 400;

// mouse trails
var mouseTrails = [];
var mousePath;
var mouseTrailFadeTime = 2;
var mouseTrailColor = clearingColor;

// clearing circle
var clearingCircle = null;
var clearingCircleCurveTime = 1;
var canClear = false;
var clearingStage = '';
var clearingCircleHead = null;
var clearingCircleAnimDuration = 500;

// create inner circle
var innerCirclePath = new Path.Circle(view.center, innerCircleRadius);
innerCirclePath.strokeColor = innerCircleColor;
innerCirclePath.fillColor = innerCircleColor;
innerCirclePath.onClick = function() {
  if (canClear) {
    clearAtCenter();
  }
}

// create outer circle
var outerCircleRadius = window.innerWidth > window.innerHeight 
  ? (window.innerHeight / 2) - outerPadding 
  : (window.innerWidth / 2) - outerPadding;
var outerCirclePath = new Path.Circle(view.center, outerCircleRadius);
outerCirclePath.strokeColor = outerCircleColor;
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
    innerCirclePath.strokeColor = clearingColor;
    innerCirclePath.fillColor = clearingColor;
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
      clearingCircleCurveTime
    );
    clearingCircleHead.position = clearingCircle.currentPath.getPointAt(clearingCircle.currentPath.length);
  } else if (clearingStage === 'end') {
    innerCirclePath.strokeColor = innerCircleColor;
    innerCirclePath.fillColor = innerCircleColor;
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
      stops: ['#FFFFFF', mouseTrailColor]
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
  var direction = 'out';
  // randomize direction of wiggle
  if (Math.random() > 0.5) {
    var startPlaceholder = startPoint;
    startPoint = endPoint;
    endPoint = startPlaceholder;
    direction = 'in';
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
  addNewWiggle(path, direction);
}

function addNewWiggle(wigglePath, direction) {
  var wiggleData = {
    id: 'w' + nWiggles.toString(), 
    fullPath: wigglePath,
    currentPath: new Path(),
    progress: 0,
    type: 'growing',
    direction: direction
  };
  wiggles.push(wiggleData);
  nWiggles += 1;
}

function animateGrowingWiggle(wiggle, curveTime) {
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
        { duration: clearingCircleAnimDuration, easing: 'easeOutQuint' }
      );
      shrinkTween.then(function() {
        clearingStage = 'end';
      });
    }
  } else {
    // otherwise, redraw wiggle further along path
    wiggle.currentPath.remove();
    var fullPath = wiggle.fullPath.clone();
    var progress = wiggle.type === 'clearing' 
      ? getClearingCircleEasing(wiggle.progress / curveTime) * fullPath.length
      : getWiggleEasing(wiggle.progress / curveTime) * fullPath.length; 
    var splitPath = fullPath.splitAt(progress);
    var pathToDraw = fullPath.subtract(splitPath, { trace: false });
    if (wiggle.type === 'growing') {
      pathToDraw.strokeColor = getTweenedColor(wiggle, pathToDraw, curveTime);
     } else {
      pathToDraw.strokeColor = clearingColor;
     }
    pathToDraw.strokeWidth = wiggleWidth;
    wiggle.currentPath = pathToDraw;
    fullPath.remove();
    splitPath.remove();
  }
}

function getClearingCircleEasing(x) {
  return x < 0.5 
    ? 4 * x * x * x 
    : 1 - Math.pow(-2 * x + 2, 3) / 2;;
}

function getWiggleEasing(t) {
  return t < 0.5 
    ? (2 * t) * (2 - 2 * t) * 0.5 
    : Math.pow((2 * (t - 0.5)), 2) * 0.5 + 0.5 ;
}

function getTweenedColor(wiggle, pathToDraw, curveTime) {
  var progress = wiggle.progress / curveTime;
  var direction = wiggle.direction;
  var r = getTweenedColorComponent('r', progress, direction);
  var g = getTweenedColorComponent('g', progress, direction);
  var b = getTweenedColorComponent('b', progress, direction);
  var startColor = direction === 'in' ? outerCircleColor : innerCircleColor;
  var endColor = '#' + r + g + b;
  return {
    gradient: {
      stops: [startColor, endColor],
    },
    origin: pathToDraw.getPointAt(0),
    destination: pathToDraw.getPointAt(pathToDraw.length)
  };
}

function getTweenedColorComponent(color, progress, direction) {
  var startIndex = 1;
  if (color === 'g') {
    startIndex = 3;
  }
  if (color === 'b') {
    startIndex = 5;
  }
  var colorProgress = direction === 'in' ? progress : 1 - progress;
  var colorNumber256 = Math.floor(colorProgress * parseInt(innerCircleColor[startIndex], 16) * 16);
  var colorNumber16 = Math.floor(colorProgress * parseInt(innerCircleColor[startIndex + 1], 16));
  var finalColorNumber = colorNumber256 + colorNumber16;
  var secondHexNumber = finalColorNumber % 16;
  var firstHexNumber = Math.floor((finalColorNumber - secondHexNumber) / 16);
  var hexString = firstHexNumber.toString(16) + secondHexNumber.toString(16);
  return hexString;
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

  // animate intersection point
  animateIntersection(wiggleHitPath.getPointAt(offset));

  // split wiggle that was hit at intersection point & create falling wiggles
  var fallingWiggle1 = wiggleHitPath.splitAt(offset);
  var fallingWiggle2 = wiggleHitPath.subtract(fallingWiggle1, { trace: false });
  addFallingWiggle(fallingWiggle1, wiggleFallColor, 'left');
  addFallingWiggle(fallingWiggle2, wiggleFallColor, 'right');

  wiggleHitPath.remove();
}

function animateIntersection(point) {
  var innerCircle = new Path.Circle(new Point(point), 8);
  var outerCircle = new Path.Circle(new Point(point), 40);
  var confetti = [];
  for (var i = 0; i < 8; i++) {
    var innerCirclePoint = innerCircle.getPointAt((i / 8) * innerCircle.length);
    var outerCirclePoint = outerCircle.getPointAt((i / 8) * outerCircle.length);
    var confet = new Path.Line(point, innerCirclePoint);
    confet.strokeColor = confettiColor;
    confet.strokeWidth = 3;
    confetti.push(confet);
    confet.tweenTo(
      { 'position.x': outerCirclePoint.x, 'position.y': outerCirclePoint.y },
      { duration: confettiDuration, easing: 'easeOutQuad' }
    );
  }
  setTimeout(function () {
    confetti.forEach(function(c) {
      c.remove();
    });
  }, confettiDuration + 20);
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
    fillColor: clearingColor,
    applyMatrix: false
  });
  var growTween = clearingCircleHead.tweenTo(
    { scaling: 5 },
    { duration: clearingCircleAnimDuration, easing: 'easeOutQuint' }
  );
  growTween.then(function() {
    clearingStage = 'clearing';
  });
}