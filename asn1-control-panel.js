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
            <div class="section-title">Custom Labels</div>
            <div id="labelForm">
              <div class="empty-state">
                Decode ASN.1 data to see unlabeled tags
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
              Import and apply ASN.1 schemas to decoded data
            </p>
            <button class="btn-secondary" id="importSchema">📋 Import Schema</button>
            <input type="file" id="schemaFileInput" accept=".json" style="display: none;">

            <div id="schemaList" style="margin-top: 16px;">
              <div class="empty-state" style="padding: 20px; font-size: 12px;">No schemas loaded</div>
            </div>

            <div id="schemaControls" style="display: none; margin-top: 12px;">
              <label style="font-size: 12px; color: #666; display: block; margin-bottom: 8px;">
                Active Schema:
              </label>
              <select id="schemaSelector" style="width: 100%; padding: 8px; border: 1px solid #e0e0e0; border-radius: 4px; margin-bottom: 12px;">
                <option value="">-- Select Schema --</option>
              </select>
              <button class="btn-primary" id="applySchema">✓ Apply Schema to Data</button>
              <button class="btn-secondary" id="clearSchemas">✕ Clear All Schemas</button>
            </div>
          </div>
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
    const schemaFileInput = this.shadowRoot.getElementById("schemaFileInput");
    const schemaSelector = this.shadowRoot.getElementById("schemaSelector");
    const applySchemaBtn = this.shadowRoot.getElementById("applySchema");
    const clearSchemasBtn = this.shadowRoot.getElementById("clearSchemas");

    importSchemaBtn.addEventListener("click", () => {
      schemaFileInput.click();
    });

    schemaFileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const schema = JSON.parse(event.target.result);
            this.dispatchEvent(new CustomEvent("schemaImport", {
              detail: { schema: schema },
              bubbles: true,
              composed: true
            }));
            this.showStatus(`Schema "${schema.name || 'Unnamed'}" imported successfully!`, "success");
          } catch (error) {
            this.showStatus("Error importing schema: " + error.message, "error");
          }
        };
        reader.readAsText(file);
      }
      // Reset file input
      schemaFileInput.value = '';
    });

    schemaSelector.addEventListener("change", (e) => {
      const schemaName = e.target.value;
      if (schemaName) {
        this.dispatchEvent(new CustomEvent("schemaSelected", {
          detail: { schemaName: schemaName },
          bubbles: true,
          composed: true
        }));
      }
    });

    applySchemaBtn.addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("applySchema", {
        bubbles: true,
        composed: true
      }));
    });

    clearSchemasBtn.addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("clearSchemas", {
        bubbles: true,
        composed: true
      }));
      this.updateSchemaList([]);
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
    const schemaSelector = this.shadowRoot.getElementById("schemaSelector");

    if (!schemas || schemas.length === 0) {
      schemaList.innerHTML = '<div class="empty-state" style="padding: 20px; font-size: 12px;">No schemas loaded</div>';
      schemaControls.style.display = 'none';
      return;
    }

    // Show controls
    schemaControls.style.display = 'block';

    // Build schema list display
    let html = '';
    schemas.forEach((schema, index) => {
      html += `
        <div style="margin-bottom: 12px; padding: 12px; background: #f9f9f9; border-radius: 6px; border-left: 4px solid #667eea;">
          <div style="font-weight: 600; color: #667eea; margin-bottom: 4px; font-size: 13px;">
            ${schema.name}
          </div>
          <div style="font-size: 11px; color: #666;">
            ${schema.version ? `Version: ${schema.version}` : 'No version specified'}
          </div>
          ${schema.description ? `<div style="font-size: 11px; color: #666; margin-top: 4px;">${schema.description}</div>` : ''}
        </div>
      `;
    });

    schemaList.innerHTML = html;

    // Update selector dropdown
    schemaSelector.innerHTML = '<option value="">-- Select Schema --</option>';
    schemas.forEach(schema => {
      const option = document.createElement('option');
      option.value = schema.name;
      option.textContent = schema.name;
      schemaSelector.appendChild(option);
    });
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

    if (node.sub && node.sub.length > 0) {
      node.sub.forEach((n) => this.collectUnknownTypes(n));
    }
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
