// set up global variables
var wiggles = [];
var nWiggles = 0;
var timeToNextWiggle = (Math.random() * 2) + 1;
var wigglesLetThrough = 0;
var mousePaths = [];
var curveTime = 3;
var endWigglinessFactor = 10;
var baseNumberWiggleSegments = 8;
var baseSpawnFrequency = 1;
var spawnFrequencyVariation = 2;

// create inner circle
var innerCircleRadius = 20;
var innerCirclePath = new Path.Circle(view.center, innerCircleRadius);
innerCirclePath.strokeColor = 'black';
innerCirclePath.fillColor = 'black';

// create outer circle
var outerCircleRadius = window.innerWidth > window.innerHeight ? (window.innerHeight / 2) - 16 : (window.innerWidth / 2) - 16;
var outerCirclePath = new Path.Circle(view.center, outerCircleRadius);
outerCirclePath.strokeColor = 'black';

// create a new wiggling path
function createWiggle(timeCreated) {
    // set start & end
    var pathOffset = Math.random();
    var startPoint = innerCirclePath.getPointAt(pathOffset * innerCirclePath.length);
    var endPoint = outerCirclePath.getPointAt(pathOffset * outerCirclePath.length);
    var path = new Path.Line(startPoint, endPoint);

    // randomize all in-between points on the wiggle
    var numWiggleSections = (Math.random() + 0.5) * baseNumberWiggleSegments;
    var wigglePoints = [];
    for (var i = 1; i < numWiggleSections - 1; i++) {
        var linePoint = path.getPointAt((i / numWiggleSections) * path.length)
        var randomizedLinePoint = linePoint + { x: (Math.random() - 0.5) * (endWigglinessFactor * i), y: (Math.random() - 0.5) * (endWigglinessFactor * i)};
        wigglePoints.push(randomizedLinePoint);
    }
    path.insertSegments(1, wigglePoints);
    path.smooth({ type: 'continuous' });
    var currentPath = new Path();
    addNewWiggle(path, timeCreated);
}

// progressively fill or drop wiggles
function onFrame(event) {
    // console.log(project.activeLayer.children.length);
    
    // spawn new wiggles
    if (event.time > timeToNextWiggle) {
        createWiggle(event.time);
        timeToNextWiggle = event.time + ((Math.random() * spawnFrequencyVariation) + baseSpawnFrequency);
    }
    
    // animate mouse trails
    for (var i = 0; i < mousePaths.length; i++) {
        if (event.time - mousePaths[i].timeCreated > 2) {
            mousePaths.splice(i, 1);
        } else {
            mousePaths[i].path.opacity -= 0.1;
        }
    }
    
    // animate growing & falling wiggles
    for (var i = 0; i < wiggles.length; i++) {
        var wiggle = wiggles[i];
        if (!wiggle.isFalling) {
            animateGrowingWiggle(wiggle, event, i);
        } else {
            animateFallingWiggle(wiggle, event);
        }
    }
}

function animateGrowingWiggle(wiggle, event, i) {
    if (event.time - wiggle.timeCreated > 10) {
        wiggle.currentPath.remove();
        wiggle.fullPath.remove();
        wiggles.splice(i, 1);
        wigglesLetThrough += 1;
        // console.log(`Let through: ${wigglesLetThrough}`);
    }
    wiggle.currentPath.remove();
    var fullPath = wiggle.fullPath.clone();
    var phase = (event.time - wiggle.timeCreated) % 3;
    var progress = (((phase * phase * phase) / 27) * fullPath.length) % fullPath.length;
    var splitPath = fullPath.splitAt(progress);
    var pathToDraw = fullPath.subtract(splitPath, { trace: false });
    pathToDraw.strokeColor = 'black';
    pathToDraw.strokeWidth = 3;
    wiggle.currentPath = pathToDraw;
    fullPath.remove();
    splitPath.remove();
}

function animateFallingWiggle(wiggle, event) {
    if (wiggle.fullPath.internalBounds.center.y < view.center.y * 2) {
        var multiplier = wiggle.fullPath.strokeColor == 'red' ? 1 : -1;
        wiggle.fullPath.translate(new Point(4 * multiplier, wiggle.delta));
        wiggle.delta += 0.6;
        wiggle.fullPath.rotate(10, wiggle.fullPath.internalBounds.center);
    } else {
        for (var i = 0; i < wiggles.length; i++) {
          if (wiggles[i].isFalling) wiggles[i].fullPath.remove();
        }
        wiggles = wiggles.filter(function(w) { 
          return !w.isFalling 
        });
    }
}

// allow mouse path creation
var mousePath;
function onMouseUp(event) {
    var mpClone = mousePath.clone();
    var mp = {
        path: mpClone,
        timeCreated: event.time
    };
  mousePaths.push(mp);
  mousePath.remove();
}
function onMouseDown(event) {
  mousePath = new Path();
  mousePath.strokeColor = '#00000';
}
function onMouseDrag(event) {
  mousePath.add(event.point);
  mousePath.strokeColor = {
        gradient: {
            stops: ['white', 'blue']
        },
        origin: mousePath.firstSegment.point,
        destination: mousePath.lastSegment.point
    }
  var mousePathLength = mousePath.segments.length;
  var lastMouseMovement = new Path([mousePath.segments[mousePathLength - 2], mousePath.segments[mousePathLength - 1]]);

  // check if mouse hit any wiggles
  var wiggleIntersections = {};
  wiggles.forEach(function(wiggle) {
      if (!wiggle.isFalling && !(wiggle.id in wiggleIntersections)) {
          var ixns = wiggle.currentPath.getIntersections(lastMouseMovement);
          if (ixns.length > 0) {
              var offset = wiggle.currentPath.getOffsetOf(ixns[0].point);
              wiggleIntersections[wiggle.id] = offset;
          }
      }
  });
  
  // drop any wiggles that were hit
  Object.keys(wiggleIntersections).forEach(function(id) {
      var wiggleHit = wiggles.find(function(w) { 
        return w.id == id 
      })
      dropWiggle(wiggleHit, wiggleIntersections[id]);
  });
}

function dropWiggle(wiggleHit, offset) {
    var wiggleHitPath = wiggleHit.currentPath.clone();
      
  // remove hit wiggle from scene
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
        delta: 0.4,
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