import { ENABLE_MACRO_AUTOMATION_SETTING, MODULE_NAME } from "../consts.mjs";

/**
 * @param {Token} token
 * @param {Token} parent
 * @param {import("../data/aura.mjs").AuraConfig} aura
 * @param {{ hasEntered: boolean; isPreview: boolean; isInit: boolean; userId: string; }} options
 */
export function onEnterLeaveAura(token, parent, aura, { hasEntered, isInit, userId }) {
	if (!game.settings.get(MODULE_NAME, ENABLE_MACRO_AUTOMATION_SETTING)) return;

	for (const auraMacro of aura.macros) {
		const macro = game.macros.get(auraMacro.macroId);
		if (macro) {
			// Foundry already wraps the execution inside a try..catch, so we do not need to worry about errors thrown in macros.
			macro.execute({ token, parent, aura, options: { hasEntered, isPreview: token.isPreview || parent.isPreview, isInit, userId } });
		} else {
			warn(`Attempted to call macro with ID '${auraMacro.macroId}' due to enter/leave from aura '${aura.name}' on token '${parent.name}', but it could not be found.`);
		}
	}
}
