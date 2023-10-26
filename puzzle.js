export class Puzzle {
  width
  height
  width_in_pieces
  height_in_pieces
  number_of_pieces

  piece

  constructor(width, height, width_in_pieces, height_in_pieces) {
    this.width = width
    this.height = height
    this.width_in_pieces = width_in_pieces
    this.height_in_pieces = height_in_pieces
    
    this.number_of_pieces = width_in_pieces * height_in_pieces
    
    const piece_width =  width / width_in_pieces
    const piece_height =  height / height_in_pieces
    this.piece = new Piece(
      piece_width,
      piece_height,
      piece_width / 3,
      piece_height / 3
    )
  }


  pieceIndex(x, y) {
    return y * this.width_in_pieces + x
  }


  vertical(x, y) {
    const index = this.pieceIndex(x, y)
    const rnd = new Phaser.Math.RandomDataGenerator([index])
    return this.edge(rnd)
  }

  horizontal(x, y) {
    const index = this.pieceIndex(x, y) << 8
    const rnd = new Phaser.Math.RandomDataGenerator([index])
    return this.edge(rnd)
  }

  edge(rnd) {
    if (rnd.frac() > 0.5) {
      return [0, 0, 0, 0, rnd.frac(), (rnd.frac() + 0.5) * -1, (rnd.frac() + 0.5) * -1, rnd.frac(), 0, 0, 0, 0]
    } else {
      return [0, 0, 0, 0, -rnd.frac(), (rnd.frac() + 0.5) * 1, (rnd.frac() + 0.5) * 1, -rnd.frac(), 0, 0, 0, 0]
    }
  }

  piecePoints(x, y) {
    const points = []
    const dim =  this.piece
    const delta = 0.05
    points.push([dim.x(0), dim.y(0)])
    // TOP
    const interpolate = Phaser.Math.Interpolation.Bezier
    if (y === 0) {
      points.push([dim.x(1), dim.y(0)])
    } else {
      const ys = this.vertical(x, y)
      for (let i = delta; i < 1; i += delta) {
        const mix = interpolate(ys, i)
        const offset = mix * dim.height_overlap
        points.push([dim.x(i), dim.y(0) + offset])
      }
      points.push([dim.x(1), dim.y(0)])
    }
    // RIGHT
    if (x === this.width_in_pieces - 1) {
      points.push([dim.x(1), dim.y(1)])
    } else {
      const xs = this.horizontal(x + 1, y)
      for (let i = delta; i < 1; i += delta) {
        const mix = interpolate(xs, i)
        const offset = mix * dim.width_overlap
        points.push([dim.x(1) + offset, dim.y(i)])
      }
      points.push([dim.x(1), dim.y(1)])
    }
    // BOTTOM
    if (y === this.height_in_pieces - 1) {
      points.push([dim.x(0), dim.y(1)])
    } else {
      const ys = this.vertical(x, y + 1)
      for (let i = 1 - delta; i >= 0; i -= delta) {
        const mix = interpolate(ys, i)
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
      for (let i = 1 - delta; i >= 0; i -= delta) {
        const mix = interpolate(xs, i)
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

}
export class Piece {
  width
  height
  width_overlap
  height_overlap
  total_width
  total_height
  constructor(width, height, width_overlap, height_overlap) {
    this.width = width
    this.height = height
    this.width_overlap = width_overlap
    this.height_overlap = height_overlap
    this.total_width = width + 2 * width_overlap
    this.total_height = height + 2 * height_overlap
  }
  
  x(t) {
    return this.width_overlap + t * this.width
  }
  
  y(t) {
    return this.height_overlap + t * this.height
  }
}