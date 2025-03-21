/** @import { AuraConfig } from "../data/aura.mjs"; */
import { ENABLE_EFFECT_AUTOMATION_SETTING, ENABLE_MACRO_AUTOMATION_SETTING, LINE_TYPES, MODULE_NAME, TOKEN_AURAS_FLAG } from "../consts.mjs";
import { createAura, getAura, getTokenAuras } from "../data/aura.mjs";
import { AuraConfigApplication } from "./aura-config.mjs";
import { ContextMenuGaa } from "./context-menu-gaa.mjs";

const openAuraConfigApps = Symbol("openAuraConfigApps");

/**
 * Wrapper for the TokenConfig._renderInner function to add the GAA aura config to it.
 * @param {TokenConfig["_renderInner"]} wrapped
 * @param {Parameters<TokenConfig["_renderInner"]>} args
 * @this {TokenConfig}
 */
export async function tokenConfigRenderInner(wrapped, ...args) {
	const html = await wrapped(...args);

	/** @type {Map<string, AuraConfigApplication>} */
	this[openAuraConfigApps] = this[openAuraConfigApps] ?? new Map();

	// Insert a tab item for the new control
	html.find("> nav.sheet-tabs").append(`
		<a class="item" data-tab="gridawareauras"><i class="far fa-hexagon"></i> ${game.i18n.localize("GRIDAWAREAURAS.Auras")}</a>
	`);

	// Load template
	const template = await getTemplate(`modules/${MODULE_NAME}/templates/token-aura-config.hbs`);

	// Create the tab content
	const tagContent = $(`<div class="tab" data-group="main" data-tab="gridawareauras"></div>`);
	html.find("> footer").before(tagContent);

	const getCurrentAuras = () => getTokenAuras(this.preview ?? this.document);

	const renderAuraConfig = () => {
		const auras = getCurrentAuras();
		const flagPath = `flags.${MODULE_NAME}.${TOKEN_AURAS_FLAG}`;
		tagContent.html(template({
			auras,
			flagPath,
			LINE_TYPES,
			FILL_TYPES: CONST.DRAWING_FILL_TYPES,
			showGridTypeWarning: !this.isPrototype && canvas.grid.type === CONST.GRID_TYPES.GRIDLESS,
			effectsEnabled: game.settings.get(MODULE_NAME, ENABLE_EFFECT_AUTOMATION_SETTING),
			macrosEnabled: game.settings.get(MODULE_NAME, ENABLE_MACRO_AUTOMATION_SETTING)
		}));
		tagContent.find(`[name="${flagPath}"]`).val(JSON.stringify(auras));
		if (this._state === Application.RENDER_STATES.RENDERED)
			this.setPosition();
	};

	renderAuraConfig();

	// --------------- //
	// Setup listeners //
	// --------------- //
	/**
	 * Opens a dialog and begins editing the given Aura.
	 * @param {AuraConfig} aura
	 */
	const editAura = aura => {
		if (this[openAuraConfigApps].has(aura.id)) return;

		const app = new AuraConfigApplication(aura);
		this[openAuraConfigApps].set(aura.id, app);

		app.onChange = newAura => {
			this._previewChanges({
				[`flags.${MODULE_NAME}.${TOKEN_AURAS_FLAG}`]: getCurrentAuras().map(a => a.id === aura.id ? ({ ...a, ...newAura }) : a)
			});
			this.render();
		};

		app.onClose = () => {
			this[openAuraConfigApps].delete(aura.id);
		};

		app.render(true);
	};

	/**
	 * Sets the aura to be enabled/disabled or to toggle.
	 * @param {number} auraId
	 * @param {boolean} [force]
	*/
	const toggleAuraEnabled = (auraId, force) => {
		this._previewChanges({
			[`flags.${MODULE_NAME}.${TOKEN_AURAS_FLAG}`]: getCurrentAuras().map(a => ({
				...a,
				enabled: a.id === auraId ? (typeof force === "boolean" ? force : !a.enabled) : a.enabled
			}))
		});
		renderAuraConfig();
	};

	tagContent.on("click", "[data-action='grid-aware-auras-add']", () => {
		const aura = createAura();
		editAura(aura);
		this._previewChanges({
			[`flags.${MODULE_NAME}.${TOKEN_AURAS_FLAG}`]: [...getCurrentAuras(), aura]
		});
		renderAuraConfig();
	});

	tagContent.on("change", "[data-action='grid-aware-auras-toggle-enabled']", withAuraDom((_, auraId) => {
		toggleAuraEnabled(auraId);
	}));

	/**
	 * Enriches the DOM event with the aura ID and aura as determined by the [data-aura-id] DOM attribute.
	 * @param {(e: Event, auraId: number, aura: AuraConfig) => void} callback
	 * @returns {(e: Event) => void}
	 */
	function withAuraDom(callback) {
		return e => {
			const { auraId } = e.target.closest("[data-aura-id]").dataset;
			const aura = getCurrentAuras().find(a => a.id == auraId)
			callback(e, auraId, aura);
		};
	};

	// ------------------ //
	// Setup context menu //
	// ------------------ //
	new ContextMenuGaa(html, "[data-aura-id]", [
		{
			name: "Edit",
			icon: "<i class='fas fa-edit'></i>",
			callback: withAuraContextMenu((_, aura) => editAura(aura))
		},
		{
			name: "Enable",
			icon: "<i class='fas fa-toggle-on'></i>",
			callback: withAuraContextMenu(auraId => toggleAuraEnabled(auraId, true)),
			condition: withAuraContextMenu((_, aura) => !aura.enabled)
		},
		{
			name: "Disable",
			icon: "<i class='fas fa-toggle-off'></i>",
			callback: withAuraContextMenu(auraId => toggleAuraEnabled(auraId, false)),
			condition: withAuraContextMenu((_, aura) => aura.enabled)
		},
		{
			name: "Duplicate",
			icon: "<i class='fas fa-clone'></i>",
			callback: withAuraContextMenu((_, aura) => {
				const clonedAura = getAura({ ...aura, id: foundry.utils.randomID() });
				editAura(clonedAura);
				this._previewChanges({
					[`flags.${MODULE_NAME}.${TOKEN_AURAS_FLAG}`]: [...getCurrentAuras(), clonedAura]
				});
				renderAuraConfig();
			})
		},
		{
			name: "Delete",
			icon: "<i class='fas fa-trash'></i>",
			callback: withAuraContextMenu(auraId => {
				this._previewChanges({
					[`flags.${MODULE_NAME}.${TOKEN_AURAS_FLAG}`]: getCurrentAuras().filter(a => a.id !== auraId)
				});
				renderAuraConfig();
			})
		}
	]);

	// Also open the context menu when the 3-dot button is clicked
	tagContent.on("click", "[data-action='grid-aware-auras-context-menu']", e => {
		e.preventDefault();
		e.stopPropagation();
		const { clientX, clientY } = e;
		e.currentTarget.closest("[data-aura-id]").dispatchEvent(new PointerEvent("contextmenu", {
			view: window, bubbles: true, cancelable: true, clientX, clientY
		}));
	});

	/**
	 * Enriches the context menu callback with the aura ID and aura as determined by the [data-aura-id] DOM attribute.
	 * @template T
	 * @param {(auraId: number, aura: AuraConfig) => T} callback
	 * @returns {(el: JQuery) => T}
	 */
	function withAuraContextMenu(callback) {
		return el => {
			const auraId = el.data("auraId");
			const aura = getCurrentAuras().find(a => a.id == auraId)
			return callback(auraId, aura);
		};
	};

	return html;
}

/**
 * Hook for when the TokenConfig dialog is closed.
 * @param {TokenConfig} tokenConfig
 */
export function tokenConfigClose(tokenConfig) {
	/** @type {Map<string, AuraConfigApplication>} */
	const auraConfigs = tokenConfig[openAuraConfigApps];
	if (!auraConfigs) return;

	for (const auraConfig of auraConfigs.values())
		auraConfig.close({ callOnClose: false });
}
