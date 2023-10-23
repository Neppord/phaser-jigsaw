export class Puzzle {

  width
  height
  width_in_pieces
  height_in_pieces

  number_of_pieces
  piece_width
  piece_height
  total_piece_width
  total_piece_height
  width_overlap
  height_overlap

  constructor(width, height, width_in_pieces, height_in_pieces) {
    this.width = width
    this.height = height
    this.width_in_pieces = width_in_pieces
    this.height_in_pieces = height_in_pieces
    
    this.number_of_pieces = width_in_pieces * height_in_pieces
    
    this.piece_width =  width / width_in_pieces
    this.piece_height =  height / height_in_pieces
    const OVERLAP = 5
    this.width_overlap = this.piece_width / OVERLAP
    this.height_overlap = this.piece_height / OVERLAP
    this.total_piece_width = this.piece_width + 2 * this.width_overlap
    this.total_piece_height = this.piece_height + 2 * this.height_overlap
    
  }
}