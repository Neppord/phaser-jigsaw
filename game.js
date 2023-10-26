import {Puzzle} from "./puzzle.js"

const EVENT = {
  clear_selection: "clear_selection"
}
class Scene extends Phaser.Scene {
  puzzle

  init(data) {
    this.puzzle = new Puzzle(
      1920,
      1080,
      16*2,
      9*2,
    )
    console.dir(this.puzzle)
    this.piece = this.puzzle.piece
  }

  preload() {
    this.load.image("jigsaw", "ship-1366926_1920.jpg")
    this.load.audio("connect", "connect.wav")
  }

  makePieceShape(x, y) {
    const ctx = this.make.graphics()
    ctx.fillPoints(
      this.puzzle.piecePoints(x, y).map(([x, y]) => new Phaser.Geom.Point(x, y)),
      true,
    )
    return ctx
  }

  create() {

    this.create_atlas()

    const table = this.add.layer()
    const foreground = this.add.layer()
    this.events.on(EVENT.clear_selection, () => {
      table.add(foreground.getChildren().map( c => c))
    })
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
          if (!moved) this.events.emit(EVENT.clear_selection)
          this.input.off(Phaser.Input.Events.POINTER_MOVE, move)
        })
      }
    })
    let lastClick = -1
    this.input.on("pointerup", (pointer) => {
      if (pointer.upTime - lastClick < 250) {
        this.scale.startFullscreen()
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
    const grid = new Array(this.puzzle.width_in_pieces)
      .fill([])
      .map(() => new Array(this.puzzle.height_in_pieces))

    for (let y = 0; y < this.puzzle.height_in_pieces; y++) {
      for (let x = 0; x < this.puzzle.width_in_pieces; x++) {
        const frameNumber = this.puzzle.pieceIndex(x, y)
        const xOffset = x * this.piece.width - this.piece.width_overlap
        const yOffset = y * this.piece.height - this.piece.height_overlap
        const piece =
          this.make.image({
              x: xOffset,
              y: yOffset,
              key: "pieces",
              frame: frameNumber,
            }, false,
          )
        const container = this.add.container(
          Phaser.Math.Between(-xOffset, this.puzzle.width - xOffset - this.piece.width),
          Phaser.Math.Between(-yOffset, this.puzzle.height - yOffset - this.piece.height),
          piece,
        )
        grid[x][y] = container
        piece.setSize(this.piece.width, this.piece.height)
        piece.setData("x", x)
        piece.setData("y", y)
        piece.setData("container", container)
        // set the top left corner to be the origin
        // instead of the center
        const points = this.puzzle.piecePoints(x, y)
        piece.setOrigin(0)
        const hitArea = new Phaser.Geom.Polygon(points)
        Phaser.Geom.Polygon.Translate(
          hitArea,
          x * this.piece.width - this.piece.width_overlap,
          y * this.piece.height - this.piece.height_overlap,
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
        container.on('dragstart', () => {
          if (!foreground.getChildren().includes(container)) {
            if (shift.isDown) {
              foreground.add(container)
            } else {
              this.events.emit(EVENT.clear_selection)
              foreground.add(container)
            }
          }
        })
        container.on('drag', (pointer, dragX, dragY) => {
          if (foreground.getChildren().includes(container)) {
            Phaser.Actions.IncXY(
              foreground.getChildren(),
              dragX - container.x,
              dragY - container.y,
            )
          }
        })
        container.on('dragend', () => {
          let didConnect = false
          foreground.getChildren().forEach(c => {
            c.each(p => {
              const gridX = p.getData("x")
              const gridY = p.getData("y")
              const candidates = new Set()
              if (gridX < this.puzzle.width_in_pieces - 1) candidates.add(grid[gridX + 1][gridY])
              if (gridX > 0) candidates.add(grid[gridX - 1][gridY])
              if (gridY < this.puzzle.height_in_pieces - 1) candidates.add(grid[gridX][gridY + 1])
              if (gridY > 0) candidates.add(grid[gridX][gridY - 1])
              Array.from(candidates)
                .filter(other => other !== c)
                .filter(other => Math.abs(c.x - other.x) < this.piece.width_overlap)
                .filter(other => Math.abs(c.y - other.y) < this.piece.height_overlap)
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
            this.cameras.main.shake(100, 0.005)
            if (foreground.getChildren()[0].getAll().length === this.puzzle.number_of_pieces) {
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
    const hud = this.add.text(0, 0, `Pieces: ${this.puzzle.number_of_pieces}`)
    hud.setScrollFactor(0)
  }

  create_atlas() {
    const atlas = this.textures
      .addDynamicTexture(
        "pieces",
        this.puzzle.width_in_pieces * this.piece.total_width,
        this.puzzle.height_in_pieces * this.piece.total_height,
      )
    atlas.fill(0x000000, 0)
    const jigsaw = this.make
      .image({key: "jigsaw"})
      .setOrigin(0, 0)
    atlas.beginDraw()
    for (let y = 0; y < this.puzzle.height_in_pieces; y++) {
      for (let x = 0; x < this.puzzle.width_in_pieces; x++) {
        const m = this.makePieceShape(x, y)
        m.setPosition(this.piece.total_width * x, this.piece.total_height * y)
        jigsaw.setMask(m.createGeometryMask())
        atlas.batchDraw(
          jigsaw,
          this.piece.width_overlap + 2 * this.piece.width_overlap * x,
          this.piece.height_overlap + 2 * this.piece.height_overlap * y,
        )
        jigsaw.clearMask(true)
        atlas.add(
          y * this.puzzle.width_in_pieces + x,
          0,
          this.piece.total_width * x,
          this.piece.total_height * y,
          this.piece.total_width,
          this.piece.total_height,
        )
      }
    }
    atlas.endDraw()
    jigsaw.destroy(true)
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
    width: 1920,
    height: 1080,
  },
})