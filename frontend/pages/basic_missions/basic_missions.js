import Alpine from 'alpinejs';

export function basicMissionsModule() {
  return {
    init() {
      // globalData existiert garantiert
      if (!Alpine.store("globalData").basic_missions 
          || typeof Alpine.store("globalData").basic_missions !== "object") {
        Alpine.store("globalData").basic_missions = {};
      }
    },

    addEntry() {
      const id = crypto.randomUUID();
      Alpine.store("globalData").basic_missions[id] = { id: id, name: "", value: "" };
    },

    deleteEntry(id) {
      delete Alpine.store("globalData").basic_missions[id];
    }
  };
}