/** @import { AuraGeometry } from "./index.mjs" */

/**
 * Geometry for gridless scenes.
 * @implements {AuraGeometry}
 */
export class GridlessAuraGeometry {

	#config;

	/**
	 * @param {number} width
	 * @param {number} height
	 * @param {number} radius
	 * @param {number} gridSize
	 */
	constructor(width, height, radius, gridSize) {
		this.#config = { width, height, radius, gridSize };
	}

	isInside(x, y) {
		const { width: w, height: h, radius: r, gridSize: s } = this.#config;
		const gx = x / s, gy = y / s; // x and y in grid units

		if (w === h) {
			// If the token has equal width and height, the aura is a circle, so we can just use simple trigonometry
			const totalRadius = (w / 2) + r;
			const distSq = ((gx - w) * (gx - w)) + ((gy - h) * (gy - h));
			return distSq <= totalRadius * totalRadius;

		} else {
			// If the token has unequal width and height the aura is a rounded rectangle, so work out the closest point
			// on the edge of the token's border and check if the difference is within the radius
			const tx = Math.max(0, Math.min(w, gx));
			const ty = Math.max(0, Math.min(h, gy));
			const distSq = ((gx - tx) * (gx - tx)) + ((gy - ty) * (gy - ty));
			return distSq <= r * r;
		}
	}

	/** @returns {Generator<import("../../../utils/pixi-utils.mjs").PathCommand, void, never>} */
	*getPath() {
		const { width: w, height: h, radius: r, gridSize: s } = this.#config;

		if (w === h) {
			// If the token has equal width and height, Foundry shows it as a circle, so just draw a large circle
			const arcRadius = ((w / 2) + r) * s;
			yield { type: "m", x: -r * s, y: h / 2 * s };
			yield { type: "a", x: w / 2 * s, y: -r * s, tx: -r * s, ty: -r * s, r: arcRadius }; // top-left
			yield { type: "a", x: (w + r) * s, y: h / 2 * s, tx: (w + r) * s, ty: -r * s, r: arcRadius }; // top-right
			yield { type: "a", x: w / 2 * s, y: (h + r) * s, tx: (w + r) * s, ty: (h + r) * s, r: arcRadius }; // bottom-right
			yield { type: "a", x: -r * s, y: h / 2 * s, tx: -r * s, ty: (h + r) * s, r: arcRadius }; // bottom-left

		} else {
			// Otherwise, Foundry draws the token as a rectangle, so we'll draw the aura as a rounded rectangle
			yield { type: "m", x: -r * s, y: 0 };
			yield { type: "a", x: 0, y: -r * s, tx: -r * s, ty: -r * s, r: r * s }; // top-left
			yield { type: "l", x: w * s, y: -r * s }; // top
			yield { type: "a", x: (w + r) * s, y: 0, tx: (w + r) * s, ty: -r * s, r: r * s }; // top-right
			yield { type: "l", x: (w + r) * s, y: h * s }; // right
			yield { type: "a", x: w * s, y: (h + r) * s, tx: (w + r) * s, ty: (h + r) * s, r: r * s }; // bottom-right
			yield { type: "l", x: 0, y: (h + r) * s }; // bottom
			yield { type: "a", x: -r * s, y: h * s, tx: -r * s, ty: (h + r) * s, r: r * s }; // bottom-left
			yield { type: "l", x: -r * s, y: 0 }; // left
		}
	}
}
