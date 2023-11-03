import {Puzzle} from "./puzzle.js"

const EVENT = {
  clear_selection: "clear_selection",
  select: "select",
  deselect: "deselect",
  move: "move",
  connect: "connect",
  game_id: "game_id",
  player_id: "player_id",
  new_game: "new_game",
  join_game: "join_game",
  peer: "peer",
  record: "record",
  client_joining: "client_joining",
  client_leaving: "client_leaving",
}

class Scene extends Phaser.Scene {
  game_id
  player_id
  color
  table
  
  puzzle= new Puzzle(
    1920,
    1080,
    16 * 2,
    9 * 2,
  )
  piece = this.puzzle.piece
  colors= Phaser.Actions.Shuffle(
    Phaser.Display.Color.HSVColorWheel(1, 1).map(c => c.color)
  )
  players = {}
  recording = []
  hands = {}
  grid= new Array(this.puzzle.width_in_pieces)
    .fill([])
    .map(() => new Array(this.puzzle.height_in_pieces))
  mute = false

  init(data) {
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

  join_game(id, players, recordings) {
    if (id !== this.player_id) return
    this.table = this.add.layer()
    this.colors.forEach(color => {
      const hand = this.add.layer()
      hand.postFX.addGlow(color)
      this.hands[color] = hand
    })
    this.players = players
    this.color = this.players[this.player_id].color
    this.create_puzzle()
    this.mute = true
    recordings.forEach( r => this.game.events.emit(r.name, ...r.args))
    this.mute = false
  }

  clear_selection(color) {
    if (this.hands[color]) this.table.add(this.hands[color].getChildren().map(c => c))
  }

  select(color, x, y) {
    this.hands[color].add(this.grid[x][y])
  }
  
  deselect(x, y) {
    this.table.add(this.grid[x][y])
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
    
    this.deselect(cx, cy)
    
    if (! this.mute) this.sound.play("connect")
    this.cameras.main.shake(100, 0.005)
    const groups = new Set(this.grid.flat())
    if (groups.size === 1) {
      this.table.postFX.addShine()
      for (let color in this.hands) {
        this.hands[color].postFX.addShine()
      }
      this.cameras.main.fadeIn()
    }
  }


  new_game() {
    this.table = this.add.layer()
    this.colors.forEach(c => {
      const hand = this.add.layer()
      hand.postFX.addGlow(c)
      this.hands[c] = hand
    })
    this.add_player(this.player_id)
    this.color = this.players[this.player_id].color
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
                  this.color,
                  container.getData("x"),
                  container.getData("y"),
                ],
              })
            } else {
              this.broadcast({
                name: EVENT.clear_selection,
                args: [this.color],
              })
              this.broadcast({
                name: EVENT.select,
                args: [
                  this.color,
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
                  ],
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
    this.game.events.emit(EVENT.record, event)
    this.game.events.emit(EVENT.peer, event)
  }

  selected() {
    return this.my_hand().getChildren()
  }

  broadcast(event) {
    this.game.events.emit(event.name, ...event.args)
    this.send(event)
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
          if (!moved) {
            this.broadcast({
              name: EVENT.clear_selection,
              args: [this.player_id],
            })
          }
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
    return this.hands[this.color]
  }

  add_player(player_id) {
    const color = this.colors.pop()
    this.players[player_id] = {color: color}
  }
  
  record(event) {
    this.recording.push(event)
  }

  create() {
    this.create_atlas()
    this.create_hud()

    this.game.events.on(EVENT.clear_selection, this.clear_selection, this)
    this.game.events.on(EVENT.select, this.select, this)
    this.game.events.on(EVENT.deselect, this.deselect, this)
    this.game.events.on(EVENT.move, this.move, this)
    this.game.events.on(EVENT.connect, this.connect, this)
    this.game.events.on(EVENT.record, this.record, this)

    this.setup_pointer()

    this.game.events.on(EVENT.new_game, this.new_game, this)
    this.game.events.on(EVENT.join_game, this.join_game, this)
    this.game.events.on(EVENT.client_joining, this.client_joining, this)
    this.game.events.on(EVENT.client_leaving, this.client_leaving, this)

  }

  move(x_index, y_index, x, y) {
    this.tweens.add({
      targets: this.grid[x_index][y_index],
      ease: Phaser.Math.Easing.Cubic.InOut,
      props: {
        x: x,
        y: y,
      },
      duration: 100,
    })
  }

  client_joining(id) {
    this.add_player(id)
    this.game.events.emit(EVENT.peer, {
      name: EVENT.join_game,
      args: [
        id,
        this.players,
        this.recording,
      ],
    })
  }
  client_leaving(id) {
    const {color} = this.players[id]
    const color_hex = "#" + color
      .toString(16)
      .toUpperCase()
      .padStart(6, "0")
    console.log(`player with id "${id}" and color "${color_hex}" is leaving `)
    this.colors.push(color)
    delete this.players[id]
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
const clients = new Set()
const handle_connection = client => {
  client.on("open", () => {
    clients.add(client)
    // from game to client
    game.events.on(EVENT.peer, client.send, client)
    
    // from client to game
    client.on("data", event => {
      game.events.emit(event.name, ...event.args)
      game.events.emit(EVENT.record, event)
      Array.from(clients)
        .filter(c => c !== client)
        .forEach( c => c.send(event))
    })
    client.on("close", () => {
      console.log(`client ${client.peer} closed`)
      clients.delete(client)
      game.events.off(EVENT.peer, client.send, client)
      game.events.emit(EVENT.client_leaving, client.peer)
    })
    
    client.on("error", () => {
      console.log(`client ${client.peer} had error`)
      clients.delete(client)
      game.events.off(EVENT.peer, client.send, client)
      game.events.emit(EVENT.client_leaving, client.peer)
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
      host.on("data", event => game.events.emit(event.name, ...event.args))
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
