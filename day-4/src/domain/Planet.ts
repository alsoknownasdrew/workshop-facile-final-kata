import * as E from "../common/Either"
import * as I from "../common/Int"

export class Planet {
  readonly _tag = "Planet"
  constructor(readonly width: I.Int, readonly height: I.Int) {}
}

export interface PlanetConfiguration {
  width: I.Int
  height: I.Int
}

export function makePlanet({
  height,
  width
}: PlanetConfiguration): E.Either<InvalidHeight | InvalidWidth, Planet> {
  return I.positive(width)
    ? I.positive(height)
      ? E.right(new Planet(width, height))
      : E.left(new InvalidHeight())
    : E.left(new InvalidWidth())
}

export class InvalidWidth {
  readonly _tag = "InvalidWidth"
}

export class InvalidHeight {
  readonly _tag = "InvalidHeight"
}
