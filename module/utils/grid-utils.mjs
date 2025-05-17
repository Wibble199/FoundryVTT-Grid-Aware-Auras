import { cacheReturn } from "./misc-utils.mjs";

/** The side length of a hexagon with a grid size of 1 (apothem of 0.5). */
const UNIT_SIDE_LENGTH = 1 / Math.sqrt(3);

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

	// Non-integer token sizes are not supported
	if (width % 1 !== 0 || height % 1 !== 0 || width < 1 || height < 1) {
		points = [];

	} else if (grid.type === CONST.GRID_TYPES.GRIDLESS) {
		points = getSpacesUnderGridlessToken(x, y, width, height, grid.size);

	} else if (grid.isHexagonal) {
		points = getSpacesUnderHexToken(x, y, width, height, hexagonalShape, [CONST.GRID_TYPES.HEXEVENQ, CONST.GRID_TYPES.HEXODDQ].includes(grid.type), grid.size);

	} else {
		points = getSpacesUnderSquareToken(x, y, width, height, grid.size);
	}

	// If the points were not valid (e.g. unsupported hex size), just return a single point at the centre of the token
	return points?.length > 0
		? points
		: [{ x: x + (width * grid.size / 2), y: y + (height * grid.size / 2) }];
}

// ------ //
// Square //
// ------ //
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

/**
 * Returns the centre of the cells occupied by the token.
 * @param {number} x The X position of the token.
 * @param {number} y The Y position of the token.
 * @param {number} width The width of the token (in grid cells).
 * @param {number} height The height of the token (in grid cells).
 * @param {number} gridSize Size of the grid to generate.
 */
function getSpacesUnderSquareToken(x, y, width, height, gridSize) {
	return generateSquareHexTokenSpaces(width, height).map(p => ({ x: x + (p.x * gridSize), y: y + (p.y * gridSize) }));
}


// --------- //
// Hexagonal //
// --------- //
const getEllipseHexTokenSpaces = cacheReturn(
	/**
	 * Calculates the coordinates of all spaces occupied by an ellipse token with the given width/height.
	 * @param {number} primaryAxisSize Size of the token in the primary direction, measured in cells.
	 * @param {number} secondaryAxisSize Size of the token in the secondary direction, measured in cells.
	 * @param {boolean} isColumnar true for hex columns, false for hex rows.
	 * @param {boolean} isVariant2 false for ELLIPSE_1, true for ELLIPSE_2.
	 */
	function(primaryAxisSize, secondaryAxisSize, isColumnar, isVariant2) {
		// Ellipses require the size in primary axis to be at least as big as `floor(secondaryAxisSize / 2) + 1`.
		// E.G. for columnar grids, for a width of 5, the height must be 3 or higher. For a width of 6, height must be
		// at least 4 or higher. Same is true for rows, but in the opposite axis.
		if (primaryAxisSize < Math.floor(secondaryAxisSize / 2) + 1) {
			return [];
		}

		const secondaryAxisOffset = Math[isVariant2 ? "ceil" : "floor"](((secondaryAxisSize - 1) / 2) * UNIT_SIDE_LENGTH * 1.5) + UNIT_SIDE_LENGTH;

		/** @type {{ x: number; y: number; }[]} */
		const spaces = [];

		// Track the offset distance from the largest part of the hex (in primary), and which side we're on.
		// The initial side we use (sign) depends on the variant of ellipse we're building.
		let offsetDist = 0;
		let offsetSign = isVariant2 ? 1 : -1;

		for (let i = 0; i < secondaryAxisSize; i++) {
			const primaryAxisOffset = (offsetDist + 1) / 2;
			const secondaryPosition = (offsetDist * offsetSign * UNIT_SIDE_LENGTH * 1.5) + secondaryAxisOffset;

			// The number of spaces in this primary axis decreases by 1 each time the offsetDist increases by 1: at the
			// 0 (the largest part of the shape), we have the full primary size number of cells. Either side of this, we
			// have primary - 1, either side of those primary - 2, etc.
			for (let j = 0; j < primaryAxisSize - offsetDist; j++) {
				spaces.push(coordinate(j + primaryAxisOffset, secondaryPosition));
			}

			// Swap over the offset side, and increase dist if neccessary
			offsetSign *= -1;
			if (i % 2 === 0) offsetDist++;
		}

		return spaces;

		/**
		 * @param {number} primary
		 * @param {number} secondary
		 */
		function coordinate(primary, secondary) {
			return isColumnar ? { x: secondary, y: primary } : { x: primary, y: secondary };
		}
	}
);

const getTrapezoidHexTokenSpaces = cacheReturn(
	/**
	 * Calculates the coordinates of all spaces occupied by an trapezoid token with the given width/height.
	 * @param {number} primaryAxisSize Size of the token in the primary direction, measured in cells.
	 * @param {number} secondaryAxisSize Size of the token in the secondary direction, measured in cells.
	 * @param {boolean} isColumnar true for hex columns, false for hex rows.
	 * @param {boolean} isVariant2 false for TRAPEZOID_1, true for TRAPEZOID_2.
	 */
	function(primaryAxisSize, secondaryAxisSize, isColumnar, isVariant2) {
		// For trapezoid to work, the size in the primary axis must be equal to or larger than the size in the secondary
		if (primaryAxisSize < secondaryAxisSize) {
			return [];
		}

		const secondaryAxisOffset = isVariant2 ? UNIT_SIDE_LENGTH + ((secondaryAxisSize - 1) * UNIT_SIDE_LENGTH * 1.5) : UNIT_SIDE_LENGTH;

		/** @type {{ x: number; y: number; }[]} */
		const spaces = [];

		// Trazpezoids are simple. Start with a line in the primary direction that is the full primary size.
		// Then, for each cell in the secondary direction, reduce the primary by one.
		// If we are doing variant1 we offset in the secondary by one direction, for variant2 we go the other direction.
		for (let i = 0; i < secondaryAxisSize; i++) {
			const primaryAxisOffset = (i + 1) / 2;
			const secondaryPosition = (i * (isVariant2 ? -1 : 1) * UNIT_SIDE_LENGTH * 1.5) + secondaryAxisOffset;

			for (let j = 0; j < primaryAxisSize - i; j++) {
				spaces.push(coordinate(j + primaryAxisOffset, secondaryPosition));
			}
		}

		return spaces;

		/**
		 * @param {number} primary
		 * @param {number} secondary
		 */
		function coordinate(primary, secondary) {
			return isColumnar ? { x: secondary, y: primary } : { x: primary, y: secondary };
		}
	}
);

const getRectangleHexTokenSpaces = cacheReturn(
	/**
	 * Calculates the coordinates of all spaces occupied by an trapezoid token with the given width/height.
	 * @param {number} primaryAxisSize Size of the token in the primary direction, measured in cells.
	 * @param {number} secondaryAxisSize Size of the token in the secondary direction, measured in cells.
	 * @param {boolean} isColumnar true for hex columns, false for hex rows.
	 * @param {boolean} isVariant2 false for TRAPEZOID_1, true for TRAPEZOID_2.
	 */
	function(primaryAxisSize, secondaryAxisSize, isColumnar, isVariant2) {
		// If the size in the primary direction is 1, the size in the secondary direction must be no more than one.
		// For primary size >= 2, any size secondary is acceptable.
		if (primaryAxisSize === 1 && secondaryAxisSize > 1) {
			return [];
		}

		/** @param {{ x: number; y: number; }[]} */
		const spaces = [];

		const largeRemainder = isVariant2 ? 1 : 0;

		// Spaces under rectangles are easy. They just alternate size in the primary direction by 0 and -1 as we iterate
		// through the cells in the secondary direction.
		for (let i = 0; i < secondaryAxisSize; i++) {
			const isLarge = i % 2 === largeRemainder;
			for (let j = 0; j < primaryAxisSize - (isLarge ? 0 : 1); j++) {
				spaces.push(coordinate(
					j + (isLarge ? 0.5 : 1),
					(i * UNIT_SIDE_LENGTH * 1.5) + UNIT_SIDE_LENGTH
				));
			}
		}

		return spaces;

		/**
		 * @param {number} primary
		 * @param {number} secondary
		 */
		function coordinate(primary, secondary) {
			return isColumnar ? { x: secondary, y: primary } : { x: primary, y: secondary };
		}
	}
);

/**
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @param {number} shape
 * @param {boolean} isColumnar
 * @param {number} gridSize
 */
function getSpacesUnderHexToken(x, y, width, height, shape, isColumnar, gridSize) {
	const primaryAxisSize = isColumnar ? height : width;
	const secondaryAxisSize = isColumnar ? width : height;

	switch (shape) {
		case CONST.TOKEN_HEXAGONAL_SHAPES.ELLIPSE_1:
		case CONST.TOKEN_HEXAGONAL_SHAPES.ELLIPSE_2:
			return getEllipseHexTokenSpaces(primaryAxisSize, secondaryAxisSize, isColumnar, shape === CONST.TOKEN_HEXAGONAL_SHAPES.ELLIPSE_2)
				.map(p => ({ x: x + (p.x * gridSize), y: y + (p.y * gridSize) }));

		case CONST.TOKEN_HEXAGONAL_SHAPES.TRAPEZOID_1:
		case CONST.TOKEN_HEXAGONAL_SHAPES.TRAPEZOID_2:
			return getTrapezoidHexTokenSpaces(primaryAxisSize, secondaryAxisSize, isColumnar, shape === CONST.TOKEN_HEXAGONAL_SHAPES.TRAPEZOID_2)
				.map(p => ({ x: x + (p.x * gridSize), y: y + (p.y * gridSize) }));

		case CONST.TOKEN_HEXAGONAL_SHAPES.RECTANGLE_1:
		case CONST.TOKEN_HEXAGONAL_SHAPES.RECTANGLE_2:
			return getRectangleHexTokenSpaces(primaryAxisSize, secondaryAxisSize, isColumnar, shape === CONST.TOKEN_HEXAGONAL_SHAPES.RECTANGLE_2)
				.map(p => ({ x: x + (p.x * gridSize), y: y + (p.y * gridSize) }));

		default:
			throw new Error("Unknown hex grid type.");
	}
}

// -------- //
// Gridless //
// -------- //
/**
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @param {number} gridSize
 */
function getSpacesUnderGridlessToken(x, y, width, height, gridSize) {
	// TODO:
	return [];
}
