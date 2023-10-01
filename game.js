const WIDTH = 3840;
const HEIGHT = 2160;
const WIDTH_IN_PIECES = 16 * 4;
const HEIGHT_IN_PIECES = 9 * 4;
console.log("Pieces: ", WIDTH_IN_PIECES * HEIGHT_IN_PIECES)
console.log("Width: ", WIDTH_IN_PIECES)
console.log("Height: ", HEIGHT_IN_PIECES)
const PIECE_WIDTH = WIDTH / WIDTH_IN_PIECES;
const PIECE_HEIGHT = HEIGHT / HEIGHT_IN_PIECES;
console.log("Piece Width: ", PIECE_WIDTH)
console.log("Piece Height: ", PIECE_HEIGHT)

class Scene extends Phaser.Scene {
    preload() {
        this.load.image("jigsaw", "ship-1366926_crop_4k.png")
        const frameConfig = {
            frameWidth: PIECE_WIDTH,
            frameHeight: PIECE_HEIGHT,
        };
        this.load.spritesheet(
            "pieces",
            "ship-1366926_crop_4k.png",
            frameConfig
        )
    }
    create() {
        const facit = this.add.image(0, 0, "jigsaw")
        const selected = this.add.group()
        const table = this.add.layer()
        const forground = this.add.layer()
        forground.bringToTop()

        facit.setOrigin(0)
        facit.setAlpha(0.01)
        facit.setInteractive()
        facit.on("pointerdown", () => {
            selected.setTint()
            selected.clear()
            forground.each(child => table.add(child))
        })
        this.input.keyboard.on('keydown-ALT', () => {
            console.log("down")
            facit.setAlpha(0.5)
        })
        this.input.keyboard.on('keyup-ALT', () => {
            facit.setAlpha(0.01)
        })

        for (let x = 0; x < WIDTH_IN_PIECES; x++) {
            for (let y = 0; y < HEIGHT_IN_PIECES; y++) {
                const piece = this.add.image(
                    PIECE_WIDTH * x,
                    PIECE_HEIGHT * y,
                    "pieces",
                    x + y * WIDTH_IN_PIECES
                )
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
                        if (shift.isDown) {
                            this.setTint(0xFFFF00)
                            selected.add(this)
                            forground.add(this)
                        } else {
                            selected.setTint()
                            selected.clear()
                            forground.each(child => table.add(child))
                            selected.add(this)
                            this.setTint(0xFFFF00)
                            forground.add(this)
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
                pieces.push(piece)
            }
        }

        const board = new Phaser.Geom.Rectangle(
            0,
            0,
            WIDTH - PIECE_WIDTH,
            HEIGHT - PIECE_HEIGHT
        );
        Phaser.Actions.RandomRectangle(pieces, board)
    }
}

const pieces = []
new Phaser.Game({
    scene: Scene,
    scale: {
        //mode: Phaser.Scale.FIT,
        //autoCenter: Phaser.Scale.CENTER_BOTH,
        width: WIDTH,
        height: HEIGHT,
    },
});
