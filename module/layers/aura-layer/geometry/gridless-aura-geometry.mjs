/** @import { AuraGeometry, AuraGeometryIsInsideOptions } from "./index.mjs" */

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

	/**
	 * @param {Token} token
	 * @param {AuraGeometryIsInsideOptions} options
	 */
	isInside(token, { auraOffset = { x: 0, y: 0 }, tokenAltPosition } = {}) {
		const { width: aWidth, height: aHeight, gridSize } = this.#config;
		let { radius } = this.#config;
		let { x: aX, y: aY } = auraOffset;
		aX = (aX / gridSize) + (aWidth / 2);
		aY = (aY / gridSize) + (aHeight / 2);

		// Work out the test point of the target token
		const { width: tWidth, height: tHeight } = token.document;
		let { x: tX, y: tY } = tokenAltPosition ?? token;
		tX = (tX / gridSize) + (tWidth / 2);
		tY = (tY / gridSize) + (tHeight / 2);

		if (tWidth === tHeight) {
			// If the width and height are the same, then the test token is circular, so we just add half of it's size
			// to the allowable radius range.
			radius += tWidth / 2;

		} else {
			// If the width and height aren't the same, then the test token is rectangular. The test point for the token
			// should be the point that is closest to this aura.
			tX = Math.max(tX - (tWidth / 2), Math.min(aX, tX + (tWidth / 2)));
			tY = Math.max(tY - (tHeight / 2), Math.min(aY, tY + (tHeight / 2)));
		}

		// Work out the test point of the aura's token (same logic as for the target token above)
		if (aWidth === aHeight) {
			radius += aWidth / 2;
		} else {
			aX = Math.max(aX - (aWidth / 2), Math.min(tX, aX + (aWidth / 2)));
			aY = Math.max(aY - (aHeight / 2), Math.min(tY, aY + (aHeight / 2)));
		}

		// Work out the difference between test points and check if they're within aura range
		const distSq = ((tX - aX) ** 2) + ((tY - aY) ** 2);
		return distSq < radius ** 2;
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
