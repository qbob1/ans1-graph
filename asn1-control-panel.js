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
          top: 20px;
          right: 20px;
          z-index: 1000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .toggle-btn {
          background: #4CAF50;
          color: white;
          border: none;
          border-radius: 50%;
          width: 60px;
          height: 60px;
          font-size: 24px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .toggle-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 16px rgba(0,0,0,0.4);
        }

        .panel {
          position: absolute;
          top: 70px;
          right: 0;
          width: 400px;
          max-height: 80vh;
          background: white;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.2);
          overflow: hidden;
          transform: translateY(-20px);
          opacity: 0;
          pointer-events: none;
          transition: all 0.3s ease;
        }

        .panel.open {
          transform: translateY(0);
          opacity: 1;
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
          max-height: calc(80vh - 70px);
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
      </style>

      <button class="toggle-btn" id="toggleBtn" title="Open Control Panel">⚙️</button>

      <div class="panel" id="panel">
        <div class="panel-header">
          ASN.1 Control Panel
        </div>
        <div class="panel-content">
          <div id="statusMessage"></div>

          <div class="section">
            <div class="section-title">Hex Input</div>
            <textarea id="hexInput" placeholder="Paste your hex-encoded ASN.1 data here..."></textarea>
            <button class="btn-primary" id="decodeBtn">🔍 Decode</button>
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

    toggleBtn.addEventListener("click", () => {
      this.isOpen = !this.isOpen;
      panel.classList.toggle("open", this.isOpen);
      toggleBtn.textContent = this.isOpen ? "✕" : "⚙️";
      toggleBtn.title = this.isOpen ? "Close Control Panel" : "Open Control Panel";
    });

    decodeBtn.addEventListener("click", () => this.decode());
    saveLabelsBtn.addEventListener("click", () => this.saveLabels());
    clearLabelsBtn.addEventListener("click", () => this.clearLabels());
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
      const bytes = window.Hex.decode(hex);

      this.allNodes = [];
      this.unknownTypes = new Set();
      let pos = 0;

      while (pos < bytes.length) {
        try {
          const remaining = bytes.slice(pos);
          const node = window.ASN1.decode(remaining);
          this.allNodes.push(node);
          this.collectUnknownTypes(node);
          const nodeEnd = node.posEnd();
          pos += nodeEnd;
        } catch (e) {
          console.log("Stopped at position:", pos, "Error:", e.message);
          break;
        }
      }

      const serialized = this.allNodes.map((n) => this.serializeNode(n));

      console.log("Decoded", this.allNodes.length, "nodes, serialized:", serialized);

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
      obj.content = typeof node.content === "function" ? node.content() : node.content;
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
