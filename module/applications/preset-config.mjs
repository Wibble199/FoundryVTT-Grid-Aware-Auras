/** @import { AuraConfig } from "../data/aura.mjs"; */
/** @import { Preset } from "../data/preset.mjs" */
import { ContextMenu } from "../components/context-menu.mjs";
import "../components/multi-select.mjs";
import { LINE_TYPES } from "../consts.mjs";
import { createAura, exportAuraJson, getAura, importAuraJson } from "../data/aura.mjs";
import { getPresets, savePresets } from "../data/preset.mjs";
import { html, render, when } from "../lib/lit-all.min.js";
import { AuraConfigApplication } from "./aura-config.mjs";

const { ApplicationV2 } = foundry.applications.api;

export class PresetConfigApplication extends ApplicationV2 {

	static DEFAULT_OPTIONS = {
		window: {
			contentClasses: ["sheet", "standard-form", "grid-aware-auras-preset-config"],
			icon: "far fa-cube",
			title: "Aura Preset Configuration"
		},
		position: {
			width: 720,
			height: "auto"
		}
	};

	#presets;

	/** @type {Map<string, AuraConfigApplication>} */
	#openAuraConfigApps = new Map();

	constructor() {
		super();

		this.#presets = getPresets();
	}

	/** @override */
	_renderHTML() {
		const actorTypes = Object.keys(game.model.Actor).filter(a => a !== "base").map(a => ({
			label: game.i18n.localize(`TYPES.Actor.${a}`),
			value: a
		}));

		return html`
			<table class="grid-aware-auras-table">
				<thead>
					<tr style="background: none">
						<th class="text-left">Name</th>
						<th class="text-center" style="width: 58px">Radius</th>
						<th class="text-center" style="width: 58px">Line</th>
						<th class="text-center" style="width: 58px">Fill</th>
						<td class="text-center" style="width: 190px">Auto-apply to <i class="fas fa-question-circle cursor-help" data-tooltip="Automatically apply this aura to newly created tokens of the selected actor types"></i></td>
						<th class="text-center" style="width: 24px">
							<a @click=${this.#openCreateContextMenu}>
								<i class="fas fa-plus"></i>
							</a>
						</th>
					</tr>
				</thead>
				<tbody>
					${this.#presets.map((preset, idx) => html`
						<tr @contextmenu=${e => this.#openContextMenu(preset, idx, e)}>
							<td>
								<a @click=${() => this.#editAura(preset.config)}>
									${preset.config.name}
									${when(preset.config.effects?.length || preset.config.macros?.length || preset.config.sequencerEffects?.length,
										() => html`<i class="fas fa-bolt" data-tooltip="This aura applies effects or calls macros"></i>`)}
								</a>
							</td>
							<td class="text-center" style="width: 58px">
								${preset.config.radius}
							</td>
							<td class="text-center" style="width: 58px">
								${when(preset.config.lineType !== LINE_TYPES.NONE,
									() => html`<input type="color" value="${preset.config.lineColor}" disabled>`)}
							</td>
							<td class="text-center" style="width: 58px">
								${when(preset.config.fillType !== CONST.DRAWING_FILL_TYPES.NONE,
									() => html`<input type="color" value="${preset.config.fillColor}" disabled>`)}
							</td>
							<td>
								<gaa-multi-select
									.items=${actorTypes}
									placeholder="None"
									.value=${preset.applyToNew}
									@change=${e => this.#updateApplyToNew(preset.config, e)}
								></gaa-multi-select>
							</td>
							<td class="text-center" style="width: 24px">
								${when(!this.disabled, () => html`
									<a @click=${e => this.#openContextMenu(preset, idx, e)} style="width: 100%; display: inline-block;">
										<i class="fas fa-ellipsis-vertical"></i>
									</a>
								`)}
							</td>
						</tr>
					`)}
				</tbody>
			</table>
			<p class="hint">Tip: You can also save existing auras as a preset.</p>

			<footer class="sheet-footer">
				<button @click=${this.#savePresets}>Save Presets</button>
			</footer>
		`;
	}

	/** @override */
	_replaceHTML(templateResult, container) {
		render(templateResult, container);
	}

	/** @param {Event} e */
	#openCreateContextMenu = e => {
		ContextMenu.open(e, [
			{
				label: "New",
				icon: "fas fa-file",
				onClick: () => this.#createNewAura()
			},
			{
				label: "Import JSON",
				icon: "fas fa-upload",
				onClick: () => this.#importJson()
			}
		]);
	};

	/**
	 * @param {Preset} preset
	 * @param {number} idx
	 * @param {MouseEvent} e
	 */
	#openContextMenu = (preset, idx, e) => {
		e.preventDefault();
		e.stopPropagation();

		ContextMenu.open(e, [
			{
				label: "Edit",
				icon: "fas fa-edit",
				onClick: () => this.#editAura(preset.config)
			},
			idx > 0 && {
				label: "Move to Top",
				icon: "fas fa-arrow-up-to-line",
				onClick: () => this.#reorderPreset(idx, 0)
			},
			idx > 0 && {
				label: "Move Up",
				icon: "fas fa-arrow-up",
				onClick: () => this.#reorderPreset(idx, idx - 1)
			},
			idx < this.#presets.length - 1 && {
				label: "Move Down",
				icon: "fas fa-arrow-down",
				onClick: () => this.#reorderPreset(idx, idx + 1)
			},
			idx < this.#presets.length - 1 && {
				label: "Move to Bottom",
				icon: "fas fa-arrow-down-to-line",
				onClick: () => this.#reorderPreset(idx, this.#presets.length - 1)
			},
			{
				label: "Duplicate",
				icon: "fas fa-clone",
				onClick: () => {
					const clonedAura = getAura({ ...preset.config, id: foundry.utils.randomID() });
					this.#editAura(clonedAura);
					this.#presets = [...this.#presets, { config: clonedAura }];
					this.render();
				}
			},
			{
				label: "Export JSON",
				icon: "fas fa-download",
				onClick: () => exportAuraJson(preset.config)
			},
			{
				label: "Delete",
				icon: "fas fa-trash",
				onClick: () => {
					this.#presets = this.#presets.filter(p => p.config.id !== preset.config.id);
					this.render();
				}
			}
		]);
	};

	#createNewAura() {
		const newAura = createAura();
		this.#presets = [...this.#presets, { config: newAura }];
		this.render();
	}

	async #importJson() {
		const newAura = await importAuraJson();
		this.#presets = [...this.#presets, { config: newAura }];
		this.render();
	}

	/** @param {AuraConfig} aura */
	#editAura(aura) {
		if (this.#openAuraConfigApps.has(aura.id)) return;

		const app = new AuraConfigApplication(aura, {
			onChange: newAura => {
				this.#presets = this.#presets.map(p => p.config.id === aura.id ? { ...p, config: newAura } : p);
				this.render();
			},
			onClose: () => this.#openAuraConfigApps.delete(aura.id),
			parentId: this.id
		});

		this.#openAuraConfigApps.set(aura.id, app);

		app.render(true);
	}

	/**
	 * @param {AuraConfig} aura
	 * @param {Event} e
	 */
	#updateApplyToNew(aura, e) {
		const applyToNew = e.target.value;
		this.#presets = this.#presets.map(p => p.config.id === aura.id ? { ...p, applyToNew } : p);
	}

	/**
	 * Re-orders a preset from a current position into the given position.
	 * @param {number} from
	 * @param {number} to
	 */
	#reorderPreset(from, to) {
		const [preset] = this.#presets.splice(from, 1);
		this.#presets.splice(to, 0, preset);
		this.render();
	}

	#savePresets = async () => {
		await savePresets(this.#presets);
		this.close();
	};

	/**
	 * Closes any Aura dialogs that have been opened.
	 */
	_closeOpenDialogs() {
		for (const auraConfig of this.#openAuraConfigApps.values()) {
			auraConfig.close({ callOnClose: false });
		}
	}

	/** @override */
	async close(...args) {
		this._closeOpenDialogs();
		return await super.close(...args);
	}
}
