import { classMap, createRef, html, LitElement, render as litRender, ref } from "../lib/lit-all.min.js";
import { arrayEqual } from "../utils/misc-utils.mjs";

/** @typedef {{ path: (string | typeof Number)[]; }} DataPath */

export const elementName = "gaa-data-path-autocomplete";

/**
 * An input element that presents the user with an autocomplete dropdown when they type the "@" character.
 */
class DataPathAutoComplete extends LitElement {

	static properties = {
		_filteredDataPaths: { state: true },
		_isInputFocused: { state: true },
		_focusedDataPath: { state: true },
		dataPaths: { attribute: false },
		value: { type: String },
		disabled: { type: Boolean },
		name: { type: String } // Not used internally, but exposes the "name" attribute as a property (for forms)
	};

	static formAssociated = true;

	#internals;

	/** @type {{ value?: HTMLInputElement; }} */
	_inputRef = createRef();

	/** @type {HTMLDivElement | null} */
	#dropdownContainer = null;

	constructor() {
		super();
		this.#internals = this.attachInternals();

		/** @type {DataPath[]} */
		this._filteredDataPaths = [];

		this._isInputFocused = false;

		/** @type {DataPath | null} */
		this._focusedDataPath = null;

		/** @type {DataPath[]} */
		this.dataPaths = [];

		this.value = "";
		this.disabled = false;
	}

	get _isDropdownOpen() {
		return this._isInputFocused
			&& !this.disabled
			&& !!this.#getCurrentDataPathInInput()
			&& this._filteredDataPaths.length > 0;
	}

	render() {
		return html`
			<input
				${ref(this._inputRef)}
				type="text"
				.value=${this.value}
				@focus=${() => { this._isInputFocused = true; this.#recalculateDisplayedDataPaths(); }}
				@blur=${() => this._isInputFocused = false}
				@input=${e => this.#setValue(e.target.value, e)}
				@click=${() => this.#recalculateDisplayedDataPaths()}
				@keyup=${() => this.#recalculateDisplayedDataPaths()}
				@keydown=${e => this.#handleKeyPress(e)}
				?disabled=${this.disabled}
			>
		`;
	}

	#renderDropdown() {
		return html`
			<menu class="gaa-dropdown-menu">
				${this._filteredDataPaths.map(dp => html`
					<li
						class=${classMap({ active: dp === this._focusedDataPath })}
						@mousedown=${() => this.#selectDatapath(dp)}
						@pointerenter=${() => this.#focusDatapath(dp, false)}
					>
						${formatPathString(dp.path)}
					</li>
				`)}
			</menu>
		`;
	}

	/** @param {Map<string, any>} changedProperties */
	willUpdate(changedProperties) {
		// If value or datapaths have changed while the dropdown is open, then re-caclculate the displayed options
		if (this._isDropdownOpen && ["value", "dataPaths", "_isInputFocused"].some(p => changedProperties.has(p))) {
			this.#recalculateDisplayedDataPaths();

			// If the previously focused datapath is no longer in the list or there is no datapath focused, then reset
			// it to the first one.
			if (this._filteredDataPaths.length === 0) {
				this.#focusDatapath(null);
			} else if (!this._filteredDataPaths.includes(this._focusedDataPath)) {
				this.#focusDatapath(this._filteredDataPaths[0]);
			}
		}
	}

	/** @param {Map<string, any>} changedProperties  */
	update(changedProperties) {
		super.update(changedProperties);
		this.#updateDropdownDom();
	}

	updated() {
		this.#updateDropdownPosition();
	}

	disconnectedCallback() {
		super.disconnectedCallback();

		this.#dropdownContainer?.remove();
		this.#dropdownContainer = null;
	}

	#updateDropdownDom() {
		// Remove the dropdown if it is not needed
		if (!this._isDropdownOpen) {
			this.#dropdownContainer?.remove();
			this.#dropdownContainer = null;
			this._focusedDataPath = null;
			return;
		}

		// Create container if required
		if (!this.#dropdownContainer) {
			this.#dropdownContainer = document.createElement("div");
			this.#dropdownContainer.classList.add("gaa-data-path-autocomplete-dropdown");
			document.body.appendChild(this.#dropdownContainer);
		}

		litRender(this.#renderDropdown(), this.#dropdownContainer);
	}

	#updateDropdownPosition() {
		if (!this.#dropdownContainer) return;

		const { top, left, width, height } = this.getBoundingClientRect();
		const { width: dropdownWidth, height: dropdownHeight } = this.#dropdownContainer.getBoundingClientRect();

		Object.assign(this.#dropdownContainer.style, {
			top: top + height + dropdownHeight > window.innerHeight
				? `${top - dropdownHeight}px`
				: `${top + height}px`,
			left: left + dropdownWidth > window.innerWidth
				? `${left + width - dropdownWidth}px`
				: `${left}px`,
			minWidth: `${width}px`
		});
	}

	/** @param {KeyboardEvent} e */
	#handleKeyPress(e) {
		switch (e.key) {
			// If the up/down arrow keys are pressed, change the focused dropdown suggestion
			case "ArrowUp":
			case "ArrowDown": {
				const focusedIndex = this._filteredDataPaths.indexOf(this._focusedDataPath);
				if (e.key === "ArrowDown" && focusedIndex < this._filteredDataPaths.length - 1) {
					this.#focusDatapath(this._filteredDataPaths[focusedIndex + 1]);
				} else if (e.key === "ArrowUp" && focusedIndex > 0) {
					this.#focusDatapath(this._filteredDataPaths[focusedIndex - 1]);
				}

				e.preventDefault();
				e.stopImmediatePropagation();
				break;
			}

			// If the enter or tab keys are pressed, use the currently focused dropdown suggestion
			case "Enter":
			case "Tab": {
				if (this._focusedDataPath)
					this.#selectDatapath(this._focusedDataPath);

				e.preventDefault();
				e.stopImmediatePropagation();
				break;
			}

			// For anything else, just update the dropdown suggestions
			default: {
				this.#recalculateDisplayedDataPaths();
				break;
			}
		}
	}

	#recalculateDisplayedDataPaths() {
		// Get the current cursor position, and traverse left across valid path characters to see if we find an @ sign
		// If not, then the user is not currently typing a data path and so we should ignore it
		const datapathAtCursor = this.#getCurrentDataPathInInput();
		if (!datapathAtCursor) {
			this._filteredDataPaths = [];
			return;
		}

		const inputParts = datapathAtCursor.value.split(".")
			.filter(i => i !== "")
			.map(i => Number.isNaN(+i) ? i.toLowerCase() : Number);

		if (!inputParts.length) {
			this._filteredDataPaths = this.dataPaths;
			return;
		}

		/** @type {{ dataPath: DataPath; distances: number[]; textIndices: number[]; }[]} */
		const candidates = [];

		for (const dataPath of this.dataPaths) {
			// Try and find a match for each part in the input.
			// Use the last term's index as a starting point for the next one. This prevents the logic from matching
			// "system.weapon.example" for the user putting in "weapon.weapon.weapon".
			// `distances` is the distance from one match part from the last. `textIndices` is how far into the part the
			// matched text was.
			// E.G. if user searched "lor.ip" then a data path with the path:
			// "system.lorem.ipsum" would be { distances: [1, 0], textIndices: [0, 0] }
			// "system.lorem.dolor.ipsum" would be { distances: [1, 1], textIndices: [0, 0] }
			// "system.lorem.doloripsum" would be { distances: [1, 0], textIndices: [0, 5] }
			/** @type {{ distances: number[]; textIndices: number[]; }} */
			const { distances, textIndices } = inputParts.reduce(
				({ distances, textIndices, startIndex }, inputPart) => {
					let partIndex = -1;
					let textIndex = -1;
					let i = startIndex;
					for (; i < dataPath.path.length; i++) {
						if (dataPath.path[i] === Number && inputPart === Number) {
							partIndex = i;
							break;
						} else if (dataPath.path[i] !== Number && inputPart !== Number) {
							textIndex = dataPath.path[i].toLowerCase().indexOf(inputPart);
							if (textIndex > -1) {
								partIndex = i;
								break;
							}
						}
					}

					return {
						distances: [...distances, partIndex === -1 ? -1 : partIndex - startIndex],
						textIndices: [...textIndices, textIndex],
						startIndex: i + 1
					};
				},
				{ distances: [], textIndices: [], startIndex: 0 }
			);

			// If any parts scored -1 (i.e. failed to find that part), then ignore this data path.
			if (!distances.includes(-1))
				candidates.push({ dataPath, distances, textIndices });
		}

		// The overall sort is determined by: lowest text index[0], then lowest distance[0], lowest index[1], lowest distance[1] etc.
		const sortedCandidates = candidates
			.sort((a, b) => {
				for (let i = 0; i < inputParts.length; i++) {
					if (a.textIndices[i] !== b.textIndices[i])
						return a.textIndices[i] - b.textIndices[i];
					if (a.distances[i] !== b.distances[i])
						return a.distances[i] - b.distances[i];
				}
				return 0;
			})
			.map(({ dataPath }) => dataPath);

		// If there's only one match and it is exactly the same as the current text, don't show the suggestions.
		this._filteredDataPaths = sortedCandidates.length === 1
			&& formatPathString(sortedCandidates[0].path) === datapathAtCursor.value
			? []
			: sortedCandidates;
	}

	/**
	 * Returns the placeholder and start/end positions of the current datapath that the user has selected in the input.
	 * Returns `null` if the input is not focused, or the selection/cursor position is not within a data placeholder.
	 * @returns {{ start: number; end: number; value: string; } | null}
	 */
	#getCurrentDataPathInInput() {
		if (!this._isInputFocused || !this._inputRef.value) return null;

		const { selectionStart, selectionEnd, value } = this._inputRef.value;
		if (typeof selectionStart !== "number") return null;

		// From the selection start, work left over valid datapath characters until we find an "@"
		// If we do not find an "@" before reaching the start of the string or an invalid char, we're not in a datapath
		let datapathStart = selectionStart - 1;
		while (true) {
			if (datapathStart < 0)
				return null;
			if (value[datapathStart] === "@")
				break;
			if (!isValidDatapathCharacter(value[datapathStart]))
				return null;
			datapathStart--;
		}

		datapathStart++; // Don't include the "@" in the datapath

		// Now that we know the start index of the datapath, find the end of it using a similar approach
		let datapathEnd = selectionStart;
		for (; datapathEnd < value.length; datapathEnd++) {
			if (!isValidDatapathCharacter(value[datapathEnd]))
				break;
		}

		// If the selectionEnd is not past the end of the datapath, then the user has highlighted text that partially
		// spans a datapath and partly some non-datapath string, so return null in this case.
		if (selectionEnd > datapathEnd) return null;

		return { start: datapathStart, end: datapathEnd, value: value.slice(datapathStart, datapathEnd) };
	}

	/** @param {DataPath} datapath */
	#selectDatapath(datapath) {
		const datapathAtCursor = this.#getCurrentDataPathInInput();
		if (!datapathAtCursor) return;

		const formattedPath = formatPathString(datapath.path);
		this.#setValue(
			this.value.slice(0, datapathAtCursor.start) +
			formattedPath +
			this.value.slice(datapathAtCursor.end, this.value.length)
		);

		const cursorPos = datapathAtCursor.start + formattedPath.length;
		setTimeout(() => {
			this._inputRef.value?.focus();
			this._inputRef.value?.setSelectionRange(cursorPos, cursorPos);
		}, 0);
	}

	/**
	 * @param {DataPath | null} dataPath
	 * @param {boolean} scrollToElement
	 */
	#focusDatapath(dataPath, scrollToElement = true) {
		this._focusedDataPath = dataPath;

		// If scrollToElement is true, then we will scroll the element into view after the redraw
		const container = this.#dropdownContainer;
		if (scrollToElement && container) {
			this.updateComplete.then(() => container.querySelector("li.active").scrollIntoView({ block: "nearest" }));
		}
	}

	/**
	 * @param {string} value
	 * @param {Event | undefined} e
	 */
	#setValue(value, e) {
		this.value = value;
		this.#internals.setFormValue(value);

		e?.preventDefault();
		e?.stopImmediatePropagation();
		this.dispatchEvent(new Event("input", { bubbles: true, cancelable: false, composed: true }));
	}

	createRenderRoot() {
		return this;
	}
}

/**
 * For the given object, returns a list of datapaths for properties defined on that object.
 * @param {any} obj
 * @param {Object} [options]
 * @param {string} [options.prefix]
 * @returns {DataPath[]}
 */
export function collectDataPathsFromObject(obj, { prefix = "" } = {}) {
	const prefixParts = prefix.split(".").filter(Boolean);

	// Track visited objects so that we don't end up in a loop
	const visitedObjects = new Set();

	const paths = getPathsRecursive([...prefixParts], obj).map(path => ({ path }));
	paths.sort((a, b) => formatPathString(a.path).localeCompare(formatPathString(b.path), undefined, { sensitivity: "base" }));
	return paths;

	/**
	 * @param {(string | typeof Number)[][]} currentPath
	 * @param {any} obj
	 * @param {number} depth
	 * @returns {(string | typeof Number)[][]}
	 */
	function getPathsRecursive(currentPath, obj, depth) {
		// Prevent going too deep (e.g. if we end up in an infinite loop that wasn't picked up by the Set)
		if (depth > 16) return [];

		switch (true) {
			// Filter to only include numbers - we don't know the type of null/undefined so assume they are valid
			case obj === null || obj === undefined || typeof obj === "number":
				return [[...currentPath]];

			case Array.isArray(obj):
				return obj.length > 0
					? getPathsRecursive([...currentPath, Number], obj[0])
					: [];

			case typeof obj === "object":
				if (visitedObjects.has(obj)) return [];
				visitedObjects.add(obj);
				return Object.entries(obj)
					.filter(([key]) => key[0] !== "_") // Properties starting with "_" typically means private, ignore
					.flatMap(([key, value]) => getPathsRecursive([...currentPath, key], value));

			default:
				return [];
		}
	}
}

/**
 * For the given data models (e.g. CONFIG.Actor.dataModels), returns a list of datapaths for properties defined in the
 * model's schema.
 * @param {Record<string, any>} dataModels
 * @param {Object} [options]
 * @param {string} [options.prefix]
 * @returns {DataPath[]}
 */
export function collectDataPathsFromDatamodels(dataModels, { prefix = "" } = {}) {
	const { ArrayField, NumberField, SchemaField } = foundry.data.fields;
	const prefixParts = prefix.split(".").filter(Boolean);

	/** @type {DataPath[]} */
	const paths = [];

	for (const documentDataModel of Object.values(dataModels)) {
		const { schema } = documentDataModel;

		for (const path of getPathsRecursive([...prefixParts, schema.name], schema)) {
			const knownPath = paths.find(p => arrayEqual(p.path, path));
			if (!knownPath) {
				paths.push({ path });
			}
		}
	}

	paths.sort((a, b) => formatPathString(a.path).localeCompare(formatPathString(b.path), undefined, { sensitivity: "base" }));
	return paths;

	/**
	 * @param {(string | typeof Number)[][]} currentPath
	 * @param {any} field
	 * @returns {(string | typeof Number)[][]}
	 */
	function getPathsRecursive(currentPath, field) {
		switch (true) {
			case field instanceof ArrayField:
				return getPathsRecursive([...currentPath, Number], field.element);

			case field instanceof SchemaField:
				return Object.values(field.fields)
					.flatMap(f => getPathsRecursive([...currentPath, f.name], f));

			case field instanceof NumberField:
				return [[...currentPath]];

			default:
				return [];
		}
	}
}

/** @param {DataPath["path"]} path */
function formatPathString(path) {
	return path.map(p => p === Number ? "0" : p).join(".");
}

/**
 * Tests whether the character is a valid part of a datapath.
 * @param {string} c The character to test.
 */
function isValidDatapathCharacter(c) {
	const charCode = c.charCodeAt(0);
	return (charCode >= "a".charCodeAt(0) && charCode <= "z".charCodeAt(0))
		|| (charCode >= "A".charCodeAt(0) && charCode <= "Z".charCodeAt(0))
		|| (charCode >= "0".charCodeAt(0) && charCode <= "9".charCodeAt(0))
		|| [".", "-", "_"].includes(c);
}

customElements.define(elementName, DataPathAutoComplete);
