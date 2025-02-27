import { cacheReturn } from "./misc-utils.mjs";

/** The side length of a hexagon with a grid size of 1 (apothem of 0.5). */
const UNIT_SIDE_LENGTH = 1 / Math.sqrt(3);

/** 30 degrees expressed as radians. */
const RADIANS_30 = 30 * Math.PI / 180;

const getEllipseHexTokenSpaces = cacheReturn(
	/**
	 * Calculates the cube coordinates of all spaces occupied by a type 1 ellipse token with the given width/height on a
 	 * columnar grid.
	 * @param {number} width Width of the token, measured in cells.
	 * @param {number} height Height of the token, measured in cells.
	 * @param {boolean} isColumnar true for hex columns, false for hex rows.
	 * @param {boolean} isVariant2 false for ELLIPSE_1, true for ELLIPSE_2.
	 */
	function(width, height, isColumnar, isVariant2) {
		const primaryAxisSize = isColumnar ? height : width;
		const secondaryAxisSize = isColumnar ? width : height;

		const secondaryAxisOffset = Math[isVariant2 ? "ceil" : "floor"]((secondaryAxisSize - 1) / 2) * UNIT_SIDE_LENGTH * 1.5 + UNIT_SIDE_LENGTH;

		// Columnar ellipses require the height to be at least as big as `floor(width / 2) + 1`.
		// E.G. for a width of 5, the height must be 3 or higher. For a width of 6, height must be at least 4 or higher.
		// Same is true for rows, but in the opposite axis.
		if (primaryAxisSize < Math.floor(secondaryAxisSize / 2) + 1) {
			return [];
		}

		/** @type {{ x: number; y: number; }[]} */
		const spaces = [];

		// Track the offset distance from the tallest part of the hex, and which side we're on.
		// The initial side we use (sign) depends on the variant of ellipse we're building.
		let offsetDist = 0;
		let offsetSign = isVariant2 ? 1 : -1;

		for (let j = 0; j < secondaryAxisSize; j++) {
			const primaryAxisOffset = (offsetDist + 1) / 2;

			// The number of spaces in this column decreases by 1 each time the offsetDist increases by 1: at the 0 (the
			// tallest part of the shape), we have the full height number of cells. Either side of this, we have height - 1,
			// either side of those height - 2, etc.
			for (let i = 0; i < primaryAxisSize - offsetDist; i++) {
				spaces.push(coordinate(
					i + primaryAxisOffset,
					offsetDist * offsetSign * UNIT_SIDE_LENGTH * 1.5 + secondaryAxisOffset));
			}

			// Swap over the offset side, and increase dist if neccessary
			offsetSign *= -1;
			if (j % 2 === 0) offsetDist++;
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

const getEllipseHexAuraBorder = cacheReturn(
	/**
	 * Calculates the points that make up the border of an aura around the token of the given size and aura radius.
	 * This is for an ELLIPSE_1 type shape, on a columnar grid.
	 * @param {number} width Width of the token, measured in cells.
	 * @param {number} height Height of the token, measured in cells.
	 * @param {number} radius Radius, measured in cells.
	 * @param {boolean} isColumnar true for hex columns, false for hex rows.
	 * @param {boolean} isVariant2 false for ELLIPSE_1, true for ELLIPSE_2.
	 */
	function (width, height, radius, isColumnar, isVariant2) {
		const primaryAxisSize = isColumnar ? height : width;
		const secondaryAxisSize = isColumnar ? width : height;

		// Columnar ellipses require the height to be at least as big as `floor(width / 2) + 1`.
		// E.G. for a width of 5, the height must be 3 or higher. For a width of 6, height must be at least 4 or higher.
		// Same is true for rows, but in the opposite axis.
		if (primaryAxisSize < Math.floor(secondaryAxisSize / 2) + 1) {
			return [];
		}

		const leftSize = Math.floor((secondaryAxisSize - 1) / 2) + 1;
		const rightSize = Math.ceil((secondaryAxisSize - 1) / 2) + 1;

		return generateHexBorder([
			primaryAxisSize - (leftSize - 1) + radius,
			leftSize + radius,
			rightSize + radius,
			primaryAxisSize - (rightSize - 1) + radius,
			rightSize + radius,
			leftSize + radius
		], isVariant2, !isColumnar);
	}
);

const generateHexBorder = cacheReturn(
	/**
	 * Generates the vertices for a hex border on a columnar grid with the given side lengths.
	 * The shape will be aligned so that the top-left is at (0,0). i.e. no point will have a negative x or y.
	 * @param {number[]} sideLengths Length of each side, starting from the left and going counter-clockwise.
	 * @param {boolean} mirror If true, mirrors the coordinates in the X axis.
	 * @param {boolean} rotate If true, swaps X and Y coordinates.
	 */
	function (sideLengths, mirror, rotate) {
		let x = 0;
		let y = 0;

		let minX = Infinity;
		let minY = Infinity;

		const points = [
			...generateSide(sideLengths[0], 270),
			...generateSide(sideLengths[1], 330),
			...generateSide(sideLengths[2], 30),
			...generateSide(sideLengths[3], 90),
			...generateSide(sideLengths[4], 150),
			...generateSide(sideLengths[5], 210),
		];

		return points.map(({ x, y }) => ({ x: x - minX, y: y - minY }));

		/**
		 * @param {number} sideLength Number of cells to draw.
		 * @param {number} angle Angle of the overall line. Individual lines will be +- 30 degrees from this line. 0 = LTR.
		 */
		function *generateSide(sideLength, angle) {
			angle = angle / 180 * Math.PI; // convert to radians
			const dx1 = Math.cos(angle + RADIANS_30) * UNIT_SIDE_LENGTH * (mirror ? -1 : 1);
			const dy1 = Math.sin(angle + RADIANS_30) * UNIT_SIDE_LENGTH;
			const dx2 = Math.cos(angle - RADIANS_30) * UNIT_SIDE_LENGTH * (mirror ? -1 : 1);
			const dy2 = Math.sin(angle - RADIANS_30) * UNIT_SIDE_LENGTH;

			yield coordinate(x += dx1, y += dy1);
			for (let i = 0; i < sideLength - 1; i++) {
				yield coordinate(x += dx2, y += dy2);
				yield coordinate(x += dx1, y += dy1);
			}
		}

		/**
		 * Returns a transformed coordinate and updates minX/maxX/minY/maxY bounds.
		 * @param {number} x
		 * @param {number} y
		 */
		function coordinate(x, y) {
			if (rotate) ([x, y] = [y, x]);

			minX = Math.min(minX, x);
			minY = Math.min(minY, y);
			return { x, y };
		}
	},
	k => [k[0].join("|"), ...k.slice(1)].join("|")
);

/**
 *
 * @param {number} width
 * @param {number} height
 * @param {number} radius
 * @param {number} shape
 * @param {boolean} isColumnar
 * @param {number} gridSize
 */
export function getHexAuraBorder(width, height, radius, shape, isColumnar, gridSize) {
	const primaryAxisOffset = gridSize * radius;
	const secondaryAxisOffset = gridSize * radius * UNIT_SIDE_LENGTH * 1.5;
	const [xOffset, yOffset] = isColumnar ? [secondaryAxisOffset, primaryAxisOffset] : [primaryAxisOffset, secondaryAxisOffset];

	switch (shape) {
		case CONST.TOKEN_HEXAGONAL_SHAPES.ELLIPSE_1:
		case CONST.TOKEN_HEXAGONAL_SHAPES.ELLIPSE_2:
			return getEllipseHexAuraBorder(width, height, radius, isColumnar, shape === CONST.TOKEN_HEXAGONAL_SHAPES.ELLIPSE_2)
				.map(({ x, y }) => ({ x: x * gridSize - xOffset, y: y * gridSize - yOffset }));

		case CONST.TOKEN_HEXAGONAL_SHAPES.TRAPEZOID_1:
		case CONST.TOKEN_HEXAGONAL_SHAPES.TRAPEZOID_2:
			return []; // TODO:

		case CONST.TOKEN_HEXAGONAL_SHAPES.RECTANGLE_1:
		case CONST.TOKEN_HEXAGONAL_SHAPES.RECTANGLE_2:
			return []; // TODO:

		default:
			throw new Error("Unknown hex grid type.");
	}
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @param {number} shape
 * @param {boolean} isColumnar
 * @param {number} gridSize
 */
export function getSpacesUnderHexToken(x, y, width, height, shape, isColumnar, gridSize) {
	switch (shape) {
		case CONST.TOKEN_HEXAGONAL_SHAPES.ELLIPSE_1:
		case CONST.TOKEN_HEXAGONAL_SHAPES.ELLIPSE_2:
			return getEllipseHexTokenSpaces(width, height, isColumnar, shape === CONST.TOKEN_HEXAGONAL_SHAPES.ELLIPSE_2)
				.map((p) => ({ x: x + p.x * gridSize, y: y + p.y * gridSize }));

		case CONST.TOKEN_HEXAGONAL_SHAPES.TRAPEZOID_1:
		case CONST.TOKEN_HEXAGONAL_SHAPES.TRAPEZOID_2:
			return []; // TODO:

		case CONST.TOKEN_HEXAGONAL_SHAPES.RECTANGLE_1:
		case CONST.TOKEN_HEXAGONAL_SHAPES.RECTANGLE_2:
			return []; // TODO:

		default:
			throw new Error("Unknown hex grid type.");
	}
}
