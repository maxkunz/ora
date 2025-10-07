import Alpine from 'alpinejs';

export function deploymentModule() {
  return {
    datatable_id: null,
    genesysHelper: null,

    init() {
      this.ensureDeploymentMeta();
      this.datatable_id  = Alpine.store('globalData').datatable_id;
      this.genesysHelper = Alpine.store('globalData').genesys.helper;
    },

    // --- Actions ---
    async deployToStaging() {
      try {
        const newDraftVersion = this.bumpVersion( this.getCfg('draft').version , 'major')
        this.updateCfg('draft', { lastChange: this.nowISO(), version: newDraftVersion });
        this.updateCfg('staging', { lastChange: this.nowISO(), version:  newDraftVersion});
        await this.genesysHelper.syncConfigurationToGenesys(this.datatable_id, 'draft');
        await this.genesysHelper.copyConfigurationBetweenVersions(this.datatable_id, 'draft', 'staging');
        Alpine.store('toast')?.show?.('Draft → Staging deployed.', 'success');
      } catch (e) {
        console.error(e);
        Alpine.store('toast')?.show?.('Deploy to Staging failed.', 'error');
      }
    },

    async launchToProduction() {
      try {
        await this.genesysHelper.copyConfigurationBetweenVersions(this.datatable_id, 'production', 'backup');
        const prodV = this.getCfg('production').version || null;
        this.updateCfg('backup', { lastChange: this.nowISO(), version: prodV });

        await this.genesysHelper.copyConfigurationBetweenVersions(this.datatable_id, 'staging', 'production');
        const stagingV = this.getCfg('staging').version || null;
        this.updateCfg('production', { lastChange: this.nowISO(), version: stagingV });

        Alpine.store('toast')?.show?.('Launch completed (Staging → Production).', 'success');
      } catch (e) {
        console.error(e);
        Alpine.store('toast')?.show?.('Launch failed.', 'error');
      }
    },

    async revertToDraft() {
      try {
        await this.genesysHelper.copyConfigurationBetweenVersions(this.datatable_id, 'staging', 'draft');
        const stagingV = this.getCfg('staging').version || null;
        this.updateCfg('draft', { lastChange: this.nowISO(), version: stagingV });
        Alpine.store('toast')?.show?.('Staging → Draft reverted.', 'success');
      } catch (e) {
        console.error(e);
        Alpine.store('toast')?.show?.('Revert to Draft failed.', 'error');
      }
    },

    async restoreBackupToProd() {
      try {
        await this.genesysHelper.copyConfigurationBetweenVersions(this.datatable_id, 'backup', 'production');
        const backupV = this.getCfg('backup').version || null;
        this.updateCfg('production', { lastChange: this.nowISO(), version: backupV });
        Alpine.store('toast')?.show?.('Backup → Production restored.', 'success');
      } catch (e) {
        console.error(e);
        Alpine.store('toast')?.show?.('Restore from Backup failed.', 'error');
      }
    },

    // --- Hold-to-confirm ---
    // Visual progress + persistence after completion
    holdProgress: 0,        // 0..1
    _holdRAF: null,
    _holdStartedAt: 0,
    _holdDuration: 600,
    _holdAction: null,
    _holdCompleted: false,
    _holdResetTimer: null,
    _holdPersistMs: 2500,   // keep filled for 2.5s after completion
    _hoverKey: null,
    _holdKey: null,
    _holdCompletedKey: null,

    _clearHoldResetTimer() {
      if (this._holdResetTimer) {
        clearTimeout(this._holdResetTimer);
        this._holdResetTimer = null;
      }
    },

    _scheduleHoldReset() {
      this._clearHoldResetTimer();
      // If still hovering **the completed button**, wait for leave event instead of timing out
      if (this._hoverKey && this._hoverKey === this._holdCompletedKey) return;
      this._holdResetTimer = setTimeout(() => {
        this.holdProgress = 0;
        this._holdCompleted = false;
        this._holdCompletedKey = null;
      }, this._holdPersistMs);
    },

    holdHoverEnter(key) {
      this._hoverKey = key;
      // while hovering keep bar filled if already completed for this key
      this._clearHoldResetTimer();
    },

    holdHoverLeave(key) {
      if (this._hoverKey === key) this._hoverKey = null;
      // if we already completed, reset after short delay unless still hovering the completed key
      if (this._holdCompleted && this._hoverKey !== this._holdCompletedKey) this._scheduleHoldReset();
    },

    holdStart(action, duration = 600, key = 'default') {
      // reset and start tracking
      this.holdEnd(); // gracefully stop any prior hold
      this.holdProgress   = 0;
      this._holdDuration  = Math.max(200, duration);
      this._holdStartedAt = performance.now();
      this._holdAction    = action;
      this._holdKey       = key;
      this._holdCompleted = false;
      this._holdCompletedKey = null;

      const tick = (now) => {
        const t = Math.min(1, (now - this._holdStartedAt) / this._holdDuration);
        this.holdProgress = t;

        if (t >= 1) {
          this._holdRAF = null;
          const fn = this._holdAction;
          this._holdAction = null;
          this._holdCompleted = true;
          this._holdCompletedKey = this._holdKey;
          try { typeof fn === 'function' && fn(); } catch (e) { console.error(e); }
          // keep the bar filled after completion; reset either on leave or after timeout
          this.holdProgress = 1;
          this._scheduleHoldReset();
        } else {
          this._holdRAF = requestAnimationFrame(tick);
        }
      };

      this._holdRAF = requestAnimationFrame(tick);
    },

    // Called on pointerup / pointercancel / keyup etc.
    holdEnd() {
      if (this._holdRAF) cancelAnimationFrame(this._holdRAF);
      this._holdRAF = null;

      if (this._holdCompleted) {
        // keep filled; schedule reset if not hovering completed key
        this._scheduleHoldReset();
      } else {
        // cancelled before completion: reset immediately
        this._holdAction = null;
        this.holdProgress = 0;
        this._clearHoldResetTimer();
        this._holdCompletedKey = null;
      }
      this._holdKey = null;
    },

    holdBarWidth(key) {
      if (this._holdCompleted && key === this._holdCompletedKey) return '100%';
      if (this._holdKey === key) return (this.holdProgress * 100).toFixed(1) + '%';
      return '0%';
    },

    // Backwards compatibility for existing bindings
    holdCancel() { this.holdEnd(); },

    // --- Meta helpers (global) ---
    ensureDeploymentMeta() {
      const g = Alpine.store('globalData');
      if (!g.meta) g.meta = {};
      if (!g.meta.deployment) g.meta.deployment = {};
      if (!g.meta.deployment.configs) {
        g.meta.deployment.configs = {
          draft:      { lastChange: null, version: null },
          staging:    { lastChange: null, version: null },
          production: { lastChange: null, version: null },
          backup:     { lastChange: null, version: null },
        };
      }
    },
    getCfg(name) {
      const cfgs = Alpine.store('globalData').meta?.deployment?.configs || {};
      return (cfgs[name] ||= { lastChange: null, version: null });
    },
    updateCfg(name, patch) {
      this.ensureDeploymentMeta();
      const t = this.getCfg(name);
      if (patch.lastChange !== undefined) t.lastChange = patch.lastChange;
      if (patch.version    !== undefined) t.version    = patch.version;
    },
    nowISO() { return new Date().toISOString(); },

    /**
     * Bump "MAJOR.MINOR".
     * @param {string} current
     * @param {'major'|'minor'} which
     * @returns {string}
     */
    bumpVersion(current, which) {
      let major = 0, minor = 0;
      if (typeof current === 'string' && /^\d+\.\d+$/.test(current)) {
        const [m, n] = current.split('.').map(v => parseInt(v, 10));
        if (!isNaN(m)) major = m;
        if (!isNaN(n)) minor = n;
      }
      if (which === 'major') { major += 1; minor = 0; }
      else if (which === 'minor') { minor += 1; }
      return `${major}.${minor}`;
    },

    // --- Card highlight helpers ---
    prodVersion() {
      const v = this.getCfg('production').version || null;
      return v && typeof v === 'string' ? v : (v ?? null);
    },
    cardHighlight(state) {
      const prodV = this.prodVersion();
      if (!prodV) return null; // no highlighting until Production has a version
      const v = this.getCfg(state).version || null;

      if (state === 'production') return 'green';

      if (state === 'draft') {
        const stagingV = this.getCfg('staging').version || null;
        if (v && v === prodV) return 'green';
        if (v && stagingV && v === stagingV) return 'yellow';
        return null; // draft differs from staging → no highlight
      }

      // staging / backup: compare against production
      if (v && v === prodV) return 'green';
      return 'yellow';
    },
    cardColorClass(state) {
      const h = this.cardHighlight(state);
      if (h === 'green') return 'bg-green-50 border-green-200';
      if (h === 'yellow') return 'bg-yellow-50 border-yellow-200';
      return 'bg-white border-gray-200';
    },

    // --- Display helper used by HTML ---
    formatDate(iso) {
      if (!iso) return '-';
      try { return new Date(iso).toLocaleString(); } catch { return iso; }
    },
  };
}