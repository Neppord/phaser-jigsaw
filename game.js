const WIDTH = 3840;
const HEIGHT = 2160;
const WIDTH_IN_PIECES = 2 //16 * 4;
const HEIGHT_IN_PIECES = 2 // 9 * 4;
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

    create() {
        const atlas = this.textures
            .addDynamicTexture(
                "pieces",
                WIDTH_IN_PIECES * TOTAL_PIECE_WIDTH ,
                HEIGHT_IN_PIECES * TOTAL_PIECE_HEIGHT,
            )
        const jigsaw = this.make
            .image({key: "jigsaw"})
            .setOrigin(0, 0)
        atlas.draw(jigsaw, 0 , 0)
        for (let y = 0; y < HEIGHT_IN_PIECES; y++) {
            for (let x = 0; x < WIDTH_IN_PIECES; x++) {
                atlas.add(
                    y * WIDTH_IN_PIECES + x,
                    0,
                    PIECE_WIDTH * x,
                    PIECE_HEIGHT * y,
                    PIECE_WIDTH,
                    PIECE_HEIGHT,
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
            console.log("down")
            facit.setAlpha(0.5)
        })
        this.input.keyboard.on('keyup-ALT', () => {
            facit.setAlpha(0.01)
        })
        const toRandomise = []
        for (let y = 0; y < HEIGHT_IN_PIECES; y++) {
            for (let x = 0; x < WIDTH_IN_PIECES; x++) {
                const frameNumber = x + y * WIDTH_IN_PIECES;
                const piece = 
                    this.physics.add.image(0, 0, "pieces", frameNumber)
                piece.setData("x", x)
                piece.setData("y", y)
                // set the top left corner to be the origin
                // instead of the center
                piece.setOrigin(0)
                piece.setInteractive({draggable: true});
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
    }
}

new Phaser.Game({
    scene: Scene,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: true
        }
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: WIDTH,
        height: HEIGHT,
    },
});