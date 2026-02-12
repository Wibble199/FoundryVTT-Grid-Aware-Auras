/** @import { AuraGeometry, AuraGeometryIsInsideOptions } from "./index.mjs" */

import { cacheReturn } from "../../../utils/misc-utils.mjs";

/** The side length of a hexagon with a grid size of 1 (apothem of 0.5). */
const UNIT_SIDE_LENGTH = 1 / Math.sqrt(3);

/** 30 degrees expressed as radians. */
const RADIANS_30 = 30 * Math.PI / 180;

/** 60 degrees expressed as radians. */
const RADIANS_60 = 60 * Math.PI / 180;

/** @type {Record<string, number>} */
const { ELLIPSE_1, ELLIPSE_2, TRAPEZOID_1, TRAPEZOID_2, RECTANGLE_1, RECTANGLE_2 } = CONST.TOKEN_HEXAGONAL_SHAPES;

/**
 * Geometry for hexagonal grids.
 * @implements {AuraGeometry}
 */
export class HexagonalAuraGeometry {

	#points;

	#collidableEdges;

	#boundingBox;

	#isColumnar;

	#gridSize;

	/**
	 * @param {number} width Width of the token in grid cells.
	 * @param {number} height Height of the token in grid cells.
	 * @param {number} radius The radius of the aura in grid cells.
	 * @param {number} shape The hexagonal shape of the token (CONST.TOKEN_HEXAGONAL_SHAPES).
	 * @param {boolean} isColumnar Is the grid a columnar hexagonal grid?
	 * @param {number} gridSize The size of the grid in pixels.
	 */
	constructor(width, height, radius, shape, isColumnar, gridSize) {
		radius = Math.round(radius);
		this.#points = HexagonalAuraGeometry.#getPoints(width, height, radius, shape, isColumnar)
			.map(({ x, y }) => ({ x: x * gridSize, y: y * gridSize }));
		({ collidableEdges: this.#collidableEdges, boundingBox: this.#boundingBox } = HexagonalAuraGeometry.#getCollisionTestData(this.#points));
		this.#isColumnar = isColumnar;
		this.#gridSize = gridSize;
	}

	/**
	 * @param {Token} token
	 * @param {AuraGeometryIsInsideOptions} options
	 */
	isInside(token, { auraOffset = { x: 0, y: 0 }, tokenAltPosition, mode = "partial" } = {}) {
		const { width, height, hexagonalShape } = token.document;
		const { x, y } = tokenAltPosition ?? token;
		const points = getSpacesUnderHexToken(x, y, width, height, hexagonalShape, this.#isColumnar, this.#gridSize);
		return points[mode === "total" ? "every" : "some"](p => this._isPointInside(p.x - auraOffset.x, p.y - auraOffset.y));
	}

	/**
	 * @param {number} x
	 * @param {number} y
	 */
	_isPointInside(x, y) {
		// If the x or y is out of bounds, then it is definitely not inside so we can skip looking for edges
		if (y < this.#boundingBox.top || y > this.#boundingBox.bottom || x < this.#boundingBox.left || x > this.#boundingBox.right)
			return false;

		let collisionCount = 0;

		for (const { p1, p2, slope } of this.#collidableEdges) {
			// Since the edges are sorted, once we find one that has a top (p1) Y higher than the test y point, we can
			// stop searching since the points are Y-sorted
			if (y <= p1.y)
				break;

			// If the bottom point of the line is lower than Y, then it can't collide.
			if (y > p2.y)
				continue;

			// If the test point lies within the y range of this edge, work out what the x point of the line is at the
			// exact y test point. If this is less than the test x point then collision occured.
			const edgeX = ((y - p1.y) / slope) + p1.x;

			if (edgeX < x)
				collisionCount++;
		}

		return collisionCount % 2 === 1;
	}

	/** @returns {Generator<import("../../../utils/pixi-utils.mjs").PathCommand, void, never>} */
	*getPath() {
		if (!this.#points.length) return;
		for (let i = 0; i < this.#points.length; i++)
			yield { type: i === 0 ? "m" : "l", x: this.#points[i].x, y: this.#points[i].y };
		yield { type: "l", x: this.#points[0].x, y: this.#points[0].y };
	}

	/**
	 * Gets the vertices that make up the hexagonal border for this aura, assuming a grid size of 1.
	 */
	static #getPoints(width, height, radius, shape, isColumnar) {
		// If the token is less than 1 on both dimesions, but has equal sides it can be treated as 1 x 1.
		// If the token is less then 1 on a side, but isn't equal, Foundry shows it as a square and we can't generate a
		// hex border for it
		if (width < 1 && width === height)
			width = height = 1;
		else if (width < 1 || height < 1)
			return [];

		const primaryAxisSize = isColumnar ? height : width;
		const secondaryAxisSize = isColumnar ? width : height;

		switch (shape) {
			case ELLIPSE_1:
			case ELLIPSE_2:
				return getEllipseHexAuraBorder(
					primaryAxisSize,
					secondaryAxisSize,
					radius,
					isColumnar,
					shape === ELLIPSE_2
				);

			case TRAPEZOID_1:
			case TRAPEZOID_2:
				return getTrapezoidHexAuraBorder(
					primaryAxisSize,
					secondaryAxisSize,
					radius,
					isColumnar,
					shape === TRAPEZOID_2
				);

			case RECTANGLE_1:
			case RECTANGLE_2:
				return getRectangleHexAuraBorder(
					primaryAxisSize,
					secondaryAxisSize,
					radius,
					isColumnar,
					shape === RECTANGLE_2
				);

			default:
				throw new Error("Unknown hex grid type.");
		}
	}

	/**
	 * Takes an array of vertices and converts them to edges, sorting them by Y for more efficient hit testing.
	 * May swap points of an edge so that `p1` is always the top-left most, and `p2` is always the bottom-right most.
	 * @param {{ x: number; y: number; }[]} points
	 */
	static #getCollisionTestData(points) {
		/** @type {{ p1: { x: number; y: number; }; p2: { x: number; y: number }; slope: number; }[]} */
		const edges = [];

		const bb = {
			top: Infinity,
			right: -Infinity,
			bottom: -Infinity,
			left: Infinity
		};

		for (let i = 0; i < points.length; i++) {
			let p1 = points[i];
			let p2 = points[(i + 1) % points.length];

			// p1 should be top-left most, p2 should be bottom-right most; so may need to swap p1 and p2 around
			if (p2.y < p1.y || (p2.y === p1.y && p2.x < p1.x))
				[p1, p2] = [p2, p1];

			// Since the collision testing is done by drawing a horizontal line, we exclude any horizontal edges from
			// the array of collidable edges.
			if (p1.y !== p2.y) {
				const slope = p1.x === p2.x
					? Infinity
					: (p2.y - p1.y) / (p2.x - p1.x);

				edges.push({ p1, p2, slope });
			}

			bb.top = Math.min(bb.top, p1.y, p2.y);
			bb.right = Math.max(bb.right, p1.x, p2.x);
			bb.bottom = Math.max(bb.bottom, p1.y, p2.y);
			bb.left = Math.min(bb.left, p1.x, p2.x);
		}

		edges.sort((a, b) => a.p1.y === b.p1.y
			? a.p1.x - b.p1.x
			: a.p1.y - b.p1.y);

		return { collidableEdges: edges, boundingBox: bb };
	}
}

// #region Border functions
const getEllipseHexAuraBorder = cacheReturn(
	/**
	 * Calculates the points that make up the border of an aura around the token of the given size and aura radius.
	 * @param {number} primaryAxisSize Size of the token in the primary direction, measured in cells.
	 * @param {number} secondaryAxisSize Size of the token in the secondary direction, measured in cells.
	 * @param {number} radius Radius, measured in cells.
	 * @param {boolean} isColumnar true for hex columns, false for hex rows.
	 * @param {boolean} isVariant2 false for ELLIPSE_1, true for ELLIPSE_2.
	 */
	function(primaryAxisSize, secondaryAxisSize, radius, isColumnar, isVariant2) {
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

const getTrapezoidHexAuraBorder = cacheReturn(
	/**
	 * Calculates the points that make up the border of an aura around the token of the given size and aura radius.
	 * @param {number} primaryAxisSize Size of the token in the primary direction, measured in cells.
	 * @param {number} secondaryAxisSize Size of the token in the secondary direction, measured in cells.
	 * @param {number} radius Radius, measured in cells.
	 * @param {boolean} isColumnar true for hex columns, false for hex rows.
	 * @param {boolean} isVariant2 false for TRAPEZOID_1, true for TRAPEZOID_2.
	 */
	function(primaryAxisSize, secondaryAxisSize, radius, isColumnar, isVariant2) {
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
			radius
		], isVariant2, !isColumnar, radius, radius * UNIT_SIDE_LENGTH * 1.5);
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
	function(sideLengths, mirror, rotate, primaryAxisOffset = 0, secondaryAxisOffset = 0) {
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
			...generateSide(sideLengths[5], 210)
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
			if (rotate) [x, y] = [y, x];

			minX = Math.min(minX, x);
			minY = Math.min(minY, y);
			return { x, y };
		}
	},
	k => [k[0].join("|"), ...k.slice(1)].join("|")
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
	function(primaryAxisSize, secondaryAxisSize, radius, isColumnar, isVariant2) {
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
		const lastIsSmall = radius === 0 || (secondaryAxisSize > 1 && (secondaryAxisSize % 2) === +isVariant2);

		const points = [
			...generateSide(primaryAxisSize + radius - +firstIsSmall, 270),
			...generateSide(radius + 1, 330),
			...generateFlatSide(secondaryAxisSize - 1, 0, firstIsSmall),
			...generateSide(radius + 1, 30),
			...generateSide(primaryAxisSize + radius - +lastIsSmall, 90),
			...generateSide(radius + +lastIsSmall, 150),
			...generateFlatSide(secondaryAxisSize - +lastIsSmall, 180, true),
			...generateSide(radius + 1, 210)
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
			const dx1 = Math.cos(angle + (RADIANS_60 * (startSmall ? -1 : 1))) * UNIT_SIDE_LENGTH;
			const dy1 = Math.sin(angle + (RADIANS_60 * (startSmall ? -1 : 1))) * UNIT_SIDE_LENGTH;
			const dx2 = Math.cos(angle + (RADIANS_60 * (startSmall ? 1 : -1))) * UNIT_SIDE_LENGTH;
			const dy2 = Math.sin(angle + (RADIANS_60 * (startSmall ? 1 : -1))) * UNIT_SIDE_LENGTH;

			for (let i = 0; i < sideLength; i++) {
				yield coordinate(x += i % 2 === 0 ? dx1 : dx2, y += i % 2 === 0 ? dy1 : dy2);
				yield coordinate(x += dx0, y += dy0);
			}
		}

		/**
		 * Returns a transformed coordinate and updates minX/maxX/minY/maxY bounds.
		 * @param {number} x
		 * @param {number} y
		 */
		function coordinate(x, y) {
			if (!isColumnar) [x, y] = [y, x];

			minX = Math.min(minX, x);
			minY = Math.min(minY, y);
			return { x, y };
		}
	}
);
// #endregion

// #region Spaces-under-token functions
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
 * Gets the canvas coordinates of the centre of the spaces that token occupies.
 * @param {number} x Token's X position coordinate
 * @param {number} y Token's Y position coordinate
 * @param {number} width Token's width (in grid cells)
 * @param {number} height Token's height (in grid cells)
 * @param {number} shape Hexagon shape used by the token.
 * @param {boolean} isColumnar Is the grid column?
 * @param {number} gridSize Size of the grid.
 */
function getSpacesUnderHexToken(x, y, width, height, shape, isColumnar, gridSize) {
	// Non-integer token sizes are not supported - use center of token in this case
	if (width % 1 !== 0 || height % 1 !== 0 || width < 1 || height < 1)
		return [{ x: x + (width / 2 * gridSize), y: y + (height / 2 * gridSize) }];

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
// #endregion
