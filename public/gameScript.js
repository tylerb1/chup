// game state variables
var wiggles = []; 
// wiggle types: 'growing', 'falling' 
// (clearing, blasts, & confetti handled separately)
var mouseDownLocation = null;
var mouseUpLocation = null;
var nWiggles = 0;
var progressToNextPowerUp = 0;
var nWigglesToNextPowerUp = 5;
var nWigglesLetThrough = 0;
var nWigglesCleared = 0;
var lastNWigglesCleared = -1;
var lastNWigglesLetThrough = -1;
var level = 1;
var levelColorAnimDuration = 1200;
var innerCircleEdgeAnimDuration = 750;

// help modal objects & params
var helpModalIsUp = true;
var helpModalText = null;
var helpModalOverlay = null;
var helpModalRectangle = null;
var helpModal = null;
var clickedOutOfHelpModal = false;

// inner circle
var innerCircleColor = '#AFD0BF';
var nInnerCircleWaveSegments = 5;
var innerCircleWaveHeight = 0;
var innerCircleWavePath = null;
var innerCircleWavePathTop = null;
var innerCircleWavePathBottom = null;
var innerCircleStrokeWidth = 4;
var waveLineY = 0;
var isRewinding = false;

// outer circle
var outerPadding = 24;
var outerCircleColor = '#000000';

// wiggle params
var wiggleStrokeWidth = 4;
var wiggleCurveTime = 6;
var endWigglinessFactor = 4;
var baseNumberWiggleSegments = 8;
var wiggleRewindingMultiplier = 3;

// wiggle spawning params
var baseTimeBetweenSpawns = 0.8;
var spawnFrequencyVariation = 0.75;
var spawnFrequencyVariationMultiplier = 0.9;
var spawnFrequencyBaseMultiplier = 0.7;
var wiggleCurveTimeMultiplier = 0.96;
var timeToNextWiggle = (Math.random() * spawnFrequencyVariation) + baseTimeBetweenSpawns;

// blast params
var blasts = [];
var initialBlastRadius = 4;
var blastStrokeWidth = 3;
var maxBlastRadius = 25;
var blastTime = 1;
var nExtraBlastSegments = 4;

// intersection params
var initialFallVelocity = 10;
var wiggleFallRotation = 12;
var clearingColor = '#5171A5';
var wiggleFallColor = '#F0A202';
var goodConfettiColor = '#F0A202';
var badColor = '#B33951';
var confettiDuration = 400;
var confettiStrokeWidth = 3;

// clearing circle params
var clearingCircles = [];
var clearingCircleHeads = [];
var clearingCircleCurveTime = 1.5;
var canClear = false;
var isClearing = false;
var clearingCircleAnimDuration = 800;
var clearingCircleOffsetTime = 240;

// create outer circle
var outerCircleRadius = window.innerWidth > window.innerHeight 
  ? (window.innerHeight / 2) - outerPadding 
  : (window.innerWidth / 2) - outerPadding;
var outerCirclePath = new Path.Circle(view.center, outerCircleRadius);
outerCirclePath.strokeColor = outerCircleColor;
outerCirclePath.strokeWidth = 4;

// create inner circle
var innerCircleRadius = Math.ceil(outerCircleRadius / 6);
var innerCirclePath = new Path.Circle(view.center, innerCircleRadius);
innerCirclePath.bringToFront();
innerCirclePath.strokeColor = innerCircleColor;
innerCirclePath.strokeWidth = innerCircleStrokeWidth;
innerCirclePath.onClick = onClickInnerCircle;

// set help modal icon
var helpIconQuestionMark = new PointText({
	point: new Point(view.center.x + outerCircleRadius, 25),
	justification: 'center',
	fontSize: 24,
  fontWeight: 400,
  fontFamily: 'Courier',
  strokeColor: clearingColor,
  content: '?'
});
var helpIconCircle = new Path.Circle({
  center: new Point(view.center.x + outerCircleRadius, 18),
  radius: 16,
  strokeColor: clearingColor,
  strokeWidth: 2,
  fillColor: '#CCCCCC'
});
var helpIcon = new Group([
  helpIconCircle,
  helpIconQuestionMark
]);
helpIcon.onClick = onClickHelp;

// create help modal
createHelpModal();

function createHelpModal() {
  helpModalText = new PointText({
    point: new Point(0, 0),
    justification: 'left',
    fontSize: 16,
    fontWeight: 400,
    fontFamily: 'Courier',
    strokeColor: '#000000',
    content: '1. Tap to create a blast\n\n2. Hold the inner circle\nto rewind\n\n3. Tap the inner circle\nwhen it\'s flashing to\ngo to the next level'
  });
  helpModalRectangle = new Path.Rectangle({
    point: new Point (view.center.x - helpModalText.bounds.width / 2, view.center.y - helpModalText.bounds.height / 2),
    size: new Size(helpModalText.bounds.width + 16, helpModalText.bounds.height + 16),
    fillColor: '#CCCCCC',
    opacity: 0.5
  });
  // update text position after its dimensions & container are created
  helpModalText.position = helpModalRectangle.position;
  helpModalOverlay = new Path.Rectangle({
    point: new Point(0, 0),
    size: view.size,
    fillColor: '#CCCCCC',
    opacity: 0.2
  });
  helpModalOverlay.onClick = onClickHelp;
  helpModal = new Group([
    helpModalRectangle,
    helpModalOverlay,
    helpModalText
  ]);
  helpModal.bringToFront();
}

// set clearing circle radii
var outerClearingCircleRadius = outerCircleRadius - 15;
var innerClearingCircleRadius = innerCircleRadius + 15;

// show level
var levelText = new PointText({
	point: new Point(view.center.x, view.center.y - outerCircleRadius - 8),
	justification: 'center',
	fontSize: 16,
  fontWeight: 400,
  fontFamily: 'Courier',
  strokeColor: '#000000',
  content: 'Level 1'
});

// ANIMATE GAME

function onFrame(event) {
  if (!helpModalIsUp) {
    // allow or prevent clearing
    canClear = progressToNextPowerUp >= 1 && !isClearing;
    if (canClear) {
      innerCirclePath.strokeColor = null;
    }

    // animate inner circle edge
    if (progressToNextPowerUp >= 1) {
      animateInnerCircle(event.time);
    }

    // update inner circle wave progress
    if (isRewinding) {
      progressToNextPowerUp -= (event.delta / 2);
      if (progressToNextPowerUp < 0) {
        progressToNextPowerUp = 0;
        isRewinding = false;
      }
    }

    // move inner circle wave up or down
    if (
      lastNWigglesCleared !== nWigglesCleared ||
      lastNWigglesLetThrough !== nWigglesLetThrough ||
      isRewinding
    ) {
      moveInnerCircleWavePath();
    }

    // animate wave in inner circle
    if (progressToNextPowerUp > 0 && progressToNextPowerUp < 1) {
      animateInnerCircleWave(event);
    }

    // spawn new wiggles
    if (event.time > timeToNextWiggle && !isClearing && !isRewinding) {
      createGrowingWiggle(event.time);
      timeToNextWiggle = event.time + ((Math.random() * spawnFrequencyVariation) + baseTimeBetweenSpawns);
    }

    // animate existing game items
    animateBlasts(event.delta, event.time);
    animateClearingCircles(event.delta);
    animateAllWiggles(event.delta);
  }

  // uncomment this to check for excessive path creation
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

function animateBlasts(delta, time) {
  for (var i = 0; i < blasts.length; i++) {
    blasts[i].progress += delta;
    if (blasts[i].progress < blastTime) {
      // increase blast radius
      var normalizedProgress = blasts[i].progress / blastTime;
      var newRadius = initialBlastRadius + easeOutCubic(normalizedProgress) * (maxBlastRadius - initialBlastRadius);
      var center = blasts[i].center;
      blasts[i].currentPath.remove();
      var path = new Path.Circle(center, newRadius);

      // animate blast edges
      for (var h = 0; h < nExtraBlastSegments; h++) {
        path.divideAt(blasts[i].extraSegmentOffsets[h] * path.length);
      }
      for (var j = 0; j < path.segments.length; j++) {
        var offset = path.getOffsetOf(path.segments[j].point);
        var normalAtPoint = path.getNormalAt(offset);
        path.segments[j].point += normalAtPoint * 2 * Math.sin(6 * time + 10 * j);
      }

      // tween blast color
      var color = (blasts[i].progress / blastTime) < 0.5
        ? getTweenedColor('#FFFFFF', clearingColor, easeOutCubic(normalizedProgress))
        : getTweenedColor(clearingColor, '#FFFFFF', easeInCubic(normalizedProgress));
      path.fillColor = color;
      path.strokeWidth = blastStrokeWidth;
      blasts[i].currentPath = path;

      // clear wiggles hit by blast
      dropIntersectedWiggles(blasts[i].currentPath, true);
    } else {
      removeBlast(blasts[i]);
    }
  }
}

function removeBlast(blast) {
  blast.currentPath.remove();
  var indexToRemove = blasts.findIndex(function(b) { 
    return b.id == blast.id 
  })
  blasts.splice(indexToRemove, 1);
}

function animateAllWiggles(delta) {
  for (var i = 0; i < wiggles.length; i++) {
    var wiggle = wiggles[i];
    var removed = false;
    if (wiggle.type === 'falling') {
      animateFallingWiggle(wiggle);
    } else {
      if (!isClearing) {
        if (!isRewinding) {
          wiggle.progress += delta;
        } else {
          if (wiggle.type === 'growing') {
            wiggle.progress -= delta * wiggleRewindingMultiplier;
            if (wiggle.progress <= 0) {
              removeWiggle(wiggle);
              removed = true;
            }
          }
        }
        if (!removed) {
          animateWiggle(
            wiggle
          );
        }
      }
    }
  }
}

function animateClearingCircles(delta) {
  for (var i = 0; i < clearingCircles.length; i++) {
    if (clearingCircles[i].stage === 'clearing') {
      dropIntersectedWiggles(clearingCircles[i].currentPath, false);
      clearingCircles[i].progress += delta;
      animateWiggle(
        clearingCircles[i]
      );
      clearingCircleHeads[i].path.position = clearingCircles[i].currentPath.getPointAt(clearingCircles[i].currentPath.length);
    } else if (clearingCircles[i].stage === 'end' && !(clearingCircles[i].isInner)) {
      finishClearing();
    }
  }
}

function finishClearing() {
  // reset game params for new level
  progressToNextPowerUp = 0;
  nWigglesToNextPowerUp = Math.ceil(1.2 * nWigglesToNextPowerUp);
  spawnFrequencyVariation *= spawnFrequencyVariationMultiplier;
  baseTimeBetweenSpawns *= spawnFrequencyBaseMultiplier;
  wiggleCurveTime *= wiggleCurveTimeMultiplier;
  canClear = false;
  level += 1;

  // remove clearing circles
  for (var i = 0; i < 2; i++) {
    clearingCircleHeads[i].path.remove();
  }
  clearingCircles = [];
  clearingCircleHeads = [];
  isClearing = false;

  // reset inner circle
  innerCirclePath.remove();
  if (innerCircleWavePathBottom) {
    innerCircleWavePathBottom.remove();
  }
  if (innerCircleWavePathTop) {
    innerCircleWavePathTop.remove();
  }
  if (innerCircleWavePath) {
    innerCircleWavePath.remove();
  }
  innerCirclePath = new Path.Circle(view.center, innerCircleRadius);
  innerCirclePath.bringToFront();
  innerCirclePath.fillColor = null;
  innerCirclePath.strokeColor = innerCircleColor;
  innerCirclePath.strokeWidth = innerCircleStrokeWidth;
  innerCirclePath.onClick = onClickInnerCircle;

  // animate level text
  var tweenIntoColor = levelText.tweenTo(
    { strokeColor: innerCircleColor },
    { duration: levelColorAnimDuration, easing: 'easeOutQuint' }
  );
  tweenIntoColor.then(function() {
    levelText.tweenTo(
      { strokeColor: '#000000' },
      { duration: levelColorAnimDuration, easing: 'easeInQuint' }
    );
  });
  levelText.content = 'Level ' + level.toString();
}

function onClickInnerCircle() {
  if (canClear) {
    canClear = false;
    initiateClearingCircle(false);
    setTimeout(function() {
      initiateClearingCircle(true) 
    }, clearingCircleOffsetTime);
  }
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
  innerCircleWavePath.sendToBack();
  innerCircleWavePath.fillRule = 'evenodd';
  innerCircleWavePath.fillColor = innerCircleColor;
}

// MOUSE EVENTS

function onMouseDown(event) {
  if (
    innerCirclePath.contains(event.point) && 
    progressToNextPowerUp > 0 &&
    !canClear
  ) {
    isRewinding = true;
  } else {
    mouseDownLocation = event.point;
  }
}

function onMouseUp(event) {
  mouseUpLocation = event.point;
  if (clickedOutOfHelpModal) {
    clickedOutOfHelpModal = false;
  } else if (
    !isClearing && 
    !isRewinding && 
    !helpIconCircle.contains(mouseDownLocation) &&
    mouseUpLocation.getDistance(mouseDownLocation) < 10
  ) {
    createBlast(event.point);
  }

  mouseDownLocation = null;
  isRewinding = false;
}

function onClickHelp() {
  helpModalIsUp = !helpModalIsUp;
  if (!helpModalIsUp) {
    clickedOutOfHelpModal = true;
    helpModalRectangle.remove();
    helpModalText.remove();
    helpModalOverlay.remove();
    helpModal.remove();
  } else {
    clickedOutOfHelpModal = false;
    createHelpModal();
  }
}

// GROWING WIGGLE FUNCTIONS

function createBlast(point) {
  var path = new Path.Circle(point, initialBlastRadius);
  path.strokeColor = clearingColor;
  var extraSegmentOffsets = [];
  for (var i = 0; i < nExtraBlastSegments; i ++) {
    extraSegmentOffsets.push((i / nExtraBlastSegments) + (Math.random() * (0.5 / nExtraBlastSegments) + (0.25 / nExtraBlastSegments)));
  }
  var blastData = {
    id: 'w' + nWiggles.toString(), 
    progress: 0,
    center: point,
    currentPath: path,
    extraSegmentOffsets: extraSegmentOffsets
  };
  blasts.push(blastData);
  nWiggles += 1;
}

function createGrowingWiggle() {
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
  addNewGrowingWiggle(path, direction);
}

function addNewGrowingWiggle(wigglePath, direction) {
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

function animateWiggle(wiggle) {
  // remove wiggle if it reached outer circle
  if (wiggle.progress >= wiggle.curveTime) {
    if (wiggle.type == 'growing') {
      handleWiggleLetThrough(wiggle);
    } else if (wiggle.type = 'clearing') {
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
  if (progressToNextPowerUp < 1) {
    innerCirclePath.fillColor = null;
    innerCirclePath.strokeWidth = innerCircleStrokeWidth;
  }
  innerCirclePath.strokeColor = badColor;
  innerCirclePath.tweenTo(
    { strokeColor: innerCircleColor },
    { duration: innerCircleEdgeAnimDuration, easing: 'easeOutQuad' }
  );
  if (progressToNextPowerUp < 0) {
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
    { scaling: 1, opacity: 0 },
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
  pathToDraw.strokeWidth = wiggleStrokeWidth;
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
    : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function easeOutCubic(x) {
  return 1 - Math.pow(1 - x, 3);
}

function easeInCubic(x) {
  return Math.pow(x, 3);
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

function dropIntersectedWiggles(path, clearedByBlast) {
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
  
  // drop any wiggles that were hit
  Object.keys(wiggleIntersectionOffsets).forEach(function(id) {
    dropWiggle(id, wiggleIntersectionOffsets[id]);
    // animate inner circle edge if necessary
    if (progressToNextPowerUp >= 1) {
      innerCirclePath.strokeColor = null;
    } else if (clearedByBlast) {
      innerCirclePath.strokeColor = clearingColor;
      innerCirclePath.tweenTo(
        { strokeColor: innerCircleColor },
        { duration: innerCircleEdgeAnimDuration, easing: 'easeOutQuad' }
      );
    }
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
      innerCircleWavePathTop.insertSegment(1, new Point({ x: newWavePointX, y: waveLineY }));
    }
    var bottomPoint = new Point({ x: view.center.x, y: view.center.y + innerCircleRadius });
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
    innerCircleWavePath.sendToBack();
    innerCircleWaveHeight = Math.pow(3 * ((innerCircleRadius - Math.abs(view.center.y - waveLineY)) / innerCircleRadius), 2);
  }
}

function getInnerCircleEndpoints() {
  var waveLine = new Path.Line(
    new Point({ x: view.center.x - (innerCircleRadius + 50), y: waveLineY }), 
    new Point({ x: view.center.x + (innerCircleRadius + 50), y: waveLineY })
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
  // get wiggle that was hit
  var wiggleHit = wiggles.find(function(w) { 
    return w.id == id 
  })
  if (!wiggleHit) return;
  var wiggleHitPath = wiggleHit.currentPath.clone();

  // increment progress to next power-up
  progressToNextPowerUp += (1.0 / nWigglesToNextPowerUp);
  if (progressToNextPowerUp >= 0.999 /* fixes rounding issues */) {
    progressToNextPowerUp = 1;
  }

  // animate intersection point
  animateIntersection(wiggleHitPath.getPointAt(offset), true);

  // remove hit wiggle from scene
  removeWiggle(wiggleHit);

  // split wiggle that was hit at intersection point & create falling wiggles
  var fallingWiggle1 = wiggleHitPath.splitAt(offset);
  var fallingWiggle2 = wiggleHitPath.subtract(fallingWiggle1, { trace: false });
  addFallingWiggle(fallingWiggle1, wiggleFallColor, 'left');
  addFallingWiggle(fallingWiggle2, wiggleFallColor, 'right');

  // remove hit wiggle and increment wiggles cleared
  nWigglesCleared += 1;
  wiggleHitPath.remove();
}

function removeWiggle(wiggle) {
  wiggle.fullPath.remove();
  wiggle.currentPath.remove();
  var indexToRemove = wiggles.findIndex(function(w) { 
    return w.id == wiggle.id 
  })
  wiggles.splice(indexToRemove, 1);
}

function animateIntersection(point, isGood) {
  var innerCircle = new Path.Circle(point, 8);
  var outerCircle = new Path.Circle(point, 32);
  var confetti = [];
  var nConfets = Math.ceil(Math.random() * 6 + 6);
  for (var i = 0; i < nConfets; i++) {
    var innerCirclePoint = innerCircle.getPointAt((i / nConfets) * innerCircle.length);
    var outerCirclePoint = outerCircle.getPointAt((i / nConfets) * outerCircle.length);
    var confet = new Path.Line(point, innerCirclePoint);
    confet.strokeColor = isGood ? goodConfettiColor : badColor;
    confet.strokeWidth = confettiStrokeWidth;
    confet.tweenTo(
      { 'position.x': outerCirclePoint.x, 'position.y': outerCirclePoint.y, 'opacity': 0 },
      { duration: confettiDuration, easing: 'easeOutQuad' }
    );
    confetti.push(confet);
  }
  setTimeout(function () {
    confetti.forEach(function(c) {
      c.remove();
    });
  }, confettiDuration + 100);
  innerCircle.remove();
  outerCircle.remove();
}

function addFallingWiggle(wigglePath, strokeColor, direction) {
  wigglePath.strokeColor = strokeColor;
  var droppedTime = Date.now();
  var wiggleData = {
    id: 'w' + nWiggles.toString(), 
    fullPath: wigglePath,
    type: 'falling',
    fallingDirection: direction,
    timeCreated: droppedTime
  };
  wiggleData.fullPath.bringToFront();
  wiggles.push(wiggleData);
  nWiggles += 1;
}

function animateFallingWiggle(wiggle) {
  if (wiggle.fullPath.internalBounds.center.y < view.center.y * 2) {
    // animate falling paths if within scene
    var xDirectionMultiplier = wiggle.fallingDirection == 'left' ? 1 : -1;
    var currentTime = Date.now();
    var timeSinceCreated = ((currentTime - wiggle.timeCreated) / 1000) + 0.5;
    var heightChange = initialFallVelocity * timeSinceCreated + 0.5 * -1 * 20 * Math.pow(timeSinceCreated, 2);
    wiggle.fullPath.translate({ x: 2 * xDirectionMultiplier, y: -1 * heightChange });
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
  isClearing = true;
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
}