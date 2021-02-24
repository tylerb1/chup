// game state variables
var wiggles = [];
var nWiggles = 0;
var progressToNextPowerUp = 0;
var nWigglesToNextPowerUp = 2;
var nWigglesLetThrough = 0;
var nWigglesCleared = 0;
var lastNWigglesCleared = -1;
var lastNWigglesLetThrough = -1;

// inner circle
var innerCircleColor = '#AFD0BF';
var nInnerCircleWaveSegments = 4;
var innerCircleWaveHeight = 0;
var innerCircleWavePath = null;
var innerCircleWavePathTop = null;
var innerCircleWavePathBottom = null;
var waveLineY = 0;

// outer circle
var outerPadding = 8;
var outerCircleColor = '#000000';

// wiggle params
var wiggleWidth = 4;
var wiggleCurveTime = 6;
var endWigglinessFactor = 10;
var baseNumberWiggleSegments = 8;

// wiggle spawning params
var baseTimeBetweenSpawns = 1.5;
var spawnFrequencyVariation = 0.8;
var timeToNextWiggle = (Math.random() * spawnFrequencyVariation) + baseTimeBetweenSpawns;

// intersection params
var initialFallDelta = 0.5;
var wiggleFallSpeed = 0.4;
var wiggleFallRotation = 10;
var clearingColor = '#5171A5';
var wiggleFallColor = '#B33951';
var goodConfettiColor = '#F0A202';
var badConfettiColor = '#B33951';
var confettiDuration = 400;

// mouse trails
var mouseTrails = [];
var mousePath;
var mouseTrailFadeTime = 2;
var mouseTrailColor = clearingColor;

// clearing circle params
var clearingCircle = null;
var clearingCircleCurveTime = 1;
var canClear = false;
var clearingStage = '';
var clearingCircleHead = null;
var clearingCircleAnimDuration = 500;

// create outer circle
var outerCircleRadius = window.innerWidth > window.innerHeight 
  ? (window.innerHeight / 2) - outerPadding 
  : (window.innerWidth / 2) - outerPadding;
var outerCirclePath = new Path.Circle(view.center, outerCircleRadius);
outerCirclePath.strokeColor = outerCircleColor;
outerCirclePath.strokeWidth = 4;
var clearingCircleRadius = outerCircleRadius / 2;

// create inner circle
var innerCircleRadius = Math.ceil(outerCircleRadius / 6);
var innerCirclePath = new Path.Circle(view.center, innerCircleRadius);
innerCirclePath.strokeColor = innerCircleColor;
innerCirclePath.strokeWidth = 3;
innerCirclePath.onClick = function() {
  if (canClear) {
    clearAtCenter();
  }
}

// show game info
// var clearedText = new PointText({
// 	point: new Point(view.center.x - outerCircleRadius + 20, 20),
// 	justification: 'center',
// 	fontSize: 20,
// 	fillColor: 'black',
//   content: '0'
// });
// var missedText = new PointText({
// 	point: new Point(view.center.x + outerCircleRadius - 20, 20),
// 	justification: 'center',
// 	fontSize: 20,
// 	fillColor: 'black',
//   content: '0'
// });

// ANIMATE GAME

function onFrame(event) {
  // uncomment to check for excessive path creation
  // console.log(project.activeLayer.children.length);
  if (canClear) {
    animateInnerCircleEdge(event.time);
  }
  if (
    lastNWigglesCleared !== nWigglesCleared ||
    lastNWigglesLetThrough !== nWigglesLetThrough
  ) {
    moveInnerCircleWavePath();
  }
  if (progressToNextPowerUp > 0 && progressToNextPowerUp < 1) {
    animateInnerCircleWave(event);
  }
  if (event.time > timeToNextWiggle && clearingStage === '') {
    createWiggle(event.time);
    timeToNextWiggle = event.time + ((Math.random() * spawnFrequencyVariation) + baseTimeBetweenSpawns);
  }
  setClearingAvailability();
  animateMouseTrails(event.time);
  animateAllWiggles(event.delta);
  animateClearingCircle(event.delta);
}

function animateInnerCircleEdge(time) {
  for (var i = 0; i < innerCirclePath.segments.length; i++) {
    var offset = innerCirclePath.getOffsetOf(innerCirclePath.segments[i].point);
    var normalAtPoint = innerCirclePath.getNormalAt(offset);
    innerCirclePath.segments[i].point = innerCirclePath.segments[i].point + normalAtPoint * 0.08 * Math.sin(time * 3 + i * 4);
  }
}

function setClearingAvailability() {
  if (progressToNextPowerUp >= 1) {
    canClear = true;
    innerCirclePath.strokeColor = clearingColor;
    innerCirclePath.fillColor = clearingColor;
  } else {
    canClear = false;
    innerCirclePath.strokeColor = innerCircleColor;
    innerCirclePath.fillColor = null;
  }
}

function animateMouseTrails(time) {
  for (var i = 0; i < mouseTrails.length; i++) {
    if (time - mouseTrails[i].timeCreated > mouseTrailFadeTime) {
      mouseTrails[i].path.remove();
      mouseTrails.splice(i, 1);
    } else {
      mouseTrails[i].path.opacity -= 0.1;
    }
  }
}

function animateAllWiggles(delta) {
  for (var i = 0; i < wiggles.length; i++) {
    var wiggle = wiggles[i];
    if (wiggle.type !== 'falling') {
      if (clearingStage === '') {
        wiggle.progress += delta;
        animateGrowingWiggle(
          wiggle
        );
      }
    } else {
      animateFallingWiggle(wiggle);
    }
  }
}

function animateClearingCircle(delta) {
  if (clearingStage === 'clearing') {
    dropIntersectedWiggles(clearingCircle.currentPath);
    clearingCircle.progress += delta;
    animateGrowingWiggle(
      clearingCircle
    );
    clearingCircleHead.position = clearingCircle.currentPath.getPointAt(clearingCircle.currentPath.length);
  } else if (clearingStage === 'end') {
    finishClearing();
  }
}

function finishClearing() {
  wiggleCurveTime = 0.95 * wiggleCurveTime;
  progressToNextPowerUp = 0;
  nWigglesToNextPowerUp += 2;
  spawnFrequencyVariation *= 0.85;
  baseTimeBetweenSpawns *= 0.8;

  canClear = false;
  clearingCircle = null;
  clearingCircleHead.remove();
  clearingCircleHead = null;

  innerCirclePath.remove();
  innerCirclePath = new Path.Circle(view.center, innerCircleRadius);
  innerCirclePath.fillColor = null;
  innerCirclePath.strokeColor = innerCircleColor;
  innerCirclePath.strokeWidth = 3;
  innerCirclePath.onClick = function() {
    if (canClear) {
      clearAtCenter();
    }
  }

  clearingStage = '';
}

function animateInnerCircleWave(event) {
  for (var i = 1; i < nInnerCircleWaveSegments - 1; i++) {
    var segment = innerCircleWavePathTop.segments[i];
    var sinus = Math.sin(event.time * 3 + i);
    segment.point.y = sinus * innerCircleWaveHeight + waveLineY;
  }
  innerCircleWavePathTop.smooth();
  if (innerCircleWavePath) {
    innerCircleWavePath.remove();
  }
  innerCircleWavePath = new CompoundPath({
    children: [innerCircleWavePathBottom, innerCircleWavePathTop]
  });
  innerCircleWavePath.fillRule = 'evenodd';
  innerCircleWavePath.fillColor = innerCircleColor;
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
  mousePath.strokeWidth = 4;

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
    curveTime: wiggleCurveTime,
    direction: direction
  };
  wiggles.push(wiggleData);
  nWiggles += 1;
}

function animateGrowingWiggle(wiggle) {
  // remove wiggle if it reached outer circle
  if (wiggle.progress >= wiggle.curveTime) {
    wiggle.fullPath.remove();
    if (wiggle.type == 'growing') {
      handleWiggleLetThrough(wiggle);
    } else {
      finishClearingCircle(wiggle);
    }
  } else {
    // otherwise, redraw wiggle further along path
    redrawWiggleAlongPath(wiggle);
  }
}

function handleWiggleLetThrough(wiggle) {
  var i = wiggles.findIndex(function (w) {
    return wiggle.id == w.id;
  });
  wiggles.splice(i, 1);
  nWigglesLetThrough += 1;
  progressToNextPowerUp -= (2.0 / nWigglesToNextPowerUp);
  if (innerCircleWavePath) {
    innerCircleWavePath.remove();
  }
  if (innerCircleWavePathTop) {
    innerCircleWavePathTop.remove();
  }
  if (innerCircleWavePathBottom) {
    innerCircleWavePathBottom.remove();
  }
  if (progressToNextPowerUp <= 0) {
    progressToNextPowerUp = 0;
  }
  animateIntersection(wiggle.currentPath.getPointAt(wiggle.currentPath.length), false);
  wiggle.currentPath.remove();
  // missedText.content = nWigglesLetThrough.toString();
}

function finishClearingCircle(wiggle) {
  wiggle.currentPath.remove();
  clearingStage = 'shrink';
  clearingCircle.fullPath.remove();
  clearingCircle.currentPath.remove();
  var shrinkTween = clearingCircleHead.tweenTo(
    { scaling: 1 },
    { duration: clearingCircleAnimDuration, easing: 'easeOutQuint' }
  );
  shrinkTween.then(function() {
    clearingStage = 'end';
  });
}

function redrawWiggleAlongPath(wiggle) {
  wiggle.currentPath.remove();
  var fullPath = wiggle.fullPath.clone();
  var progress = wiggle.type === 'clearing' 
    ? getClearingCircleEasing(wiggle.progress / wiggle.curveTime) * fullPath.length
    : (wiggle.progress / wiggle.curveTime) * fullPath.length; 
  var splitPath = fullPath.splitAt(progress);
  var pathToDraw = fullPath.subtract(splitPath, { trace: false });
  if (wiggle.type === 'growing') {
    var origin = pathToDraw.getPointAt(0);
    var destination = pathToDraw.getPointAt(pathToDraw.length);
    pathToDraw.strokeColor = getTweenedColorForPath(wiggle, origin, destination);
  } else {
    pathToDraw.strokeColor = clearingColor;
  }
  pathToDraw.strokeWidth = wiggleWidth;
  pathToDraw.strokeCap = 'round';
  pathToDraw.sendToBack();
  wiggle.currentPath = pathToDraw;
  fullPath.remove();
  splitPath.remove();
}

// Reminder: ask about https://github.com/paperjs/paper.js/issues/1855
// missing from paper.js docs
// easeOutInQuad: https://gist.github.com/gre/1650294#gistcomment-1569460

// easeInOutCubic from https://github.com/ai/easings.net/blob/master/src/easings/easingsFunctions.ts
function getClearingCircleEasing(x) {
  return x < 0.5 
    ? 4 * x * x * x 
    : 1 - Math.pow(-2 * x + 2, 3) / 2;;
}

function getTweenedColorForPath(wiggle, origin, destination) {
  var progress = wiggle.progress / wiggle.curveTime;
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
    origin: origin,
    destination: destination
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
  });
}

function moveInnerCircleWavePath() {
  lastNWigglesCleared = nWigglesCleared;
  lastNWigglesLetThrough = nWigglesLetThrough;
  if (innerCircleWavePathBottom) {
    innerCircleWavePathBottom.remove();
  }
  if (innerCircleWavePathTop) {
    innerCircleWavePathTop.remove();
  }
  if (innerCircleWavePath) {
    innerCircleWavePath.remove();
  }
  waveLineY = innerCirclePath.bounds.bottom - progressToNextPowerUp * innerCirclePath.bounds.height;
  var innerCircleEndpoints = getInnerCircleEndpoints();
  if (innerCircleEndpoints.length === 2) {
    innerCircleWavePathTop = new Path.Line(innerCircleEndpoints[0], innerCircleEndpoints[1]);
    for (var i = 0; i < nInnerCircleWaveSegments; i++) {
      var newWavePointX = innerCircleEndpoints[1].x - (i / nInnerCircleWaveSegments) * innerCircleEndpoints[0].getDistance(innerCircleEndpoints[1]);
      innerCircleWavePathTop.insertSegment(1, { x: newWavePointX, y: waveLineY });
    }
    var bottomPoint = innerCirclePath.getNearestPoint({ x: innerCirclePath.bounds.center.x, y: innerCirclePath.bounds.bottom });
    innerCircleWavePathBottom = new Path.Arc(
      innerCircleEndpoints[0],
      bottomPoint,
      innerCircleEndpoints[1]
    );
    innerCircleWavePath = new CompoundPath({
      children: [
        innerCircleWavePathTop,
        innerCircleWavePathBottom
      ]
    });
    innerCircleWaveHeight = Math.pow(2.4 * ((innerCirclePath.bounds.height - Math.abs(view.center.y - waveLineY)) / innerCirclePath.bounds.height), 3);
  }
}

function getInnerCircleEndpoints() {
  var waveLine = new Path.Line(
    { x: view.center.x - (innerCircleRadius + 50), y: waveLineY }, 
    { x: view.center.x + (innerCircleRadius + 50), y: waveLineY }
  );
  var intersections = innerCirclePath.getIntersections(waveLine);
  waveLine.remove();
  intersections = intersections.map(function(i) {
    return i.point;
  }).sort(function(i1, i2) {
    return i1.x > i2.x ? 1 : -1;
  });
  return intersections;
}

function dropWiggle(id, offset) {
  var wiggleHit = wiggles.find(function(w) { 
    return w.id == id 
  })
  if (!wiggleHit) return;
  progressToNextPowerUp += (1.0 / nWigglesToNextPowerUp);
  if (progressToNextPowerUp >= 1) {
    progressToNextPowerUp = 1;
  }
  var wiggleHitPath = wiggleHit.currentPath.clone();
  // remove hit wiggle from scene
  wiggleHit.fullPath.remove();
  wiggleHit.currentPath.remove();
  var indexToRemove = wiggles.findIndex(function(w) { 
    return w.id == wiggleHit.id 
  })
  wiggles.splice(indexToRemove, 1);
  // animate intersection point
  animateIntersection(wiggleHitPath.getPointAt(offset), true);
  // split wiggle that was hit at intersection point & create falling wiggles
  var fallingWiggle1 = wiggleHitPath.splitAt(offset);
  var fallingWiggle2 = wiggleHitPath.subtract(fallingWiggle1, { trace: false });
  addFallingWiggle(fallingWiggle1, wiggleFallColor, 'left');
  addFallingWiggle(fallingWiggle2, wiggleFallColor, 'right');
  wiggleHitPath.remove();
  nWigglesCleared += 1;
  // clearedText.content = nWigglesCleared.toString();
}

function animateIntersection(point, isGood) {
  var innerCircle = new Path.Circle(point, 8);
  var outerCircle = new Path.Circle(point, 32);
  var confetti = [];
  var nConfets = Math.ceil(Math.random() * 5 + 5);
  for (var i = 0; i < nConfets; i++) {
    var innerCirclePoint = innerCircle.getPointAt((i / nConfets) * innerCircle.length);
    var outerCirclePoint = outerCircle.getPointAt((i / nConfets) * outerCircle.length);
    var confet = new Path.Line(point, innerCirclePoint);
    confet.strokeColor = isGood ? goodConfettiColor : badConfettiColor;
    confet.strokeWidth = 2;
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
  innerCircle.remove();
  outerCircle.remove();
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
    wiggle.fullPath.translate({ x: 4 * multiplier, y: wiggle.delta });
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
    type: 'clearing',
    curveTime: clearingCircleCurveTime
  };
  clearingStage = 'grow';
  clearingCircleHead = new Path.Circle({
    center: view.center + { x: 0, y: -1 * clearingCircleRadius },
    radius: 2,
    fillColor: clearingColor,
    applyMatrix: false
  });
  var growTween = clearingCircleHead.tweenTo(
    { scaling: 7 },
    { duration: clearingCircleAnimDuration, easing: 'easeOutQuint' }
  );
  growTween.then(function() {
    clearingStage = 'clearing';
  });
}