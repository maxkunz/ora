export function announcementModule() {
    const minutesPerSlot = 15;

    function timeFromIndex(i) {
        const m = i * minutesPerSlot;
        const h = String(Math.floor(m / 60)).padStart(2, '0');
        const mm = String(m % 60).padStart(2, '0');
        return `${h}:${mm}`;
    }

    function indexFromTime(t) {
        const [h, m] = t.split(':').map(Number);
        return Math.round((h * 60 + m) / minutesPerSlot);
    }

    function emptySchedule() {
        return {
            mon: new Set(),
            tue: new Set(),
            wed: new Set(),
            thu: new Set(),
            fri: new Set(),
            sat: new Set(),
            sun: new Set()
        };
    }

    function newAnnouncement() {
        return {
            id: crypto?.randomUUID?.() || String(Date.now()),
            title: '',
            enabled: true,
            tts_text: '',
            validity: {mode: 'always', from: '', to: '', date: ''},
            schedule: emptySchedule()
        };
    }

    function defineSlots(it) {
        const slots = emptySchedule();
        Object.defineProperty(it, '_slots', {value: slots, enumerable: false, writable: true, configurable: true});
        return it;
    }

    function ensureHydrated(it) {
        if (!it) return null;
        if (it._slots && it._slots.mon instanceof Set) return it;
        defineSlots(it);
        const sched = it.schedule || {mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: []};
        for (const day of Object.keys(it._slots)) {
            const set = new Set();
            const daySched = Array.isArray(sched[day]) ? sched[day] : [];
            for (const itv of daySched) {
                const p = typeof itv === 'string' ? parseIntervalString(itv) : itv;
                if (!p) continue;
                const si = indexFromTime(p.start), ei = indexFromTime(p.end);
                for (let i = si; i < ei; i++) set.add(i);
            }
            it._slots[day] = set;
        }
        return it;
    }

    function parseIntervalString(s) {
        const m = String(s).match(/^\s*(\d{2}:\d{2})\s*[–-]\s*(\d{2}:\d{2})\s*$/);
        return m ? {start: m[1], end: m[2]} : null;
    }

    return {
        days: [
            {key: 'mon', label: 'Mo'},
            {key: 'tue', label: 'Di'},
            {key: 'wed', label: 'Mi'},
            {key: 'thu', label: 'Do'},
            {key: 'fri', label: 'Fr'},
            {key: 'sat', label: 'Sa'},
            {key: 'sun', label: 'So'}
        ],
        selectedId: null,
        drag: {active: false, mode: null, day: null, last: undefined},
        dayInputs: {
            mon: {start: '', end: ''},
            tue: {start: '', end: ''},
            wed: {start: '', end: ''},
            thu: {start: '', end: ''},
            fri: {start: '', end: ''},
            sat: {start: '', end: ''},
            sun: {start: '', end: ''}
        },
        editState: {day: null, start: null, end: null},

        get items() {
            const gd = window.Alpine.store('globalData');
            return gd.announcements || [];
        },

        init() {
            const gd = window.Alpine.store('globalData');
            gd.announcements = (gd.announcements || []).map(raw => this.hydrate(raw));
            if (gd.announcements.length === 0) {
                this.add();
            } else {
                this.selectedId = gd.announcements[0].id;
                const cur = this.current;
                ensureHydrated(cur);
            }
        },

        hydrate(raw) {
            const it = defineSlots(newAnnouncement());
            it.id = raw.id || it.id;
            it.title = raw.title ?? '';
            it.enabled = raw.enabled ?? true;
            it.tts_text = raw.tts_text ?? '';
            it.validity = {...it.validity, ...(raw.validity || {})};
            it.schedule = raw.schedule || {mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: []};
            const sched = it.schedule;
            for (const day of Object.keys(it._slots)) {
                const set = new Set();
                const daySched = sched[day] || [];
                if (Array.isArray(daySched)) {
                    for (const itv of daySched) {
                        const p = typeof itv === 'string' ? parseIntervalString(itv) : itv;
                        if (!p) continue;
                        const si = indexFromTime(p.start);
                        const ei = indexFromTime(p.end);
                        for (let i = si; i < ei; i++) set.add(i);
                    }
                }
                it._slots[day] = set;
            }
            return it;
        },

        add() {
            const gd = window.Alpine.store('globalData');
            const it = defineSlots(newAnnouncement());
            it.schedule = {mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: []};
            gd.announcements.push(it);
            this.selectedId = it.id;
            this.emit();
        },

        duplicate(id) {
            const gd = window.Alpine.store('globalData');
            const anns = gd.announcements;
            const src = anns.find(x => x.id === id);
            if (!src) return;
            const copy = this.hydrate(src);
            copy.id = crypto?.randomUUID?.() || String(Date.now());
            copy.title = (src.title || 'Ansage') + ' (Kopie)';
            anns.push(copy);
            this.selectedId = copy.id;
            this.emit();
        },

        remove(id) {
            const gd = window.Alpine.store('globalData');
            const anns = gd.announcements;
            const idx = anns.findIndex(x => x.id === id);
            if (idx < 0) return;
            const wasSelected = anns[idx].id === this.selectedId;
            anns.splice(idx, 1);
            if (anns.length === 0) {
                this.add();
                return;
            }
            if (wasSelected) {
                this.selectedId = anns[Math.max(0, idx - 1)].id;
            }
            this.emit();
        },

        select(id) {
            this.selectedId = id;
        },

        get current() {
            const gd = window.Alpine.store('globalData');
            const it = gd.announcements.find(x => x.id === this.selectedId) || null;
            return ensureHydrated(it);
        },

        setValidityMode(mode) {
            if (!this.current) return;
            const v = this.current.validity;
            v.mode = mode;
            v.from = '';
            v.to = '';
            v.date = '';
            if (mode === 'range') v.date = '';
            if (mode === 'on') {
                v.from = '';
                v.to = '';
            }
            this.emit();
        },

        normalizedValidity(v) {
            const {mode, from, to, date} = v;
            if (mode === 'always') return {mode: 'always'};
            if (mode === 'from') return {mode: 'from', from};
            if (mode === 'range') return {mode: 'range', from, to};
            if (mode === 'on') return {mode: 'on', date};
            return {...v};
        },

        isOpen(day, index) {
            const sched = this.current?._slots?.[day];
            if (sched instanceof Set) return sched.has(index);
            if (Array.isArray(sched)) return sched.includes(index);
            return false;
        },

        isOpenSlot(day, index) {
            return this.isOpen(day, index);
        },

        toggleSlot(day, i, force = null) {
            if (!this.current) return;
            let set = this.current._slots[day];
            if (!(set instanceof Set)) {
                set = new Set();
                this.current._slots[day] = set;
            }
            const on = force !== null ? force : !set.has(i);
            if (on) set.add(i);
            else set.delete(i);
            this.emit();
        },

        addIntervalWithTimes(day, startStr, endStr) {
            if (!this.current) return;
            if (!startStr || !endStr) return;
            const s = String(startStr).slice(0, 5);
            const e = String(endStr).slice(0, 5);
            let si = indexFromTime(s);
            let ei = indexFromTime(e);
            si = Math.max(0, Math.min(95, si));
            ei = Math.max(0, Math.min(96, ei));
            if (ei <= si) return;
            let set = this.current._slots[day];
            if (!(set instanceof Set)) {
                set = new Set();
                this.current._slots[day] = set;
            }
            for (let i = si; i < ei; i++) set.add(i);
            this.emit();
        },

        addInterval(day) {
            const inp = this.dayInputs[day] || {start: '', end: ''};
            if (this.editState.day === day && this.editState.start && this.editState.end) {
                this.removeInterval(day, this.editState.start, this.editState.end);
                this.editState = {day: null, start: null, end: null};
            }
            this.addIntervalWithTimes(day, inp.start, inp.end);
            this.dayInputs[day] = {start: '', end: ''};
        },

        intervalsFor(day) {
            const sched = this.current?._slots?.[day];
            let arr = [];
            if (sched instanceof Set) arr = Array.from(sched);
            else if (Array.isArray(sched)) arr = sched.slice();
            else if (sched && typeof sched === 'object') arr = Object.keys(sched).map(n => parseInt(n, 10));
            arr = arr.filter(n => Number.isFinite(n));
            arr.sort((a, b) => a - b);

            const raw = [];
            let start = null, prev = null;
            for (const i of arr) {
                if (start === null) {
                    start = i;
                    prev = i;
                    continue;
                }
                if (i === prev + 1) {
                    prev = i;
                    continue;
                }
                raw.push({start, end: prev + 1});
                start = i;
                prev = i;
            }
            if (start !== null) raw.push({start, end: (prev ?? start) + 1});
            return raw.map(iv => ({start: timeFromIndex(iv.start), end: timeFromIndex(iv.end)}));
        },

        removeInterval(day, startStr, endStr) {
            if (!this.current) return;
            const s = String(startStr).slice(0, 5);
            const e = String(endStr).slice(0, 5);
            let si = indexFromTime(s);
            let ei = indexFromTime(e);
            si = Math.max(0, Math.min(95, si));
            ei = Math.max(0, Math.min(96, ei));
            if (ei <= si) return;
            let set = this.current._slots[day];
            if (!(set instanceof Set)) {
                set = new Set();
                this.current._slots[day] = set;
            }
            for (let i = si; i < ei; i++) set.delete(i);
            this.emit();
        },

        beginEditInterval(day, startStr, endStr) {
            this.dayInputs[day] = {start: startStr, end: endStr};
            this.editState = {day, start: startStr, end: endStr};
        },

        fillRange(day, from, to, mode) {
            if (!this.current) return;
            const a = Math.min(from, to);
            const b = Math.max(from, to);
            for (let i = a; i <= b; i++) this.toggleSlot(day, i, mode);
            this.drag.last = to;
        },

        startDrag(day, i) {
            if (!this.current) return;
            this.drag.active = true;
            this.drag.day = day;
            this.drag.mode = !this.isOpen(day, i);
            this.drag.last = i;
            this.toggleSlot(day, i, this.drag.mode);
        },

        dragOver(day, i) {
            if (!this.drag.active || day !== this.drag.day) return;
            if (this.drag.last === undefined || this.drag.last === i) return;
            this.fillRange(day, this.drag.last, i, this.drag.mode);
        },

        endDrag() {
            this.drag = {active: false, mode: null, day: null, last: undefined};
        },

        clearDay(day) {
            if (this.current) this.current._slots[day] = new Set();
            this.emit();
        },

        copyFromPrev(idx) {
            if (!this.current || idx <= 0) return;
            const fromKey = this.days[idx - 1].key;
            const toKey = this.days[idx].key;
            const source = this.current._slots[fromKey];
            this.current._slots[toKey] = new Set(source instanceof Set ? Array.from(source) : []);
            this.emit();
        },

        setPreset(name) {
            if (!this.current) return;
            const sch = this.current._slots;
            const all = Object.keys(sch);
            if (name === 'closed') {
                all.forEach(d => (sch[d] = new Set()));
                return;
            }
            if (name === 'office') {
                all.forEach(d => (sch[d] = new Set()));
                for (const day of ['mon', 'tue', 'wed', 'thu', 'fri']) {
                    for (const [s, e] of [['09:00', '12:00'], ['13:00', '17:00']]) {
                        const si = indexFromTime(s);
                        const ei = indexFromTime(e);
                        for (let i = si; i < ei; i++) sch[day].add(i);
                    }
                }
            }
            this.emit();
        },

        slotLabel(i) {
            return `${timeFromIndex(i)} – ${timeFromIndex(i + 1)}`;
        },

        toIntervals(schedule) {
            const out = {};
            for (const day of Object.keys(schedule)) {
                const dayValue = schedule[day];
                let arr;
                if (dayValue instanceof Set) {
                    arr = Array.from(dayValue).sort((a, b) => a - b);
                } else if (Array.isArray(dayValue)) {
                    arr = dayValue.slice().sort((a, b) => a - b);
                } else {
                    arr = [];
                }

                const intervals = [];
                let start = null;
                let prev = null;
                for (const i of arr) {
                    if (start === null) {
                        start = i;
                        prev = i;
                        continue;
                    }
                    if (i === prev + 1) {
                        prev = i;
                        continue;
                    }
                    intervals.push({start: timeFromIndex(start), end: timeFromIndex(prev + 1)});
                    start = i;
                    prev = i;
                }
                if (start !== null) {
                    intervals.push({
                        start: timeFromIndex(start),
                        end: timeFromIndex((prev ?? start) + 1)
                    });
                }
                out[day] = intervals;
            }
            return out;
        },
        toIntervalsStrings(schedule) {
            const out = {};
            for (const day of Object.keys(schedule)) {
                const arr = (schedule[day] instanceof Set)
                    ? Array.from(schedule[day]).sort((a, b) => a - b)
                    : Array.isArray(schedule[day]) ? schedule[day].slice().sort((a, b) => a - b) : [];
                const res = [];
                let start = null, prev = null;
                for (const i of arr) {
                    if (start === null) {
                        start = i;
                        prev = i;
                        continue;
                    }
                    if (i === prev + 1) {
                        prev = i;
                        continue;
                    }
                    res.push(`${timeFromIndex(start)} - ${timeFromIndex(prev + 1)}`);
                    start = i;
                    prev = i;
                }
                if (start !== null) res.push(`${timeFromIndex(start)} - ${timeFromIndex((prev ?? start) + 1)}`);
                out[day] = res;
            }
            return out;
        },

        dehydrate(item) {
            return {
                id: item.id,
                title: item.title,
                enabled: item.enabled,
                tts_text: item.tts_text,
                validity: this.normalizedValidity(item.validity),
                schedule: this.toIntervalsStrings(item._slots)
            };
        },

        payload() {
            const gd = window.Alpine.store('globalData');
            return {
                items: gd.announcements.map(it => this.dehydrate(it))
            };
        },
        emit() {
            const gd = window.Alpine.store('globalData');
            for (const it of gd.announcements) {
                if (!it || !it._slots) continue;
                it.schedule = this.toIntervalsStrings(it._slots);
            }
        },
    };
}