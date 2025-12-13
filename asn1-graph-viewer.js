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
          left: 20px;
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
      levelSeparation: 200, // Horizontal spacing
      nodeSeparation: 80,   // Vertical spacing
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
   * Truncate long strings
   */
  truncate(str, maxLength = 50) {
    if (typeof str !== 'string') return str;
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
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
          node.properties.push({
            key: `[${index}]`,
            value: this.truncate(String(item)),
            fullValue: String(item)
          });
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
          node.properties.push({ key, value: "null", fullValue: "null" });
        } else if (typeof value !== "object") {
          // Skip internal properties that aren't useful for display
          if (!["tagClass", "tagNumber", "tagConstructed", "subCount"].includes(key)) {
            const strValue = String(value);
            node.properties.push({
              key,
              value: this.truncate(strValue),
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

    // Draw link labels
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

    // Add drag behavior for horizontal layout
    nodes.call(
      d3.drag()
        .on("start", function(event, d) {
          d3.select(this).raise();
        })
        .on("drag", function(event, d) {
          d.x = event.y;  // Swapped
          d.y = event.x;  // Swapped
          d3.select(this).attr("transform", `translate(${d.y}, ${d.x})`);

          // Update links for horizontal layout
          self.g.selectAll(".link").attr(
            "d",
            d3.linkHorizontal()
              .x((d) => d.y)
              .y((d) => d.x)
          );

          self.g
            .selectAll(".link-label")
            .attr("x", (d) => (d.source.y + d.target.y) / 2)
            .attr("y", (d) => d.target.x - 10);
        })
    );
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
   * Show edit modal for a node
   */
  showEditModal(nodeData) {
    const modal = this.shadowRoot.getElementById("editModal");
    const overlay = this.shadowRoot.getElementById("modalOverlay");
    const modalBody = this.shadowRoot.getElementById("modalBody");

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

    // Add editable properties
    nodeData.data.properties.forEach((prop, index) => {
      html += `
        <div class="field-group">
          <div class="field-label">${prop.key}</div>
          <textarea class="field-input" data-prop-index="${index}">${prop.fullValue || prop.value}</textarea>
        </div>
      `;
    });

    // Add raw data display
    if (nodeData.data.rawData) {
      html += `
        <div class="field-group">
          <div class="field-label">Raw Data (JSON)</div>
          <textarea class="field-input" readonly style="min-height: 150px;">${JSON.stringify(nodeData.data.rawData, null, 2)}</textarea>
        </div>
      `;
    }

    // Add action buttons
    html += `
      <div class="modal-actions">
        <button class="btn btn-secondary" id="cancelEdit">Cancel</button>
        <button class="btn btn-primary" id="saveEdit">Save Changes</button>
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

    this.shadowRoot.getElementById("saveEdit").addEventListener("click", () => {
      self.saveNodeEdits(nodeData);
    });
  }

  /**
   * Save node edits
   */
  saveNodeEdits(nodeData) {
    const modalBody = this.shadowRoot.getElementById("modalBody");
    const inputs = modalBody.querySelectorAll("textarea[data-prop-index]");

    inputs.forEach((input) => {
      const index = parseInt(input.dataset.propIndex);
      const newValue = input.value;
      nodeData.data.properties[index].value = this.truncate(newValue);
      nodeData.data.properties[index].fullValue = newValue;

      // Update raw data if it exists
      if (nodeData.data.rawData) {
        const key = nodeData.data.properties[index].key;
        if (nodeData.data.rawData[key] !== undefined) {
          nodeData.data.rawData[key] = newValue;
        }
      }
    });

    // Re-render the graph
    this.renderJson(this.data);

    // Emit event for external listeners
    this.dispatchEvent(new CustomEvent("nodeEdited", {
      detail: { node: nodeData, data: this.data },
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
