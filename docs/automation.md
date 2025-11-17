# Automation

Automation is the broad category for doing things when tokens interact with auras. There are several types of automation:

- [Effects](#effects) - For automatically applying or removing active effects to tokens when tokens are inside auras.
- [Macros](#macros) - For running macros when events happen relating to auras.
- [Sequencer](#sequencer) - For playing Sequencer effects when tokens enter/leave auras.
- [Terrain Height Tools](#terrain-height-tools) (If THT module is installed) - For showing line of sight rulers while dragging tokens.

## Effects

This automation allows applying or removing effects from tokens in the aura under certain conditions.

The '_Enable Effect Automation_' setting must be enabled by the GM in the world settings for this feature to be available. It defaults to disabled.

### Config

|Name|Description|
|-|-|
|Effect|Select an effect that will be applied to/removed from tokens within the aura.|
|Overlay|If checked, the effect will be added as an overlay (i.e. the icon will appear over the whole token).|
|Target Tokens|This is used to filter which tokens have the effect applied to them. There are built in filters for the token's disposition (as set in the token config), or the type of actor the token represents. [GMs can also create custom filters using JavaScript](./custom-aura-target-filters.md).|
|Trigger|Determines when the effect should be applied. See 'Effect Triggers' table below for details.|
|Priority|For certain triggers, determines the priority order against other auras that apply/remove the same effect. Not every trigger utilises the priority - see 'Effect Triggers' table below for details. Generally you won't need to change this, but it's recommended to do so if you have some auras that are applying and removing the same effect.|

<details>
<summary>Effect Triggers</summary>

|Trigger|Description|Priority|
|-|-|-|
|Apply while inside (remove on leave)|Applies the selected effect on a target token when it enters the aura, and removes the effect when the token leaves the aura.|This is an "ongoing" effect, meaning that it takes priority over all other triggers except _Remove while inside_. The priority value of the effect config determines only how it reacts to _Remove while inside_ effects. For example, if a token was in an aura which had a _Apply while inside_ 'Slowed' effect with priority 2 and also an aura which had a _Remove while inside_ 'Slowed' effect with priority 1, then the effect would be added because that effect takes priority.|
|Apply on enter|Applies the effect to a target token when that token enters the aura. Does not automatically remove it. If the effect is removed, it will not be re-applied until the token has left the aura and re-entered it.|N/A|
|Apply on leave|Applies the effect to a target token when that token leaves the aura.|N/A|
|Apply on owner turn start|Applies the effect to all targets in an aura when the token that the aura belongs to starts a turn in combat.|N/A|
|Apply on owner turn end|Applies the effect to all targets in an aura when the token that the aura belongs to ends a turn in combat.|N/A|
|Apply on target turn start|Applies the effect to a target token that is in the aura when that target token starts a turn in combat.|N/A|
|Apply on target turn end|Applies the effect to a target token that is in the aura when that target token ends a turn in combat.|N/A|
|Apply on round start|Applies the effect to all target tokens in the aura when a new combat round starts.|Lower priority round start effects are applied first, and may get overridden by higher priority ones.|
|Apply on round end|Applies the effect to all target tokens in the aura when a combat round ends. Occurs before the round start effects.|Lower priority round end effects are applied first, and may get overridden by higher priority ones.|
|Remove while inside|Removes the effect from target tokens that are inside the aura. Prevents other GAA-automated effects from applying, except _Apply while inside_ effects with a higher priority.|This is an "ongoing" effect, meaning that it takes priority over all other triggers except _Apply while inside_. The priority value of the effect config determines only how it reacts to _Apply while inside_ effects. For example, if a token was in an aura which had a _Apply while inside_ 'Slowed' effect with priority 2 and also an aura which had a _Remove while inside_ 'Slowed' effect with priority 1, then the effect would be added because that effect takes priority.|
|Remove on enter|Remove the effect from a target token when that token enters the aura.|N/A|
|Remove on leave|Remove the effect from a target token when that token leaves the aura.|N/A|
|Remove on owner turn start|Removes the effect to all targets in an aura when the token that the aura belongs to starts a turn in combat.|N/A|
|Remove on owner turn end|Removes the effect to all targets in an aura when the token that the aura belongs to ends a turn in combat.|N/A|
|Remove on target turn start|Removes the effect to a target token that is in the aura when that target token starts a turn in combat.|N/A|
|Remove on target turn end|Removes the effect to a target token that is in the aura when that target token ends a turn in combat.|N/A|
|Remove on round start|Removes the effect to all target tokens in the aura when a new combat round starts.|Lower priority round start effects are applied first, and may get overridden by higher priority ones.|
|Remove on round end|Removes the effect to all target tokens in the aura when a combat round ends. Occurs before the round start effects.|Lower priority round end effects are applied first, and may get overridden by higher priority ones.|
</details>

## Macros

This automation executes the provided macro under certain triggers. Note that this macro is executed for all players that are currently on the scene.

All macros are called with the following parameters:

|Property name|Type|Description
|-|-|-|
|`token`|`Token`|A reference to the Token object that is within the aura.|
|`parent`|`Token`|A reference to the Token object which is the owner of the aura (the token which the aura is defined on).|
|`aura`|[`AuraConfig`](./api.md#auraconfig)|The config object for the aura that has been interacted with.|
|`options`|`Object` (Varies)|Additional data depending on the trigger that was used. See the Macro Triggers below for details.|

### Config

|Name|Description|
|-|-|
|Macro ID|Enter the ID of a macro, or click and drag it from the hotbar/directory. Do **NOT** use the name of a macro.|
|Target Tokens|This is used to filter which tokens will cause a macro to fire. There are built in filters for the token's disposition (as set in the token config), or the type of actor the token represents. [GMs can also create custom filters using JavaScript](./custom-aura-target-filters.md).|
|Trigger|Determines when the macro should be fired. See 'Macro Triggers' table below for details.|

<details>
<summary>Macro Triggers</summary>

#### Enter/Leave Aura

|Trigger|Description|
|-|-|
|Token Enter/Leave|Fires whenever a token enters or leaves an aura. Does not fire if either token is a preview token.|
|Token Enter|Fires whenever a token enters an aura. Does not fire if either token is a preview token.|
|Token Leave|Fires whenever a token leaves an aura. Does not fire if either token is a preview token.|
|Token Preview Enter/Leave|Fires whenever a token enters or leaves an aura. Only fires if at least one token is a preview token.|
|Token Preview Enter|Fires whenever a token enters an aura. Only fires if at least one token is a preview token.|
|Token Preview Leave|Fires whenever a token leaves an aura. Only fires if at least one token is a preview token.|

These six triggers are called with the following data in their `options` object:

|Property name|Type|Description
|-|-|-|
|`hasEntered`|`boolean`|True if the macro has been called as a result of the token entering the aura, or false as a result of leaving.|
|`isPreview`|`boolean`|True if either the target token or the parent token are previews.|
|`isInit`|`boolean`|True if this macro has been called as a result of entering an aura when the scene has been initialised, or false for a normal entry. If you macro does anything persistent, you likely want to check this is false before doing that as otherwise the same macro will happen when the scene reloads.|
|`userId`|`string`|The ID of the user that moved the token and caused the enter/leave event to happen.|

#### Turn Start/End

|Trigger|Description|
|-|-|
|Owner Turn Start/End|Fires once for every target token within the aura at the start and at the end of the token that owns the aura's turn. Will be fired for ALL tokens in the aura, even those not in combat themselves.|
|Owner Turn Start|Fires once for every target token within the aura at the start of the token that owns the aura's combat turn. Will be fired for ALL tokens in the aura, even those not in combat themselves.|
|Owner Turn End|Fires once for every target token within the aura at the end of the token that owns the aura's combat turn. Will be fired for ALL tokens in the aura, even those not in combat themselves.|
|Target Turn Start/End|Fires when a token that is within the aura starts or ends it's own turn.|
|Target Turn Start|Fires when a token that is within the aura starts it's own turn.|
|Target Turn End|Fires when a token that is within the aura ends it's own turn.|

These six triggers are called with the following data in their `options` object:

|Property name|Type|Description
|-|-|-|
|`isTurnStart`|`boolean`|True if the macro has been called as a result of the turn being started, or false as a result of the turn being ended.|
|`userId`|`string`|The ID of the user that changed the turn in the combat tracker.|

#### Round Start/End

|Trigger|Description|
|-|-|
|Round Start/End|Calls the macro once for every target token within the aura at the start and end of the combat round. This will be called even if the parent token is not in the combat, and will be called on all tokens in the aura even if they are not in combat.|
|Round Start|Calls the macro once for every target token within the aura at the start of the combat round. This will be called even if the parent token is not in the combat, and will be called on all tokens in the aura even if they are not in combat.|
|Round End|Calls the macro once for every target token within the aura at the end of the combat round. This will be called even if the parent token is not in the combat, and will be called on all tokens in the aura even if they are not in combat.|

These three triggers are called with the following data in their `options` object:

|Property name|Type|Description
|-|-|-|
|`isRoundStart`|`boolean`|True if the macro has been called as a result of the round being started, or false as a result of the round being ended.|
|`userId`|`string`|The ID of the user that changed the round in the combat tracker.|

#### Target Starts Movement Inside Aura

This macrop is triggered when a target token is within the aura and is then moved.
It is invoked with the following data in its `options` object:

|Property name|Type|Description
|-|-|-|
|`userId`|`string`|The ID of the user that triggered the movement.|

#### Target Ends Movement Inside Aura

This macro is triggered when a target token is moved and the end position is within the aura.
It is invoked with the following data in its `options` object:

|Property name|Type|Description
|-|-|-|
|`startedInside`|`boolean`|True if the same movement operation started within this aura as well. False if the move started outside the aura.|
|`startPosition`|`{ x: number; y: number; }`|The original co-ordinates of the token before the movement happened (measured in pixels).|
|`userId`|`string`|The ID of the user that triggered the movement.|

</details>

## Sequencer

If the Sequencer module is installed and activated, this config will be available. It allows for playing sequencer effects when tokens enter/leave an aura. You will also need a module that provides assets for Sequencer, such as JB2A. Note that the Sequencer API is vast, moreso than the UI config will allow. For more complex sequences, consider instead writing a macro for Sequencer and triggering this via the [macro](#macros) automation.

Note that if you are editing the config of a sequencer effect, it is possible that a "While inside" effect can get stuck playing on a token. If this happens, you can use the Sequencer Effect Manager to remove that effect (or change scene/reload your brower). Also note that the effects are all played client-side, so if you start tweaking the settings while tokens already have effects playing, these changes may not accurately represent what other players see; Again, changing scene/reloading will fix this.

### Config

|Name|Description|
|-|-|
|Effect|Type the filepath, wildcard path, or the DB path of effect that will be played when the trigger is fired. To find an effect, click the button to open up the Sequencer database, find the effect you want, then click the database button to copy the Sequencer DB path and paste this into the aura config window.|
|Target Tokens|This is used to filter which tokens will cause an effect to play. There are built in filters for the token's disposition (as set in the token config), or the type of actor the token represents. [GMs can also create custom filters using JavaScript](./custom-aura-target-filters.md).|
|Trigger|This is the trigger that determines when the effect should play. "While inside" will loop the effect until the target token is no longer inside the aura; Other triggers will play a set number of times (depending on Repeat Count)|
|Position|Where the effect will play. This can be on the target token (the one that entered the aura), the owner token (the one which owns the aura), or as a ranged effect from the target to the owner or owner to the target.|
|Repeats|This is the number of times the effect will play, and the duration (in milliseconds) between repeats. Has no effect when trigger is "While inside".|
|Start Delay|Delays the effect by this number of milliseconds before it begins playing.|
|Playback Rate|How quickly the effect will play. For example, entering `2` would make the effect play at double speed, or `0.5` at half speed.|
|Opacity|Opacity applied to the effect.|
|Fade In|Duration and easing function of the fade in transition applied to the start of the effect.|
|Fade Out|Duration and easing function of the fade out transition applied to the end of the effect.|
|Scale|Overall scale factor applied to the effect file. For example, entering `2` will double the size of the effect, or `0.5` would halve it.|
|Scale to Object|If checked, then the effect will be scaled based on the size of the token.|
|Scale In|Scale factor, duration, and easing function of the scale in transition applied to the start of the effect.|
|Scale Out|Scale factor, duration, and easing function of the scale out transition applied to the end of the effect.|
|Below Tokens|Whether or not the effect should display below tokens and auras.|

## Terrain Height Tools

If the Terrain Height Tools module v0.4.7 or newer is installed and activated, this config will be available. It allows for drawing line of sight rulers between the token that owns the aura and any tokens that are inside the aura while the token owning the aura is being dragged.

### Config

|Name|Description|
|-|-|
|Token Ruler on Drag|This determines what type of ruler to draw (if any):<ul><li>_Don't show_ - Disables THT integration for this Aura.</li><li>_Centre Only_ - Shows centre-to-centre rulers.</li><li>_Centre and Edge_ - Shows centre-to-centre and edge-to-edge rulers.</li></ul>|
|Target Tokens|This is used to limit which tokens have effects applied to them. There are built in filters for the token's disposition (as set in the token config), or the type of actor the token represents. [GMs can also create custom filters using JavaScript](./custom-aura-target-filters.md).|
