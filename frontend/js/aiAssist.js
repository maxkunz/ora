function aiAssist() {

    const data = {
        show: false,
        x: 200,
        y: 200,
        chatHover: false,
        messages: [],
        inputActive: false,
        inputPrompt: '',
        tempInput: '',
        inputCallback: null,
        userInstruction: '',
        currentTargetElement: null,
        isGenerating: false,
        _animRunning: false,
        
        anim_easing: 0.05, //Speed of interpolation. 0 = instant jump, 1 = no movement at all.  Typical value for smooth animation: 0.05
        anim_offsetX: 120, //Horizontal offset in pixels from the mouse cursor.Positive = offset to the right; will be negated if mouse is in right third.
        anim_offsetY: 60, //Vertical offset in pixels from the mouse cursor.
        anim_padding: 16, // Minimum distance (padding) between the AI window and the screen edges.
        anim_pause_on_focus_left: 400, //Pause animation for x ms. when leaving the focus of the window
        AIGenService: null,

        init() {
            if (this._listenerInitialized) return;
            this._listenerInitialized = true;

            window.addEventListener('keydown', (e) => {
                if ((e.ctrlKey ) && e.key.toLowerCase() === 'a') {
                    e.preventDefault();
                    if (this.show==false){
                        this.start(e);
                    } else {
                        this.show=false
                    }
                }
            });
        },

        start(evt) {
            console.log("Start aiAssist:", evt);
            this.x = evt?.clientX || 200;
            this.y = evt?.clientY || 200;
            this.show = true;
            this.userInstruction = '';
            this.currentCommand = '';
            this.currentTargetElement = null;
            
            requestAnimationFrame(this.animatePosition.bind(this));

            if (Alpine.store('globalData').meta.businessContext) {
                this.addBotMessage("Wähle in der Matrix eine diese magischen Kugeln aus, dann kann ich dir an diese Stelle etwas zaubern!");
            } else {
                this.addBotMessage("Ich brauche den Business-Kontext um die beim ausfüllen der Konfiguration zu helfen!")
                this.promptUserInput("Business-Kontext:", (val) => {
                    Alpine.store('globalData').meta.businessContext = val;
                    this.addUserMessage("Kontext: " + val);
                    this.addBotMessage("Danke, das Hilft mir. Wähle nun in der Matrix eine diese magischen Kugeln aus, dann kann ich dir an diese Stelle etwas zaubern!");
                });
            }
        },

        addBotMessage(text, options = null, disableAll = false) {
            this.messages.push({ from: 'bot', text, options, selected: null, disableAll });
            this.scrollToBottom();
        },

        addUserMessage(text) {
            this.messages.push({ from: 'user', text });
            this.scrollToBottom();
        },

        promptUserInput(promptText, callbackFn) {
            this.resetInputPrompt()
            this.disableOldFunctionOptions()
            this.inputPrompt = promptText;
            this.inputCallback = (input) => {
              if (callbackFn) callbackFn(input);
              this.inputPrompt = null;
              this.inputCallback = null;
            };
        },
        resetInputPrompt() {
            this.inputPrompt = null;
            this.inputCallback = null;
            this.inputActive = false;
            this.tempInput = '';
        },

        promptFunctionSelection(currentObject, available) {
            this.resetInputPrompt()
            this.currentCommand = '';
            if(Alpine.store('globalData').meta.businessContext){
                this.disableOldFunctionOptions();
                this.currentTargetElement = currentObject;
                this.addBotMessage("Was davon kann ich dir erzeugen?", available.map(p => ({
                    label: {
                        generate_keywords: '🔤 Keywords',
                        generate_phrases: '💬 Phrasen',
                        generate_phrases_and_keywords: '🔤 💬 Both',
                        generate_categories: '📂 Kategorien',
                        generate_concerns: '⚠️ Concerns',
                        generate_subcategories: '📁 Subkategorien'
                    }[p] || p,
                        value: p
                })));
            } else {
                this.promptUserInput("Wenn du möchtest dass ich dir bei der Konfiguration helfe musst du mir erst den Business-Context verraten:", (val) => {
                    Alpine.store('globalData').meta.businessContext = val;
                    this.addUserMessage("Kontext: " + val);
                    this.addBotMessage("Ok, jetzt könenn wir weitermachen. Klick auf eine magische Kugel, dann können wir hier weiter machen!");
                });
            } 

        },
        disableOldFunctionOptions() {
            for (const msg of this.messages) {
              if (msg.options && !msg.disableAll) {
                msg.disableAll = true;
              }
            }
        },

        startPromptForFunction(currentCommand) {
              
            this.currentCommand = currentCommand;
            let botMessage = {
                generate_keywords: 'Bitte geben Sie eine Anweisung für Keyword-Generierung ein!',
                generate_phrases: 'Bitte geben Sie eine Anweisung für Phrasen ein!',
                generate_phrases_and_keywords: 'Bitte geben Sie eine Anweisung für Phrasen und Keywords ein!',
                generate_categories: 'Bitte geben Sie eine Anweisung für neue Kategorien!',
                generate_concerns: 'Bitte geben Sie eine Anweisung für neue Concerns!',
                generate_subcategories: 'Bitte geben Sie eine Anweisung für Subkategorien!'
            }[currentCommand] || 'Bitte geben Sie eine Anweisung ein:';
            this.inputPrompt = "Instruktion:"
            this.addBotMessage(botMessage)
            this.inputActive = true;

            this.inputCallback = (userInstruction) => {
                this.addUserMessage(userInstruction);
                this.resetInputPrompt();
                this.isGenerating = true;
                if (currentCommand == "generate_phrases_and_keywords") currentCommand=["generate_keywords", "generate_phrases"]
                Alpine.store('globalData').runAIGenFunction(currentCommand, this.currentTargetElement, userInstruction).then(() => {
                    this.isGenerating = false;
                });
            };
        },

        animatePosition() {
            if (!this.show) {
                this._animRunning = false;
                return;
            }
        
            if (!this.chatHover) {
                const mouseX = Alpine.store('globalData').mouseX;
                const mouseY = Alpine.store('globalData').mouseY;
        
                const screenWidth = window.innerWidth;
                const screenHeight = window.innerHeight;
        
                const isRightThird = mouseX > (screenWidth * 2 / 3);
        
                const offsetX = isRightThird ? -this.anim_offsetX : this.anim_offsetX;
                const offsetY = this.anim_offsetY;
        
                const box = this.$el.getBoundingClientRect();
                const targetX = mouseX + offsetX - (isRightThird ? box.width : 0);
                const targetY = mouseY + offsetY;
        
                const clampedX = Math.max(0, Math.min(targetX, screenWidth - box.width - this.anim_padding));
                const clampedY = Math.max(0, Math.min(targetY, screenHeight - box.height - this.anim_padding));
        
                console.log(`mouseX: ${mouseX}, isRightThird: ${isRightThird}, offsetX: ${offsetX}, targetX: ${targetX}`);
        
                this.x += (clampedX - this.x) * this.anim_easing;
                this.y += (clampedY - this.y) * this.anim_easing;
            }
        
            requestAnimationFrame(this.animatePosition.bind(this));
        },
        scrollToBottom() {
            requestAnimationFrame(() => {
              const container = document.querySelector('[x-data="$store.aiAssist"] .overflow-y-auto');
              if (container) {
                container.scrollTop = container.scrollHeight;
              }
            });
        }
    }
    return data;
}

document.addEventListener('alpine:init', () => {
    Alpine.store('aiAssist', aiAssist());
});