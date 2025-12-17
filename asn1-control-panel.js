/**
 * ASN1 Control Panel Web Component
 * A floating control panel with popup menu for ASN.1 decoding and label management
 */

class ASN1ControlPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.customLabels = {};
    this.allNodes = [];
    this.unknownTypes = new Set();
    this.isOpen = false;
  }

  connectedCallback() {
    this.render();
    this.attachEventListeners();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: fixed;
          top: 0;
          left: 0;
          height: 100%;
          z-index: 1000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .toggle-btn {
          position: fixed;
          top: 20px;
          left: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          width: 50px;
          height: 50px;
          font-size: 24px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1001;
        }

        .toggle-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 16px rgba(0,0,0,0.4);
        }

        .panel {
          position: fixed;
          top: 0;
          left: 0;
          width: 400px;
          height: 100%;
          background: white;
          box-shadow: 4px 0 24px rgba(0,0,0,0.15);
          overflow: hidden;
          transform: translateX(-100%);
          transition: transform 0.3s ease;
          pointer-events: none;
        }

        .panel.open {
          transform: translateX(0);
          pointer-events: all;
        }

        .panel-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          font-size: 18px;
          font-weight: 600;
        }

        .panel-content {
          height: calc(100% - 70px);
          overflow-y: auto;
          padding: 20px;
        }

        .section {
          margin-bottom: 24px;
        }

        .section-title {
          font-size: 14px;
          font-weight: 600;
          color: #333;
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        #hexInput {
          width: 100%;
          min-height: 100px;
          padding: 12px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          resize: vertical;
          box-sizing: border-box;
          transition: border-color 0.2s;
        }

        #hexInput:focus {
          outline: none;
          border-color: #667eea;
        }

        button {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          margin-right: 8px;
          margin-bottom: 8px;
        }

        .btn-primary {
          background: #667eea;
          color: white;
        }

        .btn-primary:hover {
          background: #5568d3;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
        }

        .btn-secondary {
          background: #f0f0f0;
          color: #333;
        }

        .btn-secondary:hover {
          background: #e0e0e0;
        }

        #labelForm {
          margin-top: 12px;
        }

        .label-row {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px;
          background: #f9f9f9;
          border-radius: 8px;
          margin-bottom: 12px;
          border: 1px solid #e0e0e0;
        }

        .label-info {
          font-size: 11px;
        }

        .label-name {
          font-weight: 600;
          color: #667eea;
          margin-bottom: 4px;
        }

        .label-details {
          color: #666;
          font-size: 10px;
        }

        .label-base {
          color: #4CAF50;
          font-size: 10px;
          margin-top: 2px;
        }

        .label-row input {
          width: 100%;
          padding: 8px;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          font-size: 12px;
          box-sizing: border-box;
        }

        .label-row input:focus {
          outline: none;
          border-color: #667eea;
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #999;
          font-size: 13px;
        }

        .status-message {
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 12px;
          font-size: 13px;
        }

        .status-success {
          background: #e8f5e9;
          color: #2e7d32;
          border: 1px solid #a5d6a7;
        }

        .status-error {
          background: #ffebee;
          color: #c62828;
          border: 1px solid #ef9a9a;
        }

        /* Scrollbar styling */
        .panel-content::-webkit-scrollbar {
          width: 8px;
        }

        .panel-content::-webkit-scrollbar-track {
          background: #f1f1f1;
        }

        .panel-content::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 4px;
        }

        .panel-content::-webkit-scrollbar-thumb:hover {
          background: #555;
        }

        /* Display Settings */
        .control-row {
          margin-bottom: 16px;
        }

        .control-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #333;
          margin-bottom: 8px;
        }

        .control-label input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .slider-container {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .slider {
          flex: 1;
          height: 6px;
          border-radius: 3px;
          background: #e0e0e0;
          outline: none;
          -webkit-appearance: none;
        }

        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .slider-value {
          min-width: 40px;
          text-align: right;
          font-size: 13px;
          color: #667eea;
          font-weight: 600;
        }

        /* Schema Viewer Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 2000;
        }

        .schema-modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: white;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          z-index: 2001;
          width: 700px;
          max-width: 90vw;
        }

        .schema-item {
          cursor: pointer;
          transition: all 0.2s;
        }

        .schema-item:hover {
          background: #f0f0ff !important;
          transform: translateX(4px);
        }

        .schema-field {
          padding: 8px 12px;
          background: #f9f9f9;
          border-left: 3px solid #667eea;
          margin-bottom: 8px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 12px;
        }

        .schema-field-name {
          color: #667eea;
          font-weight: 600;
        }

        .schema-field-type {
          color: #e67e22;
          font-weight: 500;
        }

        .schema-field-tag {
          color: #27ae60;
          font-size: 11px;
        }

        .schema-field-constraint {
          color: #8e44ad;
          font-size: 11px;
          margin-top: 4px;
        }

        .schema-field-clickable {
          cursor: pointer;
          transition: background 0.2s;
        }

        .schema-field-clickable:hover {
          background: #e8f4f8 !important;
        }

        /* Field Detail Modal */
        .field-detail-modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: white;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          z-index: 2002;
          width: 600px;
          max-width: 90vw;
          max-height: 80vh;
          overflow-y: auto;
        }

        .asn-definition {
          background: #2c3e50;
          color: #ecf0f1;
          padding: 16px;
          border-radius: 6px;
          font-family: 'Courier New', monospace;
          font-size: 13px;
          line-height: 1.6;
          overflow-x: auto;
        }

        .asn-keyword {
          color: #3498db;
          font-weight: bold;
        }

        .asn-type {
          color: #e74c3c;
        }

        .asn-tag {
          color: #2ecc71;
        }

        .asn-field-name {
          color: #f39c12;
        }
      </style>

      <button class="toggle-btn" id="toggleBtn" title="Open Control Panel">☰</button>

      <div class="panel" id="panel">
        <div class="panel-header">
          ASN.1 Control Panel
        </div>
        <div class="panel-content">
          <div id="statusMessage"></div>

          <div class="section">
            <div class="section-title">Input</div>
            <textarea id="hexInput" placeholder="Paste your hex-encoded ASN.1 data here..."></textarea>
            <div style="display: flex; gap: 8px; margin-top: 8px;">
              <button class="btn-primary" id="decodeBtn">🔍 Decode Hex</button>
              <button class="btn-secondary" id="importDerBtn">📁 Import DER File</button>
            </div>
            <input type="file" id="derFileInput" accept=".der,.ber" style="display: none;">
          </div>

          <div class="section">
            <div class="section-title">Display Settings</div>

            <div class="control-row">
              <label class="control-label">
                <input type="checkbox" id="edgeLabelsCheckbox">
                Show Edge Labels
              </label>
            </div>

            <div class="control-row">
              <label class="control-label">
                Node Spacing
              </label>
              <div class="slider-container">
                <input type="range" id="spacingSlider" class="slider" min="40" max="200" value="80">
                <span class="slider-value" id="spacingValue">80</span>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Custom Labels <span style="font-size: 11px; font-weight: 400; color: #999;">(for unknown tags)</span></div>
            <div id="labelForm">
              <div class="empty-state">
                Tags with schema definitions are auto-labeled. Custom labels are only needed for unknown tags.
              </div>
            </div>
            <button class="btn-primary" id="saveLabels" style="display: none;">✓ Apply Labels</button>
            <button class="btn-secondary" id="clearLabels" style="display: none;">✕ Clear All</button>
          </div>

          <div class="section">
            <div class="section-title">Rules & Custom Types</div>
            <div id="rulesContainer">
              <div class="empty-state">No constraints or custom types defined yet</div>
            </div>
            <button class="btn-secondary" id="toggleRawConfig" style="margin-top: 12px;">📄 View Raw Configuration</button>
            <div id="rawConfigContainer" style="display: none; margin-top: 12px;">
              <textarea readonly style="width: 100%; min-height: 200px; font-family: monospace; font-size: 11px; padding: 8px; border: 1px solid #e0e0e0; border-radius: 4px; background: #f9f9f9;"></textarea>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Configuration</div>
            <p style="font-size: 12px; color: #666; margin-bottom: 12px;">
              Export and import node constraints configuration
            </p>
            <button class="btn-primary" id="exportConfig">📥 Export Configuration</button>
            <button class="btn-secondary" id="importConfig">📤 Import Configuration</button>
            <input type="file" id="configFileInput" accept=".json" style="display: none;">
          </div>

          <div class="section">
            <div class="section-title">Schema Management</div>
            <p style="font-size: 12px; color: #666; margin-bottom: 12px;">
              Import ASN.1 schemas to apply field names to decoded data
            </p>
            <div style="display: flex; gap: 8px; margin-bottom: 12px;">
              <button class="btn-secondary" id="importSchema">📋 Import Schema</button>
              <button class="btn-secondary" id="loadAsn1Database">📚 Load ASN.1 DB</button>
            </div>
            <input type="file" id="schemaFileInput" accept=".json,.asn,.asn1" style="display: none;">
            <div style="font-size: 11px; color: #999; padding: 8px; background: #f8f9fa; border-radius: 4px; margin-bottom: 12px;">
              💡 <strong>Tip:</strong> Click "Load ASN.1 DB" to import 71 pre-defined types from the asn1-to-js database, or use "Import Schema" for custom .asn1 or .json schemas.
            </div>

            <div id="schemaList" style="margin-top: 16px;">
              <div class="empty-state" style="padding: 20px; font-size: 12px;">No schemas loaded</div>
            </div>

            <div id="schemaControls" style="display: none; margin-top: 12px;">
              <button class="btn-secondary" id="clearSchemas">✕ Clear All Schemas</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="drawer-tab">
        <div class="tab-content active">
          <div class="section">
            <div class="section-title">Element Explorer</div>
            <input type="text" id="elementSearch" placeholder="Search elements by name..." style="width: 100%; padding: 8px; border: 1px solid #e0e0e0; border-radius: 4px; margin-bottom: 12px; font-size: 12px; display: none;">
            <div id="elementTree" style="font-size: 12px;">
              <div class="empty-state" style="padding: 20px; text-align: center; color: #999;">
                Load schemas to explore elements
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Schema Viewer Modal -->
      <div id="schemaViewerOverlay" class="modal-overlay" style="display: none;"></div>
      <div id="schemaViewerModal" class="schema-modal" style="display: none;">
        <div class="modal-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 18px; font-weight: 600;">Schema Definition</div>
          <button id="closeSchemaViewer" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 4px;">✕</button>
        </div>
        <div id="schemaViewerBody" style="padding: 20px; max-height: 70vh; overflow-y: auto;">
          <!-- Content populated dynamically -->
        </div>
      </div>

      <!-- Field Detail Modal -->
      <div id="fieldDetailOverlay" class="modal-overlay" style="display: none; z-index: 2001;"></div>
      <div id="fieldDetailModal" class="field-detail-modal" style="display: none;">
        <div class="modal-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 18px; font-weight: 600;">Field Definition</div>
          <button id="closeFieldDetail" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 4px;">✕</button>
        </div>
        <div id="fieldDetailBody" style="padding: 20px;">
          <!-- Content populated dynamically -->
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    const toggleBtn = this.shadowRoot.getElementById("toggleBtn");
    const panel = this.shadowRoot.getElementById("panel");
    const decodeBtn = this.shadowRoot.getElementById("decodeBtn");
    const saveLabelsBtn = this.shadowRoot.getElementById("saveLabels");
    const clearLabelsBtn = this.shadowRoot.getElementById("clearLabels");
    const edgeLabelsCheckbox = this.shadowRoot.getElementById("edgeLabelsCheckbox");
    const spacingSlider = this.shadowRoot.getElementById("spacingSlider");
    const spacingValue = this.shadowRoot.getElementById("spacingValue");
    const importDerBtn = this.shadowRoot.getElementById("importDerBtn");
    const derFileInput = this.shadowRoot.getElementById("derFileInput");

    toggleBtn.addEventListener("click", () => {
      this.isOpen = !this.isOpen;
      panel.classList.toggle("open", this.isOpen);
      toggleBtn.textContent = this.isOpen ? "✕" : "☰";
      toggleBtn.title = this.isOpen ? "Close Control Panel" : "Open Control Panel";
    });

    decodeBtn.addEventListener("click", () => this.decode());
    saveLabelsBtn.addEventListener("click", () => this.saveLabels());
    clearLabelsBtn.addEventListener("click", () => this.clearLabels());

    // DER file import
    importDerBtn.addEventListener("click", () => {
      derFileInput.click();
    });

    derFileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        this.importDerFile(file);
      }
      // Reset file input
      derFileInput.value = '';
    });

    // Edge labels checkbox
    edgeLabelsCheckbox.addEventListener("change", (e) => {
      this.dispatchEvent(new CustomEvent("edgeLabelsChanged", {
        detail: { show: e.target.checked },
        bubbles: true,
        composed: true
      }));
    });

    // Spacing slider
    spacingSlider.addEventListener("input", (e) => {
      const value = e.target.value;
      spacingValue.textContent = value;

      this.dispatchEvent(new CustomEvent("spacingChanged", {
        detail: { spacing: parseInt(value) },
        bubbles: true,
        composed: true
      }));
    });

    // Export configuration
    const exportConfigBtn = this.shadowRoot.getElementById("exportConfig");
    exportConfigBtn.addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("exportConfiguration", {
        bubbles: true,
        composed: true
      }));
    });

    // Import configuration
    const importConfigBtn = this.shadowRoot.getElementById("importConfig");
    const configFileInput = this.shadowRoot.getElementById("configFileInput");

    importConfigBtn.addEventListener("click", () => {
      configFileInput.click();
    });

    configFileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const config = JSON.parse(event.target.result);
            this.dispatchEvent(new CustomEvent("importConfiguration", {
              detail: { config: config },
              bubbles: true,
              composed: true
            }));
            this.showStatus("Configuration imported successfully!", "success");
          } catch (error) {
            this.showStatus("Error importing configuration: " + error.message, "error");
          }
        };
        reader.readAsText(file);
      }
      // Reset file input
      configFileInput.value = '';
    });

    // Toggle raw config view
    const toggleRawConfigBtn = this.shadowRoot.getElementById("toggleRawConfig");
    const rawConfigContainer = this.shadowRoot.getElementById("rawConfigContainer");

    toggleRawConfigBtn.addEventListener("click", () => {
      const isVisible = rawConfigContainer.style.display !== 'none';
      rawConfigContainer.style.display = isVisible ? 'none' : 'block';
      toggleRawConfigBtn.textContent = isVisible ? '📄 View Raw Configuration' : '📄 Hide Raw Configuration';

      if (!isVisible) {
        // Request current config from graph viewer
        this.dispatchEvent(new CustomEvent("requestConfiguration", {
          bubbles: true,
          composed: true
        }));
      }
    });

    // Schema management
    const importSchemaBtn = this.shadowRoot.getElementById("importSchema");
    const loadAsn1DbBtn = this.shadowRoot.getElementById("loadAsn1Database");
    const schemaFileInput = this.shadowRoot.getElementById("schemaFileInput");
    const clearSchemasBtn = this.shadowRoot.getElementById("clearSchemas");

    importSchemaBtn.addEventListener("click", () => {
      schemaFileInput.click();
    });

    loadAsn1DbBtn.addEventListener("click", () => {
      this.loadAsn1Database();
    });

    schemaFileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        this.importSchemaFile(file);
      }
      // Reset file input
      schemaFileInput.value = '';
    });

    clearSchemasBtn.addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("clearSchemas", {
        bubbles: true,
        composed: true
      }));
      this.updateSchemaList([]);
    });

    // Element explorer search
    const elementSearch = this.shadowRoot.getElementById("elementSearch");
    if (elementSearch) {
      elementSearch.addEventListener("input", (e) => {
        const filter = e.target.value;
        if (this.allElements) {
          this.renderElementTree(this.allElements, filter);
        }
      });
    }

    // Schema viewer modal
    const closeSchemaViewer = this.shadowRoot.getElementById("closeSchemaViewer");
    const schemaViewerOverlay = this.shadowRoot.getElementById("schemaViewerOverlay");

    closeSchemaViewer.addEventListener("click", () => {
      this.hideSchemaViewer();
    });

    schemaViewerOverlay.addEventListener("click", () => {
      this.hideSchemaViewer();
    });

    // Field detail modal
    const closeFieldDetail = this.shadowRoot.getElementById("closeFieldDetail");
    const fieldDetailOverlay = this.shadowRoot.getElementById("fieldDetailOverlay");

    closeFieldDetail.addEventListener("click", () => {
      this.hideFieldDetail();
    });

    fieldDetailOverlay.addEventListener("click", () => {
      this.hideFieldDetail();
    });
  }

  updateRulesDisplay(config) {
    const rulesContainer = this.shadowRoot.getElementById("rulesContainer");
    const rawTextarea = this.shadowRoot.querySelector("#rawConfigContainer textarea");

    if (!config || !config.constraints || Object.keys(config.constraints).length === 0) {
      rulesContainer.innerHTML = '<div class="empty-state">No constraints or custom types defined yet</div>';
      rawTextarea.value = '{}';
      return;
    }

    // Update raw config view
    rawTextarea.value = JSON.stringify(config, null, 2);

    // Build rules display
    let html = '';
    const constraints = config.constraints;

    Object.entries(constraints).forEach(([nodePath, fieldConstraints]) => {
      const alias = fieldConstraints.alias;
      const displayPath = alias ? `${nodePath} (${alias})` : nodePath;

      html += `
        <div style="margin-bottom: 16px; padding: 12px; background: #f9f9f9; border-radius: 6px; border-left: 4px solid #667eea;">
          <div style="font-weight: 600; color: #667eea; margin-bottom: 8px; font-size: 13px;">
            ${displayPath}
          </div>
      `;

      Object.entries(fieldConstraints).forEach(([fieldName, rules]) => {
        // Skip the alias entry
        if (fieldName === 'alias') return;
        const rulesList = [];
        if (rules.required) rulesList.push('Required');
        if (rules.min !== undefined) rulesList.push(`Min: ${rules.min}`);
        if (rules.max !== undefined) rulesList.push(`Max: ${rules.max}`);
        if (rules.minLength !== undefined) rulesList.push(`Min Length: ${rules.minLength}`);
        if (rules.maxLength !== undefined) rulesList.push(`Max Length: ${rules.maxLength}`);
        if (rules.pattern) rulesList.push(`Pattern: ${rules.pattern}`);
        if (rules.enum) rulesList.push(`Enum: ${rules.enum.join(', ')}`);

        html += `
          <div style="margin-left: 12px; margin-top: 6px; font-size: 12px;">
            <span style="color: #333; font-weight: 500;">${fieldName}:</span>
            <span style="color: #666;">${rulesList.join(' • ')}</span>
          </div>
        `;
      });

      html += '</div>';
    });

    rulesContainer.innerHTML = html;
  }

  updateSchemaList(schemas) {
    const schemaList = this.shadowRoot.getElementById("schemaList");
    const schemaControls = this.shadowRoot.getElementById("schemaControls");

    // Store schemas for later use
    this.loadedSchemas = schemas || [];

    if (!schemas || schemas.length === 0) {
      schemaList.innerHTML = '<div class="empty-state" style="padding: 20px; font-size: 12px;">No schemas loaded</div>';
      schemaControls.style.display = 'none';
      this.updateElementExplorer([]);
      return;
    }

    // Show controls
    schemaControls.style.display = 'block';

    // Update element explorer
    this.updateElementExplorer(schemas);

    // Build schema list display
    let html = '';
    schemas.forEach((schema, index) => {
      html += `
        <div class="schema-item" data-schema-index="${index}" style="margin-bottom: 12px; padding: 12px; background: #f9f9f9; border-radius: 6px; border-left: 4px solid #667eea;">
          <div style="font-weight: 600; color: #667eea; margin-bottom: 4px; font-size: 13px;">
            ${schema.name} 👁️
          </div>
          <div style="font-size: 11px; color: #666;">
            ${schema.version ? `Version: ${schema.version}` : 'No version specified'}
          </div>
          ${schema.description ? `<div style="font-size: 11px; color: #666; margin-top: 4px;">${schema.description}</div>` : ''}
          <div style="font-size: 10px; color: #999; margin-top: 4px; font-style: italic;">Click to view definition</div>
        </div>
      `;
    });

    schemaList.innerHTML = html;

    // Add click handlers to schema items
    const schemaItems = this.shadowRoot.querySelectorAll('.schema-item');
    schemaItems.forEach(item => {
      item.addEventListener('click', () => {
        const index = parseInt(item.dataset.schemaIndex);
        this.showSchemaViewer(schemas[index]);
      });
    });
  }

  updateElementExplorer(schemas) {
    const elementTree = this.shadowRoot.getElementById("elementTree");
    const elementSearch = this.shadowRoot.getElementById("elementSearch");

    if (!schemas || schemas.length === 0) {
      elementTree.innerHTML = '<div class="empty-state" style="padding: 20px; text-align: center; color: #999;">Load schemas to explore elements</div>';
      elementSearch.style.display = 'none';
      return;
    }

    // Show search input
    elementSearch.style.display = 'block';

    // Build element tree from all schemas
    this.allElements = [];
    schemas.forEach(schema => {
      const schemaRoot = schema.root || schema;
      this.allElements.push({
        name: schema.name,
        type: schemaRoot.type || 'SEQUENCE',
        fields: schemaRoot.fields || [],
        schemaName: schema.name,
        isRoot: true
      });
    });

    this.renderElementTree(this.allElements);
  }

  renderElementTree(elements, filter = '') {
    const elementTree = this.shadowRoot.getElementById("elementTree");

    if (!elements || elements.length === 0) {
      elementTree.innerHTML = '<div class="empty-state" style="padding: 20px; text-align: center; color: #999;">No elements found</div>';
      return;
    }

    let html = '';
    elements.forEach((element, index) => {
      const matchesFilter = !filter || element.name.toLowerCase().includes(filter.toLowerCase());
      if (!matchesFilter && !element.isRoot) return;

      const hasChildren = element.fields && element.fields.length > 0;
      const elementId = `element-${index}-${element.name.replace(/[^a-zA-Z0-9]/g, '_')}`;

      html += `
        <div class="element-item" style="margin-bottom: 4px;">
          <div class="element-header" data-element-id="${elementId}" style="padding: 6px 8px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; gap: 6px; background: ${element.isRoot ? '#f0f7ff' : 'transparent'}; hover:background: #f5f5f5;">
            ${hasChildren ? `<span class="element-toggle" data-target="${elementId}-children" style="width: 16px; text-align: center; user-select: none;">▶</span>` : `<span style="width: 16px;"></span>`}
            <span style="font-weight: ${element.isRoot ? '600' : '500'}; color: ${element.isRoot ? '#667eea' : '#333'}; flex: 1;">${element.name}</span>
            <span style="font-size: 10px; color: #999; text-transform: uppercase;">${element.type}</span>
          </div>
          ${hasChildren ? `<div id="${elementId}-children" class="element-children" style="display: none; margin-left: 20px; border-left: 1px solid #e0e0e0; padding-left: 8px;">
            ${this.renderElementFields(element.fields, elementId)}
          </div>` : ''}
        </div>
      `;
    });

    elementTree.innerHTML = html;

    // Add click handlers for expand/collapse
    const toggles = this.shadowRoot.querySelectorAll('.element-toggle');
    toggles.forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetId = toggle.dataset.target;
        const children = this.shadowRoot.getElementById(targetId);
        if (children) {
          const isExpanded = children.style.display !== 'none';
          children.style.display = isExpanded ? 'none' : 'block';
          toggle.textContent = isExpanded ? '▶' : '▼';
        }
      });
    });

    // Add click handlers for elements (to navigate to them in graph)
    const headers = this.shadowRoot.querySelectorAll('.element-header');
    headers.forEach(header => {
      header.addEventListener('click', (e) => {
        if (e.target.classList.contains('element-toggle')) return;
        const elementName = header.querySelector('span:nth-child(2)').textContent;
        console.log('Navigate to element:', elementName);
        // TODO: Implement navigation to node in graph
      });
    });
  }

  renderElementFields(fields, parentId) {
    if (!fields || fields.length === 0) return '';

    let html = '';
    fields.forEach((field, index) => {
      const fieldId = `${parentId}-field-${index}`;
      const hasChildren = field.fields && field.fields.length > 0;
      const tagInfo = field.tag ? `[${field.tag.class === 2 ? field.tag.number : `${field.tag.class}:${field.tag.number}`}]` : '';

      html += `
        <div class="element-item" style="margin-bottom: 2px;">
          <div class="element-header" data-element-id="${fieldId}" style="padding: 4px 6px; cursor: pointer; border-radius: 3px; display: flex; align-items: center; gap: 6px;">
            ${hasChildren ? `<span class="element-toggle" data-target="${fieldId}-children" style="width: 16px; text-align: center; user-select: none;">▶</span>` : `<span style="width: 16px;"></span>`}
            <span style="font-weight: 400; color: #333; flex: 1;">${field.name}</span>
            <span style="font-size: 10px; color: #999;">${field.type || 'ANY'}</span>
            <span style="font-size: 9px; color: #999;">${tagInfo}</span>
          </div>
          ${hasChildren ? `<div id="${fieldId}-children" class="element-children" style="display: none; margin-left: 20px; border-left: 1px solid #e0e0e0; padding-left: 8px;">
            ${this.renderElementFields(field.fields, fieldId)}
          </div>` : ''}
        </div>
      `;
    });

    return html;
  }

  showStatus(message, type = "success") {
    const statusEl = this.shadowRoot.getElementById("statusMessage");
    statusEl.className = `status-message status-${type}`;
    statusEl.textContent = message;
    setTimeout(() => {
      statusEl.className = "";
      statusEl.textContent = "";
    }, 3000);
  }

  importDerFile(file) {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const arrayBuffer = event.target.result;
        const bytes = new Uint8Array(arrayBuffer);

        // Convert bytes to hex string
        const hex = Array.from(bytes)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        console.log(`📁 Loaded DER file: ${file.name} (${bytes.length} bytes)`);

        // Populate hex input
        const hexInput = this.shadowRoot.getElementById("hexInput");
        hexInput.value = hex;

        // Automatically decode
        this.decode();

        this.showStatus(`File "${file.name}" loaded (${bytes.length} bytes)`, "success");
      } catch (error) {
        console.error("Error reading DER file:", error);
        this.showStatus("Error reading file: " + error.message, "error");
      }
    };

    reader.onerror = () => {
      this.showStatus("Error reading file", "error");
    };

    reader.readAsArrayBuffer(file);
  }

  importSchemaFile(file) {
    const reader = new FileReader();
    const fileName = file.name.toLowerCase();

    reader.onload = (event) => {
      try {
        const content = event.target.result;
        let schema;

        // Determine file type and parse accordingly
        if (fileName.endsWith('.json')) {
          // JSON format
          schema = JSON.parse(content);
        } else if (fileName.endsWith('.asn') || fileName.endsWith('.asn1')) {
          // ASN.1 schema file
          if (typeof window.ASN1SchemaParser === 'undefined') {
            this.showStatus("ASN.1 schema parser not loaded", "error");
            return;
          }

          const schemaName = file.name.replace(/\.(asn|asn1)$/i, '');
          schema = window.ASN1SchemaParser.parse(content, schemaName);
        } else {
          this.showStatus("Unsupported file format. Use .json, .asn, or .asn1", "error");
          return;
        }

        // Dispatch schema import event
        this.dispatchEvent(new CustomEvent("schemaImport", {
          detail: { schema: schema },
          bubbles: true,
          composed: true
        }));

        this.showStatus(`Schema "${schema.name || 'Unnamed'}" imported successfully!`, "success");
      } catch (error) {
        console.error("Error importing schema:", error);
        this.showStatus("Error importing schema: " + error.message, "error");
      }
    };

    reader.onerror = () => {
      this.showStatus("Error reading schema file", "error");
    };

    reader.readAsText(file);
  }

  loadAsn1Database() {
    if (!window.asn1DB) {
      this.showStatus("ASN.1 database not loaded. Please refresh the page.", "error");
      return;
    }

    console.log("📚 Loading ASN.1 definitions from database...");

    try {
      // Get all definition names from the database
      const allNames = window.asn1DB.getAllNames();
      console.log(`Found ${allNames.length} definitions in database`);

      // Convert database definitions to schema format
      const schemas = [];

      allNames.forEach(name => {
        const def = window.asn1DB.getByName(name);
        if (def && def.kind === 'typedef' && def.type === 'SEQUENCE') {
          // Convert to our schema format
          const schema = {
            name: def.name,
            version: "1.0",
            description: `From asn1-to-js database (line ${def.line || 'unknown'})`,
            root: {
              type: def.type,
              fields: this.convertDbFieldsToSchema(def.fields || [])
            },
            allTypes: [{
              name: def.name,
              type: def.type,
              fields: this.convertDbFieldsToSchema(def.fields || [])
            }]
          };

          schemas.push(schema);
        }
      });

      if (schemas.length === 0) {
        this.showStatus("No SEQUENCE types found in database", "error");
        return;
      }

      // Import each schema
      let successCount = 0;
      schemas.forEach(schema => {
        console.log(`📤 Importing schema: ${schema.name}`);
        this.dispatchEvent(new CustomEvent("schemaImport", {
          detail: { schema: schema },
          bubbles: true,
          composed: true
        }));
        successCount++;
      });

      this.showStatus(`Loaded ${successCount} type definition(s) from ASN.1 database!`, "success");
      console.log(`✅ Successfully imported ${successCount} schemas from database`);

    } catch (error) {
      console.error("Error loading ASN.1 database:", error);
      this.showStatus("Error loading database: " + error.message, "error");
    }
  }

  convertDbFieldsToSchema(dbFields) {
    return dbFields.map((field, index) => {
      const schemaField = {
        name: field.name || `field${index}`,
        type: field.type || 'OCTET STRING',
        optional: field.optional || false
      };

      // Add tag if available
      if (field.tags && field.tags.length > 0) {
        const tag = field.tags[0];
        schemaField.tag = {
          class: this.tagClassToNumber(tag.class),
          number: tag.number
        };
      } else {
        // Default context-specific tag by position
        schemaField.tag = {
          class: 2,
          number: index
        };
      }

      // Add constraints if available
      if (field.validators && field.validators.length > 0) {
        schemaField.constraints = {};
        field.validators.forEach(validator => {
          if (validator.type === 'size') {
            schemaField.constraints.size = { min: validator.min, max: validator.max };
          } else if (validator.type === 'range') {
            schemaField.constraints.range = { min: validator.min, max: validator.max };
          }
        });
      }

      return schemaField;
    });
  }

  tagClassToNumber(className) {
    const map = {
      'UNIVERSAL': 0,
      'APPLICATION': 1,
      'CONTEXT': 2,
      'PRIVATE': 3
    };
    return map[className] || 2;
  }

  showSchemaViewer(schema) {
    const modal = this.shadowRoot.getElementById("schemaViewerModal");
    const overlay = this.shadowRoot.getElementById("schemaViewerOverlay");
    const body = this.shadowRoot.getElementById("schemaViewerBody");

    // Build schema viewer content
    let html = `
      <div style="margin-bottom: 20px;">
        <h3 style="color: #667eea; margin-bottom: 8px;">${schema.name}</h3>
        ${schema.version ? `<div style="font-size: 12px; color: #666;">Version: ${schema.version}</div>` : ''}
        ${schema.description ? `<div style="font-size: 13px; color: #666; margin-top: 8px;">${schema.description}</div>` : ''}
      </div>
    `;

    // Display root structure
    if (schema.root) {
      html += this.renderSchemaStructure(schema.root, 0);
    }

    // Display all types if available
    if (schema.allTypes && schema.allTypes.length > 1) {
      html += `
        <div style="margin-top: 24px; padding-top: 20px; border-top: 2px solid #e0e0e0;">
          <h4 style="color: #667eea; margin-bottom: 12px;">All Type Definitions</h4>
      `;

      schema.allTypes.forEach(typeDef => {
        html += this.renderSchemaStructure(typeDef, 0);
      });

      html += '</div>';
    }

    // Raw JSON view
    html += `
      <div style="margin-top: 24px; padding-top: 20px; border-top: 2px solid #e0e0e0;">
        <h4 style="color: #667eea; margin-bottom: 12px;">Raw JSON</h4>
        <pre style="background: #f9f9f9; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 11px; max-height: 300px; overflow-y: auto;">${JSON.stringify(schema, null, 2)}</pre>
      </div>
    `;

    body.innerHTML = html;

    // Attach click handlers to clickable fields
    const clickableFields = body.querySelectorAll('.schema-field-clickable');
    clickableFields.forEach(fieldEl => {
      fieldEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const fieldId = fieldEl.dataset.fieldId;
        if (this.fieldDataMap && this.fieldDataMap.has(fieldId)) {
          this.showFieldDetail(this.fieldDataMap.get(fieldId));
        }
      });
    });

    // Show modal
    modal.style.display = 'block';
    overlay.style.display = 'block';
  }

  renderSchemaStructure(structure, depth = 0, parentName = '') {
    const indent = depth * 20;
    const fieldId = `field_${Math.random().toString(36).substr(2, 9)}`;

    let html = `
      <div style="margin-left: ${indent}px; margin-bottom: 12px;">
        <div style="font-weight: 600; color: #333; margin-bottom: 8px;">
          <span class="schema-field-name">${structure.name || 'Root'}</span>
          <span class="schema-field-type"> :: ${structure.type || 'UNKNOWN'}</span>
        </div>
    `;

    // Show fields
    if (structure.fields && structure.fields.length > 0) {
      html += '<div style="margin-left: 20px;">';
      structure.fields.forEach((field, index) => {
        const uniqueFieldId = `${fieldId}_${index}`;
        html += `<div class="schema-field schema-field-clickable" data-field-id="${uniqueFieldId}">`;
        html += `<span class="schema-field-name">${field.name}</span>`;

        // Show tag prominently
        if (field.tag) {
          const tagClass = field.tag.class;
          const tagNumber = field.tag.number;
          let tagDisplay = '';

          switch(tagClass) {
            case 0: tagDisplay = `UNIVERSAL ${tagNumber}`; break;
            case 1: tagDisplay = `APPLICATION ${tagNumber}`; break;
            case 2: tagDisplay = `[${tagNumber}]`; break; // Context-specific
            case 3: tagDisplay = `PRIVATE ${tagNumber}`; break;
          }

          html += ` <span class="schema-field-tag" style="font-weight: bold; font-size: 12px;">${tagDisplay}</span>`;
        }

        html += ` <span class="schema-field-type">${field.type}</span>`;

        if (field.optional) {
          html += ' <span style="color: #999; font-style: italic;">OPTIONAL</span>';
        }

        if (field.constraints) {
          const constraints = [];
          if (field.constraints.required) constraints.push('required');
          if (field.constraints.min !== undefined) constraints.push(`min: ${field.constraints.min}`);
          if (field.constraints.max !== undefined) constraints.push(`max: ${field.constraints.max}`);
          if (field.constraints.minLength !== undefined) constraints.push(`minLen: ${field.constraints.minLength}`);
          if (field.constraints.maxLength !== undefined) constraints.push(`maxLen: ${field.constraints.maxLength}`);
          if (field.constraints.pattern) constraints.push(`pattern: ${field.constraints.pattern}`);

          if (constraints.length > 0) {
            html += `<div class="schema-field-constraint">${constraints.join(' • ')}</div>`;
          }
        }

        html += `<div style="font-size: 10px; color: #999; margin-top: 4px;">Click to view ASN.1 definition</div>`;

        // Store field data for click handler
        if (!this.fieldDataMap) {
          this.fieldDataMap = new Map();
        }
        this.fieldDataMap.set(uniqueFieldId, field);

        // Recursively render nested fields
        if (field.fields) {
          html += this.renderSchemaStructure(field, depth + 1, field.name);
        }

        html += '</div>';
      });
      html += '</div>';
    }

    html += '</div>';
    return html;
  }

  hideSchemaViewer() {
    const modal = this.shadowRoot.getElementById("schemaViewerModal");
    const overlay = this.shadowRoot.getElementById("schemaViewerOverlay");

    modal.style.display = 'none';
    overlay.style.display = 'none';
  }

  showFieldDetail(field) {
    const modal = this.shadowRoot.getElementById("fieldDetailModal");
    const overlay = this.shadowRoot.getElementById("fieldDetailOverlay");
    const body = this.shadowRoot.getElementById("fieldDetailBody");

    // Generate ASN.1 representation
    const asnDefinition = this.generateASN1Syntax(field);
    const fullASN1Definition = this.generateFullASN1Definition(field);

    // Build field detail content with Field Map at top
    let html = `
      <div style="margin-bottom: 20px;">
        <h3 style="color: #667eea; margin-bottom: 8px;">${field.name}</h3>
        <div style="font-size: 14px; color: #666; margin-bottom: 4px;">Type: <strong>${field.type}</strong></div>
    `;

    // Field Map Overview
    html += `
      <div style="margin-top: 16px; padding: 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; color: white;">
        <div style="font-weight: 600; margin-bottom: 12px; font-size: 15px;">📍 Field Map</div>
        <div style="display: flex; align-items: center; gap: 12px; font-family: monospace; font-size: 14px;">
          <div style="background: rgba(255,255,255,0.2); padding: 8px 12px; border-radius: 6px; font-weight: 600;">
            ${field.name}
          </div>
    `;

    if (field.tag) {
      const tagClass = field.tag.class;
      const tagNumber = field.tag.number;
      let tagDisplay = '';
      let tagBg = '';

      switch(tagClass) {
        case 0:
          tagDisplay = `UNIVERSAL ${tagNumber}`;
          tagBg = 'rgba(52, 152, 219, 0.3)';
          break;
        case 1:
          tagDisplay = `APPLICATION ${tagNumber}`;
          tagBg = 'rgba(231, 76, 60, 0.3)';
          break;
        case 2:
          tagDisplay = `[${tagNumber}]`;
          tagBg = 'rgba(46, 204, 113, 0.3)';
          break;
        case 3:
          tagDisplay = `PRIVATE ${tagNumber}`;
          tagBg = 'rgba(155, 89, 182, 0.3)';
          break;
      }

      html += `
          <div style="font-size: 20px; opacity: 0.8;">→</div>
          <div style="background: ${tagBg}; padding: 8px 12px; border-radius: 6px; border: 2px solid rgba(255,255,255,0.4); font-weight: 600;">
            Tag ${tagDisplay}
          </div>
      `;
    }

    html += `
          <div style="font-size: 20px; opacity: 0.8;">→</div>
          <div style="background: rgba(255,255,255,0.2); padding: 8px 12px; border-radius: 6px; font-style: italic;">
            ${field.type}
          </div>
        </div>
      </div>
    `;

    html += `</div>`;

    // Show tag information
    if (field.tag) {
      const tagClass = field.tag.class;
      const tagNumber = field.tag.number;
      let tagClassName = '';
      let tagColor = '';

      switch(tagClass) {
        case 0:
          tagClassName = 'Universal';
          tagColor = '#3498db';
          break;
        case 1:
          tagClassName = 'Application';
          tagColor = '#e74c3c';
          break;
        case 2:
          tagClassName = 'Context-specific';
          tagColor = '#2ecc71';
          break;
        case 3:
          tagClassName = 'Private';
          tagColor = '#9b59b6';
          break;
      }

      html += `
        <div style="margin-top: 12px; padding: 12px; background: #f9f9f9; border-left: 4px solid ${tagColor}; border-radius: 4px;">
          <div style="font-weight: 600; margin-bottom: 8px; color: ${tagColor};">Tag Information</div>
          <table style="width: 100%; font-size: 13px;">
            <tr>
              <td style="padding: 4px 0; color: #666;">Tag Class:</td>
              <td style="padding: 4px 0; font-weight: 600;">${tagClassName} (${tagClass})</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #666;">Tag Number:</td>
              <td style="padding: 4px 0; font-weight: 600;">${tagNumber}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #666;">Tag Encoding:</td>
              <td style="padding: 4px 0; font-family: monospace; font-weight: 600;">${tagClass === 2 ? `[${tagNumber}]` : `${tagClassName.toUpperCase()} ${tagNumber}`}</td>
            </tr>
          </table>
        </div>
      `;
    }

    // Show optional flag
    if (field.optional) {
      html += `<div style="margin-top: 8px; color: #e67e22; font-weight: 600;">⚠ OPTIONAL</div>`;
    }

    // Show constraints
    if (field.constraints && Object.keys(field.constraints).length > 0) {
      html += `
        <div style="margin-top: 16px; padding: 12px; background: #f0f0ff; border-left: 4px solid #8e44ad; border-radius: 4px;">
          <div style="font-weight: 600; margin-bottom: 8px; color: #8e44ad;">Constraints</div>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
      `;

      if (field.constraints.required) html += `<li>Required field</li>`;
      if (field.constraints.min !== undefined) html += `<li>Minimum value: ${field.constraints.min}</li>`;
      if (field.constraints.max !== undefined) html += `<li>Maximum value: ${field.constraints.max}</li>`;
      if (field.constraints.minLength !== undefined) html += `<li>Minimum length: ${field.constraints.minLength}</li>`;
      if (field.constraints.maxLength !== undefined) html += `<li>Maximum length: ${field.constraints.maxLength}</li>`;
      if (field.constraints.pattern) html += `<li>Pattern: <code>${field.constraints.pattern}</code></li>`;
      if (field.constraints.enum) html += `<li>Allowed values: ${field.constraints.enum.join(', ')}</li>`;

      html += `
          </ul>
        </div>
      `;
    }

    html += `</div>`;

    // Show ASN.1 definition
    html += `
      <div style="margin-bottom: 16px;">
        <h4 style="color: #667eea; margin-bottom: 8px;">ASN.1 Definition</h4>
        <div class="asn-definition">${fullASN1Definition}</div>

        <div style="margin-top: 12px; padding: 8px 12px; background: #f0f0f0; border-left: 3px solid #667eea; border-radius: 4px; font-size: 12px;">
          <strong>Compact Form:</strong> <code style="color: #667eea; font-family: monospace;">${asnDefinition}</code>
        </div>
      </div>
    `;

    // Show nested fields if any
    if (field.fields && field.fields.length > 0) {
      html += `
        <div style="margin-bottom: 16px;">
          <h4 style="color: #667eea; margin-bottom: 8px;">Nested Fields (${field.fields.length})</h4>
          <div style="background: #f9f9f9; padding: 12px; border-radius: 6px;">
      `;

      field.fields.forEach((nestedField, index) => {
        html += `<div style="padding: 8px; border-bottom: ${index < field.fields.length - 1 ? '1px solid #e0e0e0' : 'none'};">`;
        html += `<span style="color: #667eea; font-weight: 600;">${nestedField.name}</span> `;
        if (nestedField.tag) {
          html += `<span style="color: #27ae60;">[${nestedField.tag.number}]</span> `;
        }
        html += `<span style="color: #e67e22;">${nestedField.type}</span>`;
        if (nestedField.optional) {
          html += ` <span style="color: #999; font-style: italic;">OPTIONAL</span>`;
        }
        html += `</div>`;
      });

      html += `
          </div>
        </div>
      `;
    }

    // Show raw JSON
    html += `
      <div>
        <h4 style="color: #667eea; margin-bottom: 8px;">Raw JSON</h4>
        <pre style="background: #f9f9f9; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 11px; max-height: 200px; overflow-y: auto;">${JSON.stringify(field, null, 2)}</pre>
      </div>
    `;

    body.innerHTML = html;

    // Show modal
    modal.style.display = 'block';
    overlay.style.display = 'block';
  }

  generateASN1Syntax(field) {
    let syntax = '';

    // Field name and tag
    syntax += `${field.name}`;

    if (field.tag) {
      const tagClass = field.tag.class;
      const tagNumber = field.tag.number;

      if (tagClass === 2) {
        syntax += ` [${tagNumber}]`;
      } else if (tagClass === 1) {
        syntax += ` [APPLICATION ${tagNumber}]`;
      } else if (tagClass === 3) {
        syntax += ` [PRIVATE ${tagNumber}]`;
      }
    }

    syntax += ` ${field.type}`;

    if (field.optional) {
      syntax += ` OPTIONAL`;
    }

    return syntax;
  }

  generateFullASN1Definition(field) {
    let definition = '';

    // Field name and tag with syntax highlighting
    definition += `<span class="asn-field-name">${field.name}</span>`;

    if (field.tag) {
      const tagClass = field.tag.class;
      const tagNumber = field.tag.number;

      if (tagClass === 2) {
        // Context-specific
        definition += ` <span class="asn-tag">[${tagNumber}]</span>`;
      } else if (tagClass === 1) {
        definition += ` <span class="asn-tag">[APPLICATION ${tagNumber}]</span>`;
      } else if (tagClass === 3) {
        definition += ` <span class="asn-tag">[PRIVATE ${tagNumber}]</span>`;
      } else if (tagClass === 0) {
        definition += ` <span class="asn-tag">[UNIVERSAL ${tagNumber}]</span>`;
      }
    }

    // Type
    definition += ` <span class="asn-type">${field.type}</span>`;

    // Optional
    if (field.optional) {
      definition += ` <span class="asn-keyword">OPTIONAL</span>`;
    }

    // Nested fields
    if (field.fields && field.fields.length > 0) {
      definition += ` <span class="asn-keyword">{</span>\n`;
      field.fields.forEach((nestedField, index) => {
        definition += `  <span class="asn-field-name">${nestedField.name}</span>`;

        if (nestedField.tag) {
          const tagClass = nestedField.tag.class;
          const tagNumber = nestedField.tag.number;
          if (tagClass === 2) {
            definition += ` <span class="asn-tag">[${tagNumber}]</span>`;
          } else if (tagClass === 1) {
            definition += ` <span class="asn-tag">[APPLICATION ${tagNumber}]</span>`;
          } else if (tagClass === 3) {
            definition += ` <span class="asn-tag">[PRIVATE ${tagNumber}]</span>`;
          }
        }

        definition += ` <span class="asn-type">${nestedField.type}</span>`;

        if (nestedField.optional) {
          definition += ` <span class="asn-keyword">OPTIONAL</span>`;
        }

        if (index < field.fields.length - 1) {
          definition += ',';
        }
        definition += '\n';
      });
      definition += `<span class="asn-keyword">}</span>`;
    }

    return definition;
  }

  hideFieldDetail() {
    const modal = this.shadowRoot.getElementById("fieldDetailModal");
    const overlay = this.shadowRoot.getElementById("fieldDetailOverlay");

    modal.style.display = 'none';
    overlay.style.display = 'none';
  }

  decode() {
    const input = this.shadowRoot.getElementById("hexInput");
    const hex = input.value.trim().replace(/\s/g, "");

    if (!hex) {
      this.showStatus("Please enter hex data", "error");
      return;
    }

    // Check if ASN1 library is available
    if (typeof window.ASN1 === 'undefined' || typeof window.Hex === 'undefined') {
      this.showStatus("ASN.1 library not loaded. Please ensure the page includes the ASN.1 library.", "error");
      console.error("ASN1 or Hex not found on window object");
      return;
    }

    try {
      console.log("🔍 Starting decode of hex data:", hex.substring(0, 50) + "...");
      console.log("Hex length:", hex.length, "characters");

      const bytes = window.Hex.decode(hex);
      console.log("✅ Hex decoded to", bytes.length, "bytes");

      this.allNodes = [];
      this.unknownTypes = new Set();
      let pos = 0;

      console.log("🔄 Starting ASN.1 parsing loop...");
      while (pos < bytes.length) {
        try {
          const remaining = bytes.slice(pos);
          console.log(`  Parsing at position ${pos}, remaining bytes:`, remaining.length);

          const node = window.ASN1.decode(remaining);
          console.log(`  ✅ Decoded node:`, node);

          this.allNodes.push(node);
          this.collectUnknownTypes(node);

          const nodeEnd = node.posEnd();
          console.log(`  Node ends at position:`, nodeEnd);
          pos += nodeEnd;
        } catch (e) {
          console.error("❌ Stopped at position:", pos, "Error:", e.message, e);
          break;
        }
      }

      console.log("✅ Parsing complete. Total nodes:", this.allNodes.length);

      const serialized = this.allNodes.map((n) => this.serializeNode(n));

      console.log("📊 Serialized data:", JSON.stringify(serialized, null, 2));

      // Dispatch event with decoded data
      this.dispatchEvent(new CustomEvent("decoded", {
        detail: { data: serialized },
        bubbles: true,
        composed: true
      }));

      this.renderLabelForm();
      this.showStatus(`Successfully decoded ${this.allNodes.length} node(s)`, "success");

    } catch (e) {
      console.error("Decode error:", e);
      this.showStatus(`Error: ${e.message}`, "error");
    }
  }

  getASN1TypeName(tagClass, tagNumber, tagConstructed) {
    const key = `${tagClass}-${tagNumber}-${tagConstructed}`;
    if (this.customLabels[key]) {
      return this.customLabels[key];
    }

    if (tagClass === 0) {
      const universalTags = {
        1: "BOOLEAN", 2: "INTEGER", 3: "BIT STRING", 4: "OCTET STRING",
        5: "NULL", 6: "OBJECT IDENTIFIER", 7: "ObjectDescriptor",
        8: "EXTERNAL", 9: "REAL", 10: "ENUMERATED", 11: "EMBEDDED PDV",
        12: "UTF8String", 13: "RELATIVE-OID", 16: "SEQUENCE", 17: "SET",
        18: "NumericString", 19: "PrintableString", 20: "T61String",
        21: "VideotexString", 22: "IA5String", 23: "UTCTime",
        24: "GeneralizedTime", 25: "GraphicString", 26: "VisibleString",
        27: "GeneralString", 28: "UniversalString", 30: "BMPString",
      };
      return universalTags[tagNumber] || `Universal_${tagNumber}`;
    }

    if (tagClass === 2) {
      return `[${tagNumber}]${tagConstructed ? " CONSTRUCTED" : ""}`;
    }

    if (tagClass === 1) {
      return `APPLICATION ${tagNumber}${tagConstructed ? " CONSTRUCTED" : ""}`;
    }

    if (tagClass === 3) {
      return `PRIVATE ${tagNumber}${tagConstructed ? " CONSTRUCTED" : ""}`;
    }

    return "UNKNOWN";
  }

  getBaseUniversalType(node) {
    if (!node.sub && node.content) {
      const content = typeof node.content === "function" ? node.content() : node.content;

      if (typeof content === "string" && content.match(/^\([\d]+ byte\)/)) {
        const hex = content.split("\n")[1];
        if (hex && hex.length <= 8) {
          return "INTEGER";
        }
        return "OCTET STRING";
      }

      if (typeof content === "string" && content.match(/^[a-zA-Z0-9\s]+$/)) {
        return "PrintableString/UTF8String";
      }
    }

    if (node.sub && node.sub.length > 0) {
      return "SEQUENCE/SET";
    }

    return null;
  }

  collectUnknownTypes(node) {
    const typeName = this.getASN1TypeName(
      node.tag?.tagClass,
      node.tag?.tagNumber,
      node.tag?.tagConstructed
    );

    if (node.tag?.tagClass === 2 || node.tag?.tagClass === 1 || node.tag?.tagClass === 3) {
      // Check if this tag has a definition in loaded schemas or database
      const hasDefinition = this.hasSchemaDefinition(node.tag.tagClass, node.tag.tagNumber);

      // Only add to unknownTypes if no definition found
      if (!hasDefinition) {
        const baseType = this.getBaseUniversalType(node);
        const key = `${node.tag.tagClass}-${node.tag.tagNumber}-${node.tag.tagConstructed}`;
        this.unknownTypes.add(JSON.stringify({
          key,
          tagClass: node.tag.tagClass,
          tagNumber: node.tag.tagNumber,
          tagConstructed: node.tag.tagConstructed,
          currentName: typeName,
          baseType: baseType,
        }));
      }
    }

    if (node.sub && node.sub.length > 0) {
      node.sub.forEach((n) => this.collectUnknownTypes(n));
    }
  }

  hasSchemaDefinition(tagClass, tagNumber) {
    // Check ASN.1 database first
    if (window.asn1DB) {
      const tagClassNames = {
        0: 'UNIVERSAL',
        1: 'APPLICATION',
        2: 'CONTEXT',
        3: 'PRIVATE'
      };
      const tagClassName = tagClassNames[tagClass] || 'UNKNOWN';
      const defs = window.asn1DB.getByTag(tagClassName, tagNumber);
      if (defs && defs.length > 0) {
        return true;
      }
    }

    // Check loaded schemas
    if (this.loadedSchemas && this.loadedSchemas.length > 0) {
      for (const schema of this.loadedSchemas) {
        const schemaRoot = schema.root || schema;
        if (schemaRoot.fields && Array.isArray(schemaRoot.fields)) {
          const matchedField = schemaRoot.fields.find(field =>
            field.tag &&
            field.tag.class === tagClass &&
            field.tag.number === tagNumber
          );
          if (matchedField) {
            return true;
          }
        }
      }
    }

    return false;
  }

  serializeNode(node, depth = 0) {
    const typeName = this.getASN1TypeName(
      node.tag?.tagClass,
      node.tag?.tagNumber,
      node.tag?.tagConstructed
    );
    const baseType = (node.tag?.tagClass === 2 || node.tag?.tagClass === 1 || node.tag?.tagClass === 3)
      ? this.getBaseUniversalType(node)
      : null;

    const obj = {
      type: typeName,
      tagClass: node.tag?.tagClass,
      tagNumber: node.tag?.tagNumber,
      tagConstructed: node.tag?.tagConstructed,
      length: node.length,
    };

    if (baseType) {
      obj.baseType = baseType;
    }

    if (node.sub && node.sub.length > 0) {
      obj.subCount = node.sub.length;
      obj.sub = node.sub.map((n) => this.serializeNode(n, depth + 1));
    } else if (node.content !== undefined) {
      let content = typeof node.content === "function" ? node.content() : node.content;

      // Remove "(x byte)" prefix if present
      if (typeof content === "string" && content.match(/^\(\d+ byte\)/)) {
        // Extract content after the byte count line
        const lines = content.split("\n");
        content = lines.slice(1).join("\n").trim();
      }

      obj.content = content;
    }

    return obj;
  }

  renderLabelForm() {
    const labelForm = this.shadowRoot.getElementById("labelForm");
    const saveBtn = this.shadowRoot.getElementById("saveLabels");
    const clearBtn = this.shadowRoot.getElementById("clearLabels");

    labelForm.innerHTML = "";

    if (this.unknownTypes.size === 0) {
      labelForm.innerHTML = '<div class="empty-state">No unlabeled tags found</div>';
      saveBtn.style.display = "none";
      clearBtn.style.display = "none";
      return;
    }

    saveBtn.style.display = "inline-block";
    clearBtn.style.display = "inline-block";

    const types = Array.from(this.unknownTypes).map((s) => JSON.parse(s));
    types.forEach((type) => {
      const row = document.createElement("div");
      row.className = "label-row";

      const info = document.createElement("div");
      info.className = "label-info";

      const name = document.createElement("div");
      name.className = "label-name";
      name.textContent = type.currentName;
      info.appendChild(name);

      const details = document.createElement("div");
      details.className = "label-details";
      details.textContent = `Class: ${type.tagClass}, Tag: ${type.tagNumber}, ${
        type.tagConstructed ? "Constructed" : "Primitive"
      }`;
      info.appendChild(details);

      if (type.baseType) {
        const base = document.createElement("div");
        base.className = "label-base";
        base.textContent = `Inferred: ${type.baseType}`;
        info.appendChild(base);
      }

      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = "Enter custom label";
      input.value = this.customLabels[type.key] || "";
      input.dataset.key = type.key;

      row.appendChild(info);
      row.appendChild(input);
      labelForm.appendChild(row);
    });
  }

  saveLabels() {
    const inputs = this.shadowRoot.querySelectorAll("#labelForm input[data-key]");
    inputs.forEach((input) => {
      const key = input.dataset.key;
      const value = input.value.trim();
      if (value) {
        this.customLabels[key] = value;
      } else {
        delete this.customLabels[key];
      }
    });

    // Re-serialize and emit event
    const serialized = this.allNodes.map((n) => this.serializeNode(n));
    this.dispatchEvent(new CustomEvent("decoded", {
      detail: { data: serialized },
      bubbles: true,
      composed: true
    }));

    this.renderLabelForm();
    this.showStatus("Labels applied successfully", "success");
  }

  clearLabels() {
    this.customLabels = {};
    const serialized = this.allNodes.map((n) => this.serializeNode(n));
    this.dispatchEvent(new CustomEvent("decoded", {
      detail: { data: serialized },
      bubbles: true,
      composed: true
    }));

    this.renderLabelForm();
    this.showStatus("All labels cleared", "success");
  }
}

// Register the custom element
customElements.define("asn1-control-panel", ASN1ControlPanel);

export { ASN1ControlPanel };
