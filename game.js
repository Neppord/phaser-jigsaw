import {Puzzle} from "./puzzle.js"

const puzzle = new Puzzle(
  1920,
  1080,
  16,
  9,
)

console.dir(puzzle)

class Scene extends Phaser.Scene {
  preload() {
    this.load.image("jigsaw", "ship-1366926_1920.jpg")
    this.load.audio("connect", "connect.wav")
  }

  pieceIndex(x, y) {
    return y * puzzle.width_in_pieces + x
  }

  vertical(x, y) {
    const index = this.pieceIndex(x, y)
    const rnd = new Phaser.Math.RandomDataGenerator([index])
    if (rnd.frac() > 0.5) {
      return [rnd.frac(), -rnd.frac(), -rnd.frac(), rnd.frac()]
    } else {
      return [-rnd.frac(), rnd.frac(), rnd.frac(), -rnd.frac()]
    }
  }

  horizontal(x, y) {
    const index = this.pieceIndex(x, y) << 8
    const rnd = new Phaser.Math.RandomDataGenerator([index])
    if (rnd.frac() > 0.5) {
      return [rnd.frac(), -rnd.frac(), -rnd.frac(), rnd.frac()]
    } else {
      return [-rnd.frac(), rnd.frac(), rnd.frac(), -rnd.frac()]
    }
  }

  piecePoints(x, y) {
    const points = []
    const dim = puzzle.piece
    const delta = 0.05
    const strength = 2.5
    points.push([dim.x(0), dim.y(0)])
    // TOP
    const interpolate = Phaser.Math.Interpolation.Bezier
    if (y === 0) {
      points.push([dim.x(1), dim.y(0)])
    } else {
      const ys = this.vertical(x, y)
      const with_edges = [0, ...ys, 0]
      for (let i = delta; i < 1; i += delta) {
        const mix = interpolate(with_edges, i) * strength
        const offset = mix * dim.height_overlap
        points.push([dim.x(i), dim.y(0) + offset])
      }
      points.push([dim.x(1), dim.y(0)])
    }
    // RIGHT
    if (x === puzzle.width_in_pieces - 1) {
      points.push([dim.x(1), dim.y(1)])
    } else {
      const xs = this.horizontal(x + 1, y)
      const with_edges = [0, ...xs, 0]
      for (let i = delta; i < 1; i += delta) {
        const mix = interpolate(with_edges, i) * strength
        const offset = mix * dim.width_overlap
        points.push([dim.x(1) + offset, dim.y(i)])
      }
      points.push([dim.x(1), dim.y(1)])
    }
    // BOTTOM
    if (y === puzzle.height_in_pieces - 1) {
      points.push([dim.x(0), dim.y(1)])
    } else {
      const ys = this.vertical(x, y + 1)
      const with_edges = [0, ...ys, 0]
      for (let i = 1 - delta; i >= 0; i -= delta) {
        const mix = interpolate(with_edges, i) * strength
        const offset = mix * dim.height_overlap
        points.push([dim.x(i), dim.y(1) + offset])
      }
      points.push([dim.x(0), dim.y(1)])
    }
    // LEFT
    if (x === 0) {
      points.push([dim.x(0), dim.y(0)])
    } else {
      const xs = this.horizontal(x, y)
      const with_edges = [0, ...xs, 0]
      for (let i = 1 - delta; i >= 0; i -= delta) {
        const mix = interpolate(with_edges, i) * strength
        const offset = mix * dim.width_overlap
        points.push([
          dim.x(0) + offset,
          dim.y(i),
        ])
      }
      points.push([dim.x(0), dim.y(0)])
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
    const dim = puzzle.piece
    const atlas = this.textures
      .addDynamicTexture(
        "pieces",
        puzzle.width_in_pieces * dim.total_width,
        puzzle.height_in_pieces * dim.total_height,
      )
    atlas.fill(0x000000, 0)
    const jigsaw = this.make
      .image({key: "jigsaw"})
      .setOrigin(0, 0)
    for (let y = 0; y < puzzle.height_in_pieces; y++) {
      for (let x = 0; x < puzzle.width_in_pieces; x++) {
        const m = this.makePieceShape(x, y)
        m.setPosition(dim.total_width * x, dim.total_height * y)
        jigsaw.setMask(m.createGeometryMask())
        atlas.draw(
          jigsaw,
          dim.width_overlap + 2 * dim.width_overlap * x,
          dim.height_overlap + 2 * dim.height_overlap * y,
        )
        jigsaw.clearMask(true)
        atlas.add(
          y * puzzle.width_in_pieces + x,
          0,
          dim.total_width * x,
          dim.total_height * y,
          dim.total_width,
          dim.total_height,
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
    const grid = new Array(puzzle.width_in_pieces)
      .fill([])
      .map(() => new Array(puzzle.height_in_pieces))

    function addContainer(c) {
      selected.add(c)
      foreground.add(c)
    }

    for (let y = 0; y < puzzle.height_in_pieces; y++) {
      for (let x = 0; x < puzzle.width_in_pieces; x++) {
        const frameNumber = this.pieceIndex(x, y)
        const xOffset = x * dim.width - dim.width_overlap
        const yOffset = y * dim.height - dim.height_overlap
        const piece =
          this.make.image({
              x: xOffset,
              y: yOffset,
              key: "pieces",
              frame: frameNumber,
            }, false,
          )
        const container = this.add.container(
          Phaser.Math.Between(-xOffset, puzzle.width - xOffset - dim.width),
          Phaser.Math.Between(-yOffset, puzzle.height - yOffset - dim.height),
          piece,
        )
        grid[x][y] = container
        piece.setSize(dim.width, dim.height)
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
          x * dim.width - dim.width_overlap,
          y * dim.height - dim.height_overlap,
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
              if (gridX < puzzle.width_in_pieces - 1) candidates.add(grid[gridX + 1][gridY])
              if (gridX > 0) candidates.add(grid[gridX - 1][gridY])
              if (gridY < puzzle.height_in_pieces - 1) candidates.add(grid[gridX][gridY + 1])
              if (gridY > 0) candidates.add(grid[gridX][gridY - 1])
              Array.from(candidates)
                .filter(other => other !== c)
                .filter(other => Math.abs(c.x - other.x) < dim.width_overlap)
                .filter(other => Math.abs(c.y - other.y) < dim.height_overlap)
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
            if (selected.children.getArray()[0].getAll().length === puzzle.number_of_pieces) {
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
    width: puzzle.width,
    height: puzzle.height,
  },
})