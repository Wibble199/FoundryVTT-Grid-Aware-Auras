/** @import { AuraConfig, EffectConfig, MacroConfig SequencerEffectConfig, VisibilityConfig } from "../data/aura.mjs"; */
import { ContextMenu } from "../components/context-menu.mjs";
import "../components/data-path-autocomplete.mjs";
import { collectDataPathsFromDatamodels, collectDataPathsFromObject } from "../components/data-path-autocomplete.mjs";
import "../components/vertical-tabs.mjs";
import {
	AURA_POSITIONS,
	AURA_VISIBILITY_MODES,
	EFFECT_MODES,
	ENABLE_EFFECT_AUTOMATION_SETTING,
	ENABLE_MACRO_AUTOMATION_SETTING,
	LINE_TYPES, MACRO_MODES, MODULE_NAME,
	SEQUENCE_EASINGS,
	SEQUENCE_POSITIONS,
	SEQUENCE_TRIGGERS,
	THT_RULER_ON_DRAG_MODES
} from "../consts.mjs";
import { listAuraTargetFilters } from "../data/aura-target-filters.mjs";
import {
	auraVisibilityModeMatrices,
	calculateAuraRadius,
	effectConfigDefaults,
	macroConfigDefaults,
	sequencerEffectConfigDefaults
} from "../data/aura.mjs";
import { classMap, createRef, html, nothing, ref, render, when } from "../lib/lit-all.min.js";
import { selectOptions } from "../utils/lit-utils.mjs";
import { isSequencerActive, isTerrainHeightToolsActive, partialEqual } from "../utils/misc-utils.mjs";

const { ApplicationV2 } = foundry.applications.api;

/** @type {(k: string) => string} */
const l = k => game.i18n.localize(k);

export class AuraConfigApplication extends ApplicationV2 {

	/** @type {AuraConfig} */
	#aura;

	#visibilityMode;

	#disabled;

	#onChange;

	#onClose;

	#parentId;

	#attachTo;

	#radiusContext;

	#datapathAutocompleteSuggestions;

	#selectedTabIndex = 0;

	/** @type {ReturnType<html> | null} */
	#alternateContent = null;

	#tabs = [
		{
			name: "Geometry",
			icon: "far fa-hexagon",
			template: () => this.#geometryTab()
		},
		{
			name: l("GRIDAWAREAURAS.TabLines"),
			icon: "fas fa-paint-brush",
			template: () => this.#linesTab()
		},
		{
			name: l("GRIDAWAREAURAS.TabFill"),
			icon: "fas fa-fill-drip",
			template: () => this.#fillTab()
		},
		{
			name: l("GRIDAWAREAURAS.TabVisibility"),
			icon: "fas fa-eye-low-vision",
			template: () => this.#visibilityTab()
		},
		{
			name: l("GRIDAWAREAURAS.TabEffects"),
			icon: "fas fa-stars",
			template: () => this.#automationEffectTab()
		},
		{
			name: l("GRIDAWAREAURAS.TabMacros"),
			icon: "fas fa-scroll",
			template: () => this.#automationMacroTab()
		},
		{
			name: l("GRIDAWAREAURAS.TabSequencer"),
			icon: "fas fa-list-ol",
			hidden: !isSequencerActive(),
			template: () => this.#automationSequencerTab()
		},
		{
			name: l("GRIDAWAREAURAS.TabTerrainHeightTools"),
			icon: "fas fa-chart-simple",
			hidden: !isTerrainHeightToolsActive(),
			template: () => this.#automationThtTab()
		}
	];

	/**
	 * @param {AuraConfig} aura
	 * @param {Object} [options]
	 * @param {boolean} [options.disabled]
	 * @param {(aura: AuraConfig) => void} [options.onChange]
	 * @param {() => void} [options.onClose]
	 * @param {string} [options.parentId]
	 * @param {Object} [options.attachTo]
	 * @param {RadiusExpressionContext} [options.radiusContext]
	 */
	constructor(aura, { disabled = false, onChange, onClose, parentId, attachTo, radiusContext, ...options } = {}) {
		super(options);

		this.#aura = foundry.utils.deepClone(aura);
		this.#visibilityMode = this.#getVisibilityMode(aura.ownerVisibility, aura.nonOwnerVisibility);
		this.#disabled = disabled;
		this.#onChange = onChange;
		this.#onClose = onClose;
		this.#parentId = parentId;
		this.#attachTo = attachTo;
		this.#radiusContext = radiusContext ?? {};

		// If there is no actor in the radius context, we are likely in a preset menu. In this case, we need to inspect
		// the document schemas to get the data path suggestions. If we do have an actor in the context, then we can use
		// that instead. We should prefer the context when possible as it will also include computed properties that
		// aren't in the schema.
		// If there is an actor but no item, we're likely in the context of an aura that's being applied to a token, so
		// we don't need to add the item data model in here as it's irrelevant (i.e. no special handling for this case).
		this.#datapathAutocompleteSuggestions = radiusContext?.actor
			? collectDataPathsFromObject(radiusContext)
			: [
				...collectDataPathsFromDatamodels(CONFIG.Actor.dataModels, { prefix: "actor" }),
				...collectDataPathsFromDatamodels(CONFIG.Item.dataModels, { prefix: "item" })
			];
	}

	static DEFAULT_OPTIONS = {
		tag: "form",
		window: {
			contentClasses: ["sheet", "standard-form", "grid-aware-auras-aura-config"],
			icon: "far fa-hexagon",
			title: "Aura Configuration"
		},
		position: {
			width: 620,
			height: 580
		}
	};

	/** @override */
	get id() {
		return `gaa-aura-config-${this.#parentId ? "-" + this.#parentId : ""}${this.#aura.id}`;
	}

	/** @override */
	_renderHTML() {
		return html`
			<div class="sheet-header form-group">
				<label style="flex: 0; margin-right: 1rem;">${l("Name")}</label>
				<div class="form-fields">
					<input type="text" name="name" .value=${this.#aura.name} ?disabled=${this.#disabled} required>
				</div>
			</div>

			<nav class="gaa-vertical-tabs">
				${this.#tabs.map((tab, index) => tab.hidden ? nothing : html`
					<a class=${classMap({ active: this.#selectedTabIndex === index })} @click=${() => this.#setSelectedTab(index)}>
						<span class="gaa-vertical-tabs-icon"><i class=${tab.icon}></i></span>
						<span>${tab.name}</span>
					</a>
				`)}
			</nav>

			<div class="sheet-content">
				${this.#tabs[this.#selectedTabIndex].template() ?? nothing}
			</div>

			<footer class="sheet-footer">
				<button type="button" @click=${() => this.close()}>Close</button>
			</footer>

			${when(this.#alternateContent, () => html`
				<div class="gaa-popover" @click=${e => !e.target.closest(".gaa-popover-content") && this.#setAlternateContent(null, { render: true })}>
					<div class="gaa-popover-content">
						${this.#alternateContent}
					</div>
				</div>
			`)}
		`;
	}

	#geometryTab = () => {
		const radiusIsInvalidPath = typeof calculateAuraRadius(this.#aura.radius, this.#radiusContext) !== "number";
		const innerRadiusIsInvalidPath = this.#aura.innerRadius !== "" && // innerRadius is optional
			typeof calculateAuraRadius(this.#aura.innerRadius, this.#radiusContext) !== "number";

		return html`
			<div class="standard-form">
				<div class="form-group">
					<label>Radius</label>
					<div class="form-fields">
						<gaa-data-path-autocomplete
							name="radius"
							value=${this.#aura.radius}
							.dataPaths=${this.#datapathAutocompleteSuggestions}
							?disabled=${this.#disabled}>
						</gaa-data-path-autocomplete>
					</div>
					<p class="hint">${l("GRIDAWAREAURAS.Radius.Hint")}</p>
					${when(radiusIsInvalidPath, () => html`
						<div class="hint" style="text-align: right; color: var(--color-level-error);">${l("GRIDAWAREAURAS.UnresolvedRadiusConfigDialogWarning")}</div>
					`)}
				</div>

				<div class="form-group">
					<label>Inner Radius</label>
					<div class="form-fields">
						<gaa-data-path-autocomplete
							name="innerRadius"
							value=${this.#aura.innerRadius}
							placeholder="None"
							.dataPaths=${this.#datapathAutocompleteSuggestions}
							?disabled=${this.#disabled}
						></gaa-data-path-autocomplete>
					</div>
					<p class="hint">${l("GRIDAWAREAURAS.InnerRadius.Hint")}</p>
					${when(innerRadiusIsInvalidPath, () => html`
						<div class="hint" style="text-align: right; color: var(--color-level-error);">${l("GRIDAWAREAURAS.UnresolvedRadiusConfigDialogWarning")}</div>
					`)}
				</div>

				<div class="form-group">
					<label>Position</label>
					<div class="form-fields">
						<select name="position" ?disabled=${this.#disabled}>
							${selectOptions(AURA_POSITIONS, { selected: this.#aura.position })}
						</select>
					</div>
					<p class="hint">${l("GRIDAWAREAURAS.Position.Hint")}</p>
				</div>
			</div>
		`;
	};

	#linesTab = () => {
		const isDashed = this.#aura.lineType === LINE_TYPES.DASHED;

		return html`
			<div class="standard-form">
				<div class="form-group">
					<label>${l("GRIDAWAREAURAS.LineType")}</label>
					<div class="form-fields">
						<select name="lineType" ?disabled=${this.#disabled} data-dtype="Number">
							${selectOptions(LINE_TYPES, {
								selected: this.#aura.lineType,
								labelSelector: ([name]) => `GRIDAWAREAURAS.LineType${name.titleCase()}`,
								valueSelector: ([, value]) => value
							})}
						</select>
					</div>
				</div>

				<div class="form-group">
					<label>${l("DRAWING.LineWidth")} <span class="units">(px)</span></label>
					<div class="form-fields">
						<input type="number" name="lineWidth" .value=${this.#aura.lineWidth} required min="0" step="1" ?disabled=${this.#disabled}>
					</div>
				</div>

				<div class="form-group">
					<label>${l("DRAWING.StrokeColor")}</label>
					<div class="form-fields">
						<color-picker name="lineColor" .value=${this.#aura.lineColor} ?disabled=${this.#disabled}></color-picker>
					</div>
				</div>

				<div class="form-group">
					<label>${l("DRAWING.LineOpacity")}</label>
					<div class="form-fields">
						<range-picker name="lineOpacity" .value=${this.#aura.lineOpacity} min="0" max="1" step="0.1" ?disabled=${this.#disabled}></range-picker>
					</div>
				</div>

				<div class="form-group">
					<label>Dash Config <span class="units">(px)</span></label>
					<div class="form-fields">
						<input type="number" name="lineDashSize" placeholder="Dash" .value=${this.#aura.lineDashSize} required min="0" step="1" ?disabled=${this.#disabled || !isDashed}>
						<input type="number" name="lineGapSize" placeholder="Gap" .value=${this.#aura.lineGapSize} required min="0" step="1" ?disabled=${this.#disabled || !isDashed}>
					</div>
				</div>
			</div>
		`;
	};

	#fillTab = () => {
		const isPattern = this.#aura.fillType === CONST.DRAWING_FILL_TYPES.PATTERN;
		return html`
			<div class="standard-form">
				<div class="form-group">
					<label>${l("DRAWING.FillTypes")}</label>
					<div class="form-fields">
						<select name="fillType" ?disabled=${this.#disabled} data-dtype="Number">
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
						<color-picker name="fillColor" .value=${this.#aura.fillColor} ?disabled=${this.#disabled}></color-picker>
					</div>
				</div>

				<div class="form-group">
					<label>${l("DRAWING.FillOpacity")}</label>
					<div class="form-fields">
						<range-picker name="fillOpacity" .value=${this.#aura.fillOpacity} min="0" max="1" step="0.1" ?disabled=${this.#disabled}></range-picker>
					</div>
				</div>

				<div class="form-group">
					<label>${l("DRAWING.FillTexture")}</label>
					<div class="form-fields">
						<file-picker name="fillTexture" type="image" value=${this.#aura.fillTexture} ?disabled=${this.#disabled}></file-picker>
					</div>
				</div>

				<div class="form-group">
					<label>Texture Offset <span class="units">(px)</span></label>
					<div class="form-fields">
						<input type="number" name="fillTextureOffset.x" placeholder="x" .value=${this.#aura.fillTextureOffset.x} required ?disabled=${this.#disabled || !isPattern}>
						<input type="number" name="fillTextureOffset.y" placeholder="y" .value=${this.#aura.fillTextureOffset.y} required ?disabled=${this.#disabled || !isPattern}>
					</div>
				</div>

				<div class="form-group">
					<label>Texture Scale <span class="units">(%)</span></label>
					<div class="form-fields">
						<input type="number" name="fillTextureScale.x" placeholder="x" .value=${this.#aura.fillTextureScale.x} required ?disabled=${this.#disabled || !isPattern}>
						<input type="number" name="fillTextureScale.y" placeholder="y" .value=${this.#aura.fillTextureScale.y} required ?disabled=${this.#disabled || !isPattern}>
					</div>
				</div>
			</div>
		`;
	};

	#visibilityTab = () => html`
		<div class="standard-form">
			<div class="form-group">
				<label>Display Aura</label>
				<div class="form-fields">
					<select name="visibilityMode" ?disabled=${this.#disabled} @change=${this.#setVisibilityMode}>
						${selectOptions(AURA_VISIBILITY_MODES, { selected: this.#visibilityMode })}
					</select>
				</div>
			</div>

			<fieldset class=${classMap({ disabled: this.#disabled, hidden: this.#visibilityMode !== "CUSTOM" })} style="padding-block-end: 0;">
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
					</div>

					<div class="visibility-row">
						<span class="title">Dragging</span>
						<input type="checkbox" class="owner" name="ownerVisibility.dragging" .checked=${this.#aura.ownerVisibility.dragging}>
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
		</div>
	`;

	#automationEffectTab = () => {
		const effectsEnabled = game.settings.get(MODULE_NAME, ENABLE_EFFECT_AUTOMATION_SETTING);

		/** @type {(e: Event, effect: EffectConfig, idx: number) => void} */
		const openItemContextMenu = (e, effect, idx) => ContextMenu.open(e, [
			{
				label: "Edit",
				icon: "fas fa-edit",
				onClick: () => this.#editEffect(idx)
			},
			{
				label: "Duplicate",
				icon: "fas fa-clone",
				onClick: () => this.#createEffect(effect)
			},
			{
				label: "Delete",
				icon: "fas fa-trash",
				onClick: () => this.#deleteEffect(idx)
			}
		]);

		return html`
			${when(!effectsEnabled, () => html`
				<p class="alert" role="alert">Effect automation is not turned on for this world. GMs can configure this in the settings.</p>
			`)}

			${when(this.#aura.effects.length, () => html`<ul class="automated-item-list">
				${this.#aura.effects.map((effect, idx) => html`
					<li @contextmenu=${e => openItemContextMenu(e, effect, idx)}>
						<div class="flexcol">
							<span><strong>${l(CONFIG.statusEffects.find(e => e.id === effect.effectId)?.name ?? "None")}</strong></span>
							<span><em>${l(EFFECT_MODES[effect.mode] ?? "")}</em></span>
						</div>
						${when(!this.#disabled && effectsEnabled, () => html`
							<a class="menu-button" @click=${e => openItemContextMenu(e, effect, idx)}>
								<i class="fas fa-ellipsis-vertical"></i>
							</a>
						`, () => html`
							<a class="menu-button" @click=${() => this.#editEffect(idx)}>
								<i class="fas fa-eye"></i>
							</a>
						`)}
					</li>
				`)}
			</ul>`)}

			${when(effectsEnabled && this.#aura.effects.length === 0, () => html`
				<p class="hint text-center">No automated effects configured.</p>
			`)}

			<div class="automated-item-list-create-button">
				<button @click=${this.#createEffect} ?disabled=${this.#disabled || !effectsEnabled}>
					<i class="fas fa-plus"></i>
					Create Effect
				</button>
			</div>
		`;
	};

	/** @param {number} editingEffectIndex */
	#effectEditNestedDialog = editingEffectIndex => {
		const editingEffect = this.#aura.effects[editingEffectIndex];

		return html`
			<form class="standard-form" @submit=${e => this.#updateArrayItem(e, this.#aura.effects, editingEffectIndex)}>
				<div class="form-group">
					<label>Effect</label>
					<div class="form-fields">
						<select name="effectId" ?disabled=${this.#disabled}>
							<option value="" hidden>-${l("None")}-</option>
							${selectOptions(CONFIG.statusEffects, {
								selected: editingEffect.effectId,
								labelSelector: "name",
								valueSelector: "id",
								sort: true
							})}
						</select>
					</div>
				</div>

				<div class="form-group">
					<label>Overlay</label>
					<div class="form-fields">
						<input
							type="checkbox"
							name="isOverlay"
							.checked=${editingEffect.isOverlay ?? false}
							?disabled=${this.#disabled}>
					</div>
				</div>

				<div class="form-group">
					<label>Target Tokens</label>
					<div class="form-fields">
						<select name="targetTokens" ?disabled=${this.#disabled}>
							${selectOptions(listAuraTargetFilters(), { selected: editingEffect.targetTokens })}
						</select>
					</div>
				</div>

				<div class="form-group">
					<label>Trigger</label>
					<div class="form-fields">
						<select name="mode" ?disabled=${this.#disabled}>
							${selectOptions(EFFECT_MODES, { selected: editingEffect.mode })}
						</select>
					</div>
				</div>

				<div class="form-group">
					<label>Priority</label>
					<div class="form-fields">
						<input
							type="number"
							name="priority"
							.value=${editingEffect?.priority ?? 0}
							step="1"
							?disabled=${this.#disabled}>
					</div>
				</div>

				<div class="flexrow">
					${when(this.#disabled, () => html`
						<button type="button" @click=${() => this.#setAlternateContent(null, { render: true })}>
							${l("Close")}
						</button>
					`, () => html`
						<button type="button" @click=${() => this.#deleteEffect(editingEffectIndex)}>
							<i class="fas fa-trash"></i> ${l("Delete")}
						</button>
						<button type="submit">
							<i class="fas fa-check"></i> ${l("Confirm")}
						</button>
					`)}
				</div>
			</form>
		`;
	};

	#automationMacroTab = () => {
		const macrosEnabled = game.settings.get(MODULE_NAME, ENABLE_MACRO_AUTOMATION_SETTING);

		/** @type {(e: Event, macro: MacroConfig, idx: number) => void} */
		const openItemContextMenu = (e, macro, idx) => ContextMenu.open(e, [
			{
				label: "Edit",
				icon: "fas fa-edit",
				onClick: () => this.#editMacro(idx)
			},
			{
				label: "Duplicate",
				icon: "fas fa-clone",
				onClick: () => this.#createMacro(macro)
			},
			{
				label: "Delete",
				icon: "fas fa-trash",
				onClick: () => this.#deleteMacro(idx)
			}
		]);

		return html`
			${when(!macrosEnabled, () => html`
				<p class="alert" role="alert">Macro automation is not turned on for this world. GMs can configure this in the settings.</p>
			`)}

			${when(this.#aura.macros.length, () => html`<ul class="automated-item-list">
				${this.#aura.macros.map((macro, idx) => html`
					<li @contextmenu=${e => openItemContextMenu(e, macro, idx)}>
						<div class="flexcol">
							<span><strong>${game.macros.get(macro.macroId)?.name ?? l("None")}</strong></span>
							<span><em>${l(MACRO_MODES[macro.mode] ?? "")}</em></span>
						</div>
						${when(!this.#disabled && macrosEnabled, () => html`
							<a class="menu-button" @click=${e => openItemContextMenu(e, macro, idx)}>
								<i class="fas fa-ellipsis-vertical"></i>
							</a>
						`, () => html`
							<a class="menu-button" @click=${() => this.#editMacro(idx)}>
								<i class="fas fa-eye"></i>
							</a>
						`)}
					</li>
				`)}
			</ul>`)}

			${when(macrosEnabled && this.#aura.macros.length === 0, () => html`
				<p class="hint text-center">No macros configured.</p>
			`)}

			<div class="automated-item-list-create-button">
				<button @click=${this.#createMacro} ?disabled=${this.#disabled || !macrosEnabled}>
					<i class="fas fa-plus"></i>
					Create Macro
				</button>
			</div>
		`;
	};

	/** @param {number} macroIndex */
	#macroEditNestedDialog = macroIndex => {
		const editingMacro = this.#aura.macros[macroIndex];

		const macroInputRef = createRef();

		return html`
			<form class="standard-form"
				@dragover=${this.#onMacroDragOver}
				@drop=${this.#disabled ? nothing : e => this.#onMacroDrop(e, macroInputRef)}
				@submit=${e => this.#updateArrayItem(e, this.#aura.macros, macroIndex)}>
				<div class="form-group">
					<label>Macro ID</label>
					<div class="form-fields flexcol">
						<input type="text" name="macroId" value=${editingMacro.macroId} ?disabled=${this.#disabled} ${ref(macroInputRef)}>
						<p class="hint">Enter a macro's ID, or drag and drop it onto the textbox.</p>
					</div>
				</div>

				<div class="form-group">
					<label>Target Tokens</label>
					<div class="form-fields">
						<select name="targetTokens" ?disabled=${this.#disabled}>
							${selectOptions(listAuraTargetFilters(), { selected: editingMacro.targetTokens })}
						</select>
					</div>
				</div>

				<div class="form-group">
					<label>Trigger</label>
					<div class="form-fields">
						<select name="mode" ?disabled=${this.#disabled}>
							${selectOptions(MACRO_MODES, { selected: editingMacro.mode })}
						</select>
					</div>
				</div>

				<div class="flexrow">
					${when(this.#disabled, () => html`
						<button type="button" @click=${() => this.#setAlternateContent(null, { render: true })}>
							${l("Close")}
						</button>
					`, () => html`
						<button type="button" @click=${() => this.#deleteMacro(macroIndex)}>
							<i class="fas fa-trash"></i> ${l("Delete")}
						</button>
						<button type="submit">
							<i class="fas fa-check"></i> ${l("Confirm")}
						</button>
					`)}
				</div>
			</form>
		`;
	};

	#automationSequencerTab = () => {
		// GAA's (lazy) usage of Sequencer doesn't work properly unless players can create effects
		const sequencerEnabled = game.settings.get("sequencer", "permissions-effect-create") === 0;

		/** @type {(e: Event, sequence: SequencerEffectConfig, idx: number) => void} */
		const openItemContextMenu = (e, sequence, idx) => ContextMenu.open(e, [
			{
				label: "Edit",
				icon: "fas fa-edit",
				onClick: () => this.#editSequence(idx)
			},
			{
				label: "Duplicate",
				icon: "fas fa-clone",
				onClick: () => this.#createSequence(sequence)
			},
			{
				label: "Delete",
				icon: "fas fa-trash",
				onClick: () => this.#deleteSequence(idx)
			}
		]);

		return html`
			${when(!sequencerEnabled, () => html`
				<p class="alert" role="alert">Sequencer integration requires players to have permission to create effects. GMs can configure this in the Sequencer settings.</p>
			`)}

			${when(this.#aura.sequencerEffects.length, () => html`<ul class="automated-item-list">
				${this.#aura.sequencerEffects.map((sequence, idx) => html`
					<li @contextmenu=${e => openItemContextMenu(e, sequence, idx)}>
						<div class="flexcol">
							<span><strong>${sequence.effectPath?.length ? sequence.effectPath : "- No effect selected -"}</strong></span>
							<span><em>${l(SEQUENCE_TRIGGERS[sequence.trigger] ?? "")}</em></span>
							<span><em>${l(SEQUENCE_POSITIONS[sequence.position] ?? "")}</em></span>
						</div>
						${when(!this.#disabled && sequencerEnabled, () => html`
							<a class="menu-button" @click=${e => openItemContextMenu(e, sequence, idx)}>
								<i class="fas fa-ellipsis-vertical"></i>
							</a>
						`, () => html`
							<a class="menu-button" @click=${() => this.#editSequence(idx)}>
								<i class="fas fa-eye"></i>
							</a>
						`)}
					</li>
				`)}
			</ul>`)}

			${when(sequencerEnabled && this.#aura.sequencerEffects.length === 0, () => html`
				<p class="hint text-center">No sequencer effects configured.</p>
			`)}

			<div class="automated-item-list-create-button">
				<button @click=${this.#createSequence} ?disabled=${this.#disabled || !sequencerEnabled}>
					<i class="fas fa-plus"></i>
					Create Sequence
				</button>
			</div>
		`;
	};

	/** @param {number} sequenceIndex */
	#sequenceEditNestedDialog = sequenceIndex => {
		const effect = this.#aura.sequencerEffects[sequenceIndex];

		return html`
			<form class="flexcol" @submit=${e => this.#updateArrayItem(e, this.#aura.sequencerEffects, sequenceIndex)}>
				<div class="standard-form" style="flex: 1; overflow-y: scroll; padding-right: 1rem;">
					<input type="hidden" name="uId" value=${effect.uId}>

					<div class="form-group">
						<label>Effect</label>
						<div class="form-fields">
							<input type="text" name="effectPath" value=${effect.effectPath} ?disabled=${this.#disabled}>
							<button type="button" @click=${() => Sequencer.DatabaseViewer.show()}>
								<i class="fas fa-database"></i>
							</button>
						</div>
						<p class="hint">The Sequencer file to play. Can be a filepath, wildcard filepath or database path.</p>
					</div>

					<div class="form-group">
						<label>Target Tokens</label>
						<div class="form-fields">
							<select name="targetTokens" ?disabled=${this.#disabled}>
								${selectOptions(listAuraTargetFilters(), { selected: effect.targetTokens })}
							</select>
						</div>
					</div>

					<div class="form-group">
						<label>Trigger</label>
						<div class="form-fields">
							<select name="trigger" ?disabled=${this.#disabled}>
								${selectOptions(SEQUENCE_TRIGGERS, { selected: effect.trigger })}
							</select>
						</div>
					</div>

					<div class="form-group">
						<label>Position</label>
						<div class="form-fields">
							<select name="position" ?disabled=${this.#disabled}>
								${selectOptions(SEQUENCE_POSITIONS, { selected: effect.position })}
							</select>
						</div>
					</div>

					<hr/>

					<div class="form-group">
						<label>Repeats</label>
						<div class="form-fields">
							<label>Count</label>
							<input type="number" name="repeatCount" value=${effect.repeatCount} min="1" ?disabled=${this.#disabled}>
							<label>Delay</label>
							<input type="number" name="repeatDelay" value=${effect.repeatDelay} min="0" ?disabled=${this.#disabled}>
							<span class="units">ms</span>
						</div>
						<p class="hint">How many times the effect should play, and how long between repeats.</p>
					</div>

					<div class="form-group">
						<label>Start Delay</label>
						<div class="form-fields">
							<input type="number" name="delay" value=${effect.delay} min="0" ?disabled=${this.#disabled}>
							<span class="units">ms</span>
						</div>
					</div>

					<div class="form-group">
						<label>Playback Rate</label>
						<div class="form-fields">
							<input type="number" name="playbackRate" value=${effect.playbackRate} min="0.01" step="0.01" ?disabled=${this.#disabled}>
							<span class="units">x</span>
						</div>
					</div>

					<hr/>

					<div class="form-group">
						<label>Opacity</label>
						<div class="form-fields">
							<range-picker name="opacity" .value=${effect.opacity} min="0" max="1" step="0.05" ?disabled=${this.#disabled}></range-picker>
						</div>
					</div>

					<div class="form-group">
						<label>Fade In</label>
						<div class="form-fields">
							<input type="number" name="fadeInDuration" value=${effect.fadeInDuration} min="0" ?disabled=${this.#disabled}>
							<span class="units" style="margin-right: 0.75rem">ms</span>
							<select name="fadeInEasing" ?disabled=${this.#disabled}>
								${selectOptions(SEQUENCE_EASINGS, { selected: effect.fadeInEasing })}
							</select>
						</div>
					</div>

					<div class="form-group">
						<label>Fade Out</label>
						<div class="form-fields">
							<input type="number" name="fadeOutDuration" value=${effect.fadeOutDuration} min="0" ?disabled=${this.#disabled}>
							<span class="units" style="margin-right: 0.75rem">ms</span>
							<select name="fadeOutEasing" ?disabled=${this.#disabled}>
								${selectOptions(SEQUENCE_EASINGS, { selected: effect.fadeOutEasing })}
							</select>
						</div>
					</div>

					<hr/>

					<div class="form-group">
						<label>Scale</label>
						<div class="form-fields">
							<input type="number" name="scale" value=${effect.scale} min="0" step="0.01" ?disabled=${this.#disabled}>
							<span class="units">x</span>
						</div>
					</div>

					<div class="form-group">
						<label>Scale to Object</label>
						<div class="form-fields">
							<input type="checkbox" name="scaleToObject" ?checked=${effect.scaleToObject} ?disabled=${this.#disabled}>
						</div>
					</div>

					<div class="form-group">
						<label>Scale In</label>
						<div class="form-fields">
							<input type="number" name="scaleInScale" value=${effect.scaleInScale} ?disabled=${this.#disabled}>
							<span class="units" style="margin-right: 0.75rem">x</span>
							<input type="number" name="scaleInDuration" value=${effect.scaleInDuration} min="0" step="0.01" ?disabled=${this.#disabled}>
							<span class="units" style="margin-right: 0.75rem">ms</span>
							<select name="scaleInEasing" style="flex: 2" ?disabled=${this.#disabled}>
								${selectOptions(SEQUENCE_EASINGS, { selected: effect.scaleInEasing })}
							</select>
						</div>
					</div>

					<div class="form-group">
						<label>Scale Out</label>
						<div class="form-fields">
							<input type="number" name="scaleOutScale" value=${effect.scaleOutScale} ?disabled=${this.#disabled}>
							<span class="units" style="margin-right: 0.75rem">x</span>
							<input type="number" name="scaleOutDuration" value=${effect.scaleOutDuration} min="0" step="0.01" ?disabled=${this.#disabled}>
							<span class="units" style="margin-right: 0.75rem">ms</span>
							<select name="scaleOutEasing" style="flex: 2" ?disabled=${this.#disabled}>
								${selectOptions(SEQUENCE_EASINGS, { selected: effect.scaleOutEasing })}
							</select>
						</div>
					</div>

					<hr/>

					<div class="form-group">
						<label>Below Tokens</label>
						<div class="form-fields">
							<input type="checkbox" name="belowTokens" ?checked=${effect.belowTokens} ?disabled=${this.#disabled}>
						</div>
						<p class="hint">Note that auras render at the same Z-index as tokens, so this also draws the effect below auras.</p>
					</div>
				</div>

				<div class="flexrow" style="margin-top: 1rem">
					${when(this.#disabled, () => html`
						<button type="button" @click=${() => this.#setAlternateContent(null, { render: true })}>
							${l("Close")}
						</button>
					`, () => html`
						<button type="button" @click=${() => this.#deleteSequence(sequenceIndex)}>
							<i class="fas fa-trash"></i> ${l("Delete")}
						</button>
						<button type="submit">
							<i class="fas fa-check"></i> ${l("Confirm")}
						</button>
					`)}
				</div>
			</form>
		`;
	};

	#automationThtTab = () => html`
		<div class="standard-form">
			<div class="form-group">
				<label>Token Ruler on Drag</label>
				<div class="form-fields">
					<select name="terrainHeightTools.rulerOnDrag" ?disabled=${this.#disabled}>
						${selectOptions(THT_RULER_ON_DRAG_MODES, { selected: this.#aura.terrainHeightTools.rulerOnDrag })}
					</select>
				</div>
			</div>

			<div class="form-group">
				<label>Target Tokens</label>
				<div class="form-fields">
					<select name="terrainHeightTools.targetTokens" ?disabled=${this.#disabled}>
						${selectOptions(listAuraTargetFilters(), { selected: this.#aura.terrainHeightTools.targetTokens })}
					</select>
				</div>
			</div>
		</div>
	`;

	/** @param {number} tabIndex  */
	#setSelectedTab(tabIndex) {
		this.#selectedTabIndex = tabIndex;
		this.render();
	}

	/** @type {(e: Event) => void} */
	#valueChange = e => {
		const name = e.target.name?.length ? e.target.name : e.target.closest("[name]")?.name;
		if (!name?.length) return;
		const formData = new FormDataExtended(e.currentTarget);
		const value = foundry.utils.getProperty(formData.object, name);
		foundry.utils.setProperty(this.#aura, name, value);
		this.#auraUpdated();
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
			this.#onChange?.(this.#aura);
		}

		this.render();
	};

	/**
	 * @param {VisibilityConfig} ownerVisibility
	 * @param {VisibilityConfig} nonOwnerVisibility
	 * @returns {AURA_VISIBILITY_MODES}
	 */
	#getVisibilityMode(ownerVisibility, nonOwnerVisibility) {
		for (const [mode, modeConfig] of Object.entries(auraVisibilityModeMatrices)) {
			if (partialEqual(ownerVisibility, modeConfig.owner) && partialEqual(nonOwnerVisibility, modeConfig.nonOwner))
				return mode;
		}
		return "CUSTOM";
	}

	/** @type {(e: Event, array: any[], index: number) => void} */
	#updateArrayItem = (e, array, index) => {
		e.preventDefault();
		const formData = new FormDataExtended(e.currentTarget);
		Object.assign(array[index], formData.object);
		this.#setAlternateContent(null);
		this.#auraUpdated();
	};

	#createEffect = source => {
		this.#aura.effects.push({
			...effectConfigDefaults(),
			...foundry.utils.deepClone(source)
		});
		this.#setAlternateContent(this.#effectEditNestedDialog(this.#aura.effects.length - 1), { title: "Edit Effect" });
		this.#auraUpdated();
	};

	/** @param {number} effectIndex */
	#editEffect = effectIndex => {
		this.#setAlternateContent(this.#effectEditNestedDialog(effectIndex), { title: "Edit Effect", render: true });
	};

	/** @param {number} effectIndex */
	#deleteEffect = effectIndex => {
		this.#aura.effects = this.#aura.effects.filter((_, idx) => idx !== effectIndex);
		this.#setAlternateContent(null);
		this.#auraUpdated();
	};

	#createMacro = source => {
		this.#aura.macros.push({
			...macroConfigDefaults(),
			...foundry.utils.deepClone(source)
		});
		this.#setAlternateContent(this.#macroEditNestedDialog(this.#aura.macros.length - 1), { title: "Edit Macro" });
		this.#auraUpdated();
	};

	/** @param {number} macroIndex */
	#editMacro = macroIndex => {
		this.#setAlternateContent(this.#macroEditNestedDialog(macroIndex), { title: "Edit Macro", render: true });
	};

	/** @param {number} macroIndex */
	#deleteMacro = macroIndex => {
		this.#aura.macros = this.#aura.macros.filter((_, idx) => idx !== macroIndex);
		this.#setAlternateContent(null);
		this.#auraUpdated();
	};

	/** @param {DragEvent} event */
	#onMacroDragOver = event => {
		if (game.settings.get(MODULE_NAME, ENABLE_MACRO_AUTOMATION_SETTING))
			event.preventDefault(); // allow dropping
	};

	/**
	 * @param {DragEvent} event
	 * @param {({ value?: HTMLInputElement })} inputRef
	 */
	#onMacroDrop = async (event, inputRef) => {
		const macro = await this.#getMacroFromDragData(event);
		if (macro && inputRef.value) {
			inputRef.value.value = macro.id;
		}
	};

	/** @param {SequencerEffectConfig | undefined} [source] */
	#createSequence = source => {
		this.#aura.sequencerEffects.push({
			...sequencerEffectConfigDefaults(),
			...foundry.utils.deepClone(source)
		});
		this.#editSequence(this.#aura.sequencerEffects.length - 1);
		this.#auraUpdated();
	};

	/** @param {number} sequenceIndex */
	#editSequence = sequenceIndex => {
		this.#setAlternateContent(this.#sequenceEditNestedDialog(sequenceIndex), { title: "Edit Sequencer Effect", render: true });
	};

	/** @param {number} sequenceIndex */
	#deleteSequence = sequenceIndex => {
		this.#aura.sequencerEffects = this.#aura.sequencerEffects.filter((_, idx) => idx !== sequenceIndex);
		this.#setAlternateContent(null);
		this.#auraUpdated();
	};

	#auraUpdated() {
		this.#onChange?.(this.#aura);
		this.render();
	}

	/**
	 * @param {ReturnType<html> | undefined} content
	 * @param {Object} [options]
	 * @param {string} [options.title]
	 * @param {boolean} [options.render]
	 */
	#setAlternateContent(content, { title, render = false } = {}) {
		this.#alternateContent = content;
		this.element.querySelector(".window-title").innerText = "Aura Configuration" + (title?.length ? ` :: ${title}` : "");
		if (render) this.render();
	}

	/** @override */
	_onFirstRender(...args) {
		super._onFirstRender(...args);

		this.element.addEventListener("input", this.#valueChange.bind(this));

		if (this.#attachTo) {
			this.#attachTo[this.id] = this;
		}
	}

	/** @override */
	_onClose(...args) {
		super._onClose(...args);
		if (this.#attachTo) {
			delete this.#attachTo[this.id];
		}
	}

	/** @override */
	_replaceHTML(templateResult, container) {
		render(templateResult, container);
	}

	/** @override */
	async close(options) {
		if (this.#alternateContent !== null) {
			this.#setAlternateContent(null, { render: true });
			return;
		}

		if (options?.callOnClose !== false)
			this.#onClose?.();
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
				class="header-control icon fas fa-passport"
				data-tooltip=${`${aura}: ${this.#aura.id}`} data-tooltip-direction="UP"
				@click=${copyId}>
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
