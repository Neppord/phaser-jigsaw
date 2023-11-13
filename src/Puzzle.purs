module Puzzle where

import Prelude
import Data.Map (Map)
import Data.Set (Set)
import Data.Array (range)
import Data.Tuple.Nested ((/\))
import Data.Set (singleton) as Set
import Data.Map.Internal (fromFoldable) as Map

type Puzzle = { width :: Int, height :: Int, database :: DataBase }
type Index = { x :: Int, y :: Int }
type DataBase = Map Index (Set Index)

new_puzzle :: Int -> Int -> Puzzle
new_puzzle width height =
  { width
  , height
  , database: Map.fromFoldable $
      (\x y -> { x, y } /\ Set.singleton { x, y }) 
        <$> range 0 width <*> range 0 height
        
  }

size :: Puzzle -> Int
size { width, height } = width * height
