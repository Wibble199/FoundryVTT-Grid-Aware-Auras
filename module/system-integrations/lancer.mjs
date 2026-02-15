import { registerRadiusExpressionExtension } from "../data/aura-radius-expression-extensions.mjs";

const weaponDefaultThreat = 1; // "Unless specified otherwise, all weapons default to 1 Threat"

export function setupLancerSystemIntegration() {
	// Register a radius expression extension that resolves to the largest threat of an actor
	registerRadiusExpressionExtension(
		"lancer.actor_max_threat",
		actor => actor?.items?.reduce((maxRange, item) => {
			// Ignore destroyed items
			if (item.system.destroyed)
				return maxRange;

			switch (item.type) {
				case "mech_weapon":
					return Math.max(maxRange, findRange(item.system.active_profile.range, "Threat", weaponDefaultThreat));

				case "npc_feature":
					return item.system.type === "Weapon" // Ignore non-weapon NPC features
						? Math.max(maxRange, findRange(item.system.range, "Threat", weaponDefaultThreat))
						: maxRange;

				case "pilot_weapon":
					return Math.max(maxRange, findRange(item.system.range, "Threat", weaponDefaultThreat));

				default:
					return maxRange;
			}
		}, -1) ?? -1,
		{
			description: "The largest/maximum weapon threat for the actor based on it's items. Returns -1 (which will disable the aura) if no items grant threat."
		}
	);

	// Register a radius expression extension that resolves to the largest range of an actor
	registerRadiusExpressionExtension(
		"lancer.actor_max_range",
		actor => actor?.items?.reduce((maxRange, item) => {
			// Ignore destroyed items
			if (item.system.destroyed)
				return maxRange;

			switch (item.type) {
				case "mech_weapon":
					return Math.max(maxRange, findRange(item.system.active_profile.range, "Range"));

				case "npc_feature":
					return item.system.type === "Weapon" // Ignore non-weapon NPC features
						? Math.max(maxRange, findRange(item.system.range, "Range"))
						: maxRange;

				case "pilot_weapon":
					return Math.max(maxRange, findRange(item.system.range, "Range"));

				default:
					return maxRange;
			}
		}, -1) ?? -1,
		{
			description: "The largest/maximum weapon range for the actor based on it's items. Returns -1 (which will disable the aura) if no items have a range."
		}
	);
}

/**
 * Attempts to find a range value from the given range array.
 * @param {{ type: string; val: number; }[]} ranges
 * @param {string} rangeType
 * @param {number} defaultRange Default range if the specific rangeType could not be found
 */
function findRange(ranges, rangeType, defaultRange = -1) {
	const threat = +ranges?.find(r => r.type === rangeType)?.val;
	return Number.isNaN(threat) ? defaultRange : threat;
}
