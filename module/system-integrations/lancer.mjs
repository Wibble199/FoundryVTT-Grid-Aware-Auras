import { registerRadiusExpressionExtension } from "../data/aura-radius-expression-extensions.mjs";

const weaponDefaultRange = 1; // "Unless specified otherwise, all weapons default to 1 Threat"

export function setupLancerSystemIntegration() {
	// Register a radius expression extension that resolves to the threat range of an actor
	registerRadiusExpressionExtension(
		"lancer.actor_threat",
		actor => actor?.items?.reduce((maxRange, item) => {
			// Ignore destroyed items
			if (item.system.destroyed)
				return maxRange;

			switch (item.type) {
				case "mech_weapon":
					return Math.max(maxRange, findThreatRange(item.system.active_profile.range));

				case "npc_feature":
					return item.system.type === "Weapon" // Ignore non-weapon NPC features
						? Math.max(maxRange, findThreatRange(item.system.range))
						: maxRange;

				case "pilot_weapon":
					return Math.max(maxRange, findThreatRange(item.system.range));

				default:
					return maxRange;
			}
		}, -1) ?? -1,
		{
			description: "The largest/maximum threat range for the actor based on it's items. Returns -1 (which will disable the aura) if no items grant threat."
		}
	);
}

/** Attempts to find a threat value from the given range array. */
function findThreatRange(ranges) {
	const threat = +ranges?.find(r => r.type === "Threat")?.val;
	return Number.isNaN(threat) ? weaponDefaultRange : threat;
}
