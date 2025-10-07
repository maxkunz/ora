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
import { faqModule } from "../pages/faq/faq.js";
import { basicMissionsModule} from "../pages/basic_missions/basic_missions.js";
import { matrixModule } from "../pages/matrix/matrix.js";
import { deploymentModule } from "../pages/deployment/deployment.js";
const architectApi = new platformClient.ArchitectApi();


window.Alpine = Alpine;
window.addEventListener('DOMContentLoaded', () => {
    window.Alpine.plugin(component);
    window.Alpine.start();
});

document.addEventListener('alpine:init', () => {
    Alpine.data("infoAgentModule", infoAgentModule);
    Alpine.data("faqModule", faqModule);
    Alpine.data("basicMissionsModule", basicMissionsModule);
    Alpine.data("matrixModule", matrixModule);
    Alpine.data("deploymentModule", deploymentModule);

    window.addEventListener("keydown", (e) => {
    const ctrlOrCmd = e.ctrlKey || e.metaKey;
        // Toggle mit Ctrl/Cmd + Shift + P
        if (ctrlOrCmd && e.shiftKey && e.code === "KeyS") {
            e.preventDefault();
            Alpine.store("globalData").controlPanelVisible = 
            !Alpine.store("globalData").controlPanelVisible;
        }

        // Schließen mit Escape
        if (e.code === "Escape") {
            Alpine.store("globalData").controlPanelVisible = false;
        }
    });

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
        controlPanelVisible: false,
        showDebug: false,
        compactMode: false,
        showDebugModal: false,
        openMetaModal: false,
        openAIModal: false,
        AIGenService: null,

        meta: { version: 0, businessContext: "" },
        categories: [],
        concerns: [],
        targets: {},
        matrix: {},
        articles: {},
        guides: {},
        diys: [],
        info_agents: {},
        basic_missions: {},
        announcement: [],
        faqs: {},

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
        
        resources: {},

        // todo hard coded values need to be dynamic?
        client_id: "be3addac-a274-47b2-b382-86588cbba3e3",
        datatable_id: "0de34a0f-a83b-4b44-94c8-e94c8da5f4d6",
        content_workspace_id: "017fae6e-99c6-4733-b885-7fef4398c037",
        version: 'draft',
        info_agents_knowledge_endpoint: "https://d6id4rhutb6fpeqtyrygqr63aa0pxgwk.lambda-url.eu-central-1.on.aws/",

        data: null,

        dropdowns: {},

        resetUI() {
            // reset some selected.. variabels and menu flags
            this.selectedInfoAgentId = null;
            this.selectedDiyIndex = null;
            this.selectedTargetId = null;
            this.selectedArticleId = null;
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
        selectedArticleId: null,
        get selectedArticle() {
            return Alpine.store("globalData").selectedArticleId ? Alpine.store("globalData").articles[Alpine.store("globalData").selectedArticleId] : null;
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
            return {keywords: [], Type: 'article', Legitimation: false, Target: [{}]}
        },
        // --- Version helpers & Save ---
        bumpMinorVersion(ver) {
            const parts = String(ver ?? '0.0').split('.');
            const major = parseInt(parts[0], 10) || 0;
            const minor = parseInt(parts[1], 10) || 0;
            return `${major}.${minor + 1}`;
        },
        async save() {
            try {
                // 1) bump draft minor version (+ update lastChange)
                const meta = this.meta || {};
                const deployment = meta.deployment || {};
                const configs = deployment.configs || {};
                if (configs.draft) {
                    const current = configs.draft.version ?? '0.0';
                    const next = this.bumpMinorVersion(current);
                    configs.draft.version = next;
                    configs.draft.lastChange = new Date().toISOString();
                }

                // 2) persist configuration to Genesys
                await this.genesys.helper.syncConfigurationToGenesys(this.datatable_id, this.version);

                // 3) feedback
                const v = configs?.draft?.version ?? '';
                window.Alpine.store('toast').show(`Konfiguration gespeichert${v ? ` (Draft v${v})` : ''}.`, 'success');
            } catch (err) {
                console.error('Save error:', err);
                window.Alpine.store('toast').show('Speichern fehlgeschlagen.', 'error');
            }
        },
        flatOptions(includedGroups = []) {
            return Alpine.store("globalData")
                .groupedOptions(includedGroups)
                .flatMap(g => Array.isArray(g.items) ? g.items : [g.items]);
        },
        labelForSelection(target) {
            if (!target) return '';
            else if (target.type == 'route') 
                return (target.value && target.value.name) ? target.value.name : '';

            const hit = Alpine.store("globalData").flatOptions().find(i =>
                i.value.type === target.type && i.value.value === target.value); // Todo: maybe we have to rethink this and make the search more efficient as well as robust for generic/queue targets.
            return hit ? hit.label : '';
            
        },

        isSelected(target, val) {
            return target && target.type === val.type && target.value === val.value;
        },

        // Provide grouped list for the dropdown
        groupedOptions(includedGroups = []) {
            // --- Simple Module als eigene Gruppen (items = Objekt) ---
            const simpleGroups = [
                {
                    group: 'Disconnect',
                    items: {
                        key: 'disconnect',
                        value: { type: 'disconnect', value: null },
                        label: 'Disconnect'
                    }
                },
                {
                    group: 'ID&V',
                    items: {
                        key: 'idnv',
                        value: { type: 'idnv', value: null },
                        label: 'ID&V'
                    }
                },
                {
                    group: 'Concierge',
                    items: {
                        key: 'concierge',
                        value: { type: 'concierge', value: null },
                        label: 'Concierge'
                    }
                }
            ];

            // --- Bestehende, datengetriebene Gruppen (items = Array) ---
            const dataDrivenGroups = [
                {
                    group: 'Routing',
                    items: Object.values(Alpine.store("globalData").targets).map(t => ({
                        key: t.id,
                        value: { type: "target", value: t.id },
                        label: t.value
                    }))
                },
                {
                    group: 'Basic Info',
                    items: Object.values(Alpine.store("globalData").articles).map(f => ({
                        key: f.id,
                        value: { type: 'article', value: f.id },
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
                        value: { type: 'diy', value: f.id },
                        label: f.Name
                    }))
                },
                {
                    group: 'AI Info',
                    items: Object.values(Alpine.store("globalData").info_agents).map(f => ({
                        key: f.agent_id,
                        value: { type: 'info_agent', value: f.agent_id },
                        label: f.name
                    }))
                },
                {
                    group: 'Basic Mission',
                    items: Object.values(Alpine.store("globalData").basic_missions).map(f => ({
                        key: f.id,
                        value: { type: 'basic_mission', value: f.id },
                        label: f.name
                    }))
                }
            ];

            const allGroups = [...simpleGroups, ...dataDrivenGroups];

            // vorhandenes Filterverhalten beibehalten
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
                if (!Alpine.store("matrixModule").editItem && ['generate_keywords', 'generate_phrases'].includes(cmd)) {
                    Alpine.store("matrixModule").openEditModal(currentTarget, this.concerns.includes(currentTarget) ? 'concern' : 'category')
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
                                res.forEach(name => Alpine.store("matrixModule").addParentCategory("*" + name));
                            }
                            break;

                        case 'generate_concerns':
                            if (Array.isArray(res)) {
                                res.forEach(name => Alpine.store("matrixModule").addConcern("*" + name));
                            }
                            break;

                        case 'generate_subcategories':
                            if (currentTarget && Array.isArray(res)) {
                                res.forEach(name => Alpine.store("matrixModule").addSubcategory(currentTarget, "*" + name));
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
                            genesys.getConfigurationDataFromGenesys(datatable_id, window.Alpine.store("globalData").version).then(() => {
                                console.log("Got Main Config.")
                                if (Object.keys( Alpine.store("globalData").matrix).length === 0)  Alpine.store("setupWizard").visible = true;
                            })
                            genesys.getAvailableConfigurationsFromGenesys(datatable_id, 100).then(() => {
                                console.log("Got available Configs.")
                            })
                            genesys.getFlowResources("3225de50-1e9b-4103-85d0-cafe95f4a11f").then(() => {
                                console.log("Got Flows.")
                                genesys.loadArticlesFromKnowledgeBaseGenesys(window.Alpine.store("globalData").resources.knowledgeBaseId).then(() => {
                                    console.log("Got ARTICLEs from KB_ID.")
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
