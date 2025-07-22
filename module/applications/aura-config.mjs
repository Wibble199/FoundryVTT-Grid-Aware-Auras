/** @import { AuraConfig, VisibilityConfig } from "../data/aura.mjs"; */
import "../components/tabs.mjs";
import {
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

	#onChange;

	#onClose;

	#parentId;

	#attachTo;

	#radiusContext;

	/** @type {ReturnType<html> | null} */
	#alternateContent = null;

	/**
	 * @param {AuraConfig} aura
	 * @param {Object} [options]
	 * @param {(aura: AuraConfig) => void} [options.onChange]
	 * @param {() => void} [options.onClose]
	 * @param {string} [options.parentId]
	 * @param {Record<string, any>} [options.attachTo]
	 * @param {{ actor?: Actor | undefined; item?: Item | undefined; }} [options.radiusContext]
	 */
	constructor(aura, { onChange, onClose, parentId, attachTo, radiusContext, ...options } = {}) {
		super(options);

		this.#aura = foundry.utils.deepClone(aura);
		this.#visibilityMode = this.#getVisibilityMode(aura.ownerVisibility, aura.nonOwnerVisibility);
		this.#onChange = onChange;
		this.#onClose = onClose;
		this.#parentId = parentId;
		this.#attachTo = attachTo;
		this.#radiusContext = radiusContext ?? {};
	}

	static DEFAULT_OPTIONS = {
		window: {
			contentClasses: ["sheet", "standard-form", "grid-aware-auras-aura-config"],
			icon: "far fa-hexagon",
			title: "Aura Configuration"
		},
		position: {
			width: 480,
			height: "auto"
		}
	};

	/** @override */
	get id() {
		return `gaa-aura-config-${this.#parentId ? "-" + this.#parentId : ""}${this.#aura.id}`;
	}

	/** @override */
	_renderHTML() {
		const radiusIsInvalidPath = typeof this.#aura.radius !== "number"
			&& this.#aura.radius?.length > 0
			&& isNaN(parseInt(this.#aura.radius))
			&& typeof calculateAuraRadius(this.#aura.radius, this.#radiusContext) !== "number";

		return html`
			<form class=${classMap({ "standard-form": true, "hidden": this.#alternateContent })} @input=${this.#valueChange}>
				<div class="form-group">
					<label>${l("Name")}</label>
					<div class="form-fields">
						<input type="text" name="name" .value=${this.#aura.name} required>
					</div>
				</div>

				<div class="form-group">
					<label>Radius</label>
					<div class="form-fields">
						<input type="text" name="radius" value=${this.#aura.radius} required>
						<span style="flex: 0; margin-left: 0.5rem; cursor: help;">
							<i class="fas fa-question-circle" data-tooltip=${l("GRIDAWAREAURAS.Radius.Hint")}></i>
						</span>
					</div>
					${when(radiusIsInvalidPath, () => html`
						<div class="hint" style="text-align: right; color: var(--color-level-error);">${l("GRIDAWAREAURAS.UnresolvedRadiusConfigDialogWarning")}</div>
					`)}
				</div>

				<gaa-tabs .tabs=${[
					{
						name: l("GRIDAWAREAURAS.TabLines"),
						icon: "fas fa-paint-brush",
						template: this.#linesTab
					},
					{
						name: l("GRIDAWAREAURAS.TabFill"),
						icon: "fas fa-fill-drip",
						template: this.#fillTab
					},
					{
						name: l("GRIDAWAREAURAS.TabVisibility"),
						icon: "fas fa-eye-low-vision",
						template: this.#visibilityTab
					},
					{
						name: l("GRIDAWAREAURAS.TabAutomation"),
						icon: "fas fa-bolt",
						template: this.#automationTab
					}
				]}></gaa-tabs>

				<footer class="sheet-footer flexrow">
					<button type="button" @click=${() => this.close()}>Close</button>
				</footer>
			</form>

			<div class=${classMap({ "hidden": !this.#alternateContent })}>
				${this.#alternateContent ?? nothing}
			</div>
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
					<color-picker name="lineColor" .value=${this.#aura.lineColor}></color-picker>
				</div>
			</div>

			<div class="form-group">
				<label>${l("DRAWING.LineOpacity")}</label>
				<div class="form-fields">
					<range-picker name="lineOpacity" .value=${this.#aura.lineOpacity} min="0" max="1" step="0.1"></range-picker>
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
					<color-picker name="fillColor" .value=${this.#aura.fillColor}></color-picker>
				</div>
			</div>

			<div class="form-group">
				<label>${l("DRAWING.FillOpacity")}</label>
				<div class="form-fields">
					<range-picker name="fillOpacity" .value=${this.#aura.fillOpacity} min="0" max="1" step="0.1"></range-picker>
				</div>
			</div>

			<div class="form-group">
				<label>${l("DRAWING.FillTexture")}</label>
				<div class="form-fields">
					<file-picker name="fillTexture" type="image" value=${this.#aura.fillTexture}></file-picker>
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

	#automationTab = () => html`
		<gaa-tabs .tabs=${[
			{
				name: "Effect",
				icon: "fas fa-stars",
				template: this.#automationEffectTab
			},
			{
				name: "Macro",
				icon: "fas fa-scroll",
				template: this.#automationMacroTab
			},
			{
				name: "Sequencer",
				icon: "fas fa-list-ol",
				hidden: !isSequencerActive(),
				template: this.#automationSequencerTab
			},
			{
				name: "Terrain Height Tools",
				icon: "fas fa-chart-simple",
				template: this.#automationThtTab,
				hidden: !isTerrainHeightToolsActive()
			}
		]} navStyle="margin-top: -0.75rem"></gaa-tabs>
	`;

	#automationEffectTab = () => {
		const effectsEnabled = game.settings.get(MODULE_NAME, ENABLE_EFFECT_AUTOMATION_SETTING);

		return html`
			${when(!effectsEnabled, () => html`
				<p class="alert" role="alert">Effect automation is not turned on for this world. GMs can configure this in the settings.</p>
			`)}

			<div class="text-right" style="margin-top: -0.5rem; margin-bottom: -0.5rem;">
				<button type="button" class="icon fas fa-plus" @click=${this.#createEffect} ?disabled=${!effectsEnabled} style="display: inline-block">
				</button>
			</div>

			${when(this.#aura.effects.length, () => html`<ul class="automated-item-list">
				${this.#aura.effects.map((effect, idx) => html`
					<li>
						<span><strong>${l(CONFIG.statusEffects.find(e => e.id === effect.effectId)?.name ?? "None")}</strong></span>
						<span><em>${l(EFFECT_MODES[effect.mode] ?? "")}</em></span>
						<button type="button" class="icon fas fa-edit" @click=${() => this.#editEffect(idx)} ?disabled=${!effectsEnabled}></button>
						<button type="button" class="icon fas fa-trash" @click=${() => this.#deleteEffect(idx)} ?disabled=${!effectsEnabled}></button>
					</li>
				`)}
			</ul>`)}

			${when(effectsEnabled && this.#aura.effects.length === 0, () => html`
				<p class="hint text-center">No automated effects configured. Click the plus above to create one.</p>
			`)}
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
						<select name="effectId">
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
							.checked=${editingEffect.isOverlay ?? false}>
					</div>
				</div>

				<div class="form-group">
					<label>Target Tokens</label>
					<div class="form-fields">
						<select name="targetTokens">
							${selectOptions(listAuraTargetFilters(), { selected: editingEffect.targetTokens })}
						</select>
					</div>
				</div>

				<div class="form-group">
					<label>Trigger</label>
					<div class="form-fields">
						<select name="mode">
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
							step="1">
					</div>
				</div>

				<div class="flexrow">
					<button type="button" @click=${() => this.#deleteEffect(editingEffectIndex)}>
						<i class="fas fa-trash"></i> ${l("Delete")}
					</button>
					<button type="submit">
						<i class="fas fa-check"></i> ${l("Confirm")}
					</button>
				</div>
			</form>
		`;
	};

	#automationMacroTab = () => {
		const macrosEnabled = game.settings.get(MODULE_NAME, ENABLE_MACRO_AUTOMATION_SETTING);

		return html`
			${when(!macrosEnabled, () => html`
				<p class="alert" role="alert">Macro automation is not turned on for this world. GMs can configure this in the settings.</p>
			`)}

			<div class="text-right" style="margin-top: -0.5rem; margin-bottom: -0.5rem;">
				<button type="button" class="icon fas fa-plus" @click=${this.#createMacro} ?disabled=${!macrosEnabled} style="display: inline-block">
				</button>
			</div>

			${when(this.#aura.macros.length, () => html`<ul class="automated-item-list">
				${this.#aura.macros.map((macro, idx) => html`
					<li>
						<span><strong>${game.macros.get(macro.macroId)?.name ?? l("None")}</strong></span>
						<span><em>${l(MACRO_MODES[macro.mode] ?? "")}</em></span>
						<button type="button" class="icon fas fa-edit" @click=${() => this.#editMacro(idx)} ?disabled=${!macrosEnabled}></button>
						<button type="button" class="icon fas fa-trash" @click=${() => this.#deleteMacro(idx)} ?disabled=${!macrosEnabled}></button>
					</li>
				`)}
			</ul>`)}

			${when(macrosEnabled && this.#aura.macros.length === 0, () => html`
				<p class="hint text-center">No macros configured. Click the plus above to create one.</p>
			`)}
		`;
	};

	/** @param {number} macroIndex */
	#macroEditNestedDialog = macroIndex => {
		const editingMacro = this.#aura.macros[macroIndex];

		const macroInputRef = createRef();

		return html`
			<form class="standard-form"
				@dragover=${this.#onMacroDragOver}
				@drop=${e => this.#onMacroDrop(e, macroInputRef)}
				@submit=${e => this.#updateArrayItem(e, this.#aura.macros, macroIndex)}>
				<div class="form-group">
					<label>Macro ID</label>
					<div class="form-fields flexcol">
						<input type="text" name="macroId" value=${editingMacro.macroId} ${ref(macroInputRef)}>
						<p class="hint">Enter a macro's ID, or drag and drop it onto the textbox.</p>
					</div>
				</div>

				<div class="form-group">
					<label>Target Tokens</label>
					<div class="form-fields">
						<select name="targetTokens">
							${selectOptions(listAuraTargetFilters(), { selected: editingMacro.targetTokens })}
						</select>
					</div>
				</div>

				<div class="form-group">
					<label>Trigger</label>
					<div class="form-fields">
						<select name="mode">
							${selectOptions(MACRO_MODES, { selected: editingMacro.mode })}
						</select>
					</div>
				</div>

				<div class="flexrow">
					<button type="button" @click=${() => this.#deleteMacro(macroIndex)}>
						<i class="fas fa-trash"></i> ${l("Delete")}
					</button>
					<button type="submit">
						<i class="fas fa-check"></i> ${l("Confirm")}
					</button>
				</div>
			</form>
		`;
	};

	#automationSequencerTab = () => {
		// GAA's (lazy) usage of Sequencer doesn't work properly unless players can create effects
		const sequencerEnabled = game.settings.get("sequencer", "permissions-effect-create") === 0;

		return html`
			${when(!sequencerEnabled, () => html`
				<p class="alert" role="alert">Sequencer integration requires players to have permission to create effects. GMs can configure this in the Sequencer settings.</p>
			`)}

			<div class="text-right" style="margin-top: -0.5rem; margin-bottom: -0.5rem;">
				<button type="button" class="icon fas fa-plus" @click=${this.#createSequence} ?disabled=${!sequencerEnabled} style="display: inline-block">
				</button>
			</div>

			${when(this.#aura.sequencerEffects.length, () => html`<ul class="automated-item-list automated-item-list-1-col">
				${this.#aura.sequencerEffects.map((sequence, idx) => html`
					<li>
						<span><strong>${sequence.effectPath}</strong></span>
						<button type="button" class="icon fas fa-edit" @click=${() => this.#editSequence(idx)} ?disabled=${!sequencerEnabled}></button>
						<button type="button" class="icon fas fa-trash" @click=${() => this.#deleteSequence(idx)} ?disabled=${!sequencerEnabled}></button>
					</li>
				`)}
			</ul>`)}

			${when(sequencerEnabled && this.#aura.sequencerEffects.length === 0, () => html`
				<p class="hint text-center">No sequencer effects configured. Click the plus above to create one.</p>
			`)}
		`;
	};

	/** @param {number} sequenceIndex */
	#sequenceEditNestedDialog = sequenceIndex => {
		const effect = this.#aura.sequencerEffects[sequenceIndex];

		return html`
			<form class="standard-form" @submit=${e => this.#updateArrayItem(e, this.#aura.sequencerEffects, sequenceIndex)}>
				<div class="standard-form" style="height: 480px; overflow-y: scroll; padding-right: 1rem;">
					<input type="hidden" name="uId" value=${effect.uId}>

					<div class="form-group">
						<label>Effect</label>
						<div class="form-fields">
							<input type="text" name="effectPath" value=${effect.effectPath}>
							<button type="button" @click=${() => Sequencer.DatabaseViewer.show()}>
								<i class="fas fa-database"></i>
							</button>
						</div>
						<p class="hint">The Sequencer file to play. Can be a filepath, wildcard filepath or database path.</p>
					</div>

					<div class="form-group">
						<label>Target Tokens</label>
						<div class="form-fields">
							<select name="targetTokens">
								${selectOptions(listAuraTargetFilters(), { selected: effect.targetTokens })}
							</select>
						</div>
					</div>

					<div class="form-group">
						<label>Trigger</label>
						<div class="form-fields">
							<select name="trigger">
								${selectOptions(SEQUENCE_TRIGGERS, { selected: effect.trigger })}
							</select>
						</div>
					</div>

					<div class="form-group">
						<label>Position</label>
						<div class="form-fields">
							<select name="position">
								${selectOptions(SEQUENCE_POSITIONS, { selected: effect.position })}
							</select>
						</div>
					</div>

					<hr/>

					<div class="form-group">
						<label>Repeats</label>
						<div class="form-fields">
							<label>Count</label>
							<input type="number" name="repeatCount" value=${effect.repeatCount} min="1">
							<label>Delay</label>
							<input type="number" name="repeatDelay" value=${effect.repeatDelay} min="0">
							<span class="units">ms</span>
						</div>
						<p class="hint">How many times the effect should play, and how long between repeats.</p>
					</div>

					<div class="form-group">
						<label>Start Delay</label>
						<div class="form-fields">
							<input type="number" name="delay" value=${effect.delay} min="0">
							<span class="units">ms</span>
						</div>
					</div>

					<div class="form-group">
						<label>Playback Rate</label>
						<div class="form-fields">
							<input type="number" name="playbackRate" value=${effect.playbackRate} min="0.01" step="0.01">
							<span class="units">x</span>
						</div>
					</div>

					<hr/>

					<div class="form-group">
						<label>Opacity</label>
						<div class="form-fields">
							<range-picker name="opacity" .value=${effect.opacity} min="0" max="1" step="0.05"></range-picker>
						</div>
					</div>

					<div class="form-group">
						<label>Fade In</label>
						<div class="form-fields">
							<input type="number" name="fadeInDuration" value=${effect.fadeInDuration} min="0">
							<span class="units" style="margin-right: 0.75rem">ms</span>
							<select name="fadeInEasing">
								${selectOptions(SEQUENCE_EASINGS, { selected: effect.fadeInEasing })}
							</select>
						</div>
					</div>

					<div class="form-group">
						<label>Fade Out</label>
						<div class="form-fields">
							<input type="number" name="fadeOutDuration" value=${effect.fadeOutDuration} min="0">
							<span class="units" style="margin-right: 0.75rem">ms</span>
							<select name="fadeOutEasing">
								${selectOptions(SEQUENCE_EASINGS, { selected: effect.fadeOutEasing })}
							</select>
						</div>
					</div>

					<hr/>

					<div class="form-group">
						<label>Scale</label>
						<div class="form-fields">
							<input type="number" name="scale" value=${effect.scale} min="0" step="0.01">
							<span class="units">x</span>
						</div>
					</div>

					<div class="form-group">
						<label>Scale In</label>
						<div class="form-fields">
							<input type="number" name="scaleInScale" value=${effect.scaleInScale}>
							<span class="units" style="margin-right: 0.75rem">x</span>
							<input type="number" name="scaleInDuration" value=${effect.scaleInDuration} min="0" step="0.01">
							<span class="units" style="margin-right: 0.75rem">ms</span>
							<select name="scaleInEasing" style="flex: 2">
								${selectOptions(SEQUENCE_EASINGS, { selected: effect.scaleInEasing })}
							</select>
						</div>
					</div>

					<div class="form-group">
						<label>Scale Out</label>
						<div class="form-fields">
							<input type="number" name="scaleOutScale" value=${effect.scaleOutScale}>
							<span class="units" style="margin-right: 0.75rem">x</span>
							<input type="number" name="scaleOutDuration" value=${effect.scaleOutDuration} min="0" step="0.01">
							<span class="units" style="margin-right: 0.75rem">ms</span>
							<select name="scaleOutEasing" style="flex: 2">
								${selectOptions(SEQUENCE_EASINGS, { selected: effect.scaleOutEasing })}
							</select>
						</div>
					</div>

					<hr/>

					<div class="form-group">
						<label>Below Tokens</label>
						<div class="form-fields">
							<input type="checkbox" name="belowTokens" ?checked=${effect.belowTokens}>
						</div>
						<p class="hint">Note that auras render at the same Z-index as tokens, so this also draws the effect below auras.</p>
					</div>
				</div>

				<div class="flexrow">
					<button type="button" @click=${() => this.#deleteSequence(sequenceIndex)}>
						<i class="fas fa-trash"></i> ${l("Delete")}
					</button>
					<button type="submit">
						<i class="fas fa-check"></i> ${l("Confirm")}
					</button>
				</div>
			</form>
		`;
	};

	#automationThtTab = () => html`
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
					${selectOptions(listAuraTargetFilters(), { selected: this.#aura.terrainHeightTools.targetTokens })}
				</select>
			</div>
		</div>
	`;

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

	#createEffect = () => {
		this.#aura.effects.push(effectConfigDefaults());
		this.#setAlternateContent(this.#effectEditNestedDialog(this.#aura.effects.length - 1), "Edit Effect");
		this.#auraUpdated();
	};

	/** @param {number} effectIndex */
	#editEffect = effectIndex => {
		this.#setAlternateContent(this.#effectEditNestedDialog(effectIndex), "Edit Effect");
		this.render();
	};

	/** @param {number} effectIndex */
	#deleteEffect = effectIndex => {
		this.#aura.effects = this.#aura.effects.filter((_, idx) => idx !== effectIndex);
		this.#setAlternateContent(null);
		this.#auraUpdated();
	};

	#createMacro = () => {
		this.#aura.macros.push(macroConfigDefaults());
		this.#setAlternateContent(this.#macroEditNestedDialog(this.#aura.macros.length - 1), "Edit Macro");
		this.#auraUpdated();
	};

	/** @param {number} macroIndex */
	#editMacro = macroIndex => {
		this.#setAlternateContent(this.#macroEditNestedDialog(macroIndex), "Edit Macro");
		this.render();
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

	#createSequence = () => {
		this.#aura.sequencerEffects.push(sequencerEffectConfigDefaults());
		this.#editSequence(this.#aura.sequencerEffects.length - 1);
		this.#auraUpdated();
	};

	/** @param {number} sequenceIndex */
	#editSequence = sequenceIndex => {
		this.#setAlternateContent(this.#sequenceEditNestedDialog(sequenceIndex), "Edit Sequencer Effect");
		this.render();
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
	 * @param {string} [title]
	 */
	#setAlternateContent(content, title) {
		this.#alternateContent = content;
		this.element.querySelector(".window-title").innerText = "Aura Configuration" + (title?.length ? ` :: ${title}` : "");
	}

	/** @override */
	render(...args) {
		const promise = super.render(...args);
		setTimeout(() => this.setPosition({ height: "auto" }));
		return promise;
	}

	/** @override */
	_onFirstRender(...args) {
		super._onFirstRender(...args);
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
	_replaceHTML(templateResult, container, { isFirstRender }) {
		render(templateResult, container);

		if (isFirstRender) {
			container.addEventListener("tabchange", () => setTimeout(() => this.setPosition({ height: "auto" })));
		}
	}

	/** @override */
	async close(options) {
		if (this.#alternateContent !== null) {
			this.#setAlternateContent(null);
			this.render();
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
