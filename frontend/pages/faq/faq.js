// /pages/faq/faq.js
import Alpine from "alpinejs";

export function faqModule() {
  return {
    collapsed: {},

    init() {
      const store = Alpine.store("globalData");
      if (!store.faqs || typeof store.faqs !== "object") store.faqs = {};
      Object.keys(store.faqs).forEach(id => { if (!(id in this.collapsed)) this.collapsed[id] = true; });
    },

    _faqs() { return Alpine.store("globalData").faqs; },

    openExclusive(id) {
      for (const k of Object.keys(this._faqs())) this.collapsed[k] = true;
      this.collapsed[id] = false;
    },

    toggleButton(id) {
      const willOpen = this.collapsed[id];
      for (const k of Object.keys(this._faqs())) this.collapsed[k] = true;
      this.collapsed[id] = willOpen ? false : true;
    },

    addTopic() {
      const id = crypto.randomUUID();
      this._faqs()[id] = { id, topic: "", defaultAnswer: "", faq: [] }; // kein "Neues Thema"
      for (const k of Object.keys(this._faqs())) this.collapsed[k] = true;
      this.collapsed[id] = false;
    },

    removeTopic(id) {
      if (!confirm("Dieses Thema wirklich löschen?")) return;
      delete this._faqs()[id];
      delete this.collapsed[id];
    },

    addQA(id) { this._faqs()[id].faq.push({ question: "", answer: "" }); },
    removeQA(id, idx) { this._faqs()[id].faq.splice(idx, 1); },

    autoresize($el) {
      $el.style.height = "auto";
      $el.style.height = `${$el.scrollHeight}px`;
    }
  };
}