/** @import { Aura } from ("../utils/aura.mjs"); */
import { AURA_VISIBILITY_MODES, ENABLE_EFFECT_AUTOMATION_SETTING, ENABLE_MACRO_AUTOMATION_SETTING, LINE_TYPES, MODULE_NAME, THT_RULER_ON_DRAG_MODES, TOKEN_TARGETS } from "../consts.mjs";
import { auraVisibilityModeMatrices, getAura } from "../utils/aura.mjs";
import { isTerrainHeightToolsActive, partialEqual } from "../utils/misc-utils.mjs";

export class AuraConfigApplication extends FormApplication {

	/** @type {((aura: Aura) => void) | undefined} */
	onChange;

	/** @type {(() => void) | undefined} */
	onClose;

	constructor(aura, options = {}) {
		super(aura, options);
	}

	/** @override */
	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			title: "Aura Configuration",
			classes: ["sheet", "grid-aware-auras-aura-config"],
			template: `modules/${MODULE_NAME}/templates/aura-config.hbs`,
			width: 420,
			height: "auto",
			tabs: [
				{ navSelector: ".tabs[data-group='main']", contentSelector: "form" },
				{ navSelector: ".tabs[data-group='automation']", contentSelector: ".tab[data-tab='automation']" }
			],
			dragDrop: [
				{ dragSelector: null, dropSelector: ".tab[data-tab='macro']" }
			],
			submitOnChange: true,
			closeOnSubmit: false,
			submitOnClose: false
		});
	}

	/** @override */
	get id() {
		return `gaa-aura-config-${this.object.id}`;
	}

	/** @override */
	async getData(options = {}) {
		const data = await super.getData(options);

		// Apply default values for fields if they are unset
		data.object = getAura(this.object);

		data.lineTypes = Object.fromEntries(Object.entries(LINE_TYPES)
			.map(([name, value]) => [value, `GRIDAWAREAURAS.LineType${name.titleCase()}`]));

		data.fillTypes = Object.fromEntries(Object.entries(CONST.DRAWING_FILL_TYPES)
			.map(([name, value]) => [value, `DRAWING.FillType${name.titleCase()}`]));

		data.visibilityModes = AURA_VISIBILITY_MODES;
		data.visibilityMode = this.#getVisibilityMode(data.object.ownerVisibility, data.object.nonOwnerVisibility);

		data.effectsEnabled = game.settings.get(MODULE_NAME, ENABLE_EFFECT_AUTOMATION_SETTING);
		data.statusEffects = CONFIG.statusEffects.map(({ id, name }) => ({ id, name })); // fix compat warning on .label

		data.macrosEnabled = game.settings.get(MODULE_NAME, ENABLE_MACRO_AUTOMATION_SETTING);

		data.isTerrainHeightToolsActive = isTerrainHeightToolsActive();
		data.terrainHeightToolsRulerOnDragMode = THT_RULER_ON_DRAG_MODES;

		data.tokenTargets = TOKEN_TARGETS;

		return data;
	}

	/** @override */
	activateListeners(html) {
		super.activateListeners(html);
		html.find("[data-action='close']").on("click", () => this.close());

		// Prevent negative or decimals from being entered into the radius.
		html.find("[name='radius']").on("input", e => {
			const newValue = parseInt(e.target.value);
			e.target.value = isNaN(newValue) ? 0 : Math.max(newValue, 0);
		});

		// Disable/enable visibility custom fieldset depending on selected visibility mode
		html.find("[name='visibilityMode']").on("change", e => {
			const newMode = e.target.value;
			const isCustom = newMode === "CUSTOM";

			html.find("[name='visibilityCustom']").toggleClass("disabled", !isCustom);

			if (!isCustom) {
				const preset = auraVisibilityModeMatrices[newMode];
				Object.entries(preset.owner).forEach(([key, value]) => html.find(`[name="ownerVisibility.${key}"]`).prop("checked", value));
				Object.entries(preset.nonOwner).forEach(([key, value]) => html.find(`[name="nonOwnerVisibility.${key}"]`).prop("checked", value));
			}
		});
	}

	_canDragDrop() {
		// Enable dropping of macros if the setting for macros is turned on.
		return game.settings.get(MODULE_NAME, ENABLE_MACRO_AUTOMATION_SETTING);
	}

	/** @param {DragEvent} event */
	async _onDrop(event) {
		// Handle dropping macros
		if (!game.settings.get(MODULE_NAME, ENABLE_MACRO_AUTOMATION_SETTING)) return;

		try {
			const dropDataText = event.dataTransfer.getData("text/plain");
			const dropData = JSON.parse(dropDataText);

			if (dropData.type !== "Macro" || !("uuid" in dropData)) return;
			const macro = await fromUuid(dropData.uuid);

			if (!(macro instanceof Macro)) return;
			this.element.find("[name='macro.macroId']").val(macro.id);
			this.element.find("form").get(0).requestSubmit();
		} catch {
		}
	}

	/** @override */
	async _renderOuter() {
		const html = await super._renderOuter();
		this.#createAuraIdButton(html);
		return html;
	}

	/** @override */
	async _updateObject(_event, formData) {
		const aura = foundry.utils.expandObject(formData);
		delete aura.visibilityMode;
		this.onChange?.(aura);
	}

	/** @override */
	async close(options) {
		if (options?.callOnClose !== false)
			this.onClose?.();
		await super.close(options);
	}

	/**
	 * @param {import("../utils/aura.mjs").VisibilityConfig} ownerVisibility
	 * @param {import("../utils/aura.mjs").VisibilityConfig} nonOwnerVisibility
	 * @returns {AURA_VISIBILITY_MODES}
	 */
	#getVisibilityMode(ownerVisibility, nonOwnerVisibility) {
		for (const [mode, modeConfig] of Object.entries(auraVisibilityModeMatrices)) {
			if (partialEqual(ownerVisibility, modeConfig.owner) && partialEqual(nonOwnerVisibility, modeConfig.nonOwner))
				return mode;
		}
		return "CUSTOM";
	}

	/**
	 * Creates a button to copy the aura's ID, just like there is on other document sheets.
	 * @param {JQuery} html
	 */
	#createAuraIdButton(html) {
		// Copied and tweaked from DocumentSheet._createDocumentIdLink
		const title = html.find(".window-title");
		const label = game.i18n.localize("GRIDAWAREAURAS.Aura");
		const idLink = document.createElement("a");
		idLink.classList.add("document-id-link");
		idLink.setAttribute("alt", "Copy document id");
		idLink.dataset.tooltip = `${label}: ${this.object.id}`;
		idLink.dataset.tooltipDirection = "UP";
		idLink.innerHTML = '<i class="fa-solid fa-passport"></i>';
		idLink.addEventListener("click", event => {
			event.preventDefault();
			game.clipboard.copyPlainText(this.object.id);
			ui.notifications.info(game.i18n.format("DOCUMENT.IdCopiedClipboard", { label, type: "id", id: this.object.id }));
		});
		title.append(idLink);
	}
}
