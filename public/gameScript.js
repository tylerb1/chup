// game state variables
var wiggles = [];
var nWiggles = 0;
var progressToNextPowerUp = 0;
var nWigglesToNextPowerUp = 2;
var nWigglesLetThrough = 0;
var nWigglesCleared = 0;
var lastNWigglesCleared = -1;
var lastNWigglesLetThrough = -1;
var level = 1;

// inner circle
var innerCircleColor = '#AFD0BF';
var nInnerCircleWaveSegments = 5;
var innerCircleWaveHeight = 0;
var innerCircleWavePath = null;
var innerCircleWavePathTop = null;
var innerCircleWavePathBottom = null;
var innerCircleStrokeWidth = 6;
var waveLineY = 0;
var isRewinding = false;

// outer circle
var outerPadding = 24;
var outerCircleColor = '#000000';

// wiggle params
var wiggleWidth = 6;
var wiggleCurveTime = 3;
var endWigglinessFactor = 4;
var baseNumberWiggleSegments = 8;

// wiggle spawning params
var baseTimeBetweenSpawns = 1.2;
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
var confettiStrokeWidth = 2;

// mouse trails
var mouseTrails = [];
var mousePath;
var mouseTrailFadeTime = 2;
var mouseTrailColor = clearingColor;
var mousePathStrokeWidth = 3;

// clearing circle params
var clearingCircles = [];
var clearingCircleHeads = [];
var clearingCircleCurveTime = 1.5;
var canClear = false;
var isClearing = false;
var clearingCircleAnimDuration = 500;
var clearingCircleOffsetTime = 120;

// create outer circle
var outerCircleRadius = window.innerWidth > window.innerHeight 
  ? (window.innerHeight / 2) - outerPadding 
  : (window.innerWidth / 2) - outerPadding;
var outerCirclePath = new Path.Circle(view.center, outerCircleRadius);
outerCirclePath.strokeColor = outerCircleColor;
outerCirclePath.strokeWidth = 6;

// create inner circle
var innerCircleRadius = Math.ceil(outerCircleRadius / 6);
var innerCirclePath = new Path.Circle(view.center, innerCircleRadius);
innerCirclePath.strokeColor = innerCircleColor;
innerCirclePath.strokeWidth = innerCircleStrokeWidth;
innerCirclePath.onClick = function() {
  if (canClear) {
    initiateClearingCircle(false);
    setTimeout(function() {
      initiateClearingCircle(true) 
    }, clearingCircleOffsetTime);
  }
}

// set clearing circle radii
var outerClearingCircleRadius = outerCircleRadius - 15;
var innerClearingCircleRadius = innerCircleRadius + 15;

// show level
var levelText = new PointText({
	point: new Point(view.center.x, 15),
	justification: 'center',
	fontSize: 16,
  fontWeight: 'bold',
  fontFamily: 'Helvetica',
  content: '1'
});

// ANIMATE GAME

function onFrame(event) {
  canClear = progressToNextPowerUp >= 1;
  innerCirclePath.bringToFront();
  if (canClear) {
    animateInnerCircle(event.time);
  }
  if (isRewinding) {
    progressToNextPowerUp -= (event.delta / 2);
    if (progressToNextPowerUp < 0) {
      progressToNextPowerUp = 0;
      isRewinding = false;
    }
  }
  if (
    lastNWigglesCleared !== nWigglesCleared ||
    lastNWigglesLetThrough !== nWigglesLetThrough ||
    isRewinding
  ) {
    moveInnerCircleWavePath();
  }
  if (progressToNextPowerUp > 0 && progressToNextPowerUp < 1) {
    animateInnerCircleWave(event);
  }
  if (event.time > timeToNextWiggle && !isClearing && !isRewinding) {
    createWiggle(event.time);
    timeToNextWiggle = event.time + ((Math.random() * spawnFrequencyVariation) + baseTimeBetweenSpawns);
  }
  animateMouseTrails(event.time);
  animateAllWiggles(event.delta);
  animateClearingCircles(event.delta);
  // uncomment to check for excessive path creation
  // console.log(project.activeLayer.children.length);
}

function animateInnerCircle(time) {
  innerCirclePath.strokeColor = null;
  for (var i = 0; i < innerCirclePath.segments.length; i++) {
    var offset = innerCirclePath.getOffsetOf(innerCirclePath.segments[i].point);
    var normalAtPoint = innerCirclePath.getNormalAt(offset);
    innerCirclePath.segments[i].point = innerCirclePath.segments[i].point + normalAtPoint * 0.08 * Math.sin(time * 3 + i * 4);
  }
  innerCirclePath.fillColor = getTweenedColor(
    clearingColor, 
    innerCircleColor,
    (Math.sin(5 * time) + 1) / 2
  );
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
      if (!isClearing) {
        if (!isRewinding) {
          wiggle.progress += delta;
        } else {
          if (wiggle.type === 'growing') {
            wiggle.progress -= delta;
            if (wiggle.progress < 0.01) {
              wiggle.progress = 0.01;
            }
          }
        }
        animateGrowingWiggle(
          wiggle
        );
      }
    } else {
      animateFallingWiggle(wiggle);
    }
  }
}

function animateClearingCircles(delta) {
  for (var i = 0; i < clearingCircles.length; i++) {
    if (clearingCircles[i].stage === 'clearing') {
      dropIntersectedWiggles(clearingCircles[i].currentPath);
      clearingCircles[i].progress += delta;
      animateGrowingWiggle(
        clearingCircles[i]
      );
      clearingCircleHeads[i].path.position = clearingCircles[i].currentPath.getPointAt(clearingCircles[i].currentPath.length);
    } else if (clearingCircles[i].stage === 'end' && !(clearingCircles[i].isInner)) {
      finishClearing();
    }
  }
}

function finishClearing() {
  progressToNextPowerUp = 0;
  nWigglesToNextPowerUp += 2;
  spawnFrequencyVariation *= 0.75;
  baseTimeBetweenSpawns *= 0.75;

  canClear = false;
  for (var i = 0; i < 2; i++) {
    clearingCircleHeads[i].path.remove();
  }
  clearingCircles = [];
  clearingCircleHeads = [];

  innerCirclePath.remove();
  innerCirclePath = new Path.Circle(view.center, innerCircleRadius);
  innerCirclePath.fillColor = null;
  innerCirclePath.strokeColor = innerCircleColor;
  innerCirclePath.strokeWidth = innerCircleStrokeWidth;
  innerCirclePath.onClick = function() {
    if (canClear) {
      initiateClearingCircle(false);
      setTimeout(function () { 
        initiateClearingCircle(true) 
      }, clearingCircleOffsetTime);
    }
  }

  isClearing = false;
  level += 1;
  levelText.content = level.toString();
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

function onMouseDown(event) {
  mousePath = new Path();
  mousePath.strokeColor = '#000000';

  if (
    innerCirclePath.contains(event.point) && 
    progressToNextPowerUp > 0 &&
    !canClear) 
  {
    isRewinding = true;
  }
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
  mousePath.strokeWidth = mousePathStrokeWidth;

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
  isRewinding = false;

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
  if (progressToNextPowerUp <= 1) {
    innerCirclePath.fillColor = null;
    innerCirclePath.strokeColor = innerCircleColor;
    innerCirclePath.strokeWidth = innerCircleStrokeWidth;
  }
  if (progressToNextPowerUp <= 0) {
    progressToNextPowerUp = 0;
  }
  animateIntersection(wiggle.currentPath.getPointAt(wiggle.currentPath.length), false);
  wiggle.currentPath.remove();
  wiggle.fullPath.remove();
}

function finishClearingCircle(wiggle) {
  wiggle.currentPath.remove();
  wiggle.fullPath.remove();
  var isInner = wiggle.isInner;
  var clearingCircleHead = clearingCircleHeads.find(function(c) {
    return c.isInner === isInner;
  });
  var shrinkTween = clearingCircleHead.path.tweenTo(
    { scaling: 1 },
    { duration: clearingCircleAnimDuration, easing: 'easeOutQuint' }
  );
  wiggle.stage = 'shrink';
  shrinkTween.then(function() {
    var cc = clearingCircles.find(function(c) {
      return c.isInner === isInner;
    });
    cc.stage = 'end';
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
  var startColor = wiggle.direction === 'in' ? outerCircleColor : innerCircleColor;
  var endColor = wiggle.direction === 'in' ? innerCircleColor : outerCircleColor;
  var tweenedColor = getTweenedColor(startColor, endColor, progress);
  return {
    gradient: {
      stops: [startColor, tweenedColor],
    },
    origin: origin,
    destination: destination
  };
}

function getTweenedColor(startColor, endColor, progress) {
  var r = getTweenedColorComponent('r', startColor, endColor, progress);
  var g = getTweenedColorComponent('g', startColor, endColor, progress);
  var b = getTweenedColorComponent('b', startColor, endColor, progress);
  return '#' + r + g + b;
}

function getTweenedColorComponent(colorComponent, startColor, endColor, progress) {
  var startIndex = 1;
  if (colorComponent === 'g') {
    startIndex = 3;
  }
  if (colorComponent === 'b') {
    startIndex = 5;
  }
  var startColorNumber256 = parseInt(startColor[startIndex], 16) * 16;
  var startColorNumber16 = parseInt(startColor[startIndex + 1], 16);
  var startColorNumber = startColorNumber256 + startColorNumber16;
  var endColorNumber256 = parseInt(endColor[startIndex], 16) * 16;
  var endColorNumber16 = parseInt(endColor[startIndex + 1], 16);
  var endColorNumber = endColorNumber256 + endColorNumber16;
  var diff = 0;
  if (startColorNumber === endColorNumber) {
    return startColor[startIndex] + startColor[startIndex + 1];
  } else {
    diff = endColorNumber - startColorNumber;
  }
  var finalColorNumber = startColorNumber + Math.floor(progress * diff);
  var secondHexNumber = finalColorNumber % 16;
  var firstHexNumber = (finalColorNumber - secondHexNumber) / 16;
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
    var bottomPoint = { x: innerCirclePath.bounds.center.x, y: innerCirclePath.bounds.bottom };
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
    innerCircleWaveHeight = Math.pow(3 * ((innerCircleRadius - Math.abs(view.center.y - waveLineY)) / innerCircleRadius), 2);
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
  if (progressToNextPowerUp >= 0.999 /* fixes some rounding issues */) {
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
    confet.strokeWidth = confettiStrokeWidth;
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

function initiateClearingCircle(isInner) {
  var radius = isInner ? innerClearingCircleRadius : outerClearingCircleRadius;
  var clearingCirclePath = new Path.Arc(
    view.center + { x: 0, y: -1 * radius },
    view.center + { x: radius, y: 0 },
    view.center + { x: 0, y: radius }
  );
  clearingCirclePath.arcTo(
    view.center + { x: -1 * radius, y: 0},
    view.center + { x: 0, y: -1 * radius}
  );
  var clearingCircle = {
    fullPath: clearingCirclePath,
    currentPath: new Path(),
    progress: 0.02,
    type: 'clearing',
    curveTime: clearingCircleCurveTime,
    isInner: isInner,
    stage: 'grow'
  };
  var clearingCircleHeadPath = new Path.Circle({
    center: view.center + { x: 0, y: -1 * radius },
    radius: 2,
    fillColor: clearingColor,
    applyMatrix: false,
  });
  var clearingCircleHead = {
    path: clearingCircleHeadPath,
    isInner: isInner
  };
  var growTween = clearingCircleHeadPath.tweenTo(
    { scaling: 5 },
    { duration: clearingCircleAnimDuration, easing: 'easeOutQuint' }
  );
  clearingCircles.push(clearingCircle);
  clearingCircleHeads.push(clearingCircleHead);
  growTween.then(function() {
    var cc = clearingCircles.find(function(c) {
      return c.isInner === isInner;
    });
    cc.stage = 'clearing';
  });
  isClearing = true;
}