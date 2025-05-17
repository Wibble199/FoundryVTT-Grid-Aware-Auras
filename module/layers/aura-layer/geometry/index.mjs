/**
 * The AuraGeometry interface represents the shape of an aura and provides relevant methods.
 * @typedef {Object} AuraGeometry
 * @property {(x: number, y: number) => boolean} isInside Tests if a point is inside this geometry.
 * @property {() => PathCommand[] | Generator<import("../../../utils/pixi-utils.mjs").PathCommand, void, never>} getPath Draws this geometry to the given PIXI Graphics instance.
 */

export * from "./hexagonal-aura-geometry.mjs";
export * from "./square-aura-geometry.mjs";
