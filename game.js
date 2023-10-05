const WIDTH = 3840;
const HEIGHT = 2160;
const WIDTH_IN_PIECES = 16;
const HEIGHT_IN_PIECES = 9;
console.log("Pieces: ", WIDTH_IN_PIECES * HEIGHT_IN_PIECES)
console.log("Width: ", WIDTH_IN_PIECES)
console.log("Height: ", HEIGHT_IN_PIECES)
const PIECE_WIDTH = WIDTH / WIDTH_IN_PIECES;
const PIECE_HEIGHT = HEIGHT / HEIGHT_IN_PIECES;
const OVERLAP = 5
const WIDTH_OVERLAP = PIECE_WIDTH / OVERLAP;
const HEIGHT_OVERLAP = PIECE_HEIGHT / OVERLAP;
const TOTAL_PIECE_WIDTH = PIECE_WIDTH + 2 * WIDTH_OVERLAP;
const TOTAL_PIECE_HEIGHT = PIECE_HEIGHT + 2 * HEIGHT_OVERLAP;
console.log("Piece Width: ", PIECE_WIDTH)
console.log("Piece Height: ", PIECE_HEIGHT)

class Scene extends Phaser.Scene {
    preload() {
        this.load.image("jigsaw", "ship-1366926_crop_4k.png")
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
        return [rnd.frac(), rnd.frac(), rnd.frac(), rnd.frac()]
    }
    piecePoints(x, y) {
        const points = []
        points.push([WIDTH_OVERLAP, HEIGHT_OVERLAP])
        // TOP
        if (y === 0) {
            points.push([TOTAL_PIECE_WIDTH - WIDTH_OVERLAP, HEIGHT_OVERLAP])
        } else {
            const [y1, y2, y3, y4] = this.horizontal(x, y)
            points.push([WIDTH_OVERLAP + PIECE_WIDTH * 0.25, HEIGHT_OVERLAP * (1 + y1)])
            points.push([WIDTH_OVERLAP + PIECE_WIDTH * 0.50, HEIGHT_OVERLAP * (1 - y2)])
            points.push([WIDTH_OVERLAP + PIECE_WIDTH * 0.75, HEIGHT_OVERLAP * (1 + y3)])
            points.push([WIDTH_OVERLAP + PIECE_WIDTH, HEIGHT_OVERLAP])
        }
        // RIGHT
        if (x === WIDTH_IN_PIECES - 1) {
            points.push([PIECE_WIDTH + WIDTH_OVERLAP, HEIGHT_OVERLAP + PIECE_HEIGHT])
        } else {
            const [x1, x2, x3, x4] = this.horizontal(x + 1, y)
            points.push([PIECE_WIDTH + WIDTH_OVERLAP * (1 + x1), HEIGHT_OVERLAP + PIECE_HEIGHT * 0.25])
            points.push([PIECE_WIDTH + WIDTH_OVERLAP * (1 - x2), HEIGHT_OVERLAP + PIECE_HEIGHT * 0.50])
            points.push([PIECE_WIDTH + WIDTH_OVERLAP * (1 + x3), HEIGHT_OVERLAP + PIECE_HEIGHT * 0.75])
            points.push([PIECE_WIDTH + WIDTH_OVERLAP, HEIGHT_OVERLAP + PIECE_HEIGHT])
        }
        // BOTTOM
        if (y === HEIGHT_IN_PIECES - 1) {
            points.push([WIDTH_OVERLAP, PIECE_HEIGHT + HEIGHT_OVERLAP])
        } else {
            const [y1, y2, y3, y4] = this.horizontal(x, y + 1)
            points.push([WIDTH_OVERLAP + PIECE_WIDTH * 0.75, PIECE_HEIGHT + HEIGHT_OVERLAP * (1 + y3)])
            points.push([WIDTH_OVERLAP + PIECE_WIDTH * 0.50, PIECE_HEIGHT + HEIGHT_OVERLAP * (1 - y2)])
            points.push([WIDTH_OVERLAP + PIECE_WIDTH * 0.25, PIECE_HEIGHT + HEIGHT_OVERLAP * (1 + y1)])
            points.push([WIDTH_OVERLAP, PIECE_HEIGHT + HEIGHT_OVERLAP])
        }
        // LEFT
        if (x === 0) {
            points.push([WIDTH_OVERLAP, HEIGHT_OVERLAP])
        } else {
            const [x1, x2, x3, x4] = this.horizontal(x, y)
            points.push([WIDTH_OVERLAP * (1 + x3), PIECE_HEIGHT * 0.75 + HEIGHT_OVERLAP])
            points.push([WIDTH_OVERLAP * (1 - x2), PIECE_HEIGHT * 0.50 + HEIGHT_OVERLAP])
            points.push([WIDTH_OVERLAP * (1 + x1), PIECE_HEIGHT * 0.25 + HEIGHT_OVERLAP])
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
                    HEIGHT_OVERLAP + 2 * HEIGHT_OVERLAP * y
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

        const facit = this.add.image(0, 0, "jigsaw")
        const selected = this.add.group()
        const table = this.add.layer()
        const foreground = this.add.layer()
        foreground.bringToTop()

        facit.setOrigin(0)
        facit.setAlpha(0.01)
        facit.setInteractive()
        facit.on("pointerdown", () => {
            selected.setTint()
            selected.clear()
            foreground.each(child => table.add(child))
        })
        this.input.keyboard.on('keydown-ALT', () => {
            facit.setAlpha(0.5)
        })
        this.input.keyboard.on('keyup-ALT', () => {
            facit.setAlpha(0.01)
        })
        const toRandomise = []
        for (let y = 0; y < HEIGHT_IN_PIECES; y++) {
            for (let x = 0; x < WIDTH_IN_PIECES; x++) {
                const frameNumber = this.pieceIndex(x, y);
                const piece =
                    this.physics.add.image(0, 0, "pieces", frameNumber)
                piece.setSize(PIECE_WIDTH, PIECE_HEIGHT)
                piece.setData("x", x)
                piece.setData("y", y)
                // set the top left corner to be the origin
                // instead of the center
                const points = this.piecePoints(x, y)
                piece.setOrigin(0)
                const hitArea = new Phaser.Geom.Polygon(points);
                piece.setInteractive({
                    draggable: true,
                    hitArea: hitArea,
                    // why I need to write this one by hand im not sure
                    hitAreaCallback: function (hitArea, x, y, piece) {
                        return hitArea.contains(x, y)
                    }
                })
                table.add(piece)
                let shift = this.input.keyboard.addKey(
                    Phaser.Input.Keyboard.KeyCodes.SHIFT
                )
                piece.on('dragstart', function () {
                    if (!selected.contains(this)) {
                        this.setCollideWorldBounds(true);
                        if (shift.isDown) {
                            this.setTint(0xFFFF00)
                            selected.add(this)
                            foreground.add(this)
                        } else {
                            selected.setTint()
                            selected.clear()
                            foreground.each(child => {
                                table.add(child)
                                child.setCollideWorldBounds(false);
                            })
                            selected.add(this)
                            this.setTint(0xFFFF00)
                            foreground.add(this)
                        }
                    }
                })
                piece.on('drag', function (pointer, dragX, dragY) {
                    if (selected.contains(this)) {
                        selected.incXY(
                            dragX - this.x,
                            dragY - this.y
                        )
                    }
                })
                piece.setScale(0)
                toRandomise.push(piece)
            }
        }

        const board = new Phaser.Geom.Rectangle(
            0,
            0,
            WIDTH - PIECE_WIDTH,
            HEIGHT - PIECE_HEIGHT
        );
        Phaser.Actions.RandomRectangle(toRandomise, board)
        this.tweens.add({
            targets: toRandomise,
            props: {
                scale: {from: 0.2, to: 1},
                angle: {from: 360, to: 0},
            },
            //ease: 'linear',
            duration: 500,
            delay: this.tweens.stagger(1)
        });
    }
}

new Phaser.Game({
    scene: Scene,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: {y: 0},
            debug: false
        }
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: WIDTH,
        height: HEIGHT,
    },
});