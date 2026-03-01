const MODULE_ID = "slot-inventory";

/* ---------------------------- */
/* INIT                         */
/* ---------------------------- */

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initializing`);

  game.settings.register(MODULE_ID, "disableWeight", {
    name: "Disable Default Weight System",
    hint: "Encumbrance will be based on slot count instead of weight.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
});

/* ---------------------------- */
/* SLOT CALCULATION             */
/* ---------------------------- */

function isPhysicalItem(item) {
  return ["weapon", "equipment", "consumable", "tool", "loot", "backpack"].includes(item.type);
}

function getUsedSlots(actor) {
  return actor.items
    .filter(i => isPhysicalItem(i))
    .reduce((total, item) => total + (item.system.quantity ?? 1), 0);
}

function getMaxSlots(actor) {
  return actor.system.abilities.str.value ?? 10;
}

/* ---------------------------- */
/* OVERRIDE ENCUMBRANCE         */
/* ---------------------------- */

Hooks.once("ready", () => {
  if (!game.settings.get(MODULE_ID, "disableWeight")) return;

  const ActorClass = CONFIG.Actor.documentClass;
  const originalPrepareData = ActorClass.prototype.prepareDerivedData;

  ActorClass.prototype.prepareDerivedData = function () {
    originalPrepareData.call(this);

    if (this.type !== "character") return;

    const used = getUsedSlots(this);
    const max = getMaxSlots(this);

    this.system.attributes.encumbrance.value = used;
    this.system.attributes.encumbrance.max = max;
    this.system.attributes.encumbrance.pct = Math.min((used / max) * 100, 100);
    this.system.attributes.encumbrance.encumbered = used > max;
  };
});

/* ---------------------------- */
/* TIDY + DEFAULT SHEET DISPLAY */
/* ---------------------------- */

Hooks.on("renderActorSheet", (app, html) => {
  const actor = app.actor;
  if (!actor || actor.type !== "character") return;

  const used = getUsedSlots(actor);
  const max = getMaxSlots(actor);

  html.find(".slot-inventory-display").remove();

  const element = $(`
    <div class="slot-inventory-display" style="padding:6px; font-weight:bold; border-top:1px solid #999;">
      Inventory Slots: ${used} / ${max}
    </div>
  `);

  // Works for both Tidy and default sheets
  const inventorySection = html.find('[data-tab="inventory"]');
  if (inventorySection.length) {
    inventorySection.prepend(element);
  }
});
