export function setupWizard() {
  return {
    visible: false,
    stepIndex: 0,
    steps: ['domain', 'persona', 'summary'],

    selectedDomain: '',
    persona: {
      voice: null,
      speed: 1.0,
      pitch: 0
    },

    domainOptions: [
      {
        key: 'finance',
        label: 'Finance',
        description: 'Banking, Konten, IBAN, PIN, Kartenservices',
        icon: '💰',
      },
      {
        key: 'insurance',
        label: 'Insurance',
        description: 'Versicherungen, Schadensmeldungen, Policen',
        icon: '🛡️',
      },
      {
        key: 'gkv',
        label: 'GKV',
        description: 'Gesetzliche Krankenkassen, Gesundheitsleistungen',
        icon: '🏥',
      },
      {
        key: '',
        label: 'Leeres Projekt',
        description: 'Manuelle Konfiguration ohne Voreinstellungen',
        icon: '🧱',
      },
    ],

    voices: ["de-DE-Chirp3-HD-Achernar",
"de-DE-Chirp3-HD-Achird",
"de-DE-Chirp3-HD-Algenib",
"de-DE-Chirp3-HD-Algieba",
"de-DE-Chirp3-HD-Alnilam",
"de-DE-Chirp3-HD-Aoede",
"de-DE-Chirp3-HD-Autonoe",
"de-DE-Chirp3-HD-Callirrhoe",
"de-DE-Chirp3-HD-Charon",
"de-DE-Chirp3-HD-Despina",
"de-DE-Chirp3-HD-Enceladus",
"de-DE-Chirp3-HD-Erinome",
"de-DE-Chirp3-HD-Fenrir",
"de-DE-Chirp3-HD-Gacrux",
"de-DE-Chirp3-HD-Iapetus",
"de-DE-Chirp3-HD-Kore",
"de-DE-Chirp3-HD-Laomedeia",
"de-DE-Chirp3-HD-Leda",
"de-DE-Chirp3-HD-Orus",
"de-DE-Chirp3-HD-Puck",
"de-DE-Chirp3-HD-Pulcherrima",
"de-DE-Chirp3-HD-Rasalgethi",
"de-DE-Chirp3-HD-Sadachbia",
"de-DE-Chirp3-HD-Sadaltager",
"de-DE-Chirp3-HD-Schedar",
"de-DE-Chirp3-HD-Sulafat",
"de-DE-Chirp3-HD-Umbriel",
"de-DE-Chirp3-HD-Vindemiatrix",
"de-DE-Chirp3-HD-Zephyr",
"de-DE-Chirp3-HD-Zubenelgenubi"],
    isLoadingVoices: false,

    init() {
      this.loadVoices()
      this.persona.voice = this.voices[0]
    },
    
    async loadVoices() {
      console.log("Try to load Voices: " + this.voices.length === 0);
      if (this.voices.length === 0){
        this.isLoadingVoices = true;
        try {
          this.voices = await fetchGoogleVoices('de-DE');
        } catch (err) {
          console.error(err);
          Alpine.store('toast').show('Fehler beim Abrufen der Google-Stimmen', 'error');
        } finally {
          this.isLoadingVoices = false;
        }
      }
    },

    open() {
      // Zustand zurücksetzen
      this.visible = true;
      this.stepIndex = 0;
      this.selectedDomain = null;
      this.persona = {
        voice: null,
        speed: 1.0,
        pitch: 0.0,
      };
    },

    next() {
      if (this.stepIndex < this.steps.length - 1) this.stepIndex++;
    },
    prev() {
      if (this.stepIndex > 0) this.stepIndex--;
    },
    async finish() {
      this.visible = false;
      const global = Alpine.store("globalData");

      // UI reset
      global.resetUI();

      global.meta.businessContext = this.selectedDomain;

      // Set Parameter
      const id = crypto.randomUUID();
      global.meta.persona = {
        ...this.persona
      };

      // Leave empty config if not selected
      if (!this.selectedDomain) {
        Alpine.store("toast").show("Leeres Projekt initialisiert", "success");
        return;
      }

      // Domain-Template loading (categories, concerns, matrix, targets)
      try {
        Alpine.store("toast").show("Domänenvorlage wird geladen...", "loading");

        const response = await fetch(
          `https://3mlrj4a6zh4lnnwajjan33xyqa0jvrvg.lambda-url.eu-central-1.on.aws/?domain=${this.selectedDomain}`
        );

        if (!response.ok) throw new Error("Vorlage konnte nicht geladen werden");

        const data = await response.json();

        // Set Config
        global.categories = data.categories ?? [];
        global.concerns = data.concerns ?? [];
        global.matrix = data.matrix ?? {};
        global.targets = data.targets ?? {};

        Alpine.store("toast").show("Projekt erfolgreich initialisiert", "success");
      } catch (err) {
        console.error("Fehler beim Laden der Domain-Vorlage:", err);
        Alpine.store("toast").show("Fehler beim Laden der Domänenvorlage", "error");
      }
    }
  }
}
// Maybe not the best solution since, Wizard will remain in global state and not reinitialized when opening again
document.addEventListener('alpine:init', () => {
  Alpine.store('setupWizard', setupWizard());
  Alpine.effect(() => {
    Alpine.store('setupWizard').init();
  });
});

export async function fetchGoogleVoices(lang = 'de-DE') {
  const response = await fetch(`https://texttospeech.googleapis.com/v1/voices?languageCode=${lang}&key=DEIN_API_KEY`);

  if (!response.ok) {
    throw new Error("Fehler beim Abrufen der Google-Stimmen");
  }

  const data = await response.json();
  return data.voices || [];
}