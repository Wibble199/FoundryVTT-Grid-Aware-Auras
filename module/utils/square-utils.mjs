import { SQUARE_GRID_MODE } from "../consts.mjs";
import { cacheReturn } from "./misc-utils.mjs";

const generateSquareHexTokenSpaces = cacheReturn(
	/**
	 * Calculates the coordinates of all spaces occupied by an trapezoid token with the given width/height.
	 * @param {number} width The width of the token (in grid spaces).
	 * @param {number} height The height of the token (in grid spaces).
	 */
	function(width, height) {
		/** @type {{ x: number; y: number; }[]} */
		const spaces = [];

		for (let y = 0; y < height; y++)
		for (let x = 0; x < width; x++) {
			spaces.push({ x: x + 0.5, y: y + 0.5 });
		}

		return spaces;
	}
);

const generateSquareAuraBorder = cacheReturn(
	/**
	 * Generates a square aura polygon for the given radius.
	 * The origin of the polygon is the top-left of the centre.
	 * @param {number} width The width of the centre, in grid cells.
	 * @param {number} height The height of the centre, in grid cells.
	 * @param {number} radius The radius of the polygon, measured in grid cells. Must be positive.
	 * @param {SQUARE_GRID_MODE} mode The algorithm used to generate the aura.
	 */
	function(width, height, radius, mode) {
		const r = radius;
		switch (mode) {
			// This is the easiest to implement, just a large rectangle/square around the centre
			case SQUARE_GRID_MODE.EQUIDISTANT: {
				return [
					/* top-left: */ { x: -r, y: -r },
					/* top-right: */ { x: (width + r), y: -r },
					/* bottom-right: */ { x: (width + r), y: (height + r) },
					/* bottom-left: */ { x: -r, y: (height + r) }
				];
			}

			// Alternating seems to generate a pattern where there are 3 distinct slopes between adjacent sides, e.g.
			// from the top to the right, the x:y ratio of the first slope is 2:1, the second 1:1, then finally 1:2. The
			// 1:1 part is always either 1 or 3 squares in size.
			case SQUARE_GRID_MODE.ALTERNATING: {
				const padding = r > 0 ? 1 : 0 // All radii except 0 have the straight side extend 1 square further than the width/height
				const innerDiagonalLength = Math.max(r - 1, 0) % 3; // The length of the 1:1 slope part
				const outerDialogalLength = Math.floor(Math.max(r - 1, 0) / 3); // The length of the two 2:1/2:1 parts

				return [
					/* top: */ { x: -padding, y: -r },
					/* top-right diagonals: */ ...alternatingDiagonals(width + padding, -r, "x", 1, 1),
					/* right: */ { x: (width + r), y: -padding },
					/* bottom-right diagonals: */ ...alternatingDiagonals(width + r, height + padding, "y", -1, 1),
					/* bottom: */ { x: (width + padding), y: (height + r) },
					/* bottom-left diagonals: */ ...alternatingDiagonals(-padding, height + r, "x", -1, -1),
					/* left: */ { x: -r, y: (height + padding) },
					/* top-left diagonals: */ ...alternatingDiagonals(-radius, -padding, "y", 1, -1)
				];

				/**
				 * Generates diagonals for the alternating aura. One call of this will generate the 3 distinct diagonals.
				 * Dir will determine which values are stretched. dx/dy will determine the direction of the diagonals.
				 * @type {(x: number, y: number, dir: "x" | "y", dx: number, dy: number) => Generator<{ x: number; y: number; }, void, void>}
				 */
				function* alternatingDiagonals(x, y, dir, dx, dy) {
					const ifX = v => dir === "x" ? v : 0;
					const ifY = v => dir === "y" ? v : 0;
					([x, y] = yield *diagonal(x, y, outerDialogalLength, ifY(1) * dx, ifX(1) * dy, ifX(2) * dx, ifY(2) * dy));
					([x, y] = yield *diagonal(x, y, innerDiagonalLength, ifY(1) * dx, ifX(1) * dy, ifX(1) * dx, ifY(1) * dy));
					([x, y] = yield *diagonal(x, y, outerDialogalLength, ifY(2) * dx, ifX(2) * dy, ifX(1) * dx, ifY(1) * dy));
				}
			}

			// Manhattan can be boiled down to a top/bottom/left/right which are the same as the width/heigh, and then a
			// diagonal between the sides. The length of the diagonals equals the radius of aura.
			case SQUARE_GRID_MODE.MANHATTAN: {
				return [
					/** top: */ { x: 0, y: -r },
					/** top-right diagonal: */ ...diagonal(width, -r, r, 0, 1, 1, 0),
					/** right: */ { x: (width + r), y: 0 },
					/** bottom-right diagonal: */ ...diagonal(width + r, height, r, -1, 0, 0, 1),
					/** bottom: */ { x: width, y: (height + r) },
					/** bottom-left diagonal: */ ...diagonal(0, height + r, r, 0, -1, -1, 0),
					/** left: */ { x: -r, y: height },
					/** top-left diagonal: */ ...diagonal(-r, 0, r, 1, 0, 0, -1)
				];
			}
		}

		throw new Error("Unknown `mode` for generateSquareAuraBorder.");

		/**
		 * Creates a diagonal for a square grid. dx0/dy0 are the number of squares to move on the first step, and
		 * dx1/dy1 are the number of squares to move on the second step.
		 * @type {(x: number, y: number, count: number, dx0: number, dy0: number, dx1: number, dy1: number) => Generator<{ x: number; y: number; }, [number, number], void>}
		 */
		function* diagonal(x, y, count, dx0, dy0, dx1, dy1) {
			for (let i = 0; i < count; i++) {
				yield { x, y };
				x += dx0;
				y += dy0;
				yield { x, y };
				x += dx1;
				y += dy1;
			}

			return [x, y];
		}
	}
);

/**
 * Returns a square aura polygon for the given radius.
 * @param {number} width The width of the centre, in grid cells.
 * @param {number} height The height of the centre, in grid cells.
 * @param {number} radius The radius of the polygon, measured in grid cells. Must be positive.
 * @param {SQUARE_GRID_MODE} mode The algorithm used to generate the aura.
 * @param {number} gridSize Size of the grid to generate.
 */
export function getSquareAuraBorder(width, height, radius, mode, gridSize) {
	return generateSquareAuraBorder(width, height, radius, mode).map(({ x, y }) => ({ x: x * gridSize, y: y * gridSize }));
}

/**
 * Returns the centre of the cells occupied by the token.
 * @param {number} x The X position of the token.
 * @param {number} y The Y position of the token.
 * @param {number} width The width of the token (in grid cells).
 * @param {number} height The height of the token (in grid cells).
 * @param {number} gridSize Size of the grid to generate.
 */
export function getSpacesUnderSquareToken(x, y, width, height, gridSize) {
	return generateSquareHexTokenSpaces(width, height).map(p => ({ x: x + p.x * gridSize, y: y + p.y * gridSize }));
}
