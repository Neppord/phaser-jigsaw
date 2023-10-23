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
      piece_width / 5,
      piece_height / 5
    )
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