export function mission() {
    return window.Alpine.reactive({
        mission: {
            persona: '',
            tonfall: 0.5,
            background: '',
            backendUrl: '',
            slots: []
        },

        addSlot() {
            this.mission.slots.push({
                name: '',
                type: 'string',
                instruction: ''
            });
        },

        removeSlot(index) {
            this.mission.slots.splice(index, 1);
        },

        async update() {
            console.log(window.ENV.API_URL)
            try {
                const response = await fetch(window.ENV.API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(this.mission)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Fehler:', errorText);
                    alert('Update fehlgeschlagen: ' + errorText);
                    return;
                }

                const data = await response.json();
                console.log('Update erfolgreich:', data);
                alert('Mission erfolgreich aktualisiert!');
            } catch (error) {
                console.error('Fehler beim Update:', error);
                alert('Verbindung zum Backend fehlgeschlagen.');
            }
        }
    })
}