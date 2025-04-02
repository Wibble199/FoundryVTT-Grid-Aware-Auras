# Grid-Aware Auras

[![Latest module version](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fgithub.com%2FWibble199%2FFoundryVTT-Grid-Aware-Auras%2Freleases%2Flatest%2Fdownload%2Fmodule.json&query=%24.version&prefix=v&style=for-the-badge&label=module%20version)](https://github.com/Wibble199/FoundryVTT-Grid-Aware-Auras/releases/latest)
![Latest Foundry version](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fgithub.com%2FWibble199%2FFoundryVTT-Grid-Aware-Auras%2Freleases%2Flatest%2Fdownload%2Fmodule.json&query=%24.compatibility.verified&style=for-the-badge&label=foundry%20version&color=fe6a1f)
<br/>
[![GitHub downloads (total)](https://img.shields.io/github/downloads/Wibble199/FoundryVTT-Grid-Aware-Auras/release.zip?style=for-the-badge&label=downloads%20(total))](https://github.com/Wibble199/FoundryVTT-Grid-Aware-Auras/releases/latest)
[![GitHub downloads (latest version)](https://img.shields.io/github/downloads/Wibble199/FoundryVTT-Grid-Aware-Auras/latest/release.zip?style=for-the-badge&label=downloads%20(latest))](https://github.com/Wibble199/FoundryVTT-Grid-Aware-Auras/releases/latest)

A module which draws grid-accurate auras around tokens, which supports any size token and has customisable display styles.

![Preview image](./docs/img/preview.png)

## Installation

Simply search for 'Grid-Aware Auras' in the Foundry 'Install Module' screen and install it from there.

Alternatively, paste this URL into the 'Manifest URL' field of the 'Install Module' dialog in the Foundry configuration: `https://github.com/Wibble199/FoundryVTT-Grid-Aware-Auras/releases/latest/download/module.json`, then enable the module in your world.

## Usage

1. First open a token configuration by using the cog button when right-clicking a token on the scene, or open the prototype token configuration for an actor.
2. Then, navigate to the new "Auras" tab, then click the `+` button to create a new aura. You can then set the size of the aura, how you want it to appear visually, [when it should be visible](#visibility), and whether you want to add any [automation functionality](#automation). You can add as many auras as you want!
3. If you need to edit an existing aura, you can click the cog button next to it to edit it. You can also quickly toggle whether that aura is visible by clicking the eye icon.
4. Finally, just click the "Update Token" button.

### Visibility

By default, newly created auras are visible to everyone so long as the token itself is visible. This can be changed in the 'Visibility' tab of the aura's config.

There are some options you can choose from in the dropdown, similar to the Foundry's default "Display Bar" option for token resource bars.

You can also fine-tune the visibility conditions, though this is a little more advanced:

![Visibility config](./docs/img/visibility-matrix.png)

The custom setting enables the checkbox table below the dropdown. This table shows a list of 'states' in the first column, followed by a checkbox for owner and non-owner visibility.

GAA computes visibility by checking which states are applicable, determining whether you are an owner of the token or not, then looking up whether the checkbox is ticked; If so, then the aura is visible. If there are multiple applicable states (for example targeted AND hovered), then the aura will show if ANY of the appliable states are ticked. The so-called 'Default' state is slightly special in that it applies ONLY when there are no other applicable states (i.e. when you are NOT hovering, and NOT targeting, and NOT the token's turn etc.).

In the above example, the aura is visible to a user when that user is hovering the token; OR when the token is selected/controlled (only possible by it's owner); OR if the user owns the token and it is that token's turn in the combat tracker.

### Automation

#### Effect

This automation allows applying or removing effects from tokens in the aura under certain conditions.

The '_Enable Effect Automation_' setting must be enabled by the GM in the settings for this feature to be available. It defaults to disabled.

- _Effect_ - Select an effect that will be applied to/removed from tokens within the aura.
- _Overlay?_ - If checked, the effect will be added as an overlay (i.e. the icon will appear over the whole token).
- _Target Tokens_ - This is used to limit which tokens have effects applied to them. There are built in filters for the token's disposition (as set in the token config), or the type of actor the token represents. [GMs can also create custom filters using JavaScript](./docs/custom-aura-target-filters.md).
- _Mode_ - Determines when the effect should be applied. See table below.
- _Priority_ - For certain modes, determines the order that multiple of the same effect are resolved. See table below.

|Mode|Description|Priority|
|-|-|-|
|Apply while inside (remove on leave)|Applies the selected effect on a target token when it enters the aura, and removes the effect when the token leaves the aura.|This is an "ongoing" effect, meaning that it takes priority over all other modes except _Remove while inside_. The priority value of the effect config determines only how it reacts to _Remove while inside_ effects. For example, if a token was in an aura which had a _Apply while inside_ 'Slowed' effect with priority 2 and also an aura which had a _Remove while inside_ 'Slowed' effect with priority 1, then the effect would be added because that effect takes priority.|
|Apply on enter|Applies the effect to a target token when that token enters the aura. Does not automatically remove it. If the effect is removed, it will not be re-applied until the token has left the aura and re-entered it.|N/A|
|Apply on leave|Applies the effect to a target token when that token leaves the aura.|N/A|
|Apply on owner turn start|Applies the effect to all targets in an aura when the token that the aura belongs to starts a turn in combat.|N/A|
|Apply on owner turn end|Applies the effect to all targets in an aura when the token that the aura belongs to ends a turn in combat.|N/A|
|Apply on target turn start|Applies the effect to a target token that is in the aura when that target token starts a turn in combat.|N/A|
|Apply on target turn end|Applies the effect to a target token that is in the aura when that target token ends a turn in combat.|N/A|
|Apply on round start|Applies the effect to all target tokens in the aura when a new combat round starts.|Lower priority round start effects are applied first, and may get overridden by higher priority ones.|
|Apply on round end|Applies the effect to all target tokens in the aura when a combat round ends. Occurs before the round start effects.|Lower priority round end effects are applied first, and may get overridden by higher priority ones.|
|Remove while inside|Removes the effect from target tokens that are inside the aura. Prevents other GAA-automated effects from applying, except _Apply while inside_ effects with a higher priority.|This is an "ongoing" effect, meaning that it takes priority over all other modes except _Apply while inside_. The priority value of the effect config determines only how it reacts to _Apply while inside_ effects. For example, if a token was in an aura which had a _Apply while inside_ 'Slowed' effect with priority 2 and also an aura which had a _Remove while inside_ 'Slowed' effect with priority 1, then the effect would be added because that effect takes priority.|
|Remove on enter|Remove the effect from a target token when that token enters the aura.|N/A|
|Remove on leave|Remove the effect from a target token when that token leaves the aura.|N/A|
|Remove on owner turn start|Removes the effect to all targets in an aura when the token that the aura belongs to starts a turn in combat.|N/A|
|Remove on owner turn end|Removes the effect to all targets in an aura when the token that the aura belongs to ends a turn in combat.|N/A|
|Remove on target turn start|Removes the effect to a target token that is in the aura when that target token starts a turn in combat.|N/A|
|Remove on target turn end|Removes the effect to a target token that is in the aura when that target token ends a turn in combat.|N/A|
|Remove on round start|Removes the effect to all target tokens in the aura when a new combat round starts.|Lower priority round start effects are applied first, and may get overridden by higher priority ones.|
|Remove on round end|Removes the effect to all target tokens in the aura when a combat round ends. Occurs before the round start effects.|Lower priority round end effects are applied first, and may get overridden by higher priority ones.|


#### Macro

This automation executes a macro when a token enters or leaves the aura. Note that this also includes when 'preview' tokens (such as when dragging a token) enter or leave. The arguments passed to the macro are identical to those passed to the [gridAwareAuras.enterLeaveAura hook](./docs/hooks.md#gridawareaurasenterleaveaura). Note that this macro is executed for all players that are currently on the scene.

The '_Enable Macro Automation_' setting must be enabled by the GM in the settings for this feature to be available. It defaults to disabled.

- _Enter/Leave Macro_ - The **ID** of a macro to execute. Paste an ID in, or drag-and-drop a macro from the macrobar or macros folder to use it's ID.

#### Terrain Height Tools

If the Terrain Height Tools module v0.4.7 or newer is installed and activated, the tab will be available. It allows for drawing line of sight rulers between the token that owns the aura and any tokens that are inside the aura while the token is being dragged.

- _Token Ruler on Drag_ - This determines what type of ruler to draw (if any).
	- _Don't show_ - Disables THT integration for this Aura.
	- _Centre Only_ - Shows centre-to-centre rulers.
	- _Centre and Edge_ - Shows centre-to-centre and edge-to-edge rulers.
- _Target Tokens_ - This is used to limit which tokens have effects applied to them. There are built in filters for the token's disposition (as set in the token config), or the type of actor the token represents. [GMs can also create custom filters using JavaScript](./docs/custom-aura-target-filters.md).

### Square Grids

When dealing with square grids, there are different ways of handling diagonals. You can configure which rules Grid-Aware Auras uses in the module settings. Which one you choose will depend on your game. GAA supports the following:

|Name|Picture|Description|
|-|-|-|
|Equidistant (1/1/1)|![Equidistant example](./docs/img/square-equidistant.png)|In this ruleset, moving diagonally always costs 1 (i.e. the same as moving horizontally or vertically). Therefore, the resulting aura ends up being a large square around the token. For example, this is how D&D5E usually works.|
|Alternating (1/2/1)|![Alternating example](./docs/img/square-alternating.png)|In this ruleset, the first diagonal costs 1, the second 2, the third 1 again, then 2 again, etc. This is the technique that Pathfinder 2E uses, for example.|
|Manhattan (2/2/2)|![Manhattan example](./docs/img/square-manhattan.png)|In this ruleset, diagonals are effectly disallowed. Moving 1 square diagonally would always cost 2 (1 horizontal and 1 vertical).|
|Exact (√2/√2/√2)|![Exact example](./docs/img/square-exact.png)|Also known as euclidean, this ruleset treats diagonals as √2. This is the same area you would get if you used Foundry's circle template tool with an equivalent radius from the centre of each cell.

_(Numbers are for illustrative purposes only)_

### Collision Detection

A quick note on collision detection: the collisions to test if a token is inside an aura is done by checking the centre of each cell under the token. For example, on a 3x3 token, the points tested would be here on hex and square grids (shown in red):

![Test points for a 3x3 token](./docs/img/collision-detection.png)

GAA does not check from the vertices of the token's border because rounding errors and imprecision with the geometry can cause false positives. It's far easier to just check the centre cells like this and in most cases it will make little difference. In future I _may_ change this or add alternative methods, but for now it will stay like this.

## See Also
- [API Reference](./docs/api.md)
- [Hooks](./docs/hooks.md)
- [Custom Aura Target Filters](./docs/custom-aura-target-filters.md)

## Roadmap

Features that I will be looking to add to Grid-Aware Auras in future (in rough order of priority):

- [ ] Formal API for creating/updating/deleting auras on tokens.
- [ ] Allow auras on items, which will get added to the token when owned by that token's actor.
- [ ] Setting auras by active effects (e.g. allowing effects to alter the range of an aura).
