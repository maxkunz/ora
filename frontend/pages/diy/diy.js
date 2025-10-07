import Alpine from 'alpinejs';
import {loadDocumentsFromWorkspaceGenesys} from '../../js/genesys_helper.js';

export function diyModule() {
    return {
        selectedDiyIndex: null,
        addNewDiy() {
            Alpine.store("globalData").diys.push(this.newDiy());
            this.selectedDiyIndex = Alpine.store("globalData").diys.length - 1;
        },
        removeDiy(id) {
            window.Alpine.store("toast").show(`Diy gelöscht!`, "success");
            Alpine.store("globalData").diys.splice(id, 1)
            if (this.selectedDiyIndex === id) {
                this.selectedDiyIndex = null;
            }
        },

        newDiy() {
            return {
                Name: '',
                Description: '',
                Question: this.newQuestions()
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

        isSelected(target, val) {
            return target && target.type === val.type && target.value === val.value;
        },
    };
}