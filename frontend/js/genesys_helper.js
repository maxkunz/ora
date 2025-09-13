// Genesys specific functions

export async function login(client_id, redirect_uri) {
    const client = window.Alpine.store("genesys").client
    console.log("Login function called");
    client.setEnvironment('mypurecloud.de');
    return client.loginImplicitGrant(client_id, redirect_uri)
        .then(() => {
            console.log("Within login Promis: ", Date.now())
            console.log("Authenticated!");
            window.Alpine.store('globalData').genesys.accessToken = client.authData.accessToken;
            console.log("Access Token:", window.Alpine.store('globalData').genesys.accessToken);
        })
        .catch(err => console.error("Auth error:", err));
}

// Done
export async function syncConfigurationToGenesys(datatable_id, version) {
    window.Alpine.store("toast").show(`Speicheren von ${version}`, "loading");
    const architectApi = window.Alpine.store("genesys").architectApi
    let global_data = window.Alpine.store("globalData")
    const data = {
        body: {
            key: version,
            matrix: JSON.stringify(global_data.matrix),
            targets: JSON.stringify(global_data.targets),
            categories: JSON.stringify(global_data.categories),
            concerns: JSON.stringify(global_data.concerns),
            meta: JSON.stringify(global_data.meta),
            diy: JSON.stringify(global_data.diys),
            info_agents: JSON.stringify(global_data.info_agents),
        }
    };
    architectApi.putFlowsDatatableRow(datatable_id, version, data)
        .then(() => window.Alpine.store("toast").show(`${version} wurde abgespeichert!`, "success"))
        .catch(err => {
            window.Alpine.store("toast").show(`Error beim Speichern von ${version}`, "error");
            console.error("Sync error:", err)
        });
}

// Done
export async function newConfigurationToGenesys(datatable_id, version) {
    window.Alpine.store("toast").show(`Erstelle neue Datenversion ${version}`, "loading");
    const architectApi = window.Alpine.store("genesys").architectApi
    const body = {
        key: version,
        matrix: JSON.stringify({}),
        targets: JSON.stringify({}),
        categories: JSON.stringify([]),
        concerns: JSON.stringify([]),
        meta: JSON.stringify({}),
        diy: JSON.stringify([]),
        info_agents: JSON.stringify({}),
    };
    architectApi.postFlowsDatatableRows(datatable_id, body)
        .then(() => {
            window.Alpine.store("toast").show(`Neue Version erstellt: ${version} `, "success");
            console.log(`New configuration "${version}" created.`)
            getAvailableConfigurationsFromGenesys(datatable_id, 100);
            getConfigurationDataFromGenesys(datatable_id, version);
        })
        .catch(err => {
            window.Alpine.store("toast").show(`Error beim Erstellen von ${version}`, "error");
            console.error("Config fetch error:", err)
        });
}

// Done
export async function getAvailableConfigurationsFromGenesys(datatable_id, pageSize) {
    const architectApi = window.Alpine.store("genesys").architectApi
    architectApi.getFlowsDatatableRows(datatable_id, {pageSize: pageSize})
        .then(res => {
            window.Alpine.store("globalData").availableConfigurations = res.entities.map(row => row.key);
            console.log("Available configuration versions:", window.Alpine.store("globalData").availableConfigurations);
        })
        .catch(err => console.error("Error listing configuration keys:", err));
}

// Done
export async function getConfigurationDataFromGenesys(datatable_id, version) {
    window.Alpine.store("toast").show(`${version} Lade Daten`, "loading");
    const architectApi = window.Alpine.store("genesys").architectApi
    return architectApi.getFlowsDatatableRow(datatable_id, version, {showbrief: false})
        .then(data => {
            window.Alpine.store("toast").show(`${version} Daten geladen!`, "success");
            let global_data = window.Alpine.store("globalData")
            global_data.data = data
            global_data.version = version
            global_data.categories.splice(0, global_data.categories.length, ...safeParse(data.categories, []));
            global_data.concerns.splice(0, global_data.concerns.length, ...safeParse(data.concerns, []));
            global_data.targets = safeParse(data.targets, {})
            global_data.matrix = safeParse(data.matrix, {})
            global_data.meta = safeParse(data.meta, {})
            global_data.diys = safeParse(data.diy, [])
            global_data.info_agents = safeParse(data.info_agents, {})
        })
        .catch(err => {
            window.Alpine.store("toast").show(`Error beim Laden von ${version}`, "error");
            console.error("Config fetch error:", err)
        });
}

// Done
export async function deleteConfigurationFromGenesys(datatable_id, version) {
    if (!version) {
        window.Alpine.store("toast").show(`Version ist nicht angegeben!`, "error");
        console.error("deleteConfiguration requires a version key.");
        return;
    }
     window.Alpine.store("toast").show(`Löschung von ${version}`, "loading");
    const architectApi = window.Alpine.store("genesys").architectApi
    architectApi.deleteFlowsDatatableRow(datatable_id, version)
        .then(() => {
            console.log(`Config "${version}" deleted`);
            window.Alpine.store("toast").show(`${version} gelöscht!`, "success");
            getAvailableConfigurationsFromGenesys(datatable_id, 100); // 🔁
            getConfigurationDataFromGenesys(datatable_id, "main")
        })
        .catch(err => {
            window.Alpine.store("toast").show(`Error beim Löschen von ${version}`, "error");
            console.error("Delete error:", err)
        });
}

// Done
export async function fetchQueuesFromGenesys() {
    const routingApi = window.Alpine.store("genesys").routingApi
    routingApi.getRoutingQueues({pageSize: 100})
        .then(res => {
            let global_data = window.Alpine.store("globalData")
            global_data.availableQueues = res.entities.map(q => ({id: q.id, name: q.name}))
            console.log("Queues:", global_data.availableQueues);
        })
        .catch(err => console.error("Queue fetch error:", err));

}

// Done
export async function loadFaqsFromKnowledgeBaseGenesys(kb_id) {
    console.log(`Connectiong to knowledgebase: "${kb_id}"`);
    const kbApi = window.Alpine.store("genesys").kbApi
    kbApi.getKnowledgeKnowledgebaseDocuments(kb_id, {pageSize: 100})
        .then(res => Promise.all(res.entities.map(doc =>
            kbApi.getKnowledgeKnowledgebaseDocumentVariations(kb_id, doc.id).then(vars => {
                const bodyText = vars.entities?.[0]?.body?.blocks?.[0]?.paragraph?.blocks?.[0]?.text?.text || '';
                let global_data = window.Alpine.store("globalData")
                global_data.resetUI();
                global_data.faqs[doc.id] = {
                    id: doc.id,
                    knowledge_base_id: kb_id,
                    title: doc.title,
                    category: doc.category?.name || 'Uncategorized',
                    text: bodyText,
                    phrases: doc.alternatives?.map(a => a.phrase) || [],
                    selfUri: doc.selfUri
                };
            })
        )))
        .then(() => console.log('FAQs loaded from knowledge base:', window.Alpine.store("globalData").faqs))
        .catch(err => console.error('Error loading KB articles:', err));
}

export async function loadGuidesFromGenesys() {
    const token = window.Alpine.store("globalData").genesys.accessToken;

    if (!token) {
        console.error("No access token available. Cannot load guides.");
        return;
    }

    try {
        const res = await fetch("https://api.mypurecloud.de/api/v2/guides", {
            method: "GET",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            }
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error("Failed to fetch guides from Genesys:", errText);
            return;
        }

        const data = await res.json();

        if (!Array.isArray(data.entities)) {
            console.warn("Unexpected response format. Expected 'entities' array:", data);
            return;
        }

        const store = window.Alpine.store("globalData");

        // Optional: clear existing guides before loading new ones
        store.guides = {};

        // Store each guide by ID with selected properties
        data.entities.forEach((guide) => {
            store.guides[guide.id] = {
                id: guide.id,
                name: guide.name,
                status: guide.status,
                latestProductionReadyVersion: guide.latestProductionReadyVersion || null
            };
        });

        console.log("Successfully loaded guides from Genesys:", store.guides);

    } catch (err) {
        console.error("Unexpected error while loading guides:", err);
    }
}

export async function loadDocumentsFromWorkspaceGenesys(workspaceId) {
    const cmApi = window.Alpine.store("genesys").cmApi;

    if (!workspaceId || typeof workspaceId !== "string") {
        console.error("Invalid workspaceId. Must be a non-empty string.");
        return [];
    }

    console.log("Loading documents from workspace:", workspaceId);

    try {
        const res = await cmApi.getContentmanagementQuery("", {
            pageSize: 100,
            sortBy: "name",
            sortOrder: "ascending",
            expand: ["workspace"],
            queryType: "TERM",
            queryFields: ["workspace.id"],
            queryValues: [workspaceId]
        });

        if (!Array.isArray(res.results.entities)) {
            console.warn("Unexpected query response format:", res);
            return [];
        }

        const documents = await Promise.all(res.results.entities.map(async (doc) => {
            const meta = doc.body;
            let downloadUrl = null;

            try {
                const contentRes = await cmApi.getContentmanagementDocumentContent(meta.id);
                downloadUrl = contentRes.url || contentRes.contentLocationUri;
            } catch (e) {
                console.warn("No downloadable content for document", meta.id, e);
            }

            return {
                id: meta.id,
                name: meta.name,
                contentType: meta.contentType,
                tags: meta.tags || [],
                downloadUrl: downloadUrl,
                selfUri: meta.selfUri,
                workspaceId
            };
        }));

        console.log("Documents loaded successfully from workspace:", workspaceId);
        return documents;

    } catch (err) {
        console.error("Error loading documents from workspace:", err);
        return [];
    }
}

export async function downloadGenesysDocument(documentId) {
    const cmApi = window.Alpine.store("genesys").cmApi;

    if (!documentId) {
        console.error("❌ No document ID provided");
        return;
    }

    try {
        // Get document metadata
        const doc = await cmApi.getContentmanagementDocumentContent(documentId);
        const downloadUrl = doc.contentLocationUri;
        
        if (!downloadUrl) {
            console.warn("No contentLocationUri for document ${documentId}");
            return;
        }

        // Trigger download
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = doc.name || ''; // optional filename
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log("Download started for document: ${doc.name}");

    } catch (err) {
        console.error("Failed to download document ${documentId}:", err);
    }
}

// Done
export async function getFlowResources(flow_id) {
    const architectApi = window.Alpine.store("genesys").architectApi
    return architectApi.getFlow(flow_id)
        .then(flowMeta => {
            const versionId = flowMeta?.publishedVersion?.id;
            if (!versionId) throw new Error("No published version found.");
            return architectApi.getFlowVersionConfiguration(flow_id, versionId);
        })
        .then(config => {
            const manifest = config?.manifest || {};
            const kb = manifest.knowledgeBase?.[0] || null;
            const nlu = manifest.nluDomain?.[0] || null;

            window.Alpine.store("globalData").resources = {
                knowledgeBaseId: kb?.id || null,
                knowledgeBaseName: kb?.name || null,
                nluDomainId: nlu?.id || null,
                nluDomainVersion: nlu?.version || null
            };

            console.log("Extracted Flow Resources:", window.Alpine.store("globalData").resources);
        })
        .catch(err => {
            console.error("Error loading flow configuration:", err);
        });
}


export function onMouseMove(evt) {
    window.Alpine.store("globalData").mouseX = evt.clientX;
    window.Alpine.store("globalData").mouseY = evt.clientY;
}

export function safeParse(json, fallback) {
    try {
        return JSON.parse(json);
    } catch (e) {
        console.warn("JSON parse error:", json, e);
        return fallback;
    }
}