import { MODULE_NAME, SQUARE_GRID_MODE, SQUARE_GRID_MODE_SETTING } from "../consts.mjs";
import { getHexAuraBorder, getSpacesUnderHexToken } from "./hex-utils.mjs";
import { getSquareAuraBorder } from "./square-utils.mjs";

/**
 * Gets the polygon for an aura for the given token with the given radius.
 * @param {Token} token
 * @param {number} radius
 * @param {BaseGrid} grid
 */
export function getTokenAura(token, radius, grid) {
	if (grid.type === CONST.GRID_TYPES.GRIDLESS) {
		return []; // Gridless not supported
	}

	const { width, height, hexagonalShape } = token.document;

	// Non-integer token sizes or radii are not supported
	if (width % 1 !== 0 || height % 1 !== 0 || radius % 1 !== 0 || width < 1 || height < 1 || radius < 0) {
		return [];
	}

	if (grid.isHexagonal) {
		return getHexAuraBorder(width, height, radius, hexagonalShape, [CONST.GRID_TYPES.HEXEVENQ, CONST.GRID_TYPES.HEXODDQ].includes(grid.type), grid.size);

	} else {
		/** @type {SQUARE_GRID_MODE} */
		const squareGridMode = game.settings.get(MODULE_NAME, SQUARE_GRID_MODE_SETTING);
		return getSquareAuraBorder(width, height, radius, squareGridMode, grid.size);
	}
}

/**
 * Gets the canvas coordinates of the centre of the spaces that token occupies.
 * @param {Token} token Token whose size and position to use.
 * @param {BaseGrid} grid The grid to generate the points for.
 * @param {{ x: number; y: number; }} altPosition If provided, uses this position instead of the token's own position.
 */
export function getSpacesUnderToken(token, grid, altPosition = undefined) {
	const { width, height, hexagonalShape } = token.document;
	const { x, y } = altPosition ?? token;

	/** @type {{ x: number; y: number; }[]} */
	let points;

	// Gridless and non-integer token sizes are not supported
	if (grid.type === CONST.GRID_TYPES.GRIDLESS || width % 1 !== 0 || height % 1 !== 0 || width < 1 || height < 1) {
		return points = [];

	} else if (grid.isHexagonal) {
		points = getSpacesUnderHexToken(x, y, width, height, hexagonalShape, [CONST.GRID_TYPES.HEXEVENQ, CONST.GRID_TYPES.HEXODDQ].includes(grid.type), grid.size);

	} else {
		points = []; // TODO:
	}

	// If the points were not valid (e.g. unsupported hex size), just return a single point at the centre of the token
	return points?.length > 0
		? points
		: [{ x: x + width * grid.size / 2, y: y + height * grid.size / 2 }];
}
