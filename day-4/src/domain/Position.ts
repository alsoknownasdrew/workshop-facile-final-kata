import type { PlanetContext } from "../app/PlanetContext"
import { pipe } from "../common/Function"
import * as I from "../common/Int"
import type { Newtype } from "../common/Newtype"
import { newtype } from "../common/Newtype"
import * as RTE from "../common/ReaderTaskEither"

export interface Position {
  readonly x: I.Int
  readonly y: I.Int
}

export interface PositionHash extends Newtype<"PositionHash", string> {}

export const PositionHash = newtype<PositionHash>()

export function hashPosition(self: Position) {
  return PositionHash.wrap(`x: ${self.x} - y: ${self.y}`)
}

export function scale(to: { width: I.Int; height: I.Int }) {
  return (self: Position): Position => ({
    x: I.mod(to.width)(self.x),
    y: I.mod(to.height)(self.y)
  })
}

export const makPosition = (x: I.Int, y: I.Int) =>
  RTE.access(({ planetContext: { planet } }: PlanetContext) =>
    pipe(scale(planet)({ x, y }), ({ x, y }): Position => ({ x, y }))
  )

export class ObstacleHit {
  readonly _tag = "ObstacleHit"
  constructor(readonly position: Position) {}
}

export function validatePosition(
  self: Position
): RTE.ReaderTaskEither<PlanetContext, ObstacleHit, Position> {
  return RTE.accessM(({ planetContext: { planet } }: PlanetContext) =>
    pipe(scale(planet)(self), (p) => {
      if (planet.obstacles.has(hashPosition(p))) {
        return RTE.left(new ObstacleHit(p))
      }
      return RTE.right(p)
    })
  )
}
