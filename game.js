import {Puzzle} from "./puzzle.js"

const EVENT = {
  clear_selection: "clear_selection",
  select: "select",
  move: "move",
  connect: "connect",
  game_id: "game_id",
  player_id: "player_id",
  new_game: "new_game",
  join_game: "join_game",
  peer: "peer",
  client_joining: "client_joining",
}

class Scene extends Phaser.Scene {
  puzzle
  game_id
  player_id
  colors
  players
  recording
  hands
  grid
  table

  init(data) {
    this.puzzle = new Puzzle(
      1920,
      1080,
      3,
      3,
    )
    console.dir(this.puzzle)
    this.piece = this.puzzle.piece
    this.colors = [0x00FF00, 0xFF0000, 0xFFFF00]
    this.players = {}
    this.hands = {}
    this.grid = new Array(this.puzzle.width_in_pieces)
      .fill([])
      .map(() => new Array(this.puzzle.height_in_pieces))
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

  join_game(players, recordings) {
    this.table = this.add.layer()
    this.players = players
    console.dir(players)
    for (const id in players) {
      const hand = this.add.layer()
      hand.postFX.addGlow(players[id].color)
      this.hands[id] = hand
    }
    this.create_puzzle()
  }

  clear_selection(player_id) {
    if (this.hands[player_id]) this.table.add(this.hands[player_id].getChildren().map(c => c))
  }

  select(player_id, x, y) {
    this.hands[player_id].add(this.grid[x][y])
  }

  connect(cx, cy, ox, oy) {
    const c = this.grid[cx][cy]
    const o = this.grid[ox][oy]
    if (c === o) return
    o.each(op => {
      this.grid[op.getData("x")][op.getData("y")] = c
      c.add(op)
    })
    o.removeAll()
    const hitAreas = c.getData("hitAreas")
    o.getData("hitAreas").forEach(ha => hitAreas.push(ha))

    o.destroy(true)
    this.sound.play("connect")
    this.cameras.main.shake(100, 0.005)
    if ((this.selected())[0].getAll().length === this.puzzle.number_of_pieces) {
      this.my_hand().postFX.addShine()
      table.postFX.addShine()
      this.cameras.main.fadeIn()
    }

  }


  new_game() {
    this.table = this.add.layer()
    this.add_player(this.player_id)
    this.create_puzzle()
  }

  create_puzzle() {
    const toRandomise = []
    for (let y = 0; y < this.puzzle.height_in_pieces; y++) {
      for (let x = 0; x < this.puzzle.width_in_pieces; x++) {
        const frameNumber = this.puzzle.pieceIndex(x, y)
        const xOffset = x * this.piece.width - this.piece.width_overlap
        const yOffset = y * this.piece.height - this.piece.height_overlap
        const piece = this.make.image(
          {
            x: xOffset,
            y: yOffset,
            key: "pieces",
            frame: frameNumber,
          },
          false,
        )
        const container = this.add.container(
          Phaser.Math.Between(-xOffset, this.puzzle.width - xOffset - this.piece.width),
          Phaser.Math.Between(-yOffset, this.puzzle.height - yOffset - this.piece.height),
          piece,
        )
        piece.setSize(this.piece.width, this.piece.height)

        this.grid[x][y] = container
        container.setData("x", x)
        container.setData("y", y)
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
        this.table.add(container)
        let shift = this.input.keyboard.addKey(
          Phaser.Input.Keyboard.KeyCodes.SHIFT,
        )
        container.on('dragstart', () => {
          if (!this.selected().includes(container)) {
            if (shift.isDown) {
              this.broadcast({
                name: EVENT.select,
                args: [
                  this.player_id,
                  container.getData("x"),
                  container.getData("y"),
                ],
              })
            } else {
              this.broadcast({
                name: EVENT.clear_selection,
                args: [this.player_id],
              })
              this.broadcast({
                name: EVENT.select,
                args: [
                  this.player_id,
                  container.getData("x"),
                  container.getData("y"),
                ],
              })
            }
          }
        })
        container.on('drag', (pointer, dragX, dragY) => {
          if (this.selected().includes(container)) {
            Phaser.Actions.IncXY(
              this.selected(),
              dragX - container.x,
              dragY - container.y,
            )
          }
        })
        container.on('dragend', () => {
          this.selected().forEach(c => this.send({
            name: EVENT.move,
            args: [c.getData("x"), c.getData("y"), c.x, c.y],
          }))
          this.selected().forEach(c => {
            c.each(p => {
              const gridX = p.getData("x")
              const gridY = p.getData("y")
              const candidates = new Set()
              if (gridX < this.puzzle.width_in_pieces - 1) candidates.add(this.grid[gridX + 1][gridY])
              if (gridX > 0) candidates.add(this.grid[gridX - 1][gridY])
              if (gridY < this.puzzle.height_in_pieces - 1) candidates.add(this.grid[gridX][gridY + 1])
              if (gridY > 0) candidates.add(this.grid[gridX][gridY - 1])
              Array.from(candidates).filter(o =>
                o !== c &&
                Math.abs(c.x - o.x) < this.piece.width_overlap &&
                Math.abs(c.y - o.y) < this.piece.height_overlap,
              ).forEach(o => {
                this.broadcast({
                  name: EVENT.connect,
                  args: [
                    c.getData("x"),
                    c.getData("y"),
                    o.getData("x"),
                    o.getData("y"),
                  ]
                })
              })
            })
          })
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

  send(event) {
    return this.game.events.emit(
      EVENT.peer,
      event,
    )
  }

  selected() {
    return this.my_hand().getChildren()
  }

  broadcast(event) {
    this.game.events.emit(event.name, ...event.args)
    this.game.events.emit(EVENT.peer, event)
  }

  setup_pointer() {
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
          if (!moved) this.game.events.emit(EVENT.clear_selection, this.player_id)
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
    let zoomLvl = 800
    this.cameras.main.zoom = zoomLvl / 1000
    this.input.on(Phaser.Input.Events.POINTER_WHEEL, (p, o, x, y, z) => {
      zoomLvl = Math.max(250, Math.min(4000, zoomLvl - y))
      this.cameras.main.zoom = zoomLvl / 1000
    })
  }

  my_hand() {
    return this.hands[this.player_id]
  }

  add_player(player_id) {
    const color = this.colors.pop()
    const hand = this.add.layer()
    this.players[player_id] = {color: color}
    this.hands[player_id] = hand
    hand.postFX.addGlow(color)
  }

  create() {
    this.create_atlas()
    this.create_hud()

    this.game.events.on(EVENT.clear_selection, this.clear_selection, this)
    this.game.events.on(EVENT.select, this.select, this)
    this.game.events.on(EVENT.move, this.move, this)
    this.game.events.on(EVENT.connect, this.connect, this)

    this.setup_pointer()

    this.game.events.on(EVENT.new_game, () => this.new_game())
    this.game.events.on(EVENT.join_game, (players, recordings) => this.join_game(players, recordings))
    this.game.events.on(EVENT.client_joining, id => this.client_joining(id))

  }

  move(x_index, y_index, x, y) {
    this.tweens.add({
      targets: this.grid[x_index][y_index],
      ease: Phaser.Math.Easing.Cubic.InOut,
      props: {
        x: x,
        y: y,
      },
      duration: 100
    })
  }

  client_joining(id) {
    console.log("joining", id)
    this.add_player(id)
    this.game.events.emit(EVENT.peer, {
      name: EVENT.join_game,
      args: [
        this.players,
        this.recording,
      ],
    })
  }

  create_hud() {
    this.cameras.main.zoom = 800 / 1000
    const hud = this.add.text(0, 50, `Pieces: ${this.puzzle.number_of_pieces}`)
    hud.setScrollFactor(0)
    this.game.events.on(EVENT.player_id, (id) => {
      this.player_id = id
      hud.setText(`Game: ${this.game_id}\nPlayer: ${this.player_id}\nPieces: ${this.puzzle.number_of_pieces}\n`)
    })
    this.game.events.on(EVENT.game_id, (id) => {
      this.game_id = id
      location.hash = id
      hud.setText(`Game: ${this.game_id}\nPlayer: ${this.player_id}\nPieces: ${this.puzzle.number_of_pieces}\n`)
    })
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

const game = new Phaser.Game({
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

const peer = new Peer(undefined, {
  debug: 1,
})
const handle_connection = client => {
  client.on("open", () => {
    // from game to client
    game.events.on(EVENT.peer, event => {
      console.log("Sending event", event)
      client.send(event)
    })
    // from client to game
    client.on("data", event => {
      console.log("Received event", event)
      game.events.emit(event.name, ...event.args)
    })
    // start joining
    game.events.emit(EVENT.client_joining, client.peer)
  })
}
if (location.hash) {
  const host_id = location.hash.slice(1)
  peer.on("open", id => {
    game.events.emit(EVENT.player_id, id)
    const host = peer.connect(host_id, {reliable: true})
    peer.once("error", e => {
      if (e.type === "peer-unavailable") {
        game.events.emit(EVENT.game_id, id)
        game.events.emit(EVENT.new_game)
        peer.on("connection", handle_connection)
      }
    })
    host.on("open", () => {
      game.events.on(EVENT.peer, event => host.send(event))
      host.on("data", event => {
        console.log("received event", event)
        game.events.emit(event.name, ...event.args)
      })
      game.events.emit(EVENT.game_id, host_id)
    })
  })
} else {
  peer.on("open", id => {
    game.events.emit(EVENT.game_id, id)
    game.events.emit(EVENT.player_id, id)
    game.events.emit(EVENT.new_game)
  })
  peer.on("connection", handle_connection)
}
//peer.on("error", e => console.log(e))
