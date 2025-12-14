/**
 * ASN1 Graph Viewer Web Component
 * A standalone web component for rendering ASN.1 data as an interactive D3 graph
 */

class ASN1GraphViewer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.data = null;
    this.svg = null;
    this.g = null;
    this.graphOptions = null;
    this.showEdgeLabels = false; // Default: hide edge labels
    this.nodeSeparation = 80; // Default vertical spacing
    this.levelSeparation = 200; // Default horizontal spacing
  }

  connectedCallback() {
    this.render();
    this.initGraph();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          height: 100%;
          overflow: hidden;
          position: relative;
        }

        #searchBar {
          position: absolute;
          top: 20px;
          left: 90px;
          z-index: 100;
          padding: 10px 16px;
          border: 2px solid #667eea;
          border-radius: 8px;
          font-size: 14px;
          width: 300px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          background: white;
        }

        #searchBar:focus {
          outline: none;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        #container {
          width: 100%;
          height: 100%;
          background: #fafafa;
        }

        svg {
          display: block;
          cursor: grab;
        }

        svg:active {
          cursor: grabbing;
        }

        .node-highlighted rect {
          stroke: #ff6b6b !important;
          stroke-width: 3 !important;
          filter: drop-shadow(0 0 8px rgba(255, 107, 107, 0.6));
        }

        .node-dimmed {
          opacity: 0.3;
        }

        /* Edit Modal */
        #editModal {
          display: none;
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: white;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
          z-index: 1000;
          width: 500px;
          max-height: 80vh;
          overflow-y: auto;
        }

        #editModal.visible {
          display: block;
        }

        #modalOverlay {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          z-index: 999;
        }

        #modalOverlay.visible {
          display: block;
        }

        .modal-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          border-radius: 12px 12px 0 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-title {
          font-size: 18px;
          font-weight: 600;
        }

        .close-btn {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
        }

        .close-btn:hover {
          background: rgba(255,255,255,0.2);
        }

        .modal-body {
          padding: 20px;
        }

        .field-group {
          margin-bottom: 16px;
        }

        .field-label {
          font-size: 12px;
          font-weight: 600;
          color: #666;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .field-value {
          padding: 10px;
          background: #f9f9f9;
          border-radius: 6px;
          font-family: monospace;
          font-size: 13px;
          border: 1px solid #e0e0e0;
        }

        .field-input {
          width: 100%;
          padding: 10px;
          border: 2px solid #e0e0e0;
          border-radius: 6px;
          font-family: monospace;
          font-size: 13px;
          box-sizing: border-box;
        }

        .field-input:focus {
          outline: none;
          border-color: #667eea;
        }

        textarea.field-input {
          min-height: 100px;
          resize: vertical;
        }

        select.field-input {
          min-height: 40px;
          cursor: pointer;
          background: white;
        }

        input.field-input[type="text"],
        input.field-input[type="number"],
        input.field-input[type="date"],
        input.field-input[type="time"],
        input.field-input[type="datetime-local"] {
          min-height: 40px;
        }

        input.field-input[type="checkbox"] {
          width: auto;
          min-height: auto;
        }

        textarea.field-input[readonly],
        select.field-input[disabled],
        input.field-input[readonly] {
          background: #f5f5f5;
          color: #999;
          cursor: not-allowed;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          margin-top: 20px;
        }

        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          flex: 1;
        }

        .btn-primary {
          background: #667eea;
          color: white;
        }

        .btn-primary:hover {
          background: #5568d3;
        }

        .btn-secondary {
          background: #f0f0f0;
          color: #333;
        }

        .btn-secondary:hover {
          background: #e0e0e0;
        }
      </style>
      <input type="text" id="searchBar" placeholder="🔍 Search nodes..." />
      <div id="container"></div>

      <div id="modalOverlay"></div>
      <div id="editModal">
        <div class="modal-header">
          <div class="modal-title">Edit Node</div>
          <button class="close-btn" id="closeModal">✕</button>
        </div>
        <div class="modal-body" id="modalBody">
          <!-- Content populated dynamically -->
        </div>
      </div>
    `;
  }

  initGraph() {
    const container = this.shadowRoot.getElementById("container");
    const searchBar = this.shadowRoot.getElementById("searchBar");
    const modalOverlay = this.shadowRoot.getElementById("modalOverlay");
    const closeModal = this.shadowRoot.getElementById("closeModal");

    // Get dimensions from the component
    const width = this.getAttribute("width") || window.innerWidth;
    const height = this.getAttribute("height") || window.innerHeight;

    // Create D3 graph directly on the container element
    this.graphOptions = {
      width: parseInt(width),
      height: parseInt(height),
      levelSeparation: this.levelSeparation, // Horizontal spacing
      nodeSeparation: this.nodeSeparation,   // Vertical spacing
    };

    // Search functionality
    searchBar.addEventListener("input", (e) => {
      this.searchNodes(e.target.value);
    });

    // Modal close handlers
    modalOverlay.addEventListener("click", () => this.closeEditModal());
    closeModal.addEventListener("click", () => this.closeEditModal());

    // Initialize SVG directly since we're working with shadow DOM
    this.initD3Graph(container);
  }

  initD3Graph(container) {
    // Clear container
    container.innerHTML = '';

    const width = this.graphOptions.width;
    const height = this.graphOptions.height;

    // Create SVG using D3 on the container element
    this.svg = d3.select(container)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("border", "1px solid #ddd");

    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 3])
      .on("zoom", (event) => {
        this.g.attr("transform", event.transform);
      });

    this.svg.call(zoom);

    this.g = this.svg
      .append("g")
      .attr("transform", `translate(100, ${height / 2})`);  // Start from left, centered vertically
  }

  /**
   * Set the data to visualize
   * @param {Object|Array} data - The ASN.1 data to visualize
   */
  setData(data) {
    this.data = data;
    if (this.svg && this.g) {
      this.renderJson(data);
    }
  }

  /**
   * Set edge label visibility
   * @param {boolean} show - Whether to show edge labels
   */
  setEdgeLabels(show) {
    this.showEdgeLabels = show;
    if (this.data) {
      this.renderJson(this.data);
    }
  }

  /**
   * Set node spacing
   * @param {number} nodeSep - Vertical spacing between nodes
   * @param {number} levelSep - Horizontal spacing between levels
   */
  setSpacing(nodeSep, levelSep) {
    this.nodeSeparation = nodeSep || this.nodeSeparation;
    this.levelSeparation = levelSep || this.levelSeparation;

    if (this.graphOptions) {
      this.graphOptions.nodeSeparation = this.nodeSeparation;
      this.graphOptions.levelSeparation = this.levelSeparation;
    }

    if (this.data) {
      this.renderJson(this.data);
    }
  }

  /**
   * Update URL with current node path
   */
  updateURLState(nodePath) {
    const url = new URL(window.location);
    if (nodePath) {
      url.searchParams.set('node', encodeURIComponent(nodePath));
    } else {
      url.searchParams.delete('node');
    }
    window.history.pushState({}, '', url);
  }

  /**
   * Get node path from URL
   */
  getNodePathFromURL() {
    const params = new URLSearchParams(window.location.search);
    const nodePath = params.get('node');
    return nodePath ? decodeURIComponent(nodePath) : null;
  }

  /**
   * Find node by path
   */
  findNodeByPath(path) {
    if (!this.root) return null;

    let foundNode = null;
    this.root.each((node) => {
      if (node.data.path === path) {
        foundNode = node;
      }
    });
    return foundNode;
  }

  /**
   * Convert JSON to hierarchical structure
   */
  jsonToHierarchy(obj, name = "root", path = "root") {
    const node = {
      name: name,
      path: path,
      properties: [],
      children: [],
      rawData: obj, // Store raw data for editing
    };

    if (Array.isArray(obj)) {
      node.name = `${name} [${obj.length} items]`;
      node.isArray = true;

      obj.forEach((item, index) => {
        if (typeof item === "object" && item !== null) {
          node.children.push(
            this.jsonToHierarchy(item, `[${index}]`, `${path}[${index}]`)
          );
        } else {
          // Omit content - don't display primitive values
          // Only structural information is shown
        }
      });
    } else if (typeof obj === "object" && obj !== null) {
      // Determine node name
      if (obj.name) {
        node.name = obj.name;
      } else if (obj.type) {
        node.name = obj.type;
      } else {
        node.name = name;
      }

      // Separate properties and children
      Object.entries(obj).forEach(([key, value]) => {
        // Special handling for ASN.1 'sub' array - these are children nodes
        if (key === "sub" && Array.isArray(value)) {
          value.forEach((child, index) => {
            node.children.push(
              this.jsonToHierarchy(child, `[${index}]`, `${path}.sub[${index}]`)
            );
          });
        } else if (value === null) {
          // Skip null values
        } else if (typeof value !== "object") {
          // Skip content and internal properties - only show structural information
          // Display only: type, length, name
          if (["type", "length", "name"].includes(key)) {
            const strValue = String(value);
            node.properties.push({
              key,
              value: strValue,
              fullValue: strValue
            });
          }
        } else if (!Array.isArray(value)) {
          // Regular object property (not 'sub' array)
          node.children.push(
            this.jsonToHierarchy(value, key, `${path}.${key}`)
          );
        }
      });
    }

    return node;
  }

  /**
   * Render the JSON data as a D3 tree
   */
  renderJson(jsonObj) {
    if (!this.svg || !this.g) {
      return;
    }

    // Convert JSON to hierarchy
    const hierarchyData = this.jsonToHierarchy(jsonObj);
    this.root = d3.hierarchy(hierarchyData);

    // Create tree layout - HORIZONTAL (left to right)
    const tree = d3.tree()
      .nodeSize([
        this.graphOptions.nodeSeparation || 80,  // Vertical spacing between nodes
        this.graphOptions.levelSeparation || 200, // Horizontal spacing between levels
      ]);

    // Generate tree
    tree(this.root);

    // Clear previous render
    this.g.selectAll("*").remove();

    // Draw links - HORIZONTAL
    this.g
      .selectAll(".link")
      .data(this.root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr(
        "d",
        d3.linkHorizontal()  // Changed from linkVertical
          .x((d) => d.y)       // Swap x and y for horizontal layout
          .y((d) => d.x)
      )
      .attr("fill", "none")
      .attr("stroke", "#999")
      .attr("stroke-width", 1.5);

    // Draw link labels (if enabled)
    if (this.showEdgeLabels) {
      this.g
        .selectAll(".link-label")
        .data(this.root.links())
        .enter()
        .append("text")
        .attr("class", "link-label")
        .attr("x", (d) => (d.source.y + d.target.y) / 2)  // Swapped
        .attr("y", (d) => d.target.x - 10)                // Swapped and offset
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("fill", "#666")
        .text((d) =>
          d.target.data.name !== d.target.parent.data.name
            ? d.target.data.name.split(" ")[0]
            : ""
        );
    }

    // Draw nodes
    const nodes = this.g
      .selectAll(".node")
      .data(this.root.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (d) => `translate(${d.y}, ${d.x})`)  // Swapped for horizontal
      .style("cursor", "pointer");

    // Store reference to component for click handler
    const self = this;

    // Add node backgrounds
    nodes.each(function (d) {
      const node = d3.select(this);
      const props = d.data.properties;
      const hasProps = props && props.length > 0;

      // Calculate height based on properties
      const titleHeight = 25;
      const propHeight = hasProps ? props.length * 18 + 10 : 0;
      const totalHeight = titleHeight + propHeight;
      const width = 180;

      // Add rectangle
      node
        .append("rect")
        .attr("x", -width / 2)
        .attr("y", -titleHeight / 2)
        .attr("width", width)
        .attr("height", totalHeight)
        .attr("rx", 5)
        .attr("fill", d.data.isArray ? "#f0f0f0" : "white")
        .attr("stroke", "#ddd")
        .attr("stroke-width", 2)
        .on("click", function(event) {
          event.stopPropagation();
          self.showEditModal(d);
        });

      // Add title
      node
        .append("text")
        .attr("y", 5)
        .attr("text-anchor", "middle")
        .attr("font-weight", "bold")
        .attr("font-size", "12px")
        .text(d.data.name);

      // Add properties
      if (hasProps) {
        const propGroup = node
          .append("g")
          .attr(
            "transform",
            `translate(${-width / 2 + 8}, ${titleHeight / 2 + 5})`
          );

        props.forEach((prop, i) => {
          const propLine = propGroup
            .append("g")
            .attr("transform", `translate(0, ${i * 18})`);

          propLine
            .append("text")
            .attr("font-size", "11px")
            .attr("fill", "#666")
            .text(`${prop.key}:`);

          propLine
            .append("text")
            .attr("x", 50)
            .attr("font-size", "11px")
            .attr("fill", "#333")
            .text(prop.value);
        });
      }
    });

    // Nodes are now locked in place - no drag behavior
  }

  /**
   * Search and filter nodes
   */
  searchNodes(query) {
    if (!this.root) return;

    const lowerQuery = query.toLowerCase();
    const nodes = this.g.selectAll(".node");

    if (!query) {
      // Clear search - show all nodes
      nodes.classed("node-highlighted", false).classed("node-dimmed", false);
      return;
    }

    nodes.each(function(d) {
      const node = d3.select(this);
      const nodeName = d.data.name.toLowerCase();
      const nodeProps = d.data.properties.map(p =>
        `${p.key}:${p.fullValue || p.value}`.toLowerCase()
      ).join(" ");

      const matches = nodeName.includes(lowerQuery) || nodeProps.includes(lowerQuery);

      node.classed("node-highlighted", matches);
      node.classed("node-dimmed", !matches);
    });
  }

  /**
   * Collect all OIDs from the data tree
   */
  collectAllOIDs(node = null) {
    const oids = new Set();
    const rootNode = node || this.root;

    if (!rootNode) return [];

    rootNode.each((d) => {
      // Check if this node is an OID type
      if (d.data.rawData) {
        if (d.data.rawData.type === 'OBJECT IDENTIFIER' ||
            d.data.rawData.type === 'OID' ||
            d.data.name === 'OBJECT IDENTIFIER') {
          // Try to find the OID value in various possible locations
          if (d.data.rawData.oid) {
            oids.add(d.data.rawData.oid);
          } else if (d.data.rawData.content) {
            oids.add(d.data.rawData.content);
          }
        }
      }
    });

    return Array.from(oids).sort();
  }

  /**
   * Determine the appropriate input type for a field based on ASN.1 type and field key
   */
  getInputTypeForField(nodeType, fieldKey, fieldValue) {
    // Handle specific field keys first
    if (fieldKey === 'length') {
      return { type: 'number', min: 0, step: 1 };
    }

    // Map ASN.1 types to input types
    const typeMapping = {
      'INTEGER': { type: 'number', step: 1 },
      'BOOLEAN': { type: 'checkbox' },
      'UTCTime': { type: 'datetime-local' },
      'GeneralizedTime': { type: 'datetime-local' },
      'DATE': { type: 'date' },
      'TIME': { type: 'time' },
      'NumericString': { type: 'number' },
      'IA5String': { type: 'text' },
      'PrintableString': { type: 'text' },
      'UTF8String': { type: 'text' },
      'BMPString': { type: 'text' },
      'UniversalString': { type: 'text' },
    };

    // Check if the node type matches any known types
    if (typeMapping[nodeType]) {
      return typeMapping[nodeType];
    }

    // Default to textarea for complex types
    return { type: 'textarea' };
  }

  /**
   * Show edit modal for a node
   */
  showEditModal(nodeData) {
    const modal = this.shadowRoot.getElementById("editModal");
    const overlay = this.shadowRoot.getElementById("modalOverlay");
    const modalBody = this.shadowRoot.getElementById("modalBody");

    const hasChildren = nodeData.data.children && nodeData.data.children.length > 0;
    const hasProperties = nodeData.data.properties && nodeData.data.properties.length > 0;

    // Collect all OIDs from the payload
    const allOIDs = this.collectAllOIDs();

    // Build modal content
    let html = `
      <div class="field-group">
        <div class="field-label">Node Type</div>
        <div class="field-value">${nodeData.data.name}</div>
      </div>
      <div class="field-group">
        <div class="field-label">Path</div>
        <div class="field-value">${nodeData.data.path}</div>
      </div>
    `;

    // Show class if available
    if (nodeData.data.rawData && nodeData.data.rawData.tagClass !== undefined) {
      const classNames = ['Universal', 'Application', 'Context-specific', 'Private'];
      const className = classNames[nodeData.data.rawData.tagClass] || nodeData.data.rawData.tagClass;
      html += `
        <div class="field-group">
          <div class="field-label">Class</div>
          <div class="field-value">${className}</div>
        </div>
      `;
    }

    // Show list of child nodes if this node has them
    if (hasChildren) {
      html += `
        <div class="field-group">
          <div class="field-label">Child Nodes (${nodeData.data.children.length})</div>
          <div class="field-value" style="color: #666; font-style: italic;">
      `;

      nodeData.data.children.forEach((child, index) => {
        const childType = child.name || 'Unknown';
        html += `<div style="padding: 4px 0; border-bottom: 1px solid #eee;">
          ${index + 1}. ${childType}
        </div>`;
      });

      html += `
          </div>
        </div>
      `;
    }

    // Add editable properties from rawData (only for this node, not children)
    const editableProps = [];
    const isOIDNode = nodeData.data.rawData &&
                      (nodeData.data.rawData.type === 'OBJECT IDENTIFIER' ||
                       nodeData.data.name === 'OBJECT IDENTIFIER');

    if (nodeData.data.rawData && typeof nodeData.data.rawData === 'object') {
      // Get all properties from rawData except structural ones
      const excludeKeys = ['sub', 'tagClass', 'tagNumber', 'tagConstructed', 'subCount'];
      Object.entries(nodeData.data.rawData).forEach(([key, value]) => {
        if (!excludeKeys.includes(key) && typeof value !== 'object') {
          editableProps.push({ key, value: String(value) });
        }
      });
    }

    if (editableProps.length > 0) {
      html += `<div class="field-label" style="margin-top: 16px;">Editable Properties (This Node Only)</div>`;

      // Get the node type for input type detection
      const nodeType = nodeData.data.rawData?.type || nodeData.data.name;

      editableProps.forEach((prop, index) => {
        const isLengthField = prop.key === 'length';
        const isReadonly = (isLengthField && hasChildren);
        const isOIDField = isOIDNode && (prop.key === 'oid' || prop.key === 'content');

        html += `<div class="field-group">
          <div class="field-label">${prop.key}${isReadonly ? ' (read-only)' : ''}</div>`;

        // Use dropdown for OID fields
        if (isOIDField && allOIDs.length > 0) {
          html += `<select class="field-input" data-prop-key="${prop.key}" ${isReadonly ? 'disabled' : ''}>`;
          allOIDs.forEach(oid => {
            const selected = oid === prop.value ? 'selected' : '';
            html += `<option value="${oid}" ${selected}>${oid}</option>`;
          });
          html += `</select>`;
        } else {
          // Get appropriate input type based on ASN.1 type
          const inputInfo = this.getInputTypeForField(nodeType, prop.key, prop.value);

          if (inputInfo.type === 'checkbox') {
            // Boolean checkbox
            const checked = (prop.value === 'true' || prop.value === '1' || prop.value === 'TRUE') ? 'checked' : '';
            html += `<label style="display: flex; align-items: center; gap: 8px;">
              <input type="checkbox" class="field-input" data-prop-key="${prop.key}" ${checked} ${isReadonly ? 'disabled' : ''} style="width: auto;">
              <span>${prop.value}</span>
            </label>`;
          } else if (inputInfo.type === 'textarea') {
            // Default textarea for complex content
            html += `<textarea class="field-input" data-prop-key="${prop.key}" ${isReadonly ? 'readonly' : ''}>${prop.value}</textarea>`;
          } else {
            // Standard input types (text, number, date, datetime-local, time)
            let attrs = `type="${inputInfo.type}"`;
            if (inputInfo.min !== undefined) attrs += ` min="${inputInfo.min}"`;
            if (inputInfo.max !== undefined) attrs += ` max="${inputInfo.max}"`;
            if (inputInfo.step !== undefined) attrs += ` step="${inputInfo.step}"`;

            html += `<input class="field-input" ${attrs} data-prop-key="${prop.key}" value="${prop.value}" ${isReadonly ? 'readonly' : ''}>`;
          }
        }

        html += `</div>`;
      });
    } else {
      html += `
        <div class="field-group">
          <div class="field-value" style="color: #999; font-style: italic;">
            This node has no editable properties.
          </div>
        </div>
      `;
    }

    // Add raw data display (excluding 'sub' array to show only this node's data)
    if (nodeData.data.rawData) {
      const dataToShow = {...nodeData.data.rawData};
      delete dataToShow.sub; // Don't show child nodes in raw data

      html += `
        <div class="field-group">
          <div class="field-label">Raw Data (This Node Only)</div>
          <textarea class="field-input" readonly style="min-height: 100px;">${JSON.stringify(dataToShow, null, 2)}</textarea>
        </div>
      `;
    }

    // Add action buttons
    html += `
      <div class="modal-actions">
        <button class="btn btn-secondary" id="cancelEdit">Close</button>
        ${editableProps.length > 0 ? '<button class="btn btn-primary" id="saveEdit">Save Changes</button>' : ''}
      </div>
    `;

    modalBody.innerHTML = html;

    // Show modal
    modal.classList.add("visible");
    overlay.classList.add("visible");

    // Attach event listeners
    const self = this;
    this.shadowRoot.getElementById("cancelEdit").addEventListener("click", () => {
      this.closeEditModal();
    });

    const saveBtn = this.shadowRoot.getElementById("saveEdit");
    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        self.saveNodeEdits(nodeData);
      });
    }
  }

  /**
   * Save node edits
   */
  saveNodeEdits(nodeData) {
    const modalBody = this.shadowRoot.getElementById("modalBody");
    // Get all input types: textareas, selects, and inputs
    const inputs = modalBody.querySelectorAll("textarea[data-prop-key], select[data-prop-key], input[data-prop-key]");

    let contentChanged = false;
    let newContentValue = null;

    // Only update properties that belong to THIS node, not children
    inputs.forEach((input) => {
      // Skip if readonly or disabled
      if (input.hasAttribute('readonly') || input.hasAttribute('disabled')) {
        return;
      }

      const key = input.dataset.propKey;
      let newValue;

      // Handle different input types
      if (input.type === 'checkbox') {
        newValue = input.checked ? 'true' : 'false';
      } else {
        newValue = input.value;
      }

      // Update the raw data object (this is a reference to the original data)
      if (nodeData.data.rawData && typeof nodeData.data.rawData === 'object') {
        // Only update if this key exists directly on this node's data
        // Don't update if it's part of a child node (sub array)
        if (nodeData.data.rawData.hasOwnProperty(key) && key !== 'sub') {
          // Convert to appropriate type based on original data type
          const originalValue = nodeData.data.rawData[key];
          if (typeof originalValue === 'number') {
            nodeData.data.rawData[key] = Number(newValue);
          } else if (typeof originalValue === 'boolean') {
            nodeData.data.rawData[key] = newValue === 'true' || newValue === true;
          } else {
            nodeData.data.rawData[key] = newValue;
          }

          // Track if content was changed
          if (key === 'content') {
            contentChanged = true;
            newContentValue = newValue;
          }
        }
      }

      // Update the properties array if this key exists there
      const property = nodeData.data.properties.find(p => p.key === key);
      if (property) {
        property.value = newValue;
        property.fullValue = newValue;
      }
    });

    // If content changed, update the length field
    if (contentChanged && nodeData.data.rawData) {
      // Calculate new length based on content
      // For ASN.1, this is typically the byte length of the content
      if (typeof newContentValue === 'string') {
        // Calculate byte length (UTF-8 encoding)
        const byteLength = new TextEncoder().encode(newContentValue).length;
        nodeData.data.rawData.length = byteLength;

        // Update the length in properties if it exists
        const lengthProp = nodeData.data.properties.find(p => p.key === 'length');
        if (lengthProp) {
          lengthProp.value = String(byteLength);
          lengthProp.fullValue = String(byteLength);
        } else {
          // Add length property if it doesn't exist
          nodeData.data.properties.push({
            key: 'length',
            value: String(byteLength),
            fullValue: String(byteLength)
          });
        }
      }
    }

    // Re-render only this branch of the tree to avoid affecting other nodes
    this.renderJson(this.data);

    // Emit event for external listeners
    this.dispatchEvent(new CustomEvent("nodeEdited", {
      detail: {
        node: nodeData.data,
        path: nodeData.data.path,
        data: this.data
      },
      bubbles: true,
      composed: true
    }));

    this.closeEditModal();
  }

  /**
   * Close edit modal
   */
  closeEditModal() {
    const modal = this.shadowRoot.getElementById("editModal");
    const overlay = this.shadowRoot.getElementById("modalOverlay");
    modal.classList.remove("visible");
    overlay.classList.remove("visible");
  }

  /**
   * Clear the graph
   */
  clear() {
    if (this.g) {
      this.g.selectAll("*").remove();
    }
  }

  /**
   * Export the graph as SVG
   * @returns {string} SVG string
   */
  exportSVG() {
    return this.svg ? this.svg.node().outerHTML : "";
  }

  /**
   * Handle window resize
   */
  handleResize() {
    const width = this.getAttribute("width") || window.innerWidth;
    const height = this.getAttribute("height") || window.innerHeight;

    this.graphOptions.width = parseInt(width);
    this.graphOptions.height = parseInt(height);

    // Re-initialize the graph
    const container = this.shadowRoot.getElementById("container");
    this.initD3Graph(container);

    // Re-render data if exists
    if (this.data) {
      this.renderJson(this.data);
    }
  }
}

// Register the custom element
customElements.define("asn1-graph-viewer", ASN1GraphViewer);

export { ASN1GraphViewer };
