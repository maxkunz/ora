import Alpine from 'alpinejs';
import component from './alpinejs-component/component.esm.js'
import * as genesys from './genesys_helper.js';
import platformClient from "purecloud-platform-client-v2";
import './dragBar.js';
import './aiAssist.js';
import {AIGenService} from './AIGenService.js';
import { setupWizard } from './setup_wizard.js';
import '../css/styles.css';
import { infoAgentModule } from "../pages/info_agent/info_agent.js";
import { basicMissionsModule} from "../pages/basic_missions/basic_missions.js";


const architectApi = new platformClient.ArchitectApi();


window.Alpine = Alpine;
window.addEventListener('DOMContentLoaded', () => {
    window.Alpine.plugin(component);
    window.Alpine.start();
});

document.addEventListener('alpine:init', () => {
    Alpine.data("infoAgentModule", infoAgentModule);
    Alpine.data("basicMissionsModule", basicMissionsModule);

    window.Alpine.store('genesys', {
        client: platformClient.ApiClient.instance,
        architectApi: new platformClient.ArchitectApi(),
        routingApi: new platformClient.RoutingApi(),
        kbApi: new platformClient.KnowledgeApi(),
        cmApi: new platformClient.ContentManagementApi()
    })
    let reactive_data = window.Alpine.reactive({
        activeTab: 'diys',
        mouseX: null,
        mouseY: null,
        leaveTimeout: null,
        // ----- DATA STORE (like defmoApp) -----
        showDebug: false,
        compactMode: false,
        showDebugModal: false,
        openMetaModal: false,
        openAIModal: false,
        AIGenService: null,
        meta: {
            businessContext: ""
        },

        categories: [],
        concerns: [],
        targets: {},
        matrix: {},
        faqs: {},
        guides: {},
        diys: [],
        info_agents: {},
        basic_missions: {},

        fileMenu: {
            showNewInput: false,
            newVersionName: '',
            showPanel: null, // 'saveAs' | 'load' | 'delete'
        },
        availableConfigurations: [],
        availableQueues: [],
        availableTargetTypes: ["Queue", "Generic"],

        // --- Shared Genesys SDK & Auth Data ---
        genesys: {
            client: null,
            architectApi: null,
            routingApi: null,
            accessToken: null,
            // todo hard coded values need to be dynamic?
            flowId: "3225de50-1e9b-4103-85d0-cafe95f4a11f",
            helper: genesys,
        },
        /*
        typeColors: {
            queue: 'bg-amber-100  text-amber-800',
            generic: 'bg-amber-100  text-amber-800',
            faq: 'bg-teal-100 text-teal-800',
            diy: 'bg-sky-100    text-sky-800',
            guide: 'bg-lime-100 text-lime-800',
            info_agent: 'bg-emerald-100 text-emerald-800',
            default: 'bg-gray-100 text-gray-700',
        },*/
        typeColors: {
            target: 'bg-gray-100 text-gray-700',   // bewusst neutral gehalten
            generic: 'bg-[#FFBF7F] text-black',    // sanftes Pastell-Orange
            guide: 'bg-[#BCB550] text-black',      // Olivgrün, wie gewünscht
            faq: 'bg-[#F2FEDC] text-black',        // sehr helles Grün, freundlich
            info_agent: 'bg-[#BCB550] text-black', // gleiche Farbe wie guide
            basic_mission: 'bg-[#FFFDBF] text-black',
            diy: 'bg-[#FDC5A5] text-black',        // leichtes Pastell-Korall
            default: 'bg-gray-100 text-gray-700',  // neutrales Grau
        },
        resources: {},

        // todo hard coded values need to be dynamic?
        client_id: "be3addac-a274-47b2-b382-86588cbba3e3",
        datatable_id: "0de34a0f-a83b-4b44-94c8-e94c8da5f4d6",
        content_workspace_id: "017fae6e-99c6-4733-b885-7fef4398c037",
        version: 'main',
        info_agents_knowledge_endpoint: "https://d6id4rhutb6fpeqtyrygqr63aa0pxgwk.lambda-url.eu-central-1.on.aws/",

        data: null,

        dropdowns: {},

        resetUI() {
            // reset some selected.. variabels and menu flags
            this.selectedInfoAgentId = null;
            this.selectedDiyIndex = null;
            this.selectedTargetId = null;
            this.selectedFaqId = null;
            this.selectedGuideId = null;
            this.editType = null;
            this.editItem = null;

            
            this.fileMenu.showNewInput = false;
            this.fileMenu.newVersionName = '';
            this.fileMenu.showPanel = null;
            this.openMetaModal = false;
            this.openAIModal = false;
            this.showDebugModal = false;

            this.dropdowns = {};

            console.log("UI reseted.");
        },
        selectedFaqId: null,
        get selectedFaq() {
            return Alpine.store("globalData").selectedFaqId ? Alpine.store("globalData").faqs[Alpine.store("globalData").selectedFaqId] : null;
        },
        selectedGuideId: null,
        get selectedGuide() {
            const id = Alpine.store("globalData").selectedGuideId;
            return id ? Alpine.store("globalData").guides[id] : null;
        },
        selectedInfoAgentId: null,
        get selectedInfoAgent() {
            return Alpine.store("globalData").selectedInfoAgentId !== null ? Alpine.store("globalData").info_agents[Alpine.store("globalData").selectedInfoAgentId] : null;
        },
        
        selectedDiyIndex: null,
        get selectedDiy() {
            
            return Alpine.store("globalData").selectedDiyIndex !== null ? Alpine.store("globalData").diys[Alpine.store("globalData").selectedDiyIndex] : null;
        },
        selectedTargetId: null,
        get selectedTarget() {
            return Alpine.store("globalData").selectedTargetId ? Alpine.store("globalData").targets[Alpine.store("globalData").selectedTargetId] : null;
        },
        get flattenedCategories() {
            const rows = [];
            for (let cat of Alpine.store("globalData").categories) {
                rows.push({
                    isParent: true,
                    obj: cat
                });
                if (cat.subcategories?.length) {
                    for (let sub of cat.subcategories) {
                        rows.push({
                            isParent: false,
                            obj: sub
                        });
                    }
                }
            }
            return rows;
        },
        cellClasses(catId, conId) {
            const sel = Alpine.store("globalData").matrixGet(catId, conId);
            const colors = Alpine.store("globalData").typeColors || {};

            // Neues Schema: Route
            if (sel.type === 'route' && sel.value && Array.isArray(sel.value.modules)) {
                for (const mod of sel.value.modules) {
                    const type = mod?.type;
                    if (type && colors[type]) return colors[type];
                }
                return colors.default; // kein bekanntes Modul gefunden
            }

            // Nicht-Route: direkter Typ-Farblookup
            return (sel.type && colors[sel.type]) ? colors[sel.type] : '';
        },
        matrixGet(catId, conId) {
            if (!Alpine.store("globalData").matrix[catId]) return '';
            return Alpine.store("globalData").matrix[catId][conId] ?? '';
        },
        matrixSet(catId, conId, val) {
            if (!Alpine.store("globalData").matrix[catId]) {
                Alpine.store("globalData").matrix[catId] = {};
            }
            Alpine.store("globalData").matrix[catId][conId] = val;
        },
        matrixQuickSet(catId, conId) {
            if (Alpine.store("globalData").activeTab === 'targets' && Alpine.store("globalData").selectedTarget) {
                Alpine.store("globalData").matrixSet(catId, conId, {
                    type: Alpine.store("globalData").selectedTarget.type,
                    value: Alpine.store("globalData").selectedTarget.id
                });
            } else if (Alpine.store("globalData").activeTab === 'faqs' && Alpine.store("globalData").selectedFaq) {
                Alpine.store("globalData").matrixSet(catId, conId, {
                    type: 'faq',
                    value: Alpine.store("globalData").selectedFaq.id
                });
            } else if (Alpine.store("globalData").activeTab === 'guides' && Alpine.store("globalData").selectedGuide) {
                Alpine.store("globalData").matrixSet(catId, conId, {
                    type: 'guide',
                    value: Alpine.store("globalData").selectedGuide.id
                });
            } else if (Alpine.store("globalData").activeTab === 'diys' && Alpine.store("globalData").selectedDiy) {
                Alpine.store("globalData").matrixSet(catId, conId, {
                    type: 'diy',
                    value: Alpine.store("globalData").selectedDiy.id
                });
            } else if (Alpine.store("globalData").activeTab === 'info_agents' && Alpine.store("globalData").selectedDiy) {
                Alpine.store("globalData").matrixSet(catId, conId, {
                    type: 'info_agent',
                    value: Alpine.store("globalData").selectedInfoAgent.agent_id
                });
            }
        },
        matrixUnset(catId, conId) {
            if (Alpine.store("globalData").matrix[catId]) {
                delete Alpine.store("globalData").matrix[catId][conId];
            }

            const key = catId + '_' + conId;
            if (Alpine.store("globalData").dropdowns[key]) {
                Alpine.store("globalData").dropdowns[key].selected = null;
            }
        },
        // Category / Concern modal editing
        editType: null, // 'category' or 'concern'
        editItem: null, // holds the object being edited
        openEditModal(item, type) {
            Alpine.store("globalData").editItem = item;
            Alpine.store("globalData").editType = type;

            if (item.name?.startsWith('*')) {
                Alpine.store("globalData").editItem.name = item.name.replace(/^\*\s*/, '');
            }
        },
        closeEditModal(confirmApply) {
            const kws = Alpine.store("globalData").editItem?.keywords || [];
            const phr = Alpine.store("globalData").editItem?.phrases || [];

            const hasUnconfirmed = kws.some(k => k.startsWith('*')) || phr.some(p => p.startsWith('*'));

            if (hasUnconfirmed && confirmApply !== undefined) {
                if (confirmApply) {
                    // Übernehmen: * entfernen
                    Alpine.store("globalData").editItem.keywords = kws.map(k => k.startsWith('*') ? k.replace(/^\*\s*/, '') : k);
                    Alpine.store("globalData").editItem.phrases = phr.map(p => p.startsWith('*') ? p.replace(/^\*\s*/, '') : p);
                } else {
                    // Verwerfen: mit * entfernen
                    Alpine.store("globalData").editItem.keywords = kws.filter(k => !k.startsWith('*'));
                    Alpine.store("globalData").editItem.phrases = phr.filter(p => !p.startsWith('*'));
                }
            }

            Alpine.store("globalData").editItem = null;
            Alpine.store("globalData").editType = null;
        },

        //////////////////////////////////
        // START Route Modal
        //////////////////////////////////
        // State (Beispiel)
route: {
  open: false,
  cell: null,
  selectedIndex: null,

  // Draft hält nur lowercase type + optional value (keine Namenskopie)
  draft: {
    name: 'Neue Route',
    modules: [{ type: 'disconnect' }], // letzter Eintrag ist das End-Modul
  },

  // Generische Definition aller auswählbaren Module (kompakt: 1 Modul/Zeile)
  selectable: {
    order: { end: ['disconnect','concierge','target','diy'], mid: ['idnv', 'faq','guide','info_agent', 'basic_mission'] },
    modules: {
      disconnect: { label:'Disconnect',   value:'disconnect' },
      idnv: { label:'ID&V',   value:'idnv' },
      concierge:    { label:'Concierge',      value:'concierge' },
      target:     { label:'Routing',       value:['Routing'] },
      diy:        { label:'DIY',          value:['DIY'] },
      faq:        { label:'Basic Info',          value:['Basic Info'] },
      guide:      { label:'AI Mission',       value:['AI Mission'] },
      info_agent: { label:'AI Info',  value:['AI Info'] },
      basic_mission: { label:'Basic Mission',  value:['Basic Mission'] },
    },
  },
},

resolveRouteTypeToLabel(type) {
  if (!type) return '—'; // kein Typ übergeben
  const mod = this.route?.selectable?.modules?.[type];
  return mod?.label ?? type; // Fallback: label, sonst raw type zurückgeben
},

openRouteModal(categoryId, concernId, categoryName, concernName) {
  this.route.open = true;
  this.route.cell = { categoryId, concernId, categoryName, concernName };

  const existing = this.matrixGet(categoryId, concernId);
  if (existing && existing.type === 'route' && existing.value) {
    this.route.draft = JSON.parse(JSON.stringify(existing.value)); // { name, modules:[{type,value}, ...] }
  } else {
    this.route.draft = {
      name: 'Neue Route',
      modules: [
        // optional: ein Mid-Start lassen wir weg; End ist Disconnect
        { type: 'disconnect' } // End (immer letzter Eintrag)
      ],
    };
  }

  // Auswahl: erstes Mid-Element (falls vorhanden), sonst End
  this.route.selectedIndex = this.route.draft.modules.length > 1 ? 0 : (this.route.draft.modules.length - 1);
},

saveRouteModal() {
  if (!this.route.cell) return;
  const { categoryId, concernId } = this.route.cell;

  // Draft 1:1 speichern
  this.matrixSet(categoryId, concernId, {
    type: 'route',
    value: JSON.parse(JSON.stringify(this.route.draft)),
  });

  this.closeRouteModal();
},

closeRouteModal() {
  this.route.open = false;
  this.route.cell = null;
  this.route.selectedIndex = null;
  this.route.draft = { name: 'Neue Route', modules: [{ type: 'Disconnect' }] };
},

        //////////////////////////////////
        // END Route Modal
        //////////////////////////////////


        // Concern functions
        addConcern(name = "*New Concern") {
            Alpine.store("globalData").concerns.unshift({
                id: crypto.randomUUID(),
                name: name,
                keywords: [],
                phrases: []
            });
        },
        removeConcern(con) {
            Alpine.store("globalData").concerns = Alpine.store("globalData").concerns.filter(x => x.id !== con.id);
            for (const catId in Alpine.store("globalData").matrix) {
                delete Alpine.store("globalData").matrix[catId][con.id];
            }
        },
        // Category / Subcategory functions
        addParentCategory(name = "*New Category") {
            Alpine.store("globalData").categories.unshift({
                id: crypto.randomUUID(),
                name: name,
                keywords: [],
                phrases: [],
                subcategories: []
            });
        },
        removeParentCategory(catObj) {
            Alpine.store("globalData").categories = Alpine.store("globalData").categories.filter(c => c.id !== catObj.id);
            delete Alpine.store("globalData").matrix[catObj.id];
        },
        addSubcategory(catObj, name = "*New Sub Category") {
            if (!Array.isArray(catObj.subcategories)) {
                catObj.subcategories = [];
            }
            catObj.subcategories.push({id: crypto.randomUUID(), name: name, keywords: [], phrases: []});
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

        addNewInfoAgent() {
        const id = crypto.randomUUID();
        this.info_agents[id] = {
            name: '',
            personality: '',
            instruction: '',
            trainingsContent: [],
            agent_id: id,
            tenant_id: this.client_id
        };
        this.selectedInfoAgentId = id;
        },
        addNewTarget() {
            const newId = crypto.randomUUID()
            Alpine.store("globalData").targets[newId] = {id: newId, type: 'queue', value: 'NewTarget'};
            Alpine.store("globalData").selectedTargetId = newId;
        },
        removeTarget(id) {
            window.Alpine.store("toast").show(`Target gelöscht!`, "success");
            delete Alpine.store("globalData").targets[id];
            if (Alpine.store("globalData").selectedTargetId === id) {
                Alpine.store("globalData").selectedTargetId = null;
            }
        },
        newDiy() {
            return {
                Name: '',
                Description: '',
                Question: Alpine.store("globalData").newQuestions()
            }
        },
        removeDiy(id) {
            window.Alpine.store("toast").show(`Diy gelöscht!`, "success");
            Alpine.store("globalData").diys.splice(id, 1)
            if (Alpine.store("globalData").selectedDiyIndex === id) {
                Alpine.store("globalData").selectedDiyIndex = null;
            }
        },
        newQuestions() {
            return {
                Prompt: '',
                Reprompt: '',
                Answers: [],
                Target: [{}],
                Question: undefined
            };
        },
        newAnswer() {
            return {keywords: [], Type: 'faq', Legitimation: false, Target: [{}]}
        },

        labelForSelection(target) {
            if (!target) return '';
            else if (target.type == 'route') 
                return (target.value && target.value.name) ? target.value.name : '';

            const hit = Alpine.store("globalData").flatOptions().find(i =>
                i.value.type === target.type && i.value.value === target.value); // Todo: maybe we have to rethink this and make the search more efficient as well as robust for generic/queue targets.
            return hit ? hit.label : '';
            
        },
        labelForMatrixSelection(catId, conId) {
            const sel = Alpine.store("globalData").matrixGet(catId, conId);
            return Alpine.store("globalData").labelForSelection(sel)
        },
        isSelected(target, val) {
            return target && target.type === val.type && target.value === val.value;
        },
        isSelectedMatrix(catId, conId, val) {
            const sel = Alpine.store("globalData").matrixGet(catId, conId);
            return Alpine.store("globalData").isSelected(sel, val);
        },
        answerQuickSet(target) {
            if (Alpine.store("globalData").activeTab === 'targets' && Alpine.store("globalData").selectedTarget) {
                target = {
                    type: Alpine.store("globalData").selectedTarget.type,
                    value: Alpine.store("globalData").selectedTarget.id
                };
            } else if (Alpine.store("globalData").activeTab === 'faqs' && Alpine.store("globalData").selectedFaq) {
                target = {
                    type: 'faq',
                    value: Alpine.store("globalData").selectedFaq.id
                };
            }
            console.log("Target: " + JSON.stringify(target))
        },
        // todo Matrix options maybe rework with other module
        // Question Target read/write
        getQuestionTarget(target) {
            if (!Alpine.store("globalData").matrix[catId]) return '';
            return Alpine.store("globalData").matrix[catId][conId] ?? '';
        },
        setQuestionTarget(target) {
            if (!Alpine.store("globalData").matrix[catId]) {
                Alpine.store("globalData").matrix[catId] = {};
            }
            Alpine.store("globalData").matrix[catId][conId] = val;
        },
        flatOptions(includedGroups = []) {      // ungegroupte Liste, um Label-Suche zu erleichtern
            return Alpine.store("globalData").groupedOptions(includedGroups).flatMap(g => g.items);
        },
        // Provide grouped list for the dropdown
        groupedOptions(includedGroups = []) {
            const allGroups = [
                {
                    group: 'Routing',
                    items: Object.values(Alpine.store("globalData").targets).map(t => ({
                        key: t.id,
                        value: {type: "target", value: t.id},
                        label: t.value
                    }))
                },
                {
                    group: 'Basic Info',
                    items: Object.values(Alpine.store("globalData").faqs).map(f => ({
                        key: f.id,
                        value: {type: 'faq', value: f.id},
                        label: f.title
                    }))
                },
                {
                    group: 'AI Mission',
                    items: Object.values(Alpine.store("globalData").guides).map(g => ({
                        key: g.id,
                        value: { type: 'guide', value: g.id },
                        label: g.name
                    }))
                },
                {
                    group: 'DIY',
                    items: Object.values(Alpine.store("globalData").diys).map(f => ({
                        key: f.id,
                        value: {type: 'diy', value: f.id},
                        label: f.Name
                    }))
                },
                {
                    group: 'AI Info',
                    items: Object.values(Alpine.store("globalData").info_agents).map(f => ({
                        key: f.agent_id,
                        value: {type: 'info_agent', value: f.agent_id},
                        label: f.name
                    }))
                },
                {
                    group: 'Basic Mission',
                    items: Object.values(Alpine.store("globalData").basic_missions).map(f => ({
                        key: f.id,
                        value: {type: 'basic_mission', value: f.id},
                        label: f.name
                    }))
                }
            ];
            // return all if no filter applied
            if (!includedGroups || includedGroups.length === 0) {
                return allGroups;
            }
            return allGroups.filter(g => includedGroups.includes(g.group));
        },
        onMouseMove(evt) {
            Alpine.store("globalData").mouseX = evt.clientX;
            Alpine.store("globalData").mouseY = evt.clientY;
        },

        //// AI ASSISTANT ////
        async runAIGenFunction(currentCommand, currentTarget, userInstruction) {
            const commands = Array.isArray(currentCommand) ? currentCommand : [currentCommand];

            if (!Alpine.store("globalData").AIGenService || commands.length === 0) return;
            console.log("First check AI funktion")

            const businessContext = this.meta.businessContext;

            const fnMap = {
                'generate_keywords': () =>
                    Alpine.store("globalData").AIGenService.generateKeywords(businessContext, userInstruction, currentTarget?.name || '', currentTarget?.keywords || []),
                'generate_phrases': () =>
                    Alpine.store("globalData").AIGenService.generatePhrases(businessContext, userInstruction, currentTarget?.name || '', currentTarget?.phrases || []),
                'generate_concerns': () =>
                    Alpine.store("globalData").AIGenService.generateConcerns(businessContext, userInstruction, this.concerns.map(c => c.name)),
                'generate_categories': () =>
                    Alpine.store("globalData").AIGenService.generateCategories(businessContext, userInstruction, this.categories.map(c => c.name)),
                'generate_subcategories': () =>
                    Alpine.store("globalData").AIGenService.generateSubcategories(businessContext, userInstruction, currentTarget?.name || '', currentTarget?.subcategories || [])
            };

            for (const cmd of commands) {
                console.log("AI-Command:", cmd);

                const aiGenfunction = fnMap[cmd];
                if (!aiGenfunction) {
                    console.warn("Unknown command:", cmd);
                    continue;
                }

                // Modal nur beim ersten passenden Command öffnen
                if (!this.editItem && ['generate_keywords', 'generate_phrases'].includes(cmd)) {
                    this.openEditModal(currentTarget, this.concerns.includes(currentTarget) ? 'concern' : 'category')
                }

                try {
                    const res = await aiGenfunction();
                    console.log("AI-Ergebnis:", res);

                    switch (cmd) {
                        case 'generate_keywords':
                            if (currentTarget && Array.isArray(res)) {
                                const prefixed = res.map(k => k.startsWith('*') ? k : `*${k}`);
                                currentTarget.keywords = [
                                    ...(currentTarget.keywords || []),
                                    ...prefixed
                                ].filter((v, i, a) => a.indexOf(v) === i);
                            }
                            break;

                        case 'generate_phrases':
                            if (currentTarget && Array.isArray(res)) {
                                const prefixed = res.map(p => p.startsWith('*') ? p : `*${p}`);
                                currentTarget.phrases = [
                                    ...(currentTarget.phrases || []),
                                    ...prefixed
                                ].filter((v, i, a) => a.indexOf(v) === i);
                            }
                            break;

                        case 'generate_categories':
                            if (Array.isArray(res)) {
                                res.forEach(name => this.addParentCategory("*" + name));
                            }
                            break;

                        case 'generate_concerns':
                            if (Array.isArray(res)) {
                                res.forEach(name => this.addConcern("*" + name));
                            }
                            break;

                        case 'generate_subcategories':
                            if (currentTarget && Array.isArray(res)) {
                                res.forEach(name => this.addSubcategory(currentTarget, "*" + name));
                            }
                            break;

                        default:
                            console.warn("Unbekannter command:", cmd);
                    }

                } catch (err) {
                    console.error("AIGen Fehler bei", cmd, ":", err);
                }
            }
        },


    })
    window.Alpine.store('globalData', reactive_data);
    window.Alpine.store('toast', window.Alpine.reactive({
        visible: false,
        message: '',
        type: 'success',
        timeout: null,
        show(message, type = 'success', duration = 3000) {
            this.message = message;
            this.type = type;
            this.visible = true;

            if (this.timeout) clearTimeout(this.timeout);

            if (duration > 0) {
                this.timeout = setTimeout(() => {
                    this.visible = false;
                }, duration);
            }
        },
        close() {
            this.visible = false;
            if (this.timeout) clearTimeout(this.timeout);
        }
    }));
    window.Alpine.store('modal', window.Alpine.reactive({
        show: false,
        title: '',
        message: '',
        confirmLabel: 'Bestätigen',
        cancelLabel: 'Abbrechen',
        onConfirm: null,
        onCancel: null,

        confirm({title, message, onConfirm, onCancel = null, confirmLabel = 'Bestätigen', cancelLabel = 'Abbrechen'}) {
            this.title = title
            this.message = message
            this.confirmLabel = confirmLabel
            this.cancelLabel = cancelLabel
            this.onConfirm = onConfirm
            this.onCancel = onCancel
            this.show = true
        },

        proceed() {
            this.show = false
            if (typeof this.onConfirm === 'function') this.onConfirm()
        },

        cancel() {
            this.show = false
            if (typeof this.onCancel === 'function') this.onCancel()
        },
    }));
    let dropdownMenu = window.Alpine.reactive({
        visible: false,
        posX: 0,
        posY: 0,
        items: [],
        callback: null,
        row: false,
        type: "",

        open(event, row, type) {
            const rect = event.target.getBoundingClientRect();
            this.posX = rect.left;
            this.posY = rect.bottom + window.scrollY;
            this.visible = true;
            this.row = row;
            this.type = type;
        },

        close() {
            this.visible = false;
            this.items = [];
            this.row = null;
            this.type = "";
        },
    });
    Alpine.store('dropdownMenu', dropdownMenu);   
    window.init_data = function () {
        return {
            async init() {
                try {
                    const params = new URLSearchParams(window.location.search)
                    const client_id = params.get("client_id") || "be3addac-a274-47b2-b382-86588cbba3e3"
                    const datatable_id = params.get("datatable_id") || "0de34a0f-a83b-4b44-94c8-e94c8da5f4d6"
                    genesys.login(client_id, window.location.href)
                        .then(() => {
                            console.log("After Login Promis ", Date.now())
                            genesys.fetchQueuesFromGenesys().then(() => {
                                console.log("Got Queues.")
                            })
                            genesys.getConfigurationDataFromGenesys(datatable_id, "main").then(() => {
                                console.log("Got Main Config.")
                                if (Object.keys( Alpine.store("globalData").matrix).length === 0)  Alpine.store("setupWizard").visible = true;
                            })
                            genesys.getAvailableConfigurationsFromGenesys(datatable_id, 100).then(() => {
                                console.log("Got available Configs.")
                            })
                            genesys.getFlowResources("3225de50-1e9b-4103-85d0-cafe95f4a11f").then(() => {
                                console.log("Got Flows.")
                                genesys.loadFaqsFromKnowledgeBaseGenesys(window.Alpine.store("globalData").resources.knowledgeBaseId).then(() => {
                                    console.log("Got FAQs from KB_ID.")
                                })

                            })
                            genesys.loadGuidesFromGenesys().then(() => {
                                console.log("Got Guides.")
                            });
                            Alpine.store("globalData").AIGenService = new AIGenService({
                                endpointUrl: "https://7mnetvh56sar7rkbx3foylp55m0ccfek.lambda-url.eu-central-1.on.aws/",
                                authToken: Alpine.store("globalData").genesys.accessToken
                            });

                        })

                } catch (e) {
                    this.message = 'Login fehlgeschlagen!';
                }
            },

            onMouseMove(evt) {
                this.mouseX = evt.clientX;
                this.mouseY = evt.clientY;
            }
        };
    };

})
