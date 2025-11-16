/** @import { AuraConfig, importAuraJson } from "../data/aura.mjs" */
/** @import { Preset } from "../data/preset.mjs" */
import { AuraConfigApplication } from "../applications/aura-config.mjs";
import { PresetManagerApplication } from "../applications/preset-manager.mjs";
import { ENABLE_EFFECT_AUTOMATION_SETTING, ENABLE_MACRO_AUTOMATION_SETTING, LINE_TYPES, MODULE_NAME } from "../consts.mjs";
import { calculateAuraRadius, createAura, exportAuraJson, getAura } from "../data/aura.mjs";
import { getPresetsRaw, saveAuraAsNewPreset } from "../data/preset.mjs";
import { html, LitElement, when } from "../lib/lit-all.min.js";
import { ContextMenu } from "./context-menu.mjs";

export const elementName = "gaa-aura-table";

export class AuraTable extends LitElement {

	static properties = {
		value: { attribute: "value", type: Array, reflect: true },
		disabled: { type: Boolean },
		showHeader: { type: Boolean },
		subHeadingText: { type: String },
		parentId: { type: String },
		attachConfigsTo: { attribute: false },
		radiusContext: { attribute: false }
	};

	static formAssociated = true;

	/** @type {ElementInternals} */
	#internals;

	/** @type {Map<string, AuraConfigApplication>} */
	#openAuraConfigApps = new Map();

	constructor() {
		super();

		this.#internals = this.attachInternals();

		/** @type {AuraConfig[]} */
		this.value = [];

		/** @type {boolean} */
		this.disabled = false;

		this.showHeader = true;

		/** @type {string | undefined} */
		this.subHeadingText = undefined;

		/** @type {string | undefined} */
		this.parentId = undefined;

		/** @type {Object | undefined} */
		this.attachConfigsTo = undefined;

		/** @type {{ actor: Actor | undefined; item: Item | undefined; }} */
		this.radiusContext = { actor: undefined, item: undefined };
	}

	get form() {
		return this.#internals.form;
	}

	get name() {
		return this.getAttribute("name");
	}

	get type() {
		return this.localName;
	}

	get canEditPresets() {
		// Presets setting is a world-level setting so needs GM permissions
		return game.user.isGM;
	}

	render() {
		const effectsEnabled = game.settings.get(MODULE_NAME, ENABLE_EFFECT_AUTOMATION_SETTING);
		const macrosEnabled = game.settings.get(MODULE_NAME, ENABLE_MACRO_AUTOMATION_SETTING);

		return html`
			<table class="grid-aware-auras-table">
				<thead>
					${when(this.showHeader, () => html`
						<tr style="background: none">
							<th style="width: 24px">&nbsp;</th>
							<th class="text-left">${when(!this.subHeadingText?.length, () => "Name")}</th>
							<th class="text-center" style="width: 58px">Radius</th>
							<th class="text-center" style="width: 58px">Line</th>
							<th class="text-center" style="width: 58px">Fill</th>
							<th class="text-center" style="width: 24px">
								${when(!this.disabled, () => html`
									<a data-action="create-aura" @click=${this.#createAuraContextMenu}>
										<i class="fas fa-plus"></i>
									</a>
								`)}
							</th>
						</tr>
					`)}

					${when(this.subHeadingText?.length, () => html`
						<tr style="background: none">
							<th colspan="6">
								<div class="grid-aware-auras-table-item-header">
									<span>${this.subHeadingText}</span>
									<hr class="hr-narrow" />
								</div>
							</th>
						</tr>
					`)}
				</thead>
				<tbody>
					${this.value.map(a => this.#renderAura(a, effectsEnabled, macrosEnabled))}
				</tbody>
			</table>
		`;
	}

	/**
	 * @param {AuraConfig} aura
	 * @param {boolean} effectsEnabled
	 * @param {boolean} macrosEnabled
	 */
	#renderAura(aura, effectsEnabled, macrosEnabled) {
		const isCalculateRadius = typeof aura.radius !== "number" && isNaN(parseInt(aura.radius)) && aura.radius.length;
		const calculatedRadius = calculateAuraRadius(aura.radius, this.radiusContext);

		return html`
			<tr data-aura-id=${aura.id} @contextmenu=${e => this.#openContextMenu(aura, e)}>
				<td style="width: 24px">
					${this.disabled
						// eslint-disable-next-line @stylistic/js/indent
						? html`<p style="width: 18px">
							<i class=${`fas fa-toggle-${aura.enabled ? "on" : "off"}`}></i>
						</p>`
						// eslint-disable-next-line @stylistic/js/indent
						: html`<a data-tooltip="Enable/disable aura" style="width: 18px" @click=${() => !this.disabled && this.#setAuraEnabled(aura.id, !aura.enabled)}>
							<i class=${`fas fa-toggle-${aura.enabled ? "on" : "off"}`}></i>
						</a>`
					}
				</td>
				<td>
					<a @click=${() => this.#editAura(aura)}>
						${aura.name}
						${when((effectsEnabled && aura.effects?.length) || (macrosEnabled && aura.macros?.length) || aura.sequencerEffects?.length,
							() => html`<i class="fas fa-bolt" data-tooltip="This aura applies effects or calls macros"></i>`)}
					</a>
				</td>
				<td class="text-center" style="width: 58px">
					${calculatedRadius}
					${when(isCalculateRadius && typeof calculatedRadius !== "number", () => html`<i class="fas fa-warning cursor-help" data-tooltip=${game.i18n.format("GRIDAWAREAURAS.UnresolvedRadiusTableWarning", { path: `<code>${aura.radius}</code>` })}></i>`)}
					${when(isCalculateRadius && typeof calculatedRadius === "number", () => html`<i class="fas fa-link cursor-help" data-tooltip=${aura.radius}></i>`)}
				</td>
				<td class="text-center" style="width: 58px">
					${when(aura.lineType !== LINE_TYPES.NONE,
						() => html`<input type="color" value="${aura.lineColor}" disabled>`)}
				</td>
				<td class="text-center" style="width: 58px">
					${when(aura.fillType !== CONST.DRAWING_FILL_TYPES.NONE,
						() => html`<input type="color" value="${aura.fillColor}" disabled>`)}
				</td>
				<td class="text-center" style="width: 24px">
					${when(!this.disabled, () => html`
						<a @click=${e => this.#openContextMenu(aura, e)} style="width: 100%; display: inline-block;">
							<i class="fas fa-ellipsis-vertical"></i>
						</a>
					`)}
				</td>
			</tr>
		`;
	}

	/** @param {Map<string, any>} changedProperties */
	updated(changedProperties) {
		if (changedProperties.has("value")) {
			this.#internals.setFormValue(JSON.stringify(this.value));
		}
	}

	/** @param {Event} e */
	#createAuraContextMenu = e => {
		const presets = getPresetsRaw();

		ContextMenu.open(e, [
			{
				label: "New",
				icon: "fas fa-file",
				onClick: () => this.#createNewAura()
			},
			(presets.length || this.canEditPresets) && {
				label: "Add Preset",
				icon: "far fa-cube",
				children: [
					...presets.map(preset => ({
						label: preset.config.name,
						onClick: () => this.#createAuraFromConfig(preset.config)
					})),
					...this.canEditPresets ? [
						presets.length && {
							type: "separator"
						},
						{
							label: "Edit presets",
							onClick: () => new PresetManagerApplication().render(true)
						}
					] : []
				]
			},
			{
				label: "Import JSON",
				icon: "fas fa-upload",
				onClick: () => this.#importJson()
			}
		]);
	};

	/**
	 * Creates a new aura and opens the edit dialog for it.
	 */
	#createNewAura() {
		const aura = createAura();
		this.value = [...this.value, aura];
		this.#dispatchChangeEvent();
		this.#editAura(aura);
	}

	/**
	 * Creates a new aura from the given aura config.
	 * @param {Partial<AuraConfig>} auraConfig
	 */
	#createAuraFromConfig(auraConfig) {
		const aura = getAura(auraConfig, { newId: true });
		this.value = [...this.value, aura];
		this.#dispatchChangeEvent();
	}

	/**
	 * Shows a dialog to the user and asks them to provide JSON for a new aura.
	 */
	async #importJson() {
		const aura = await importAuraJson();
		this.value = [...this.value, aura];
		this.#dispatchChangeEvent();
		this.#editAura(aura);
	}

	/**
	 * Opens an edit dialog for the given aura.
	 * @param {AuraConfig} aura
	*/
	#editAura(aura) {
		if (this.#openAuraConfigApps.has(aura.id)) return;

		const app = new AuraConfigApplication(aura, {
			onChange: newAura => {
				this.value = this.value.map(a => a.id === aura.id ? { ...a, ...newAura } : a);
				this.#dispatchChangeEvent();
			},
			onClose: () => this.#openAuraConfigApps.delete(aura.id),
			parentId: this.parentId,
			attachTo: this.attachConfigsTo,
			radiusContext: this.radiusContext
		});

		this.#openAuraConfigApps.set(aura.id, app);

		app.render(true);
	}

	/**
	 * @param {string} auraId
	 * @param {boolean} enabled
	 */
	#setAuraEnabled(auraId, enabled) {
		this.value = this.value.map(a => a.id === auraId ? { ...a, enabled } : a);
		this.#dispatchChangeEvent();
	}

	/**
	 * @param {AuraConfig} aura
	 * @param {MouseEvent} e
	 */
	#openContextMenu(aura, e) {
		e.preventDefault();
		e.stopPropagation();

		ContextMenu.open(e, [
			{
				label: "Edit",
				icon: "fas fa-edit",
				onClick: () => this.#editAura(aura)
			},
			!aura.enabled && {
				label: "Enable",
				icon: "fas fa-toggle-on",
				onClick: () => this.#setAuraEnabled(aura.id, true)
			},
			aura.enabled && {
				label: "Disable",
				icon: "fas fa-toggle-off",
				onClick: () => this.#setAuraEnabled(aura.id, false)
			},
			{
				label: "Duplicate",
				icon: "fas fa-clone",
				onClick: () => {
					const clonedAura = getAura({ ...aura, id: foundry.utils.randomID() });
					this.#editAura(clonedAura);
					this.value = [...this.value, clonedAura];
					this.#dispatchChangeEvent();
				}
			},
			this.canEditPresets && {
				label: "Save as Preset",
				icon: "fas fa-floppy-disk",
				onClick: () => saveAuraAsNewPreset(aura)
			},
			{
				label: "Export JSON",
				icon: "fas fa-download",
				onClick: () => exportAuraJson(aura)
			},
			{
				label: "Delete",
				icon: "fas fa-trash",
				onClick: () => {
					this.value = this.value.filter(a => a.id !== aura.id);
					this.#dispatchChangeEvent();
				}
			}
		]);
	}

	#dispatchChangeEvent() {
		this.#internals.setFormValue(JSON.stringify(this.value));
		const event = new Event("change", { bubbles: true, composed: true });
		this.dispatchEvent(event);
	}

	/**
	 * Closes any Aura dialogs that have been opened.
	 */
	_closeOpenDialogs() {
		for (const auraConfig of this.#openAuraConfigApps.values()) {
			auraConfig.close({ callOnClose: false });
		}
	}

	createRenderRoot() {
		return this;
	}
}

customElements.define(elementName, AuraTable);
