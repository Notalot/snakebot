const outputElement = document.getElementById("text");
const url = "http://codebattle-pro-2020s1.westeurope.cloudapp.azure.com/codenjoy-contest/board/player/tm9vfc9lyqfruf97zrec?code=4990475814834644367&gameName=snakebattle"

let HEAD_POINT = null;
let WAS_EVIL = false;

const client = new GameClient(url, {
  onUpdate: board => {
    outputElement.value = board.toString();
  },

  log: message => {
    console.log(message);
    outputElement.value += message;
  }
});

client.run(board => {
  try {
    console.time('START');

    board.startTick(HEAD_POINT, WAS_EVIL);
    WAS_EVIL = false;

    const isActing = true;//Math.random() < 0.5;

    let myHead = board.getMyHead();
    const myLength = board.myLength();
    const isEvil = board.amIEvil();

    if (myHead === null && HEAD_POINT === null) {
      console.log('NO HEAD, NO SAVED POINT', myLength);
      return new Action('fail', isActing); // to go where it was going
    }

    const myDirections = board.getDirectionsPoints(myHead);
    const myDirectionsTypes = myDirections.map(point => board.getElementAt(point));

    const headPoints = myDirections.filter((point, index) =>
        board.getEnemiesHeadsTypes().includes(myDirectionsTypes[index]) && (myLength - board.getSnakeLength(point) >= 2));
    if (headPoints.length) {
      const enemyLength = board.getSnakeLength(headPoints[0]);
      console.log('HEAD ATTACK', myLength, enemyLength, myLength - enemyLength >= 2);
      return getAction(myHead, headPoints[0], isActing, board);
    }

    const snakePoints = myDirections.filter((point, index) => board.isEnemyBodyAt(myDirectionsTypes[index]));
    if (snakePoints.length && isEvil) {
      return getAction(myHead, snakePoints[0], isActing, board);
    }

    const possiblePoints = myDirections.filter(point => !board.isBarrierAt(point) && !board.dangerSnakeIsNear(point) && !board.isTupik(point, myHead));
    console.log('possiblePoints', possiblePoints, myDirections, myDirectionsTypes);
    const stones = myDirections.filter((point, index) => myDirectionsTypes[index] === ELEMENTS.STONE);
    if (possiblePoints.length === 0) {
      const secondaryPoints = myDirections.filter(point => !board.isStrictBarrierAt(point) && !board.isStrictTupik(point, myHead) && !board.dangerSnakeIsNear(point));
      console.log('NO SOFT DIRECTION', secondaryPoints);

      const enemyTails = myDirections.filter(point => board.isEnemyTailAt(point));
      if (enemyTails.length) {
        console.log('ENEMY_TAIL', enemyTails[0], isEvil, myLength);
        return getAction(myHead, enemyTails[0], isActing, board);
      }

      if (stones.length) {
        console.log('STONE', stones[0], isEvil, myLength);
        return getAction(myHead, stones[0], isActing, board);
      }

      if (secondaryPoints.length) {
        console.log('BAD DIRECTION', secondaryPoints[0], isEvil, myLength);
        return getAction(myHead, secondaryPoints[0], isActing, board);
      } else {
        console.log('NO DIRECTION', isEvil, myLength);
        return new Action(DIRECTIONS.LEFT, isActing);
      }
    }

    if (possiblePoints.length === 1) {
      console.log('ONLY DIRECTION');
      return getAction(myHead, possiblePoints[0], isActing, board);
    }

    const onPerepheria = board.getEnemyHeadsOnPerepheria(myHead);
    if (onPerepheria) {
      console.log('TRY ON PEREPHERIA');
      return getAction(myHead, onPerepheria, isActing, board);
    }

    const possibleBodyKus = board.getPossibleEnemyBodyPoint();
    if (possibleBodyKus.length) {
      console.log('TRY TO KUS');
      return getAction(myHead, possibleBodyKus[0], isActing, board);
    }

    const bonusPoints = possiblePoints.filter(point => board.isBonusToCatchAt(point));
    if (bonusPoints.length) {
      console.log('BONUS CATCH');
      return getAction(myHead, bonusPoints[0], isActing, board);
    }

    // const bonusPoint = board.findBonusesClosestPoint(board.getBonuses(), myHead);
    // console.log('bonusPoint', bonusPoint);
    // if (bonusPoint) {
    //   console.log('BONUS PATH');
    //   return getAction(myHead, bonusPoint, isActing, board);
    // }

    const bonusDirections = board.findBonusesClosestDirections(board.getBonuses(), myHead);

    const directions = possiblePoints.map(point => getDirectionByPoint(myHead, point));
    const bonusIntersections = directions.filter(direction => bonusDirections.includes(direction));
    if (bonusIntersections.length) {
      console.log('BONUS DIRECTION');
      return getActionByDirection(myHead, bonusIntersections[0], isActing, board);
    }

    const r = Math.floor(Math.random() * possiblePoints.length);
    console.log('RANDOM DIRECTION');
    return getActionByDirection(myHead, directions[r], isActing, board);
  }catch (e) {
    console.error('ERROR: ', e);
  }
});

function getAction(myHead, point, isActing, board) {
  HEAD_POINT = point;
  if(board.hasElementAt(ELEMENTS.FURY_PILL, HEAD_POINT)) WAS_EVIL = true;
  console.timeEnd('START');
  return new Action(getDirectionByPoint(myHead, point), isActing);
}
function getActionByDirection(myHead, direction, isActing, board) {
  return getAction(myHead, getPointByDirection(myHead, direction), isActing, board)
}
function getDirectionByPoint({x, y}, destination) {
  if (destination.x - x < 0)
    return DIRECTIONS.LEFT;
  if (destination.x - x > 0)
    return DIRECTIONS.RIGHT;
  if (destination.y - y > 0)
    return DIRECTIONS.DOWN;
  return DIRECTIONS.UP;
}
function getPointByDirection(point, direction) {
  if (direction === DIRECTIONS.LEFT)
    return point.shiftLeft();
  if (direction === DIRECTIONS.RIGHT)
    return point.shiftRight();
  if (direction === DIRECTIONS.DOWN)
    return point.shiftBottom();
  return point.shiftTop();
}