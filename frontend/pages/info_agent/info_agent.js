import Alpine from 'alpinejs';
import {loadDocumentsFromWorkspaceGenesys} from '../../js/genesys_helper.js';

export function infoAgentModule() {
  return {
    selectedArticleId: '',
    selectedDocId: '',
    trainingsContent: [],

    documents: [],
    async init() {
      const workspaceId = Alpine.store("globalData").content_workspace_id;
      if (workspaceId) {
        this.documents = await loadDocumentsFromWorkspaceGenesys(workspaceId);
        console.info("Documents" + this.documents)
      } else {
        console.warn("Kein workspace_id vorhanden für Dokument-Import.");
      }
    },

    isAlreadyInTraining(type, id) {
        const store = Alpine.store("globalData");
        const agent = store.info_agents[store.selectedInfoAgentId];
        return agent.trainingsContent.some(item => item.type === (type === 'article' ? 'article' : 'pdf') && item.id === id);
    },

    addTrainingItem(type, id) {
      const store = Alpine.store("globalData");
      const agent = store.info_agents[store.selectedInfoAgentId];
      if (!agent) return;

      const item = type === "article"
        ? {
            type: "article",
            id,
            title: store.articles[id]?.title ?? "ARTICLE",
            knowledge_base_id: store.articles[id]?.knowledge_base_id,
            already_uploaded: false,
            flags: { force_reindex: false, delete_before_upload: false, delete: false },
            tenant_id: store.client_id,
            agent_id: agent.agent_id,
            document_id: id
          }
        : (() => {
            const doc = this.documents.find(d => d.id === id);
            if (!doc) return null;
            return {
              type: "pdf",
              id,
              title: doc.name,
              already_uploaded: false,
              flags: { force_reindex: false, delete_before_upload: false, delete: false },
              tenant_id: store.client_id,
              agent_id: agent.agent_id,
              document_id: doc.id
            };
          })();

      if (item) agent.trainingsContent.push(item);
    },

    deleteTrainingItem(index) {
        const store = Alpine.store("globalData");
        const agent = store.info_agents[store.selectedInfoAgentId];
        const item = agent.trainingsContent[index];

        if (!item) return;

        if (!item.already_uploaded) {
            // Noch nie trainiert → hard remove
            agent.trainingsContent.splice(index, 1);
        } else {
            // Schon trainiert → toggle Lösch-Flag
            item.flags.delete = !item.flags.delete;
        }
    },

    async trainAgent() {
        const store = Alpine.store("globalData");
        const token = store.genesys.accessToken;
        const clientId = store.client_id;
        const agentId = store.selectedInfoAgentId;
        const agent = store.info_agents[agentId];

        if (!agent) {
            console.warn("Kein gültiger Agent ausgewählt.");
            return;
        }

        const body = {
            action: "process_custom_content",
            index_name: clientId,
            content: agent.trainingsContent
        };

        const url = store.info_agents_knowledge_endpoint;
        const headers = {
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json"
        };

        console.log("Training request gestartet");
        console.log("Endpoint:", url);
        console.log("Authorization (gekürzt):", token ? token.substring(0, 10) + "..." : "kein Token");
        console.log("Request Headers:", headers);
        console.log("Request Body (Objekt):", body);
        console.log("Request Body (JSON-String):", JSON.stringify(body, null, 2));

        try {
            window.Alpine.store("toast").show("Trainiere deinen Agenten...", "loading");

            const res = await fetch(url, {
                method: "POST",
                headers: headers,
                body: JSON.stringify(body)
            });

            if (!res || !res.ok) {
                const text = await res.text();
                console.error("Fehlerhafte Antwort vom Backend");
                console.error("Status:", res?.status);
                console.error("Antworttext:", text);
                throw new Error("Request failed with status " + res?.status);
            }

            const result = await res.json();
            console.log("Training erfolgreich abgeschlossen");
            console.log("Antwort:", result);

            const uploadedIds = result.results?.map(r => r.id) || [];

            uploadedIds.forEach((docId) => {
                const item = agent.trainingsContent.find(entry => entry.id === docId);
                if (item) {
                    item.already_uploaded = true;
                    item.flags.delete = false; // optional: reset deletion mark
                    console.log(`Dokument ${docId} als 'already_uploaded = true' gesetzt.`);
                } else {
                    console.warn(`Dokument mit ID ${docId} nicht im trainingsContent gefunden.`);
                }
            });

            window.Alpine.store("toast").show("Training abgeschlossen!", "success");

        } catch (err) {
            console.error("Training fehlgeschlagen");
            console.error(err);
            window.Alpine.store("toast").show("Training fehlgeschlagen", "error");
        }
    }
  };
}