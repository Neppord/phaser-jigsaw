module Test.Main where

import Prelude

import Effect (Effect)

import Effect.Aff (launchAff_)
import Test.Spec.Runner (runSpec)
import Test.Spec.Reporter.TeamCity (teamcityReporter)
import Test.Spec (describe, it)
import Test.Spec.Assertions (shouldEqual)
import Puzzle (new_puzzle, size)
import Test.Spec.Reporter.Spec (specReporter)

main :: Effect Unit
main = launchAff_ $ runSpec [teamcityReporter, specReporter] do
    describe "Puzzle" do
        let puzzle = new_puzzle 16 9
        it "has a width" $ puzzle.width # shouldEqual 16
        it "has a height" $ puzzle.height # shouldEqual 9
        it "has a size" $ puzzle # size # shouldEqual (16 * 9)
        