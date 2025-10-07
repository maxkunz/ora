import Alpine from "alpinejs";

export function matrixModule() {
  return {

    init() {
      // Expose Public functions
      if (!Alpine.store('matrixModule')) {
        Alpine.store('matrixModule', {
            editItem: this.editItem,

            addConcern:        (...args) => this.addConcern(...args),
            removeConcern: (...args) => this.addParentCategory(...args),
            addParentCategory: (...args) => this.addParentCategory(...args),
            removeParentCategory: (...args) => this.removeParentCategory(...args),
            addSubcategory: (...args) => this.addParentCategory(...args),
            removeSubcategory: (...args) => this.addParentCategory(...args),
            openEditModal: (...args) => this.openEditModal(...args),
        });
      }
    },
    /* -----------------------------
     * Matrix accessors (UI-facing)
     * ----------------------------- */
    matrixGet(catId, conId) {
      if (!Alpine.store("globalData").matrix[catId]) return "";
      return Alpine.store("globalData").matrix[catId][conId] ?? "";
    },
    matrixSet(catId, conId, val) {
      if (!Alpine.store("globalData").matrix[catId]) Alpine.store("globalData").matrix[catId] = {};
      Alpine.store("globalData").matrix[catId][conId] = val;
    },
    matrixUnset(catId, conId) {
      if (Alpine.store("globalData").matrix[catId]) {
        delete Alpine.store("globalData").matrix[catId][conId];
      }
      const key = `${catId}_${conId}`;
      if (Alpine.store("globalData").dropdowns[key]) {
        Alpine.store("globalData").dropdowns[key].selected = null;
      }
    },

    /* -----------------------------
     * Route Modal (UI state + handlers)
     * ----------------------------- */
    route: {
      open: false,
      cell: null,           // { categoryId, concernId, categoryName, concernName }
      selectedIndex: null,  // selected module slot
      draft: {              // purely UI draft; actual data lives in store.matrix
        name: "Neue Route",
        modules: [{ type: "disconnect" }],
      },
    },

    resolveRouteTypeToLabel(type) {
      if (!type) return "—";
      const groups = Alpine.store("globalData").groupedOptions(); // keep global API
      // "type" maps to a group label (same logic you had in main.js)
      for (const g of groups) {
        if (Array.isArray(g.items)) {
          const first = g.items[0];
          if (first?.value?.type === type) return g.group;
        } else if (g?.items?.value?.type === type) {
          return g.group;
        }
      }
      return type; // fallback for unknown type
    },

    openRouteModal(categoryId, concernId, categoryName, concernName) {
      this.route.open = true;
      this.route.cell = { categoryId, concernId, categoryName, concernName };

      const existing = this.matrixGet(categoryId, concernId);
      if (existing && existing.type === "route" && existing.value) {
        // deep clone for safe UI editing
        this.route.draft = JSON.parse(JSON.stringify(existing.value));
      } else {
        this.route.draft = { name: "Neue Route", modules: [{ type: "disconnect" }] };
      }
      // prefer first mid module if available; else default to end
      this.route.selectedIndex = this.route.draft.modules.length > 1 ? 0 : (this.route.draft.modules.length - 1);
    },

    saveRouteModal() {
      if (!this.route.cell) return;
      const { categoryId, concernId } = this.route.cell;
      this.matrixSet(categoryId, concernId, {
        type: "route",
        value: JSON.parse(JSON.stringify(this.route.draft)),
      });
      this.closeRouteModal();
    },

    closeRouteModal() {
      this.route.open = false;
      this.route.cell = null;
      this.route.selectedIndex = null;
      this.route.draft = { name: "Neue Route", modules: [{ type: "disconnect" }] };
    },

    /* -----------------------------
     * Category / Concern CRUD
     * ----------------------------- */
    addConcern(name = "*New Concern") {
      Alpine.store("globalData").concerns.unshift({
        id: crypto.randomUUID(), name, keywords: [], phrases: [],
      });
    },
    removeConcern(con) {
      Alpine.store("globalData").concerns = Alpine.store("globalData").concerns.filter(x => x.id !== con.id);
      for (const catId in Alpine.store("globalData").matrix) {
        delete Alpine.store("globalData").matrix[catId][con.id];
      }
    },
    addParentCategory(name = "*New Category") {
      Alpine.store("globalData").categories.unshift({
        id: crypto.randomUUID(), name, keywords: [], phrases: [], subcategories: [],
      });
    },
    removeParentCategory(catObj) {
      Alpine.store("globalData").categories = Alpine.store("globalData").categories.filter(c => c.id !== catObj.id);
      delete Alpine.store("globalData").matrix[catObj.id];
    },
    addSubcategory(catObj, name = "*New Sub Category") {
      if (!Array.isArray(catObj.subcategories)) catObj.subcategories = [];
      catObj.subcategories.push({ id: crypto.randomUUID(), name, keywords: [], phrases: [] });
    },
    removeSubcategory(subObj) {
      for (let cat of Alpine.store("globalData").categories) {
        const idx = cat.subcategories.findIndex(s => s.id === subObj.id);
        if (idx >= 0) {
          cat.subcategories.splice(idx, 1);
          delete Alpine.store("globalData").matrix[subObj.id];
          return;
        }
      }
    },

    /* -----------------------------
     * Category / Concern Edit Modal
     * ----------------------------- */
    editType: null, // 'category' | 'concern'
    editItem: null,
    openEditModal(item, type) {
      // Normalize display by stripping leading '*' for editing
      this.editItem = { ...item, name: item.name?.startsWith("*") ? item.name.replace(/^\*\s*/, "") : item.name };
      this.editType = type;
    },
    closeEditModal(confirmApply) {
      // Persist back into the original object inside global store:
      const src = Alpine.store("globalData"); // we need the original reference
      const kws = this.editItem?.keywords || [];
      const phr = this.editItem?.phrases || [];
      const hasUnconfirmed = kws.some(k => k.startsWith("*")) || phr.some(p => p.startsWith("*"));

      if (hasUnconfirmed && confirmApply !== undefined) {
        // Confirm: strip "*", else drop tentative entries
        this.editItem.keywords = confirmApply ? kws.map(k => k.replace(/^\*\s*/, "")) : kws.filter(k => !k.startsWith("*"));
        this.editItem.phrases  = confirmApply ? phr.map(p => p.replace(/^\*\s*/, "")) : phr.filter(p => !p.startsWith("*"));
      }

      // Write back: find and replace the original object (by id) to preserve reactivity
      const collection = this.editType === "category" ? src.categories : src.concerns;
      const i = collection.findIndex(o => o.id === this.editItem.id);
      if (i >= 0) collection[i] = this.editItem;

      this.editItem = null;
      this.editType = null;
    },

    /* -----------------------------
     * Table helpers
     * ----------------------------- */
    get flattenedCategories() {
      // Provides a flat list of category + subcategory rows for the matrix table
      const rows = [];
      for (let cat of Alpine.store("globalData").categories) {
        rows.push({ isParent: true, obj: cat });
        if (cat.subcategories?.length) {
          for (let sub of cat.subcategories) rows.push({ isParent: false, obj: sub });
        }
      }
      return rows;
    },

    /*
    typeColors: {
        queue: 'bg-amber-100  text-amber-800',
        generic: 'bg-amber-100  text-amber-800',
        article: 'bg-teal-100 text-teal-800',
        diy: 'bg-sky-100    text-sky-800',
        guide: 'bg-lime-100 text-lime-800',
        info_agent: 'bg-emerald-100 text-emerald-800',
        default: 'bg-gray-100 text-gray-700',
    },*/
    typeColors: {
        target: 'bg-gray-100 text-gray-700',   // bewusst neutral gehalten
        generic: 'bg-[#FFBF7F] text-black',    // sanftes Pastell-Orange
        guide: 'bg-[#BCB550] text-black',      // Olivgrün, wie gewünscht
        article: 'bg-[#F2FEDC] text-black',        // sehr helles Grün, freundlich
        info_agent: 'bg-[#BCB550] text-black', // gleiche Farbe wie guide
        basic_mission: 'bg-[#FFFDBF] text-black',
        diy: 'bg-[#FDC5A5] text-black',        // leichtes Pastell-Korall
        default: 'bg-gray-100 text-gray-700',  // neutrales Grau
    },

    cellClasses(catId, conId) {
      // Chooses color based on selection type. Reads palette from global store.
      const sel = this.matrixGet(catId, conId);
      const colors = this.typeColors || {}; // keep palette global for reuse

      if (sel?.type === "route" && sel.value && Array.isArray(sel.value.modules)) {
        for (const mod of sel.value.modules) {
          const t = mod?.type;
          if (t && colors[t]) return colors[t];
        }
        return colors.default || "";
      }
      return (sel?.type && colors[sel.type]) ? colors[sel.type] : "";
    },
    labelForMatrixSelection(catId, conId) {
        const sel = this.matrixGet(catId, conId);
        return Alpine.store("globalData").labelForSelection(sel)
    },

  };
}