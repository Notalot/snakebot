class Board {
  constructor() {
    this._board = "";
  }

  get size() {
    return Math.sqrt(this._board.length);
  }

  startTick(savedHeadPoint, wasFury) {
    this._pointsHash = {};
    this._getMappedBoard();

    this._snakesLengths = {};

    const headElementTypes = [
      "HEAD_DEAD",
      "HEAD_DOWN",
      "HEAD_UP",
      "HEAD_LEFT",
      "HEAD_RIGHT",
      "HEAD_EVIL",
      "HEAD_FLY",
      "HEAD_SLEEP"
    ].map(elementName => ELEMENTS[elementName]);

    const foundHeadElement = this.findFirstElement(...headElementTypes);

    this._savedHeadPoint = foundHeadElement ? foundHeadElement.coordinates : savedHeadPoint;

    if (this._furyTicks) this._furyTicks--;
    if (wasFury) {
      this._furyTicks = !this._furyTicks ? 10 : this._furyTicks + 10;
    }
    if (foundHeadElement && foundHeadElement.type === ELEMENTS.HEAD_SLEEP) {
      console.log('NEW GAME STARTED');
      this._furyTicks = 0;
      this._closestBonus = undefined;
      this._closestBonusPath = [];
    }
    console.log('HEAD', this._savedHeadPoint);
    console.log('EVIL_TICKS', this._furyTicks);

    this._amIEvil = foundHeadElement && foundHeadElement.type === ELEMENTS.HEAD_EVIL && this._furyTicks > 1;

    const elementTypes = [
      "BODY_HORIZONTAL",
      "BODY_VERTICAL",
      "BODY_LEFT_DOWN",
      "BODY_LEFT_UP",
      "BODY_RIGHT_DOWN",
      "BODY_RIGHT_UP",
    ].map(elementName => ELEMENTS[elementName]);
    this._myLength = this.findAllElements(...elementTypes).length + 2;
  }

  getPath(point, init) {
    let open = [{point: init, f: 0, parent: null, g: 0, h: 0}];
    const closed = [];
    const formPath = (lastPoint) => {
      const path = [lastPoint.point];
      let next = lastPoint.parent;
      while (next) {
        path.push(next.point);
        next = next.parent;
      }
      return path;
    }
    const getH = (next) => {
      return Math.sqrt(Math.pow(next.x - point.x, 2) + Math.pow(next.y - point.y, 2));
    }
    const getStructure = (current, next) => {
      const g = current.g + 1;
      const h = getH(next);
      const f = g + h;
      return {point: next, g, h, f, parent: current};
    }

    let count = 100;
    while(open.length && count > 0) {
      count--;
      // console.log('PATH', open);
      open.sort((a, b) => a.f - b.f);
      const current = open.shift();
      const directions = this.getDirectionsPoints(current.point);
      if (directions.find(p => p.equals(point))) return formPath(current);
      const possibleDirections = directions.filter(p => !this.isStrictBarrierAt(p) && !this.isStrictTupik(p, current.point))
          .map(p => getStructure(current, p))
          .filter(p => !open.find(s => s.point.equals(p.point) && s.f < p.f) && !closed.find(s => s.point.equals(p.point) && s.f < p.f));
      open = [...open, ...possibleDirections];
      closed.push(current);
    }
  }

  findBonusesClosestPoint(bonuses, point) {
    let closest = this._closestBonus ? this._closestBonus : bonuses[0];
    for (let i = 1; i < bonuses.length; i++){
      const absX = Math.abs(closest.x - point.x);
      const absY = Math.abs(closest.y - point.y);

      const newAbsX = Math.abs(bonuses[i].x - point.x);
      const newAbsY = Math.abs(bonuses[i].y - point.y);

      if (absX + absY > newAbsX + newAbsY) closest = bonuses[i];
    }
    console.log('PATH PROPS', this._closestBonus, this._closestBonusPath);
    if (closest.equals(this._closestBonus) && point.equals(this._closestBonusPath[0])) {
      this._closestBonusPath.shift();
    } else {
      this._closestBonus = closest;
      console.log('PATH START', closest);
      this._closestBonusPath = this.getPath(point, closest) || [];
      console.log('CLOSEST PATH', this._closestBonusPath);
    }
    return this._closestBonusPath[0];
  }

  findBonusesClosestDirections(bonuses, point) {
    let closest = bonuses[0];
    for (let i = 1; i < bonuses.length; i++){
      const absX = Math.abs(closest.x - point.x);
      const absY = Math.abs(closest.y - point.y);

      const newAbsX = Math.abs(bonuses[i].x - point.x);
      const newAbsY = Math.abs(bonuses[i].y - point.y);

      if (absX + absY > newAbsX + newAbsY) closest = bonuses[i];
    }
    // console.log('PATH TO:', closest);
    // console.log('PATH FINAL:', this.getPath(point, closest));
    const directions = [];
    if (closest.x - point.x < 0)
      directions.push(DIRECTIONS.LEFT);
    if (closest.x - point.x > 0)
      directions.push(DIRECTIONS.RIGHT);
    if (closest.y - point.y > 0)
      directions.push(DIRECTIONS.DOWN);
    if (closest.y - point.y < 0)
      directions.push(DIRECTIONS.UP);
    return directions;
  }

  findElement(elementType) {
    const foundPoint = Object.values(this._pointsHash).find(({type}) => type === elementType);

    return foundPoint ? foundPoint.coordinates : null;
  }

  findFirstElement(...elementTypes) {
    const element = Object.values(this._pointsHash).find(({type}) => {
      return elementTypes.includes(type);
    });

    return element || null;
  }

  findAllElements(...elementTypes) {
    return Object.values(this._pointsHash).filter(({type}) => elementTypes.includes(type)).map(({coordinates}) => coordinates);
  }

  getElementAt(point) {
    if (this._pointsHash[this._getPointHash(point)]) return this._pointsHash[this._getPointHash(point)].type;
    const element = this._getMappedBoard().find(el => {
      return el.coordinates.equals(point);
    });
    return !element ? null : element.type;
  }

  hasElementAt(elementType, point) {
    return this.getElementAt(point) === elementType;
  }

  amIEvil() {
    return this._amIEvil;
  }

  amIFlying() {
    return this.getMyHead() === ELEMENTS.HEAD_FLY;
  }

  getWalls() {
    return this.findAllElements(ELEMENTS.WALL);
  }

  getStones() {
    return this.findAllElements(ELEMENTS.STONE);
  }

  getApples() {
    return this.findAllElements(ELEMENTS.APPLE);
  }

  getGold() {
    return this.findAllElements(ELEMENTS.FURY_PILL);
  }

  getFuryPills() {
    return this.findAllElements(ELEMENTS.FURY_PILL);
  }

  getStartPoints() {
    return this.findAllElements(ELEMENTS.START_FLOOR);
  }

  getFlyingPills() {
    return this.findAllElements(ELEMENTS.FLYING_PILL);
  }

  getMyHead() {
    return this._savedHeadPoint;
  }

  getBarriers() {
    let elementTypes = [
      "WALL",
      "START_FLOOR",
      "ENEMY_HEAD_SLEEP", // змейка противника ожидает начала раунда
      "ENEMY_TAIL_INACTIVE",
      "TAIL_INACTIVE",

      "BODY_HORIZONTAL",
      "BODY_VERTICAL",
      "BODY_LEFT_DOWN",
      "BODY_LEFT_UP",
      "BODY_RIGHT_DOWN",
      "BODY_RIGHT_UP",

      "ENEMY_HEAD_DOWN",
      "ENEMY_HEAD_LEFT",
      "ENEMY_HEAD_RIGHT",
      "ENEMY_HEAD_UP",
      "ENEMY_HEAD_DEAD", // этот раунд противник проиграл
      "ENEMY_HEAD_EVIL", // противник скушал таблетку ярости
      "ENEMY_HEAD_FLY", // противник скушал таблетку полета

      // хвосты змеек противников
      "ENEMY_TAIL_END_DOWN",
      "ENEMY_TAIL_END_LEFT",
      "ENEMY_TAIL_END_UP",
      "ENEMY_TAIL_END_RIGHT",
      "ENEMY_TAIL_INACTIVE",

      // туловище змеек противников
      "ENEMY_BODY_HORIZONTAL",
      "ENEMY_BODY_VERTICAL",
      "ENEMY_BODY_LEFT_DOWN",
      "ENEMY_BODY_LEFT_UP",
      "ENEMY_BODY_RIGHT_DOWN",
      "ENEMY_BODY_RIGHT_UP"
    ];
    const myLength = this.myLength();
    if (!this.amIEvil() && myLength < 35) elementTypes.push("STONE");
    if (myLength <= 4) elementTypes = [...elementTypes, ...[
      "TAIL_END_DOWN",
      "TAIL_END_LEFT",
      "TAIL_END_UP",
      "TAIL_END_RIGHT",
    ]];
    return elementTypes.map(elementName => ELEMENTS[elementName]);
  }

  isBarrierAt(point) {
    const elementTypes = this.getBarriers();
    return elementTypes.includes(this.getElementAt(point));
  }

  isDangerEnemyHead(point) {
    const type = this.getElementAt(point);
    if (type === ELEMENTS.ENEMY_HEAD_EVIL && !this.amIEvil()) return true;
    if (this.isEnemyHeadAt(point)) {
      const length = this.getSnakeLength(point);
      const myLength = this.myLength();
      if (type === ELEMENTS.ENEMY_HEAD_EVIL && (myLength - length < 2)) return true;
      if (!this.amIEvil() && (myLength - length < 2)) return true;
    }
    return false;
  }

  isEnemyTailAt(point) {
    const elementTypes = [
      "ENEMY_TAIL_END_DOWN",
      "ENEMY_TAIL_END_LEFT",
      "ENEMY_TAIL_END_UP",
      "ENEMY_TAIL_END_RIGHT",
      "ENEMY_TAIL_INACTIVE",
    ];
    return elementTypes.map(elementName => ELEMENTS[elementName]).includes(this.getElementAt(point));
  }
  isBonusBarrierAt(point) {
    const elementTypes = [
      "WALL",
      "START_FLOOR",
      "ENEMY_HEAD_SLEEP",
      "ENEMY_TAIL_INACTIVE",
      "TAIL_INACTIVE",
      "ENEMY_TAIL_INACTIVE",
    ];
    if (!this.amIEvil()) elementTypes.push("STONE");
    return elementTypes.map(elementName => ELEMENTS[elementName]).includes(this.getElementAt(point));
  }

  getSnakeLength(head) {
    const hash = this._getPointHash(head);
    if (!this._snakesLengths[hash])
      this._snakesLengths[hash] = this._getSnakeLength(head);
    return this._snakesLengths[hash];
  }

  _getSnakeLength(head, direction = '') {
    let length = 1;
    console.log('getSnakeLength', this.getElementAt(head), direction);
    if (this.hasElementAt(ELEMENTS.ENEMY_HEAD_DOWN, head)
        || this.hasElementAt(ELEMENTS.ENEMY_BODY_VERTICAL, head) && direction === 'up'
        || this.hasElementAt(ELEMENTS.ENEMY_BODY_LEFT_UP, head) && direction === 'right'
        || this.hasElementAt(ELEMENTS.ENEMY_BODY_RIGHT_UP, head) && direction === 'left') {
      const nextPoint = head.shiftTop();
      console.log("TOP");
      if (this.isEnemyTailAt(nextPoint)) {
        length++;
      } else {
        length += this._getSnakeLength(
            nextPoint,
            'up',
        );
      }
    }
    if (this.hasElementAt(ELEMENTS.ENEMY_HEAD_LEFT, head)
        || this.hasElementAt(ELEMENTS.ENEMY_BODY_HORIZONTAL, head) && direction === 'right'
        || this.hasElementAt(ELEMENTS.ENEMY_BODY_RIGHT_DOWN, head) && direction === 'up'
        || this.hasElementAt(ELEMENTS.ENEMY_BODY_RIGHT_UP, head) && direction === 'down') {
      const nextPoint = head.shiftRight();
      console.log("RIGHT");
      if (this.isEnemyTailAt(nextPoint)) {
        length++;
      } else {
        length += this._getSnakeLength(nextPoint, 'right');
      }
    }
    if (this.hasElementAt(ELEMENTS.ENEMY_HEAD_RIGHT, head)
        || this.hasElementAt(ELEMENTS.ENEMY_BODY_HORIZONTAL, head) && direction === 'left'
        || this.hasElementAt(ELEMENTS.ENEMY_BODY_LEFT_DOWN, head) && direction === 'up'
        || this.hasElementAt(ELEMENTS.ENEMY_BODY_LEFT_UP, head) && direction === 'down') {
      const nextPoint = head.shiftLeft();
      console.log("LEFT");
      if (this.isEnemyTailAt(nextPoint)) {
        length++;
      } else {
        length += this._getSnakeLength(nextPoint, 'left');
      }
    }
    if (this.hasElementAt(ELEMENTS.ENEMY_HEAD_UP, head)
        || this.hasElementAt(ELEMENTS.ENEMY_BODY_VERTICAL, head) && direction === 'down'
        || this.hasElementAt(ELEMENTS.ENEMY_BODY_LEFT_DOWN, head) && direction === 'right'
        || this.hasElementAt(ELEMENTS.ENEMY_BODY_RIGHT_DOWN, head) && direction === 'left') {
      const nextPoint = head.shiftBottom();
      console.log("BOTTOM");
      if (this.isEnemyTailAt(nextPoint)) {
        length++;
      } else {
        length += this._getSnakeLength(
            nextPoint,
            'down'
        );
      }
    }

    return length;
  }

  getEnemiesHeadsTypes() {
    const elementTypes = [
      "ENEMY_HEAD_DOWN",
      "ENEMY_HEAD_LEFT",
      "ENEMY_HEAD_RIGHT",
      "ENEMY_HEAD_UP",
    ];
    if (this.amIEvil()) elementTypes.push("ENEMY_HEAD_EVIL");
    return elementTypes.map(elementName => ELEMENTS[elementName]);
  }

  isEnemyHeadAt(point) {
    return this.getEnemiesHeadsTypes().includes(this.getElementAt(point));
  }

  getEnemyHeadsOnPerepheria(point) {
    const points = [point.shiftTop().shiftRight(), point.shiftTop().shiftLeft(), point.shiftBottom().shiftRight(), point.shiftBottom().shiftLeft()];
    // right top
    let type = this.getElementAt(points[0]);
    const top = point.shiftTop();
    const isTop = !this.isBarrierAt(top) && !this.dangerSnakeIsNear(top);
    if ([ELEMENTS.ENEMY_HEAD_LEFT, ELEMENTS.ENEMY_HEAD_EVIL].includes(type)
        && !this.isDangerEnemyHead(points[0])
        && isTop) return top;
    // left top
    type = this.getElementAt(points[1]);
    if ([ELEMENTS.ENEMY_HEAD_RIGHT, ELEMENTS.ENEMY_HEAD_EVIL].includes(type)
        && !this.isDangerEnemyHead(points[1])
        && isTop) return top;
    // right bottom
    type = this.getElementAt(points[2]);
    const bottom = point.shiftBottom();
    const isBottom = !this.isBarrierAt(bottom) && !this.dangerSnakeIsNear(bottom);
    if ([ELEMENTS.ENEMY_HEAD_LEFT, ELEMENTS.ENEMY_HEAD_EVIL].includes(type)
        && !this.isDangerEnemyHead(points[2])
        && isBottom) return bottom;
    // left bottom
    type = this.getElementAt(points[3]);
    if ([ELEMENTS.ENEMY_HEAD_RIGHT, ELEMENTS.ENEMY_HEAD_EVIL].includes(type)
        && !this.isDangerEnemyHead(points[3])
        && isBottom) return bottom;
    return null;
  }

  isEnemyBodyAt(pointType) {
    const elementTypes = [
      "ENEMY_BODY_HORIZONTAL",
      "ENEMY_BODY_VERTICAL",
      "ENEMY_BODY_LEFT_DOWN",
      "ENEMY_BODY_LEFT_UP",
      "ENEMY_BODY_RIGHT_DOWN",
      "ENEMY_BODY_RIGHT_UP",
      "ENEMY_HEAD_DOWN",
      "ENEMY_HEAD_LEFT",
      "ENEMY_HEAD_RIGHT",
      "ENEMY_HEAD_UP",
    ].map(elementName => ELEMENTS[elementName]);
    return elementTypes.includes(pointType);
  }

  getPossibleEnemyBodyPoint() {
    if (this._furyTicks < 3) return [];
    const intermediatePoints = this.getDirectionsPoints(this.getMyHead());
    return this.getDirectionsPoints(this.getMyHead(), 2)
        .map((point, index) => {
          const type = this.getElementAt(point);
          if (this.isDangerEnemyHead(point)) return null;
          if ((this.isEnemyHeadAt(point) && this.getSnakeLength(point) >= 3 || this.isEnemyBodyAt(type))
              && !this.isBarrierAt(intermediatePoints[index])
              && !this.dangerSnakeIsNear(intermediatePoints[index]))
            return intermediatePoints[index];
          return null;
        })
        .filter(point => point !== null);
  }

  isStrictBarrierAt(point) {
    let elementTypes = [
      "WALL",
      "START_FLOOR",
      "ENEMY_HEAD_SLEEP",
      "ENEMY_TAIL_INACTIVE",
      "TAIL_INACTIVE",
    ];
    if (this.myLength() < 5) elementTypes.push("STONE");
    if (this.myLength() < 4) elementTypes = [...elementTypes, ...[
      "TAIL_END_DOWN",
      "TAIL_END_LEFT",
      "TAIL_END_UP",
      "TAIL_END_RIGHT",
    ]];
    return elementTypes.map(elementName => ELEMENTS[elementName]).includes(this.getElementAt(point));
  }

  getDirectionsPoints(point, delta = 1) {
    return [point.shiftRight(delta), point.shiftLeft(delta), point.shiftBottom(delta), point.shiftTop(delta)];
  }
  dangerSnakeIsNear(point) {
    return this.getDirectionsPoints(point).some(p => this.isDangerEnemyHead(p));
  }
  isTupik(point, head, count = 0) {
    const points = this.getDirectionsPoints(point).filter(p => !this.isBarrierAt(p) && !p.equals(head) && (count > 0 || !this.isTupik(p, point, count+1)));
    return points.length === 0;
  }
  isStrictTupik(point, head, count = 0) {
    const points = this.getDirectionsPoints(point).filter(p => !this.isStrictBarrierAt(p) && !p.equals(head) && (count > 0 || !this.isStrictTupik(p, point, count+1)));
    return points.length === 0;
  }

  getBonuses() {
    let elementTypes = [
      "APPLE", // яблоки надо кушать от них становишься длинее
      "FLYING_PILL", // таблетка полета - дает суперсилы
      "FURY_PILL", // таблетка ярости - дает суперсилы
      "GOLD", // золото - просто очки
    ];
    if (this.amIEvil()) elementTypes = [...elementTypes, [
        "ENEMY_BODY_HORIZONTAL",
        "ENEMY_BODY_VERTICAL",
        "ENEMY_BODY_LEFT_DOWN",
        "ENEMY_BODY_LEFT_UP",
        "ENEMY_BODY_RIGHT_DOWN",
        "ENEMY_BODY_RIGHT_UP",
        "ENEMY_HEAD_DOWN",
        "ENEMY_HEAD_LEFT",
        "ENEMY_HEAD_RIGHT",
        "ENEMY_HEAD_UP"
    ]];

    return this.findAllElements(...elementTypes.map(elementName => ELEMENTS[elementName])).filter(point => {
      // const isNonTupik = this.isTherePath(point, point.x == 23 && point.y == 8, null, 2);
      return this.isTherePath(point);
    });
  }

  getEnemiesHeads() {
    const elementTypes = [
      "ENEMY_HEAD_DOWN",
      "ENEMY_HEAD_LEFT",
      "ENEMY_HEAD_RIGHT",
      "ENEMY_HEAD_UP",
    ].map(elementName => ELEMENTS[elementName]);


    return this.findAllElements(...elementTypes);
  }

  isTherePath(point, print = false,  count = 0) {
    const length = this.getDirectionsPoints(point).filter(p =>
        !this.isBonusBarrierAt(p) && (count > 1 || this.isTherePath(p, print, count+1))
    );
    if (print)
      console.log('Point', `'${this.getElementAt(point)}'`, length.length, length);
    return length.length > 1;
  }

  myLength() {
    return this._myLength;
  }

  isBonusToCatchAt(point) {
    const elementTypes = [
      "APPLE", // яблоки надо кушать от них становишься длинее
      "FLYING_PILL", // таблетка полета - дает суперсилы
      "FURY_PILL", // таблетка ярости - дает суперсилы
      "GOLD", // золото - просто очки
    ];
    if (this.amIEvil()) elementTypes.push("STONE");
    return elementTypes.map(elementName => ELEMENTS[elementName]).includes(this.getElementAt(point))
        && this.getDirectionsPoints(point).every(p => !this.isDangerEnemyHead(p));
  }

  update(raw) {
    this._board = raw.replace("board=", "");
  }

  _getMappedBoard() {
    return this._board.split("").map((type, index) => {
      const coordinates = this.getPointByShift(index);
      this._pointsHash[this._getPointHash(coordinates)] = { type, coordinates };
      return { type, coordinates };
    });
  }

  _getPointHash(point) {
    const coef = this.size <= 100 ? 100 : 1000;
    return point.x * coef + point.y;
  }

  getPointByShift(shift) {
    return new Point(shift % this.size, Math.floor(shift / this.size));
  }

  toString() {
    const lineRegExp = new RegExp(`(.{${this.size}})`, "g");
    return this._board.replace(lineRegExp, "$1\n");
  }
}
