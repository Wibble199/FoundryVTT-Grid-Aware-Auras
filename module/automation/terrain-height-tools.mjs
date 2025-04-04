import { MODULE_NAME } from "../consts.mjs";
import { canTargetToken } from "../data/aura-target-filters.mjs";
import { isTerrainHeightToolsActive } from "../utils/misc-utils.mjs";

/**
 * @param {Token} token
 * @param {Token} parent
 * @param {import("../data/aura.mjs").AuraConfig} aura
 * @param {{ hasEntered: boolean; isPreview: boolean; isInit: boolean; userId: string; }} options
 */
export function onEnterLeaveAura(token, parent, aura, { hasEntered, userId }) {
	if (userId === game.userId && parent.isPreview && aura.terrainHeightTools.rulerOnDrag !== "NONE" && isTerrainHeightToolsActive()) {
		const group = [MODULE_NAME, parent.document.uuid, aura.id, token.document.uuid].join("|");
		if (hasEntered && canTargetToken(token, parent, aura, aura.terrainHeightTools.targetTokens))
			terrainHeightTools.drawLineOfSightRaysBetweenTokens(parent, token, { group, drawForOthers: false, includeEdges: aura.terrainHeightTools.rulerOnDrag === "E2E" });
		else
			terrainHeightTools.clearLineOfSightRays({ group });
	}
}
