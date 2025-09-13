import {login} from '../../js/genesys_helper.js';
import Alpine from 'alpinejs';

window.init_data = function () {
    return {
        async init() {
            await login("be3addac-a274-47b2-b382-86588cbba3e3", "http://localhost:5173/announcement")
                .then(res => {
                    console.log("Access Token from inside init: ", Alpine.store('auth.token'));
                });
        },
    }
}

window.Alpine = Alpine;
Alpine.start();



Alpine.data('generalData', () => ({
    name: 'generalData',
    init() {
        login("be3addac-a274-47b2-b382-86588cbba3e3", "http://localhost:5173/announcement")
            .then(res => {
                console.log("Access Token from inside init: ", Alpine.store('auth.token'));
            });
    },
}));