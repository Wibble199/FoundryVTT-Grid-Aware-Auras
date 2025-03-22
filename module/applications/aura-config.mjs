/** @import { AuraConfig } from ("../data/aura.mjs"); */
import "../components/tabs.mjs";
import { AURA_VISIBILITY_MODES, ENABLE_EFFECT_AUTOMATION_SETTING, ENABLE_MACRO_AUTOMATION_SETTING, LINE_TYPES, MODULE_NAME, THT_RULER_ON_DRAG_MODES } from "../consts.mjs";
import { listAuraTargetFilters } from "../data/aura-target-filters.mjs";
import { auraVisibilityModeMatrices } from "../data/aura.mjs";
import { classMap, html, render, when } from "../lib/lit-all.min.js";
import { selectOptions } from "../utils/lit-utils.mjs";
import { isTerrainHeightToolsActive } from "../utils/misc-utils.mjs";

const { ApplicationV2 } = foundry.applications.api;

/** @type {(k: string) => string} */
const l = k => game.i18n.localize(k);

export class AuraConfigApplication extends ApplicationV2 {

	#aura;

	#visibilityMode;

	/** @type {((aura: AuraConfig) => void) | undefined} */
	onChange;

	/** @type {(() => void) | undefined} */
	onClose;

	/** @param {AuraConfig} aura */
	constructor(aura, options = {}) {
		super(options);

		this.#aura = foundry.utils.deepClone(aura);
	}

	static DEFAULT_OPTIONS = {
		tag: "form",
		window: {
			contentClasses: ["sheet", "standard-form", "grid-aware-auras-aura-config"],
			icon: "far fa-hexagon",
			title: "Aura Configuration"
		},
		position: {
			width: 420,
			height: "auto"
		}
	};

	/** @override */
	get id() {
		return `gaa-aura-config-${this.#aura.id}`;
	}

	/** @override */
	_renderHTML() {
		return html`
			<div class="form-group">
				<label>${l("Name")}</label>
				<div class="form-fields">
					<input type="text" name="name" .value=${this.#aura.name} required>
				</div>
			</div>

			<div class="form-group">
				<label>Radius</label>
				<div class="form-fields">
					<input type="number" name="radius" .value=${this.#aura.radius} required min="0" step="1">
				</div>
			</div>

			<gaa-tabs .tabs=${[
				{
					name: l("DRAWING.TabLines"),
					icon: "fas fa-paint-brush",
					template: this.#linesTab
				},
				{
					name: l("DRAWING.TabFill"),
					icon: "fas fa-fill-drip",
					template: this.#fillTab
				},
				{
					name: "Visibility",
					icon: "fas fa-eye-low-vision",
					template: this.#visibilityTab
				},
				{
					name: "Automation",
					icon: "fas fa-bolt",
					template: this.#automationTab
				},
			]}></gaa-tabs>

			<footer class="sheet-footer flexrow">
				<button type="button" @click=${() => this.close()}>Close</button>
			</footer>
		`;
	}

	#linesTab = () => {
		const isDashed = this.#aura.lineType === LINE_TYPES.DASHED;

		return html`
			<div class="form-group">
				<label>${l("GRIDAWAREAURAS.LineType")}</label>
				<div class="form-fields">
					<select name="lineType" data-dtype="Number">
						${selectOptions(LINE_TYPES, {
							selected: this.#aura.lineType,
							labelSelector: ([name]) => `GRIDAWAREAURAS.LineType${name.titleCase()}`,
							valueSelector: ([, value]) => value
						})}
					</select>
				</div>
			</div>

			<div class="form-group">
				<label>${l("DRAWING.LineWidth")} <span class="units">(${l("Pixels")})</span></label>
				<div class="form-fields">
					<input type="number" name="lineWidth" .value=${this.#aura.lineWidth} required min="0" step="1">
				</div>
			</div>

			<div class="form-group">
				<label>${l("DRAWING.StrokeColor")}</label>
				<div class="form-fields">
					<color-picker name="lineColor" .value=${this.#aura.lineColor} />
				</div>
			</div>

			<div class="form-group">
				<label>${l("DRAWING.LineOpacity")}</label>
				<div class="form-fields">
					<range-picker name="lineOpacity" .value=${this.#aura.lineOpacity} min="0" max="1" step="0.1" />
				</div>
			</div>

			<div class="form-group">
				<label>Dash Config</label>
				<div class="form-fields">
					<input type="number" name="lineDashSize" placeholder="Dash" .value=${this.#aura.lineDashSize} required min="0" step="1" ?disabled=${!isDashed}>
					<input type="number" name="lineGapSize" placeholder="Gap" .value=${this.#aura.lineGapSize} required min="0" step="1" ?disabled=${!isDashed}>
				</div>
			</div>
		`;
	};

	#fillTab = () => {
		const isPattern = this.#aura.fillType === CONST.DRAWING_FILL_TYPES.PATTERN;
		return html`
			<div class="form-group">
				<label>${l("DRAWING.FillTypes")}</label>
				<div class="form-fields">
					<select name="fillType" data-dtype="Number">
						${selectOptions(CONST.DRAWING_FILL_TYPES, {
							selected: this.#aura.fillType,
							labelSelector: ([name]) => `DRAWING.FillType${name.titleCase()}`,
							valueSelector: ([, value]) => value
						})}
					</select>
				</div>
			</div>

			<div class="form-group">
				<label>${l("DRAWING.FillColor")}</label>
				<div class="form-fields">
					<color-picker name="fillColor" .value=${this.#aura.fillColor} />
				</div>
			</div>

			<div class="form-group">
				<label>${l("DRAWING.FillOpacity")}</label>
				<div class="form-fields">
					<range-picker name="fillOpacity" .value=${this.#aura.fillOpacity} min="0" max="1" step="0.1" />
				</div>
			</div>

			<div class="form-group">
				<label>${l("DRAWING.FillTexture")}</label>
				<div class="form-fields">
					<file-picker name="fillTexture" type="image" value=${this.#aura.fillTexture} />
				</div>
			</div>

			<div class="form-group">
				<label>Texture Offset <span class="units">(px)</span></label>
				<div class="form-fields">
					<input type="number" name="fillTextureOffset.x" placeholder="x" .value=${this.#aura.fillTextureOffset.x} required ?disabled=${!isPattern}>
					<input type="number" name="fillTextureOffset.y" placeholder="y" .value=${this.#aura.fillTextureOffset.y} required ?disabled=${!isPattern}>
				</div>
			</div>

			<div class="form-group">
				<label>Texture Scale <span class="units">(%)</span></label>
				<div class="form-fields">
					<input type="number" name="fillTextureScale.x" placeholder="x" .value=${this.#aura.fillTextureScale.x} required ?disabled=${!isPattern}>
					<input type="number" name="fillTextureScale.y" placeholder="y" .value=${this.#aura.fillTextureScale.y} required ?disabled=${!isPattern}>
				</div>
			</div>
		`;
	};

	#visibilityTab = () => html`
		<div class="form-group">
			<label>Display Aura</label>
			<div class="form-fields">
				<select name="visibilityMode" @change=${this.#setVisibilityMode}>
					${selectOptions(AURA_VISIBILITY_MODES, { selected: this.#visibilityMode })}
				</select>
			</div>
		</div>

		<fieldset class=${classMap({ disabled: this.#visibilityMode !== "CUSTOM" })} style="padding-block-end: 0;">
			<legend>Custom</legend>

			<p class="hint" style="margin-top: 0;">
				Specify under which states the aura should be visible to owners and non-owners.
				When multiple states are appliable, the aura is visible when ANY applicable state is checked.
			</p>

			<div class="visibility-grid">
				<div class="visibility-row">
					<span class="owner text-bold">Owner</span>
					<span class="nonowner text-bold">Non-owners</span>
				</div>

				<div class="visibility-row">
					<span class="title">Default</span>
					<p class="hint">When none of the below states are applicable.</p>
					<input type="checkbox" class="owner" name="ownerVisibility.default" .checked=${this.#aura.ownerVisibility.default}>
					<input type="checkbox" class="nonowner" name="nonOwnerVisibility.default" .checked=${this.#aura.nonOwnerVisibility.default}>
				</div>

				<div class="visibility-row">
					<span class="title">Hovered</span>
					<input type="checkbox" class="owner" name="ownerVisibility.hovered" .checked=${this.#aura.ownerVisibility.hovered}>
					<input type="checkbox" class="nonowner" name="nonOwnerVisibility.hovered" .checked=${this.#aura.nonOwnerVisibility.hovered}>
				</div>

				<div class="visibility-row">
					<span class="title">Controlled/Selected</span>
					<input type="checkbox" class="owner" name="ownerVisibility.controlled" .checked=${this.#aura.ownerVisibility.controlled}>
					<input type="checkbox" class="nonowner" disabled>
				</div>

				<div class="visibility-row">
					<span class="title">Dragging</span>
					<input type="checkbox" class="owner" name="ownerVisibility.dragging" .checked=${this.#aura.ownerVisibility.dragging}>
					<input type="checkbox" class="nonowner" disabled>
				</div>

				<div class="visibility-row">
					<span class="title">Targeted</span>
					<input type="checkbox" class="owner" name="ownerVisibility.targeted" .checked=${this.#aura.ownerVisibility.targeted}>
					<input type="checkbox" class="nonowner" name="nonOwnerVisibility.targeted" .checked=${this.#aura.nonOwnerVisibility.targeted}>
				</div>

				<div class="visibility-row">
					<span class="title">Combat Turn</span>
					<p class="hint">When the token has its turn in the combat tracker.</p>
					<input type="checkbox" class="owner" name="ownerVisibility.turn" .checked=${this.#aura.ownerVisibility.turn}>
					<input type="checkbox" class="nonowner" name="nonOwnerVisibility.turn" .checked=${this.#aura.nonOwnerVisibility.turn}>
				</div>
			</div>
		</fieldset>
	`;

	#automationTab = () => {
		const tokenTargets = listAuraTargetFilters();
		const effectsEnabled = game.settings.get(MODULE_NAME, ENABLE_EFFECT_AUTOMATION_SETTING);
		const macrosEnabled = game.settings.get(MODULE_NAME, ENABLE_MACRO_AUTOMATION_SETTING);

		return html`
			<gaa-tabs .tabs=${[
				{
					name: "Effect",
					icon: "fas fa-stars",
					template: () => html`
						${when(!effectsEnabled, () => html`
							<p class="alert" role="alert">Effect automation is not turned on for this world. GMs can configure this in the settings.</p>
						`)}

						<div class="form-group">
							<label>Effect</label>
							<div class="form-fields">
								<select name="effect.effectId" ?disabled=${!effectsEnabled}>
									<option value="">-${l("None")}-</option>
									${selectOptions(CONFIG.statusEffects, {
										selected: this.#aura.effect.effectId,
										labelSelector: "name",
										valueSelector: "id",
										sort: true
									})}
								</select>
							</div>
						</div>

						<div class="form-group">
							<label>Overlay?</label>
							<div class="form-fields">
								<input type="checkbox" name="effect.isOverlay" .checked=${this.#aura.effect.isOverlay} ?disabled=${!effectsEnabled}>
							</div>
						</div>

						<div class="form-group">
							<label>Target Tokens</label>
							<div class="form-fields">
								<select name="effect.targetTokens" ?disabled=${!effectsEnabled}>
									${selectOptions(tokenTargets, { selected: this.#aura.effect.targetTokens })}
								</select>
							</div>
						</div>
					`
				},
				{
					name: "Macro",
					icon: "fas fa-scroll",
					template: () => html`
						<div @dragover=${this.#onMacroDragOver} @drop=${this.#onMacroDrop} style="display: contents">
							${when(!macrosEnabled, () => html`
								<p class="alert" role="alert">Macro automation is not turned on for this world. GMs can configure this in the settings.</p>
							`)}

							<div class="form-group">
								<label>Enter/Leave Macro</label>
								<div class="form-fields">
									<input type="text" name="macro.macroId" .value=${this.#aura.macro.macroId} ?disabled=${!macrosEnabled}>
								</div>
							</div>

							${when(macrosEnabled, () => html`
								<p class="hint">Enter a macro's ID, or drag and drop it onto the textbox.</p>
							`)}
					</div>
					`
				},
				{
					name: "Terrain Height Tools",
					icon: "fas fa-chart-simple",
					template: () => html`
						<div class="form-group">
							<label>Token Ruler on Drag</label>
							<div class="form-fields">
								<select name="terrainHeightTools.rulerOnDrag">
									${selectOptions(THT_RULER_ON_DRAG_MODES, { selected: this.#aura.terrainHeightTools.rulerOnDrag })}
								</select>
							</div>
						</div>

						<div class="form-group">
							<label>Target Tokens</label>
							<div class="form-fields">
								<select name="terrainHeightTools.targetTokens">
									${selectOptions(tokenTargets, { selected: this.#aura.terrainHeightTools.targetTokens })}
								</select>
							</div>
						</div>
					`,
					hidden: !isTerrainHeightToolsActive()
				}
			]} navStyle="margin-top: -0.75rem"></gaa-tabs>
		`;
	};

	/** @type {(e: Event) => void} */
	#valueChange = e => {
		const name = e.target.name?.length ? e.target.name : e.target.closest("[name]")?.name;
		if (!name?.length) return;
		const formData = new FormDataExtended(this.element);
		const value = foundry.utils.getProperty(formData.object, name);
		foundry.utils.setProperty(this.#aura, name, value);
		this.onChange?.(this.#aura);
		this.render();
	};

	/** @type {(e: Event) => void} */
	#setVisibilityMode = e => {
		const newMode = e.target.value;
		this.#visibilityMode = newMode;
		const isCustom = newMode === "CUSTOM";

		if (!isCustom) {
			const preset = auraVisibilityModeMatrices[newMode];
			Object.entries(preset.owner).forEach(([key, value]) => this.#aura.ownerVisibility[key] = value);
			Object.entries(preset.nonOwner).forEach(([key, value]) => this.#aura.nonOwnerVisibility[key] = value);
			this.onChange?.(this.#aura);
		}

		this.render();
	};

	/** @param {DragEvent} event */
	#onMacroDragOver = event => {
		if (game.settings.get(MODULE_NAME, ENABLE_MACRO_AUTOMATION_SETTING))
			event.preventDefault(); // allow dropping
	};

	/** @param {DragEvent} event */
	#onMacroDrop = async event => {
		const macro = await this.#getMacroFromDragData(event);
		if (macro) {
			this.#aura.macro.macroId = macro.id;
			this.onChange?.(this.#aura);
			this.render();
		}
	};

	/** @override */
	_replaceHTML(templateResult, container, { isFirstRender }) {
		render(templateResult, container);

		if (isFirstRender) {
			container.addEventListener("input", this.#valueChange);
			container.addEventListener("tabchange", () => setTimeout(() => this.setPosition({ height: "auto" })));
		}
	}

	/** @override */
	async close(options) {
		if (options?.callOnClose !== false)
			this.onClose?.();
		await super.close(options);
	}

	/** @override */
	_updateFrame(options) {
		super._updateFrame(options);

		const aura = game.i18n.localize("GRIDAWAREAURAS.Aura");

		/** @type {(event: Event) => void} */
		const copyId = event => {
			event.preventDefault();
			game.clipboard.copyPlainText(this.#aura.id);
			ui.notifications.info(game.i18n.format("DOCUMENT.IdCopiedClipboard", { label: aura, type: "id", id: this.#aura.id }));
		};

		const buttons = html`
			<button type="button"
				class="header-control fas fa-passport"
				data-tooltip=${`${aura}: ${this.#aura.id}`} data-tooltip-direction="UP"
				@click=${copyId}
				style="opacity: 0.6">
			</button>
		`;

		render(buttons, this.window.header, { renderBefore: this.window.controls });
	}

	/**
	 * If the event's drag data contains a macro, returns it. Otherwise returns `null.`
	 * @param {DragEvent} event
	 */
	async #getMacroFromDragData(event) {
		// If macro functionality is not enabled, we don't allow dropping macros
		if (!game.settings.get(MODULE_NAME, ENABLE_MACRO_AUTOMATION_SETTING)) return null;

		try {
			const dropDataText = event.dataTransfer.getData("text/plain");

			const dropData = JSON.parse(dropDataText);
			if (dropData.type !== "Macro" || !("uuid" in dropData)) return null;

			const macro = await fromUuid(dropData.uuid);
			return macro instanceof Macro ? macro : null;
		} catch {
			return null;
		}
	}
}
