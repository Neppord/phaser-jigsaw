const WIDTH = 1920
const HEIGHT = 1080
const WIDTH_IN_PIECES = 16 / 4
const HEIGHT_IN_PIECES = 9 / 3
const PIECES = WIDTH_IN_PIECES * HEIGHT_IN_PIECES
console.log("Pieces: ", PIECES)
console.log("Width: ", WIDTH_IN_PIECES)
console.log("Height: ", HEIGHT_IN_PIECES)
const PIECE_WIDTH = WIDTH / WIDTH_IN_PIECES
const PIECE_HEIGHT = HEIGHT / HEIGHT_IN_PIECES
const OVERLAP = 5
const WIDTH_OVERLAP = PIECE_WIDTH / OVERLAP
const HEIGHT_OVERLAP = PIECE_HEIGHT / OVERLAP
const TOTAL_PIECE_WIDTH = PIECE_WIDTH + 2 * WIDTH_OVERLAP
const TOTAL_PIECE_HEIGHT = PIECE_HEIGHT + 2 * HEIGHT_OVERLAP
console.log("Piece Width: ", PIECE_WIDTH)
console.log("Piece Height: ", PIECE_HEIGHT)

class Scene extends Phaser.Scene {
  preload() {
    this.load.image("jigsaw", "ship-1366926_1920.jpg")
    this.load.audio("connect", "connect.wav")
  }

  pieceIndex(x, y) {
    return y * WIDTH_IN_PIECES + x
  }

  vertical(x, y) {
    const index = this.pieceIndex(x, y)
    const rnd = new Phaser.Math.RandomDataGenerator([index])
    return [rnd.frac(), rnd.frac(), rnd.frac(), rnd.frac()]
  }

  horizontal(x, y) {
    const index = this.pieceIndex(x, y) << 8
    const rnd = new Phaser.Math.RandomDataGenerator([index])
    if (rnd.frac() > 0.5) {
      return [rnd.frac(), - rnd.frac(), - rnd.frac(), rnd.frac()]
    } else {
      return [- rnd.frac(), rnd.frac(),  rnd.frac(), -rnd.frac()]
    }
  }

  piecePoints(x, y) {
    const points = []
    points.push([WIDTH_OVERLAP, HEIGHT_OVERLAP])
    // TOP
    if (y === 0) {
      points.push([TOTAL_PIECE_WIDTH - WIDTH_OVERLAP, HEIGHT_OVERLAP])
    } else {
      const [y1, y2, y3, y4] = this.horizontal(x, y)
      points.push([WIDTH_OVERLAP + PIECE_WIDTH * 0.20, HEIGHT_OVERLAP * (1 + y1)])
      points.push([WIDTH_OVERLAP + PIECE_WIDTH * 0.40, HEIGHT_OVERLAP * (1 - y2)])
      points.push([WIDTH_OVERLAP + PIECE_WIDTH * 0.60, HEIGHT_OVERLAP * (1 - y3)])
      points.push([WIDTH_OVERLAP + PIECE_WIDTH * 0.80, HEIGHT_OVERLAP * (1 + y4)])
      points.push([WIDTH_OVERLAP + PIECE_WIDTH, HEIGHT_OVERLAP])
    }
    // RIGHT
    if (x === WIDTH_IN_PIECES - 1) {
      points.push([PIECE_WIDTH + WIDTH_OVERLAP, HEIGHT_OVERLAP + PIECE_HEIGHT])
    } else {
      const xs = this.horizontal(x + 1, y)
      const yd = xs.length + 1
      for (let i = 0; i < xs.length; i++) {
        const point = [
          PIECE_WIDTH + WIDTH_OVERLAP * (1 + xs[i]),
          HEIGHT_OVERLAP + PIECE_HEIGHT * ((i + 1) / yd),
        ]
        points.push(point)
      }
      points.push([PIECE_WIDTH + WIDTH_OVERLAP, HEIGHT_OVERLAP + PIECE_HEIGHT])
    }
    // BOTTOM
    if (y === HEIGHT_IN_PIECES - 1) {
      points.push([WIDTH_OVERLAP, PIECE_HEIGHT + HEIGHT_OVERLAP])
    } else {
      const [y1, y2, y3, y4] = this.horizontal(x, y + 1)
      points.push([WIDTH_OVERLAP + PIECE_WIDTH * 0.80, PIECE_HEIGHT + HEIGHT_OVERLAP * (1 + y4)])
      points.push([WIDTH_OVERLAP + PIECE_WIDTH * 0.60, PIECE_HEIGHT + HEIGHT_OVERLAP * (1 - y3)])
      points.push([WIDTH_OVERLAP + PIECE_WIDTH * 0.40, PIECE_HEIGHT + HEIGHT_OVERLAP * (1 - y2)])
      points.push([WIDTH_OVERLAP + PIECE_WIDTH * 0.20, PIECE_HEIGHT + HEIGHT_OVERLAP * (1 + y1)])
      points.push([WIDTH_OVERLAP, PIECE_HEIGHT + HEIGHT_OVERLAP])
    }
    // LEFT
    if (x === 0) {
      points.push([WIDTH_OVERLAP, HEIGHT_OVERLAP])
    } else {
      const xs = this.horizontal(x, y)
      const yd = xs.length + 1
      for (let i = xs.length - 1; i >= 0; i--) {
        const point = [
          WIDTH_OVERLAP * (1 + xs[i]),
          HEIGHT_OVERLAP + PIECE_HEIGHT * ((i + 1) / yd),
        ]
        points.push(point)
      }
      points.push([WIDTH_OVERLAP, HEIGHT_OVERLAP])
    }
    return points

  }

  makePieceShape(x, y) {
    const ctx = this.make.graphics()
    ctx.fillPoints(
      this.piecePoints(x, y).map(([x, y]) => new Phaser.Geom.Point(x, y)),
      true,
    )
    return ctx
  }

  create() {
    const atlas = this.textures
      .addDynamicTexture(
        "pieces",
        WIDTH_IN_PIECES * TOTAL_PIECE_WIDTH,
        HEIGHT_IN_PIECES * TOTAL_PIECE_HEIGHT,
      )
    atlas.fill(0x000000, 0)
    const jigsaw = this.make
      .image({key: "jigsaw"})
      .setOrigin(0, 0)
    for (let y = 0; y < HEIGHT_IN_PIECES; y++) {
      for (let x = 0; x < WIDTH_IN_PIECES; x++) {
        const m = this.makePieceShape(x, y)
        m.setPosition(TOTAL_PIECE_WIDTH * x, TOTAL_PIECE_HEIGHT * y)
        jigsaw.setMask(m.createGeometryMask())
        atlas.draw(
          jigsaw,
          WIDTH_OVERLAP + 2 * WIDTH_OVERLAP * x,
          HEIGHT_OVERLAP + 2 * HEIGHT_OVERLAP * y,
        )
        jigsaw.clearMask(true)
        atlas.add(
          y * WIDTH_IN_PIECES + x,
          0,
          TOTAL_PIECE_WIDTH * x,
          TOTAL_PIECE_HEIGHT * y,
          TOTAL_PIECE_WIDTH,
          TOTAL_PIECE_HEIGHT,
        )
      }
    }
    jigsaw.destroy(true)
    const selected = this.add.group()
    const table = this.add.layer()
    const foreground = this.add.layer()
    foreground.bringToTop()
    foreground.postFX.addGlow(0xFFFF00)

    this.input.on("pointerdown", (pointer, objects) => {
      if (objects.length === 0) {
        let moved = false
        let scrollXStart = this.cameras.main.scrollX
        let scrollYStart = this.cameras.main.scrollY
        let move = (pointer) => {
          moved = true
          const xDelta = pointer.x - pointer.downX
          const yDelta = pointer.y - pointer.downY
          this.cameras.main.scrollX = scrollXStart - xDelta
          this.cameras.main.scrollY = scrollYStart - yDelta
        }
        this.input.on(Phaser.Input.Events.POINTER_MOVE, move)
        this.input.once("pointerup", () => {
          if (!moved) {
            selected.children.each(container => container.each(p => p.setTint()))
            selected.clear()
            table.add(foreground.getChildren().map(o => o))
          }
          this.input.off(Phaser.Input.Events.POINTER_MOVE, move)
        })
      }
    })
    let lastClick = -1
    this.input.on("pointerup", (pointer) => {
      if (pointer.upTime - lastClick < 500) {
        this.scale.toggleFullscreen()
      }
      lastClick = pointer.upTime
    })
    const shift = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SHIFT,
    )
    let zoomLvl = 800
    this.cameras.main.zoom = zoomLvl / 1000
    this.input.on(Phaser.Input.Events.POINTER_WHEEL, (p, o, x, y, z) => {
      if (shift.isDown) {
        zoomLvl = Math.max(250, Math.min(4000, zoomLvl - y))
        this.cameras.main.zoom = zoomLvl / 1000
      } else {
        this.cameras.main.scrollX += x
        this.cameras.main.scrollY += y
      }
    })
    const toRandomise = []
    const grid = new Array(WIDTH_IN_PIECES)
      .fill([])
      .map(() => new Array(HEIGHT_IN_PIECES))

    function addContainer(c) {
      selected.add(c)
      foreground.add(c)
    }

    for (let y = 0; y < HEIGHT_IN_PIECES; y++) {
      for (let x = 0; x < WIDTH_IN_PIECES; x++) {
        const frameNumber = this.pieceIndex(x, y)
        const xOffset = x * PIECE_WIDTH - WIDTH_OVERLAP
        const yOffset = y * PIECE_HEIGHT - HEIGHT_OVERLAP
        const piece =
          this.make.image({
              x: xOffset,
              y: yOffset,
              key: "pieces",
              frame: frameNumber,
            }, false,
          )
        const container = this.add.container(
          Phaser.Math.Between(-xOffset, WIDTH - xOffset - PIECE_WIDTH),
          Phaser.Math.Between(-yOffset, HEIGHT - yOffset - PIECE_HEIGHT),
          piece,
        )
        grid[x][y] = container
        piece.setSize(PIECE_WIDTH, PIECE_HEIGHT)
        piece.setData("x", x)
        piece.setData("y", y)
        piece.setData("container", container)
        // set the top left corner to be the origin
        // instead of the center
        const points = this.piecePoints(x, y)
        piece.setOrigin(0)
        const hitArea = new Phaser.Geom.Polygon(points)
        Phaser.Geom.Polygon.Translate(
          hitArea,
          x * PIECE_WIDTH - WIDTH_OVERLAP,
          y * PIECE_HEIGHT - HEIGHT_OVERLAP,
        )
        container.setData("hitAreas", [hitArea])
        container.setInteractive({
          draggable: true,
          hitAreaCallback: function (hitArea, x, y, c) {
            return c.getData("hitAreas").some(ha => ha.contains(x, y))
          },
        })
        table.add(container)
        let shift = this.input.keyboard.addKey(
          Phaser.Input.Keyboard.KeyCodes.SHIFT,
        )
        container.on('dragstart', function () {
          if (!selected.contains(this)) {
            if (shift.isDown) {
              addContainer(this)
            } else {
              selected.clear()
              table.add(foreground.getChildren().map(o => o))
              addContainer(this)
            }
          }
        })
        container.on('drag', function (pointer, dragX, dragY) {
          if (selected.contains(this)) {
            selected.incXY(
              dragX - this.x,
              dragY - this.y,
            )
          }
        })
        container.on('dragend', () => {
          let didConnect = false
          selected.children.each(c => {
            c.each(p => {
              const gridX = p.getData("x")
              const gridY = p.getData("y")
              const candidates = new Set()
              if (gridX < WIDTH_IN_PIECES - 1) candidates.add(grid[gridX + 1][gridY])
              if (gridX > 0) candidates.add(grid[gridX - 1][gridY])
              if (gridY < HEIGHT_IN_PIECES - 1) candidates.add(grid[gridX][gridY + 1])
              if (gridY > 0) candidates.add(grid[gridX][gridY - 1])
              Array.from(candidates)
                .filter(other => other !== c)
                .filter(other => Math.abs(c.x - other.x) < WIDTH_OVERLAP)
                .filter(other => Math.abs(c.y - other.y) < HEIGHT_OVERLAP)
                .forEach(other => {
                  other.each(op => {
                    grid[op.getData("x")][op.getData("y")] = c
                    c.add(op)
                    didConnect = true
                  })
                  other.removeAll()
                  const hitAreas = c.getData("hitAreas")
                  other.getData("hitAreas").forEach(ha => hitAreas.push(ha))
                  other.destroy(true)
                })
            })
          })
          if (didConnect) {
            this.sound.play("connect")
            if (selected.children.getArray()[0].getAll().length === PIECES) {
              foreground.postFX.addShine()
              table.postFX.addShine()
              this.cameras.main.fadeIn()
            }
          }
        })
        container.setScale(0)
        toRandomise.push(container)
      }
    }
    this.tweens.add({
      targets: toRandomise,
      props: {
        scale: {from: 0.2, to: 1},
        angle: {from: 360, to: 0},
      },
      //ease: 'linear',
      duration: 500,
      delay: this.tweens.stagger([10, 1000]),
    })
  }
}

new Phaser.Game({
  scene: Scene,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: {y: 0},
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.ENVELOP,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: WIDTH,
    height: HEIGHT,
  },
})