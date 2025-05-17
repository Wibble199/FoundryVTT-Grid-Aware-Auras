/**
 * @typedef {Object} AuraGeometryIsInsideOptions
 * @property {{ x: number; y: number; }?} auraOffset The aura's own x and y position to offset against.
 * @property {{ x: number; y: number; }?} tokenAltPosition If provided, an alternative position to use for the test token.
 */
/**
 * The AuraGeometry interface represents the shape of an aura and provides relevant methods.
 * @typedef {Object} AuraGeometry
 * @property {(token: Token, options?: AuraGeometryIsInsideOptions) => boolean} isInside Tests if a token is inside this geometry.
 * @property {() => PathCommand[] | Generator<import("../../../utils/pixi-utils.mjs").PathCommand, void, never>} getPath Draws this geometry to the given PIXI Graphics instance.
 */

export * from "./gridless-aura-geometry.mjs";
export * from "./hexagonal-aura-geometry.mjs";
export * from "./square-aura-geometry.mjs";
