import { pipe } from "../common/Function"
import * as I from "../common/Int"
import { matchTag } from "../common/Match"
import * as NA from "../common/NonEmptyArray"
import * as RTE from "../common/ReaderTaskEither"
import { Orientation } from "../domain/Orientation"
import type { Position } from "../domain/Position"
import { validatePosition } from "../domain/Position"
import { Rover } from "../domain/Rover"
import type { ParseCommandError } from "../serde/CommandParser"
import { parseCommands } from "../serde/CommandParser"
import * as C from "./Command"
import type { Console } from "./Console"
import { error, log } from "./Console"
import type { PlanetContext } from "./PlanetContext"
import type { Readline } from "./Readline"
import { getStrLn } from "./Readline"
import { prettyObstacle, prettyPosition } from "./Render"
import type { RoverContext, RoverState } from "./RoverContext"
import {
  actualize,
  getCurrentState,
  RoverHistoricPosition,
  updateCurrentState
} from "./RoverContext"

export class NextPositionObstacle {
  readonly _tag = "NextPositionObstacle"
  constructor(readonly position: Position, readonly orientation: Orientation) {}
}

export function nextPosition(
  x: I.Int,
  y: I.Int,
  orientation: Orientation
): RTE.ReaderTaskEither<
  PlanetContext & RoverContext,
  NextPositionObstacle,
  RoverState
> {
  return pipe(
    validatePosition({ x, y }),
    RTE.chain((position) =>
      updateCurrentState(({ history }) => ({
        rover: new Rover(position, orientation),
        history: NA.append(new RoverHistoricPosition(position, orientation))(history)
      }))
    ),
    RTE.catchAll((e) => RTE.left(new NextPositionObstacle(e.position, orientation)))
  )
}

export const move: (
  command: C.Command
) => RTE.ReaderTaskEither<
  PlanetContext & RoverContext,
  NextPositionObstacle,
  RoverState
> = matchTag({
  GoForward,
  GoBackward,
  GoLeft,
  GoRight
})

export function GoForward(_: C.GoForward) {
  return pipe(
    getCurrentState,
    RTE.chain((state) =>
      pipe(
        state.rover.orientation,
        matchTag({
          North: () =>
            nextPosition(
              state.rover.position.x,
              I.increment(state.rover.position.y),
              Orientation.North
            ),
          South: () =>
            nextPosition(
              state.rover.position.x,
              I.decrement(state.rover.position.y),
              Orientation.South
            ),
          East: () =>
            nextPosition(
              I.increment(state.rover.position.x),
              state.rover.position.y,
              Orientation.East
            ),
          West: () =>
            nextPosition(
              I.decrement(state.rover.position.x),
              state.rover.position.y,
              Orientation.West
            )
        })
      )
    )
  )
}

export function GoBackward(_: C.GoBackward) {
  return pipe(
    getCurrentState,
    RTE.chain((state) =>
      pipe(
        state.rover.orientation,
        matchTag({
          North: () =>
            nextPosition(
              state.rover.position.x,
              I.decrement(state.rover.position.y),
              Orientation.South
            ),
          South: () =>
            nextPosition(
              state.rover.position.x,
              I.increment(state.rover.position.y),
              Orientation.North
            ),
          East: () =>
            nextPosition(
              I.decrement(state.rover.position.x),
              state.rover.position.y,
              Orientation.West
            ),
          West: () =>
            nextPosition(
              I.increment(state.rover.position.x),
              state.rover.position.y,
              Orientation.East
            )
        })
      )
    )
  )
}

export function GoLeft(_: C.GoLeft) {
  return pipe(
    getCurrentState,
    RTE.chain((state) =>
      pipe(
        state.rover.orientation,
        matchTag({
          North: () =>
            nextPosition(
              I.decrement(state.rover.position.x),
              state.rover.position.y,
              Orientation.West
            ),
          South: () =>
            nextPosition(
              I.increment(state.rover.position.x),
              state.rover.position.y,
              Orientation.East
            ),
          East: () =>
            nextPosition(
              state.rover.position.x,
              I.increment(state.rover.position.y),
              Orientation.North
            ),
          West: () =>
            nextPosition(
              state.rover.position.x,
              I.decrement(state.rover.position.y),
              Orientation.South
            )
        })
      )
    )
  )
}

export function GoRight(_: C.GoRight) {
  return pipe(
    getCurrentState,
    RTE.chain((state) =>
      pipe(
        state.rover.orientation,
        matchTag({
          North: () =>
            nextPosition(
              I.increment(state.rover.position.x),
              state.rover.position.y,
              Orientation.East
            ),
          South: () =>
            nextPosition(
              I.decrement(state.rover.position.x),
              state.rover.position.y,
              Orientation.West
            ),
          East: () =>
            nextPosition(
              state.rover.position.x,
              I.decrement(state.rover.position.y),
              Orientation.South
            ),
          West: () =>
            nextPosition(
              state.rover.position.x,
              I.increment(state.rover.position.y),
              Orientation.North
            )
        })
      )
    )
  )
}

export const moveRight = move(C.Commands.Right)

export const moveLeft = move(C.Commands.Left)

export const moveForward = move(C.Commands.Forward)

export const moveBackward = move(C.Commands.Backward)

export const main: RTE.ReaderTaskEither<
  Readline & PlanetContext & RoverContext & Console,
  ParseCommandError,
  void
> = RTE.repeatUntilStop(
  pipe(
    getStrLn,
    RTE.chain((commandsInput) =>
      commandsInput.length === 0
        ? RTE.Stop
        : pipe(
            commandsInput,
            parseCommands,
            RTE.fromEither,
            RTE.chain(RTE.foreach(move)),
            RTE.andThen(
              pipe(
                getCurrentState,
                RTE.chain(({ history }) =>
                  pipe(
                    history,
                    RTE.foreach(({ orientation, position }) =>
                      log(prettyPosition(position, orientation))
                    )
                  )
                ),
                RTE.andThen(actualize),
                RTE.andThen(RTE.Continue)
              )
            ),
            RTE.catchAll((e) =>
              e._tag === "NextPositionObstacle"
                ? pipe(
                    getCurrentState,
                    RTE.chain(({ history }) =>
                      pipe(
                        history,
                        RTE.foreach(({ orientation, position }) =>
                          log(prettyPosition(position, orientation))
                        )
                      )
                    ),
                    RTE.andThen(error(prettyObstacle(e))),
                    RTE.andThen(actualize),
                    RTE.andThen(RTE.Continue)
                  )
                : RTE.left(e)
            )
          )
    )
  )
)
