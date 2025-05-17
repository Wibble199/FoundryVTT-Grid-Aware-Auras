import { SQUARE_GRID_MODE } from "../consts.mjs";
import { cacheReturn } from "./misc-utils.mjs";

/** @type {Map<SQUARE_GRID_MODE, (xOffset: number, yOffset: number, radius: number) => boolean>} */
const costFuncs = new Map([
	[SQUARE_GRID_MODE.EQUIDISTANT, (x, y, r) => Math.max(x, y) <= r],
	[SQUARE_GRID_MODE.ALTERNATING, (x, y, r) => Math.max(x, y) + Math.floor(Math.min(x, y) / 2) <= r],
	[SQUARE_GRID_MODE.MANHATTAN, (x, y, r) => x + y <= r],
	[SQUARE_GRID_MODE.EXACT, (x, y, r) => (x * x) + (y * y) <= r * r]
]);

const generateSquareHexTokenSpaces = cacheReturn(
	/**
	 * Calculates the coordinates of all spaces occupied by an trapezoid token with the given width/height.
	 * @param {number} width The width of the token (in grid spaces).
	 * @param {number} height The height of the token (in grid spaces).
	 */
	function(width, height) {
		/** @type {{ x: number; y: number; }[]} */
		const spaces = [];

		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				spaces.push({ x: x + 0.5, y: y + 0.5 });
			}
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
		const costFunc = costFuncs.get(mode);
		if (!costFunc) throw new Error("Unknown `mode` for generateSquareAuraBorder.");

		// All the corners are the same, so we only need to calculate one corner and can re-use this for all 4 corners
		// by 'rotating' the points.
		/** @type {{ x: number; y: number; }[]} */
		const cornerPoints = [];

		// Loop over all spaces, starting from closest to the centre of the token and working outwards (left-to-right
		// then top-to-bottom). Keep track of the previous time the X value of the edge of the aura changed. Work out
		// where the X edge of the aura is at the current Y. If the X is different, add a pair of points for it.
		// Finally, we add just a single point at the same previous X at Y = radius, UNLESS that X is 0 (because if so
		// it will already be handled by the straight edge part).
		// E.G. if the aura was a radius 4 with a pattern like this:
		// ■■■□
		// ■■■□
		// ■■□□
		// □□□□
		// The initial 'lastX' will be 4 (we assume this carries over from the straight edge, and will be at the radius)
		// The X value at the the first Y is 3. This is different from 4, add { x: 4, y: 0 }, { x: 3, y: 0 } to points.
		// The next X value is the same as the previous. Doesn't need any new points.
		// The next X value is 2, which is different, so add { x: 3, y: 2 }, { x: 2, y: 2 }
		// The next X value is 0, which is different, so add { x: 2, y: 3 }, { x: 0, y: 3 }
		// We do not add the final point, because X is 0.
		let lastXPoint = radius;
		for (let y = 0; y < radius; y++) {
			let x = 0;
			for (; x < radius; x++) {
				const isInAura = costFunc(x + 1, y + 1, radius);
				if (!isInAura) break;
			}

			if (lastXPoint !== x) {
				cornerPoints.push({ x: lastXPoint, y });
				cornerPoints.push({ x, y });
				lastXPoint = x;
			}
		}

		if (lastXPoint > 0) {
			cornerPoints.push({ x: lastXPoint, y: radius });
		}

		// Now, we can take the points we calculated for a single corner, and use them to generate the whole points for
		// the entire aura.
		return [
			// Top-left corner:
			...cornerPoints.map(({ x, y }) => ({ x: -x, y: -y })),
			// Top edge
			{ x: 0, y: -radius },
			{ x: width, y: -radius },
			// Top-right corner
			...cornerPoints.map(({ x, y }) => ({ x: y + width, y: -x })),
			// Right edge
			{ x: width + radius, y: 0 },
			{ x: width + radius, y: height },
			// Bottom-right corner
			...cornerPoints.map(({ x, y }) => ({ x: x + width, y: y + height })),
			// Bottom edge
			{ x: width, y: height + radius },
			{ x: 0, y: height + radius },
			// Bottom-left corner:
			...cornerPoints.map(({ x, y }) => ({ x: -y, y: x + height })),
			// Left edge:
			{ x: -radius, y: height },
			{ x: -radius, y: 0 }
		];
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
	return generateSquareHexTokenSpaces(width, height).map(p => ({ x: x + (p.x * gridSize), y: y + (p.y * gridSize) }));
}
