import { cacheReturn } from "./misc-utils.mjs";

/** The side length of a hexagon with a grid size of 1 (apothem of 0.5). */
const UNIT_SIDE_LENGTH = 1 / Math.sqrt(3);

/** 30 degrees expressed as radians. */
const RADIANS_30 = 30 * Math.PI / 180;

/** 60 degrees expressed as radians. */
const RADIANS_60 = 60 * Math.PI / 180;

const getEllipseHexTokenSpaces = cacheReturn(
	/**
	 * Calculates the cube coordinates of all spaces occupied by an ellipse token with the given width/height.
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

		const secondaryAxisOffset = Math[isVariant2 ? "ceil" : "floor"]((secondaryAxisSize - 1) / 2) * UNIT_SIDE_LENGTH * 1.5 + UNIT_SIDE_LENGTH;

		/** @type {{ x: number; y: number; }[]} */
		const spaces = [];

		// Track the offset distance from the largest part of the hex (in primary), and which side we're on.
		// The initial side we use (sign) depends on the variant of ellipse we're building.
		let offsetDist = 0;
		let offsetSign = isVariant2 ? 1 : -1;

		for (let i = 0; i < secondaryAxisSize; i++) {
			const primaryAxisOffset = (offsetDist + 1) / 2;
			const secondaryPosition = offsetDist * offsetSign * UNIT_SIDE_LENGTH * 1.5 + secondaryAxisOffset;

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

const getEllipseHexAuraBorder = cacheReturn(
	/**
	 * Calculates the points that make up the border of an aura around the token of the given size and aura radius.
	 * @param {number} primaryAxisSize Size of the token in the primary direction, measured in cells.
	 * @param {number} secondaryAxisSize Size of the token in the secondary direction, measured in cells.
	 * @param {number} radius Radius, measured in cells.
	 * @param {boolean} isColumnar true for hex columns, false for hex rows.
	 * @param {boolean} isVariant2 false for ELLIPSE_1, true for ELLIPSE_2.
	 */
	function (primaryAxisSize, secondaryAxisSize, radius, isColumnar, isVariant2) {
		// Columnar ellipses require the primary axis size to be at least as big as `floor(secondaryAxisSize / 2) + 1`.
		// E.G. on a columnar grid, for a width of 5, the height must be 3 or higher. For a width of 6, height must be
		// at least 4 or higher. Same is true for rows, but in the opposite axis.
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
		], isVariant2, !isColumnar, radius, radius * UNIT_SIDE_LENGTH * 1.5);
	}
);

const getTrapezoidHexTokenSpaces = cacheReturn(
	/**
	 * Calculates the cube coordinates of all spaces occupied by an trapezoid token with the given width/height.
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

		const secondaryAxisOffset = isVariant2 ? UNIT_SIDE_LENGTH + (secondaryAxisSize - 1) * UNIT_SIDE_LENGTH * 1.5 : UNIT_SIDE_LENGTH;

		/** @type {{ x: number; y: number; }[]} */
		const spaces = [];

		// Trazpezoids are simple. Start with a line in the primary direction that is the full primary size.
		// Then, for each cell in the secondary direction, reduce the primary by one.
		// If we are doing variant1 we offset in the secondary by one direction, for variant2 we go the other direction.
		for (let i = 0; i < secondaryAxisSize; i++) {
			const primaryAxisOffset = (i + 1) / 2;
			const secondaryPosition = i * (isVariant2 ? -1 : 1) * UNIT_SIDE_LENGTH * 1.5 + secondaryAxisOffset;

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

const getTrapezoidHexAuraBorder = cacheReturn(
	/**
	 * Calculates the points that make up the border of an aura around the token of the given size and aura radius.
	 * @param {number} primaryAxisSize Size of the token in the primary direction, measured in cells.
	 * @param {number} secondaryAxisSize Size of the token in the secondary direction, measured in cells.
	 * @param {number} radius Radius, measured in cells.
	 * @param {boolean} isColumnar true for hex columns, false for hex rows.
	 * @param {boolean} isVariant2 false for TRAPEZOID_1, true for TRAPEZOID_2.
	 */
	function (primaryAxisSize, secondaryAxisSize, radius, isColumnar, isVariant2) {
		// Columnar trapezoids require the primary axis size to be equal to or larger than the secondary size.
		if (primaryAxisSize < secondaryAxisSize) {
			return [];
		}

		return generateHexBorder([
			primaryAxisSize + radius + 1,
			radius + 1,
			secondaryAxisSize + radius,
			primaryAxisSize - secondaryAxisSize + radius + 1,
			secondaryAxisSize + radius,
			radius + 1
		], isVariant2, !isColumnar, radius, radius * UNIT_SIDE_LENGTH * 1.5);
	}
);

const getRectangleHexTokenSpaces = cacheReturn(
	/**
	 * Calculates the cube coordinates of all spaces occupied by an trapezoid token with the given width/height.
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
					i * UNIT_SIDE_LENGTH * 1.5 + UNIT_SIDE_LENGTH));
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

const getRectangleHexAuraBorder = cacheReturn(
	/**
	 * Calculates the points that make up the border of an aura around the token of the given size and aura radius.
	 * @param {number} primaryAxisSize Size of the token in the primary direction, measured in cells.
	 * @param {number} secondaryAxisSize Size of the token in the secondary direction, measured in cells.
	 * @param {number} radius Radius, measured in cells.
	 * @param {boolean} isColumnar true for hex columns, false for hex rows.
	 * @param {boolean} isVariant2 false for RECTANGLE_1, true for RECTANGLE_2.
	 */
	window.test = function (primaryAxisSize, secondaryAxisSize, radius, isColumnar, isVariant2) {
		// If the size in the primary direction is 1, the size in the secondary direction must be no more than one.
		// For primary size >= 2, any size secondary is acceptable.
		if (primaryAxisSize === 1 && secondaryAxisSize > 1) {
			return [];
		}

		let x = 0;
		let y = 0;

		let minX = Infinity;
		let minY = Infinity;

		const primaryAxisOffset = radius;
		const secondaryAxisOffset = radius * UNIT_SIDE_LENGTH * 1.5;
		const [xOffset, yOffset] = isColumnar
			? [secondaryAxisOffset, primaryAxisOffset]
			: [primaryAxisOffset, secondaryAxisOffset];

		const firstIsSmall = secondaryAxisSize > 1 && isVariant2;
		const lastIsSmall = secondaryAxisSize > 1 && (secondaryAxisSize % 2) === +isVariant2;

		const points = [
			...generateSide(primaryAxisSize + radius - +firstIsSmall, 270),
			...generateSide(radius + 1, 330),
			...generateFlatSide(secondaryAxisSize - 1, 0, firstIsSmall),
			...generateSide(radius + 1, 30),
			...generateSide(primaryAxisSize + radius - +lastIsSmall, 90),
			...generateSide(radius + +lastIsSmall, 150),
			...generateFlatSide(secondaryAxisSize - +lastIsSmall, 180, true),
			...generateSide(radius + 1, 210),
		];

		return points.map(({ x, y }) => ({ x: x - minX - xOffset, y: y - minY - yOffset }));

		/**
		 * @param {number} sideLength Number of cells to draw.
		 * @param {number} angle Angle of the overall line. Individual lines will be +- 30 degrees from this line. 0 = LTR.
		 */
		function *generateSide(sideLength, angle) {
			angle = angle / 180 * Math.PI; // convert to radians
			const dx1 = Math.cos(angle + RADIANS_30) * UNIT_SIDE_LENGTH;
			const dy1 = Math.sin(angle + RADIANS_30) * UNIT_SIDE_LENGTH;
			const dx2 = Math.cos(angle - RADIANS_30) * UNIT_SIDE_LENGTH;
			const dy2 = Math.sin(angle - RADIANS_30) * UNIT_SIDE_LENGTH;

			yield coordinate(x += dx1, y += dy1);
			for (let i = 0; i < sideLength - 1; i++) {
				yield coordinate(x += dx2, y += dy2);
				yield coordinate(x += dx1, y += dy1);
			}
		}

		/**
		 * @param {number} sideLength Number of cells to draw.
		 * @param {number} angle Angle of the overall line. Individual lines will be +- 30 degrees from this line. 0 = LTR.
		 * @param {boolean} startSmall Whether to start on the smaller part
		 */
		function *generateFlatSide(sideLength, angle, startSmall) {
			angle = angle / 180 * Math.PI; // convert to radians
			const dx0 = Math.cos(angle) * UNIT_SIDE_LENGTH;
			const dy0 = Math.sin(angle) * UNIT_SIDE_LENGTH;
			const dx1 = Math.cos(angle + RADIANS_60 * (startSmall ? -1 : 1)) * UNIT_SIDE_LENGTH;
			const dy1 = Math.sin(angle + RADIANS_60 * (startSmall ? -1 : 1)) * UNIT_SIDE_LENGTH;
			const dx2 = Math.cos(angle + RADIANS_60 * (startSmall ? 1 : -1)) * UNIT_SIDE_LENGTH;
			const dy2 = Math.sin(angle + RADIANS_60 * (startSmall ? 1 : -1)) * UNIT_SIDE_LENGTH;

			for (let i = 0; i < sideLength; i++) {
				yield coordinate(x += (i % 2 === 0 ? dx1 : dx2), y += (i % 2 === 0 ? dy1 : dy2));
				yield coordinate(x += dx0, y += dy0);
			}
		}

		/**
		 * Returns a transformed coordinate and updates minX/maxX/minY/maxY bounds.
		 * @param {number} x
		 * @param {number} y
		 */
		function coordinate(x, y) {
			if (!isColumnar) ([x, y] = [y, x]);

			minX = Math.min(minX, x);
			minY = Math.min(minY, y);
			return { x, y };
		}
	}
);

const generateHexBorder = cacheReturn(
	/**
	 * Generates the vertices for a hex border on a columnar grid with the given side lengths.
	 * The shape will be aligned so that the top-left is at (0,0). i.e. no point will have a negative x or y.
	 * @param {number[]} sideLengths Length of each side, starting from the left and going counter-clockwise.
	 * @param {boolean} mirror If true, mirrors the coordinates in the X axis (happens BEFORE rotating).
	 * @param {boolean} rotate If true, swaps X and Y coordinates (happens AFTER mirroring).
	 * @param {number} [primaryAxisOffset] The offset (in grid cells) in the Y direction (or X if rotated).
	 * @param {number} [secondaryAxisOffset] The offset (in grid cells) in the X direction (or Y if rotated).
	 */
	function (sideLengths, mirror, rotate, primaryAxisOffset = 0, secondaryAxisOffset = 0) {
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

		const [xOffset, yOffset] = rotate ? [primaryAxisOffset, secondaryAxisOffset] : [secondaryAxisOffset, primaryAxisOffset];

		return points.map(({ x, y }) => ({ x: x - minX - xOffset, y: y - minY - yOffset }));

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
	const primaryAxisSize = isColumnar ? height : width;
	const secondaryAxisSize = isColumnar ? width : height;

	switch (shape) {
		case CONST.TOKEN_HEXAGONAL_SHAPES.ELLIPSE_1:
		case CONST.TOKEN_HEXAGONAL_SHAPES.ELLIPSE_2:
			return getEllipseHexAuraBorder(primaryAxisSize, secondaryAxisSize, radius, isColumnar, shape === CONST.TOKEN_HEXAGONAL_SHAPES.ELLIPSE_2)
				.map(({ x, y }) => ({ x: x * gridSize, y: y * gridSize }));

		case CONST.TOKEN_HEXAGONAL_SHAPES.TRAPEZOID_1:
		case CONST.TOKEN_HEXAGONAL_SHAPES.TRAPEZOID_2:
			return getTrapezoidHexAuraBorder(primaryAxisSize, secondaryAxisSize, radius, isColumnar, shape === CONST.TOKEN_HEXAGONAL_SHAPES.TRAPEZOID_2)
				.map(({ x, y }) => ({ x: x * gridSize, y: y * gridSize }));

		case CONST.TOKEN_HEXAGONAL_SHAPES.RECTANGLE_1:
		case CONST.TOKEN_HEXAGONAL_SHAPES.RECTANGLE_2:
			return getRectangleHexAuraBorder(primaryAxisSize, secondaryAxisSize, radius, isColumnar, shape === CONST.TOKEN_HEXAGONAL_SHAPES.RECTANGLE_2)
				.map(({ x, y }) => ({ x: x * gridSize, y: y * gridSize }));

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
	const primaryAxisSize = isColumnar ? height : width;
	const secondaryAxisSize = isColumnar ? width : height;

	switch (shape) {
		case CONST.TOKEN_HEXAGONAL_SHAPES.ELLIPSE_1:
		case CONST.TOKEN_HEXAGONAL_SHAPES.ELLIPSE_2:
			return getEllipseHexTokenSpaces(primaryAxisSize, secondaryAxisSize, isColumnar, shape === CONST.TOKEN_HEXAGONAL_SHAPES.ELLIPSE_2)
				.map(p => ({ x: x + p.x * gridSize, y: y + p.y * gridSize }));

		case CONST.TOKEN_HEXAGONAL_SHAPES.TRAPEZOID_1:
		case CONST.TOKEN_HEXAGONAL_SHAPES.TRAPEZOID_2:
			return getTrapezoidHexTokenSpaces(primaryAxisSize, secondaryAxisSize, isColumnar, shape === CONST.TOKEN_HEXAGONAL_SHAPES.TRAPEZOID_2)
				.map(p => ({ x: x + p.x * gridSize, y: y + p.y * gridSize }));

		case CONST.TOKEN_HEXAGONAL_SHAPES.RECTANGLE_1:
		case CONST.TOKEN_HEXAGONAL_SHAPES.RECTANGLE_2:
			return getRectangleHexTokenSpaces(primaryAxisSize, secondaryAxisSize, isColumnar, shape === CONST.TOKEN_HEXAGONAL_SHAPES.RECTANGLE_2)
				.map(p => ({ x: x + p.x * gridSize, y: y + p.y * gridSize }));

		default:
			throw new Error("Unknown hex grid type.");
	}
}
