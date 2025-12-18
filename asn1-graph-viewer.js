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
    this.constraints = {}; // Store constraints by node path
    this.schemas = []; // Store loaded ASN.1 schemas
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

        .btn-small {
          padding: 4px 8px;
          border: none;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          background: #667eea;
          color: white;
        }

        .btn-small:hover {
          background: #5568d3;
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
   * Add or update constraints for a node
   * @param {string} nodePath - The node path
   * @param {Object} constraints - Constraint configuration
   */
  setNodeConstraints(nodePath, constraints) {
    this.constraints[nodePath] = constraints;
    this.dispatchEvent(new CustomEvent("constraintsChanged", {
      detail: { path: nodePath, constraints: constraints },
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Get constraints for a node
   * @param {string} nodePath - The node path
   * @returns {Object} The constraints or null
   */
  getNodeConstraints(nodePath) {
    return this.constraints[nodePath] || null;
  }

  /**
   * Export all constraints as configuration
   * @returns {Object} Configuration object
   */
  exportConfiguration() {
    return {
      version: "1.0",
      constraints: this.constraints,
      metadata: {
        exportDate: new Date().toISOString(),
        nodeCount: Object.keys(this.constraints).length
      }
    };
  }

  /**
   * Import constraints from configuration
   * @param {Object} config - Configuration object
   */
  importConfiguration(config) {
    if (config && config.constraints) {
      this.constraints = config.constraints;
      this.dispatchEvent(new CustomEvent("configurationImported", {
        detail: { config: config },
        bubbles: true,
        composed: true
      }));
    }
  }

  /**
   * Import an ASN.1 schema
   * @param {Object} schema - Schema definition
   * @returns {boolean} Success status
   */
  importSchema(schema) {
    if (!schema || !schema.name) {
      console.error("Invalid schema: must have a 'name' property");
      return false;
    }

    // Check if schema with same name already exists
    const existingIndex = this.schemas.findIndex(s => s.name === schema.name);
    if (existingIndex >= 0) {
      // Replace existing schema
      this.schemas[existingIndex] = schema;
    } else {
      // Add new schema
      this.schemas.push(schema);
    }

    this.dispatchEvent(new CustomEvent("schemaImported", {
      detail: { schema: schema },
      bubbles: true,
      composed: true
    }));

    // Re-render graph if data is already loaded
    if (this.data) {
      console.log("🔄 Re-rendering graph with new schema:", schema.name);
      this.renderJson(this.data);
    }

    return true;
  }

  /**
   * Get all loaded schemas
   * @returns {Array} List of schemas
   */
  getSchemas() {
    return this.schemas;
  }

  /**
   * Apply schema to ASN.1 data recursively
   * @param {Object} data - ASN.1 data object
   * @param {Object} schemaDef - Schema definition
   */
  applySchemaToData(data, schemaDef) {
    if (!data || !schemaDef) {
      return;
    }

    // Handle array data
    if (Array.isArray(data)) {
      // Apply schema to each element if schema has itemSchema
      if (schemaDef.itemSchema) {
        data.forEach(item => this.applySchemaToData(item, schemaDef.itemSchema));
      }
      return;
    }

    // Handle object data
    if (typeof data === 'object') {
      // If schema has a name, apply it to the data
      if (schemaDef.name) {
        data.name = schemaDef.name;
      }

      // Apply constraints from schema
      if (schemaDef.constraints) {
        // Store constraints for this node
        // We need the path, which we'll compute from the data structure
        // For now, we'll add it as a property on the data object
        data._schemaConstraints = schemaDef.constraints;
      }

      // If schema has fields, match them to sub-elements
      if (schemaDef.fields && Array.isArray(schemaDef.fields) && data.sub && Array.isArray(data.sub)) {
        // Match by tag class and number, or by position
        data.sub.forEach((subItem, index) => {
          // Try to match by tag
          let matchingField = null;

          if (subItem.tagClass !== undefined && subItem.tagNumber !== undefined) {
            matchingField = schemaDef.fields.find(field =>
              field.tag &&
              field.tag.class === subItem.tagClass &&
              field.tag.number === subItem.tagNumber
            );
          }

          // Fall back to position matching
          if (!matchingField && schemaDef.fields[index]) {
            matchingField = schemaDef.fields[index];
          }

          if (matchingField) {
            // Apply field name
            subItem.name = matchingField.name;

            // Apply field constraints
            if (matchingField.constraints) {
              subItem._schemaConstraints = matchingField.constraints;
            }

            // Recursively apply if field has nested structure
            if (matchingField.fields) {
              this.applySchemaToData(subItem, matchingField);
            }
          }
        });
      }

      // Recursively apply to sub-elements
      if (data.sub && Array.isArray(data.sub)) {
        data.sub.forEach(subItem => {
          // Continue applying current schema structure
          if (schemaDef.fields) {
            // Already handled above
          } else if (schemaDef.itemSchema) {
            // For repeated elements
            this.applySchemaToData(subItem, schemaDef.itemSchema);
          }
        });
      }
    }
  }

  /**
   * Clear all schemas
   */
  clearSchemas() {
    this.schemas = [];
    this.dispatchEvent(new CustomEvent("schemasCleared", {
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Validate a value against constraints
   * @param {*} value - The value to validate
   * @param {Object} constraints - The constraints to check against
   * @returns {Object} Validation result {valid: boolean, errors: []}
   */
  validateValue(value, constraints) {
    const errors = [];

    if (!constraints) {
      return { valid: true, errors: [] };
    }

    // Required check
    if (constraints.required && (value === null || value === undefined || value === '')) {
      errors.push('This field is required');
    }

    // Type-specific validations
    if (value !== null && value !== undefined && value !== '') {
      // Min/Max for numbers
      if (constraints.min !== undefined && Number(value) < constraints.min) {
        errors.push(`Value must be at least ${constraints.min}`);
      }
      if (constraints.max !== undefined && Number(value) > constraints.max) {
        errors.push(`Value must be at most ${constraints.max}`);
      }

      // Pattern for strings
      if (constraints.pattern && typeof value === 'string') {
        const regex = new RegExp(constraints.pattern);
        if (!regex.test(value)) {
          errors.push(`Value must match pattern: ${constraints.pattern}`);
        }
      }

      // Enum values
      if (constraints.enum && Array.isArray(constraints.enum)) {
        if (!constraints.enum.includes(value)) {
          errors.push(`Value must be one of: ${constraints.enum.join(', ')}`);
        }
      }

      // Min/Max length for strings
      if (typeof value === 'string') {
        if (constraints.minLength !== undefined && value.length < constraints.minLength) {
          errors.push(`Length must be at least ${constraints.minLength} characters`);
        }
        if (constraints.maxLength !== undefined && value.length > constraints.maxLength) {
          errors.push(`Length must be at most ${constraints.maxLength} characters`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
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
   * Find nodes by name (can be multiple matches)
   * @param {string} name - Name to search for
   * @returns {Array} Array of matching nodes
   */
  findNodesByName(name) {
    if (!this.root) return [];

    const foundNodes = [];
    this.root.each((node) => {
      // Extract just the field name from the full node name (remove tag info)
      const nodeName = node.data.name.split(' ')[0]; // Gets "iccid" from "iccid [0]"
      if (nodeName === name) {
        foundNodes.push(node);
      }
    });
    return foundNodes;
  }

  /**
   * Navigate to and highlight a node by name
   * @param {string} elementName - Name of element to navigate to
   */
  navigateToNode(elementName) {
    const nodes = this.findNodesByName(elementName);

    if (nodes.length === 0) {
      console.log(`No nodes found with name: ${elementName}`);
      return false;
    }

    // If multiple matches, highlight all but focus on the first
    const targetNode = nodes[0];

    // Center the view on the target node
    if (this.svg && this.g) {
      const transform = d3.zoomIdentity
        .translate(this.getAttribute('width') / 2, this.getAttribute('height') / 2)
        .scale(1)
        .translate(-targetNode.y, -targetNode.x);

      this.svg.transition()
        .duration(750)
        .call(this.zoom.transform, transform);
    }

    // Highlight the nodes
    this.highlightNodes(nodes);

    console.log(`Navigated to ${nodes.length} node(s) with name: ${elementName}`);
    return true;
  }

  /**
   * Highlight specific nodes
   * @param {Array} nodes - Array of nodes to highlight
   */
  highlightNodes(nodes) {
    if (!this.g) return;

    // Remove previous highlights
    this.g.selectAll('rect.node-highlight').remove();

    // Add highlight to each node
    nodes.forEach(nodeData => {
      const nodeGroup = this.g.selectAll('g.node')
        .filter(d => d === nodeData);

      // Add a pulsing highlight rectangle
      nodeGroup.select('rect')
        .classed('highlighted', true)
        .transition()
        .duration(300)
        .attr('stroke', '#667eea')
        .attr('stroke-width', 3)
        .transition()
        .duration(300)
        .attr('stroke', '#ddd')
        .attr('stroke-width', 2);

      // Flash effect
      nodeGroup.select('rect')
        .transition()
        .duration(150)
        .attr('fill', '#e3f2fd')
        .transition()
        .duration(150)
        .attr('fill', nodeData.data.isArray ? '#f0f0f0' : 'white');
    });
  }

  /**
   * Get tag class name from numeric value
   * @param {number} tagClass - Numeric tag class (0=UNIVERSAL, 1=APPLICATION, 2=CONTEXT, 3=PRIVATE)
   * @returns {string} Tag class name
   */
  getTagClassName(tagClass) {
    const tagClassNames = {
      0: 'UNIVERSAL',
      1: 'APPLICATION',
      2: 'CONTEXT',
      3: 'PRIVATE'
    };
    return tagClassNames[tagClass] || 'UNKNOWN';
  }

  /**
   * Convert tag class name to numeric value
   * @param {string} className - Tag class name (UNIVERSAL, APPLICATION, CONTEXT, PRIVATE)
   * @returns {number} Numeric tag class
   */
  tagClassToNumber(className) {
    const map = {
      'UNIVERSAL': 0,
      'APPLICATION': 1,
      'CONTEXT': 2,
      'CONTEXT-SPECIFIC': 2,
      'PRIVATE': 3
    };
    return map[className] !== undefined ? map[className] : 2; // Default to CONTEXT
  }

  /**
   * Convert JSON to hierarchical structure
   * @param {Object} obj - ASN.1 data object
   * @param {string} name - Node name
   * @param {string} path - Node path
   * @param {Object} parentSchema - Parent schema definition for field lookup
   */
  jsonToHierarchy(obj, name = "root", path = "root", parentSchema = null) {
    // Log what parent schema we received
    if (obj.tagClass !== undefined && obj.tagNumber !== undefined) {
      console.log(`\n📥 jsonToHierarchy called for [${obj.tagClass}:${obj.tagNumber}] at path: ${path}`);
      if (parentSchema) {
        console.log(`  📦 Received parent schema: type=${parentSchema.type}, fields=${parentSchema.fields?.length || 0}, alternatives=${parentSchema.alternatives?.length || 0}`);
        if (parentSchema.fields && parentSchema.fields.length <= 5) {
          console.log(`  📦 Parent schema fields:`, parentSchema.fields.map(f => `${f.name}[${f.tag?.class}:${f.tag?.number}]`).join(', '));
        }
      } else {
        console.log(`  ⚠️  NO parent schema received!`);
      }
    }

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
          // For each item in array, find its own matching schema
          const itemSchema = this.findMatchingSchema(item);
          node.children.push(
            this.jsonToHierarchy(item, `[${index}]`, `${path}[${index}]`, itemSchema)
          );
        } else {
          // Omit content - don't display primitive values
          // Only structural information is shown
        }
      });
    } else if (typeof obj === "object" && obj !== null) {
      // Determine node name with tag information
      let baseType = null;
      let fieldLabel = null;
      let schemaField = null;
      let fieldInfo = null;

      // Get the base type from the ASN.1 data
      if (obj.name) {
        baseType = obj.name;
      } else if (obj.type) {
        baseType = obj.type;
      } else {
        baseType = name;
      }

      // Add application-relevant tag information
      if (obj.tagClass !== undefined && obj.tagNumber !== undefined) {
        const tagClass = obj.tagClass;
        const tagNumber = obj.tagNumber;

        // First, try to get field info from parent schema
        if (parentSchema && (parentSchema.fields || parentSchema.alternatives)) {
          // Look for matching field by tag class and number
          // Search in fields (for SEQUENCE/SET) or alternatives (for CHOICE)
          const fieldsToSearch = parentSchema.fields || parentSchema.alternatives || [];
          console.log(`🔍 Searching parent schema for [${tagClass}:${tagNumber}] in ${fieldsToSearch.length} fields/alternatives`);
          console.log(`  Parent schema type: ${parentSchema.type || 'unknown'}`);
          if (fieldsToSearch.length > 0 && fieldsToSearch.length <= 10) {
            console.log(`  Available fields:`, fieldsToSearch.map(f => `${f.name}[${f.tag?.class}:${f.tag?.number}]`).join(', '));
          }

          schemaField = fieldsToSearch.find(field =>
            field.tag &&
            field.tag.class === tagClass &&
            field.tag.number === tagNumber
          );

          if (schemaField) {
            fieldLabel = schemaField.name;
            // Use schema field info
            fieldInfo = schemaField;
            console.log(`  ✅ MATCH in parent schema: ${fieldLabel}`);
          } else {
            console.log(`  ❌ NO MATCH in parent schema for [${tagClass}:${tagNumber}]`);
          }
          // If we have a parent schema but didn't find a match,
          // DON'T search other schemas - this is likely an undefined field in this schema's context
        }
        // Only search all schemas if we have NO parent schema context
        else if (!fieldLabel && this.schemas && this.schemas.length > 0) {
          console.log(`⚠️  No parent schema - searching globally for [${tagClass}:${tagNumber}]`);
          // For context-specific tags, prioritize UNTAGGED CHOICE schemas (global contexts)
          // These schemas like ProfileElement have no root tag and define the global context
          if (tagClass === 2) { // CONTEXT-SPECIFIC
            // First pass: search UNTAGGED CHOICE schemas only (global context)
            console.log(`  🌍 Searching untagged CHOICE schemas...`);
            for (const schema of this.schemas) {
              const schemaRoot = schema.root || schema;
              if (schemaRoot.type === 'CHOICE' && !schemaRoot.tag && schemaRoot.alternatives && schemaRoot.alternatives.length > 0) {
                const matchedField = schemaRoot.alternatives.find(field =>
                  field.tag &&
                  field.tag.class === tagClass &&
                  field.tag.number === tagNumber
                );

                if (matchedField) {
                  schemaField = matchedField;
                  fieldLabel = matchedField.name;
                  fieldInfo = matchedField;
                  console.log(`🎯 Matched [${tagNumber}] to UNTAGGED CHOICE ${schema.name} alternative: ${matchedField.name}`);
                  break; // Found a match in global CHOICE, stop searching
                }
              }
            }

            // Second pass: search tagged CHOICE schemas if no untagged match
            if (!fieldLabel) {
              console.log(`  🔍 Searching tagged CHOICE schemas...`);
              for (const schema of this.schemas) {
                const schemaRoot = schema.root || schema;
                if (schemaRoot.type === 'CHOICE' && schemaRoot.tag && schemaRoot.alternatives && schemaRoot.alternatives.length > 0) {
                  const matchedField = schemaRoot.alternatives.find(field =>
                    field.tag &&
                    field.tag.class === tagClass &&
                    field.tag.number === tagNumber
                  );

                  if (matchedField) {
                    schemaField = matchedField;
                    fieldLabel = matchedField.name;
                    fieldInfo = matchedField;
                    console.log(`🎯 Matched [${tagNumber}] to tagged CHOICE ${schema.name} alternative: ${matchedField.name}`);
                    break; // Found a match in tagged CHOICE, stop searching
                  }
                }
              }
            }
          }

          // Second pass: if no CHOICE match found, search all schemas (SEQUENCE/SET/CHOICE)
          if (!fieldLabel) {
            for (const schema of this.schemas) {
              const schemaRoot = schema.root || schema;
              const fieldsToSearch = schemaRoot.fields || schemaRoot.alternatives || [];
              if (fieldsToSearch.length > 0) {
                const matchedField = fieldsToSearch.find(field =>
                  field.tag &&
                  field.tag.class === tagClass &&
                  field.tag.number === tagNumber
                );

                if (matchedField) {
                  schemaField = matchedField;
                  fieldLabel = matchedField.name;
                  fieldInfo = matchedField;
                  console.log(`📌 Matched [${tagClass}:${tagNumber}] to ${schemaRoot.type} ${schema.name}: ${matchedField.name}`);
                  break; // Found a match, stop searching
                }
              }
            }
          }
        }

        // Fall back to ASN.1 database lookup if no schema match
        if (!fieldLabel && window.asn1DB) {
          const tagClassName = this.getTagClassName(tagClass);
          const defs = window.asn1DB.getByTag(tagClassName, tagNumber);

          // Look for matching definition in parent context if available
          if (defs && defs.length > 0) {
            // Use the first match for now (could be improved with context matching)
            fieldInfo = defs[0];
            fieldLabel = fieldInfo.name;
          }
        }

        // Store database info in node for later use
        if (fieldInfo) {
          node.fieldInfo = fieldInfo;
        }
      }

      // Store schema constraints if available
      if (obj._schemaConstraints) {
        node.schemaConstraints = obj._schemaConstraints;
      }

      // Store constraints from schema field if matched
      if (schemaField && schemaField.constraints) {
        node.schemaConstraints = schemaField.constraints;
      }

      // Build the final node name: prioritize field name, fall back to type
      let nodeName = "";
      let tagInfo = "";

      if (fieldLabel) {
        // Field name is primary - don't show tag numbers when we have a semantic name
        nodeName = fieldLabel;
      } else {
        // No field name, use type as primary and show tag info
        nodeName = baseType;

        // Add tag number info for non-universal tags (only when no field label)
        if (obj.tagClass !== undefined && obj.tagNumber !== undefined) {
          const tagClass = obj.tagClass;
          const tagNumber = obj.tagNumber;

          if (tagClass === 1) {
            // Application
            tagInfo = ` [APPLICATION ${tagNumber}]`;
          } else if (tagClass === 2) {
            // Context-specific
            tagInfo = ` [${tagNumber}]`;
          } else if (tagClass === 3) {
            // Private
            tagInfo = ` [PRIVATE ${tagNumber}]`;
          }
        }
      }

      // If there's a base type (e.g., SEQUENCE under a context tag), show it
      if (obj.baseType && obj.baseType !== baseType && !fieldLabel) {
        nodeName = `${nodeName} (${obj.baseType})`;
      }

      node.name = nodeName + tagInfo;

      // Determine schema to pass to children
      let childSchema = null;
      if (schemaField) {
        console.log(`🔧 Resolving child schema for field: ${fieldLabel}, type: ${schemaField.type}`);

        if (schemaField.fields || schemaField.alternatives) {
          // Use the matched schema field as context for children
          childSchema = schemaField;
          console.log(`  ✓ Using inline schema (has ${schemaField.fields?.length || 0} fields, ${schemaField.alternatives?.length || 0} alternatives)`);
        } else if (schemaField.type) {
          // CHOICE alternative may reference another type - look it up
          console.log(`  🔍 Looking up referenced type: "${schemaField.type}" in ${this.schemas.length} loaded schemas`);
          const referencedSchema = this.schemas.find(s => s.name === schemaField.type);
          if (referencedSchema) {
            childSchema = referencedSchema.root || referencedSchema;
            console.log(`  ✓ Found schema: ${referencedSchema.name}, type: ${childSchema.type}`);
          } else {
            console.log(`  ✗ Schema "${schemaField.type}" not found in loaded schemas`);
            console.log(`  📋 Available schemas:`, this.schemas.map(s => s.name).join(', '));

            if (window.asn1DB) {
              // Try to get from database
              console.log(`  🔍 Trying database lookup for "${schemaField.type}"`);
              const dbDef = window.asn1DB.getByName(schemaField.type);
              if (dbDef) {
                console.log(`  ⚠️  Found in database but NOT in loaded schemas - converting fields on-the-fly...`);
                console.log(`  ⚠️  Database entry:`, dbDef);

                // asn1DB.getByName() returns structured format with type, fields, alternatives
                // But fields are in DB format: {name, type, tags: [{class: "CONTEXT", number: 0}]}
                // We need our format: {name, type, tag: {class: 2, number: 0}}

                const convertedFields = (dbDef.fields || []).map((field, index) => {
                  const converted = {
                    name: field.name || `field${index}`,
                    type: field.type || 'OCTET STRING',
                    optional: field.optional || false
                  };

                  // Convert tag format from database to our format
                  if (field.tags && field.tags.length > 0) {
                    const tag = field.tags[0];
                    converted.tag = {
                      class: this.tagClassToNumber(tag.class),
                      number: tag.number
                    };
                  } else {
                    // Default context-specific tag by position
                    converted.tag = {
                      class: 2,
                      number: index
                    };
                  }

                  return converted;
                });

                const convertedAlternatives = (dbDef.alternatives || []).map((alt, index) => {
                  const converted = {
                    name: alt.name || `alternative${index}`,
                    type: alt.type || 'OCTET STRING',
                    optional: false
                  };

                  // Convert tag format
                  if (alt.tags && alt.tags.length > 0) {
                    const tag = alt.tags[0];
                    converted.tag = {
                      class: this.tagClassToNumber(tag.class),
                      number: tag.number
                    };
                  } else {
                    converted.tag = {
                      class: 2,
                      number: index
                    };
                  }

                  return converted;
                });

                childSchema = {
                  type: dbDef.type,
                  fields: convertedFields,
                  alternatives: convertedAlternatives
                };
                console.log(`  ✅ Converted database schema: ${convertedFields.length} fields, ${convertedAlternatives.length} alternatives`);
                if (convertedFields.length > 0 && convertedFields.length <= 10) {
                  console.log(`  📋 Converted fields:`, convertedFields.map(f => `${f.name}[${f.tag?.class}:${f.tag?.number}]`).join(', '));
                }
              } else {
                console.log(`  ✗ Not found in database either`);
              }
            }
          }
        }
      }

      // If no child schema found, continue with parent schema
      if (!childSchema && parentSchema && (parentSchema.fields || parentSchema.alternatives)) {
        childSchema = parentSchema;
        console.log(`⚠️  No child schema, continuing with parent schema: ${parentSchema.type || 'unknown'}`);
      } else if (childSchema) {
        console.log(`✅ Child schema set: type=${childSchema.type}, has ${childSchema.fields?.length || 0} fields, ${childSchema.alternatives?.length || 0} alternatives`);
      } else {
        console.log(`⚠️  No child schema available - children will search globally`);
      }

      // Separate properties and children
      Object.entries(obj).forEach(([key, value]) => {
        // Special handling for ASN.1 'sub' array - these are children nodes
        if (key === "sub" && Array.isArray(value)) {
          console.log(`\n📤 Processing ${value.length} children in 'sub' array at ${path}`);
          console.log(`  📤 Passing childSchema to children: ${childSchema ? `type=${childSchema.type}, fields=${childSchema.fields?.length || 0}` : 'NULL'}`);
          value.forEach((child, index) => {
            node.children.push(
              this.jsonToHierarchy(child, `[${index}]`, `${path}.sub[${index}]`, childSchema)
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
            this.jsonToHierarchy(value, key, `${path}.${key}`, childSchema)
          );
        }
      });
    }

    return node;
  }

  /**
   * Find the best matching schema for the given data
   * @param {Object} obj - ASN.1 data object
   * @returns {Object|null} Matching schema or null
   */
  findMatchingSchema(obj) {
    if (!obj || !this.schemas || this.schemas.length === 0) {
      return null;
    }

    console.log('🔎 findMatchingSchema for obj:', {
      name: obj.name,
      type: obj.type,
      tagClass: obj.tagClass,
      tagNumber: obj.tagNumber
    });

    // First, try to match by schema name (most specific)
    if (obj.name) {
      for (const schema of this.schemas) {
        if (schema.name === obj.name) {
          console.log('  ✓ Matched by name:', schema.name);
          return schema.root || schema;
        }
      }
    }

    // For context-specific tags, first check UNTAGGED CHOICE schemas (global contexts like ProfileElement)
    // These schemas have no root tag and serve as the global context for context-specific tagging
    if (obj.tagClass === 2 && obj.tagNumber !== undefined) {
      console.log('  🌍 Searching for untagged CHOICE schemas (global context)...');
      for (const schema of this.schemas) {
        const schemaRoot = schema.root || schema;
        // Check if this is an untagged CHOICE schema
        if (schemaRoot.type === 'CHOICE' && !schemaRoot.tag && schemaRoot.alternatives) {
          const matchingAlternative = schemaRoot.alternatives.find(alt =>
            alt.tag &&
            alt.tag.class === obj.tagClass &&
            alt.tag.number === obj.tagNumber
          );

          if (matchingAlternative) {
            console.log(`  ✓ Matched [${obj.tagNumber}] to UNTAGGED CHOICE schema: ${schema.name} (alternative: ${matchingAlternative.name})`);
            return schemaRoot;
          }
        }
      }

      // If no untagged CHOICE found, search tagged CHOICE schemas
      console.log('  🔍 Searching tagged CHOICE schemas...');
      for (const schema of this.schemas) {
        const schemaRoot = schema.root || schema;
        if (schemaRoot.type === 'CHOICE' && schemaRoot.tag && schemaRoot.alternatives) {
          const matchingAlternative = schemaRoot.alternatives.find(alt =>
            alt.tag &&
            alt.tag.class === obj.tagClass &&
            alt.tag.number === obj.tagNumber
          );

          if (matchingAlternative) {
            console.log(`  ✓ Matched [${obj.tagNumber}] to tagged CHOICE schema: ${schema.name} (alternative: ${matchingAlternative.name})`);
            return schemaRoot;
          }
        }
      }
    }

    // Try to match by type and tag
    for (const schema of this.schemas) {
      const schemaRoot = schema.root || schema;

      // Match by type
      if (obj.type && schemaRoot.type === obj.type) {
        // If both have tags, match them too
        if (obj.tagClass !== undefined && schemaRoot.tag) {
          if (schemaRoot.tag.class === obj.tagClass && schemaRoot.tag.number === obj.tagNumber) {
            console.log('  ✓ Matched by type+tag:', schema.name, 'type:', obj.type, 'tag:', obj.tagClass + ':' + obj.tagNumber);
            return schemaRoot;
          }
        }
        // Don't return on type-only match - continue searching for better match
      }
    }

    console.log('  ✗ No schema match found');
    // No specific match found
    return null;
  }

  /**
   * Render the JSON data as a D3 tree
   */
  renderJson(jsonObj) {
    if (!this.svg || !this.g) {
      return;
    }

    // Find matching schema for the root data
    const matchingSchema = this.findMatchingSchema(jsonObj);

    // Convert JSON to hierarchy with schema context
    const hierarchyData = this.jsonToHierarchy(jsonObj, "root", "root", matchingSchema);
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

    // Get constraints for this node
    const currentConstraints = this.getNodeConstraints(nodeData.data.path) || {};

    // Build modal content
    const nodeAlias = currentConstraints.alias || null;

    let html = `
      <div class="field-group">
        <div class="field-label">Node Type</div>
        <div class="field-value">${nodeData.data.name}${nodeAlias ? ` <span style="color: #667eea; font-weight: 600;">(${nodeAlias})</span>` : ''}</div>
      </div>
      <div class="field-group">
        <div class="field-label">Path</div>
        <div class="field-value">${nodeData.data.path}</div>
      </div>
    `;

    // Show tag information if available
    if (nodeData.data.rawData && nodeData.data.rawData.tagClass !== undefined) {
      const classNames = ['Universal', 'Application', 'Context-specific', 'Private'];
      const className = classNames[nodeData.data.rawData.tagClass] || nodeData.data.rawData.tagClass;
      const tagNumber = nodeData.data.rawData.tagNumber;
      const tagConstructed = nodeData.data.rawData.tagConstructed;
      const baseType = nodeData.data.rawData.baseType;

      html += `
        <div class="field-group">
          <div class="field-label">Tag Information</div>
          <div class="field-value" style="font-family: monospace; background: #f5f5f5; padding: 8px; border-radius: 4px;">
            <div style="margin-bottom: 4px;"><strong>Class:</strong> ${className} (${nodeData.data.rawData.tagClass})</div>
            <div style="margin-bottom: 4px;"><strong>Number:</strong> ${tagNumber !== undefined ? tagNumber : 'N/A'}</div>
            <div style="margin-bottom: 4px;"><strong>Form:</strong> ${tagConstructed ? 'Constructed' : 'Primitive'}</div>
            ${baseType ? `<div style="margin-bottom: 4px;"><strong>Base Type:</strong> ${baseType}</div>` : ''}
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd; font-size: 11px; color: #666;">
              Raw: [${className.toUpperCase()} ${tagNumber}] ${tagConstructed ? 'CONSTRUCTED' : 'PRIMITIVE'}${baseType ? ` → ${baseType}` : ''}
            </div>
          </div>
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

    // Add constraints section
    html += `
      <div class="field-group" style="margin-top: 24px; border-top: 2px solid #e0e0e0; padding-top: 16px;">
        <div class="field-label" style="font-size: 14px; margin-bottom: 12px;">
          Field Constraints & Alias
          <button class="btn-small" id="toggleConstraints" style="float: right; font-size: 11px; padding: 4px 8px;">
            ${Object.keys(currentConstraints).length > 0 || currentConstraints.alias ? 'Edit' : 'Add'}
          </button>
        </div>
    `;

    // Display schema constraints if available
    const hasSchemaConstraints = nodeData.data.schemaConstraints && Object.keys(nodeData.data.schemaConstraints).length > 0;
    const hasDbFieldInfo = nodeData.data.fieldInfo;

    if (hasSchemaConstraints || hasDbFieldInfo) {
      html += `
        <div style="margin-bottom: 16px; padding: 12px; background: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 4px;">
          <div style="font-weight: 600; margin-bottom: 8px; color: #16a34a; display: flex; align-items: center; gap: 6px;">
            <span>📋</span> Schema Information
          </div>
      `;

      if (hasDbFieldInfo && nodeData.data.fieldInfo.validators) {
        html += `<div style="font-size: 12px; color: #166534; margin-bottom: 8px;">
          <strong>From ASN.1 Database:</strong>
        </div>`;

        nodeData.data.fieldInfo.validators.forEach(validator => {
          let constraintText = '';
          if (validator.type === 'size') {
            constraintText = `Size: ${validator.min} - ${validator.max}`;
          } else if (validator.type === 'range') {
            constraintText = `Range: ${validator.min} - ${validator.max}`;
          } else if (validator.type === 'pattern') {
            constraintText = `Pattern: ${validator.pattern}`;
          } else {
            constraintText = `${validator.type}: ${validator.message || 'See definition'}`;
          }
          html += `<div style="font-size: 11px; color: #15803d; padding: 4px 8px; background: #dcfce7; border-radius: 3px; margin-bottom: 4px;">
            • ${constraintText}
          </div>`;
        });
      }

      if (hasSchemaConstraints) {
        const sc = nodeData.data.schemaConstraints;
        html += `<div style="font-size: 12px; color: #166534; margin-top: 8px; margin-bottom: 8px;">
          <strong>From Schema:</strong>
        </div>`;

        if (sc.size) {
          html += `<div style="font-size: 11px; color: #15803d; padding: 4px 8px; background: #dcfce7; border-radius: 3px; margin-bottom: 4px;">
            • Size: ${sc.size.min !== undefined ? sc.size.min : '0'} - ${sc.size.max !== undefined ? sc.size.max : '∞'}
          </div>`;
        }
        if (sc.range) {
          html += `<div style="font-size: 11px; color: #15803d; padding: 4px 8px; background: #dcfce7; border-radius: 3px; margin-bottom: 4px;">
            • Range: ${sc.range.min !== undefined ? sc.range.min : '-∞'} - ${sc.range.max !== undefined ? sc.range.max : '∞'}
          </div>`;
        }
        if (sc.pattern) {
          html += `<div style="font-size: 11px; color: #15803d; padding: 4px 8px; background: #dcfce7; border-radius: 3px; margin-bottom: 4px;">
            • Pattern: ${sc.pattern}
          </div>`;
        }
        if (sc.enum) {
          html += `<div style="font-size: 11px; color: #15803d; padding: 4px 8px; background: #dcfce7; border-radius: 3px; margin-bottom: 4px;">
            • Allowed values: ${Array.isArray(sc.enum) ? sc.enum.join(', ') : sc.enum}
          </div>`;
        }
      }

      html += `</div>`;
    }

    html += `
        <div id="constraintsSection" style="display: none;">
          <div class="constraint-field" style="margin-bottom: 16px; padding: 12px; background: #f0f7ff; border-radius: 6px;">
            <div style="font-weight: 600; margin-bottom: 8px; color: #667eea;">Node Alias</div>
            <label style="font-size: 12px; color: #666; display: block; margin-bottom: 4px;">
              Common name for this node (e.g., "User ID", "Password")
            </label>
            <input type="text" style="width: 100%; padding: 8px; border: 1px solid #e0e0e0; border-radius: 4px;"
                   data-constraint-type="alias" value="${currentConstraints.alias || ''}"
                   placeholder="Enter friendly name for this node">
          </div>
    `;

    if (editableProps.length > 0) {
      editableProps.forEach((prop) => {
        const fieldConstraints = currentConstraints[prop.key] || {};
        html += `
          <div class="constraint-field" style="margin-bottom: 16px; padding: 12px; background: #f9f9f9; border-radius: 6px;">
            <div style="font-weight: 600; margin-bottom: 8px; color: #667eea;">${prop.key}</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;">
              <label>
                <input type="checkbox" data-constraint-field="${prop.key}" data-constraint-type="required" ${fieldConstraints.required ? 'checked' : ''}>
                Required
              </label>
              <label>
                Min:
                <input type="number" style="width: 60px; padding: 2px;" data-constraint-field="${prop.key}" data-constraint-type="min" value="${fieldConstraints.min || ''}" placeholder="-">
              </label>
              <label>
                Max:
                <input type="number" style="width: 60px; padding: 2px;" data-constraint-field="${prop.key}" data-constraint-type="max" value="${fieldConstraints.max || ''}" placeholder="-">
              </label>
              <label>
                Min Length:
                <input type="number" style="width: 60px; padding: 2px;" data-constraint-field="${prop.key}" data-constraint-type="minLength" value="${fieldConstraints.minLength || ''}" placeholder="-">
              </label>
              <label>
                Max Length:
                <input type="number" style="width: 60px; padding: 2px;" data-constraint-field="${prop.key}" data-constraint-type="maxLength" value="${fieldConstraints.maxLength || ''}" placeholder="-">
              </label>
              <label style="grid-column: 1 / -1;">
                Pattern (regex):
                <input type="text" style="width: 100%; padding: 4px;" data-constraint-field="${prop.key}" data-constraint-type="pattern" value="${fieldConstraints.pattern || ''}" placeholder="^[A-Z]+$">
              </label>
              <label style="grid-column: 1 / -1;">
                Enum (comma-separated):
                <input type="text" style="width: 100%; padding: 4px;" data-constraint-field="${prop.key}" data-constraint-type="enum" value="${fieldConstraints.enum ? fieldConstraints.enum.join(',') : ''}" placeholder="value1,value2,value3">
              </label>
            </div>
          </div>
        `;
      });
    }

    html += `
        </div>
      </div>
    `;

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
        ${editableProps.length > 0 ? '<button class="btn btn-primary" id="saveConstraints" style="display: none;">Save Constraints</button>' : ''}
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

    // Toggle constraints section
    const toggleConstraintsBtn = this.shadowRoot.getElementById("toggleConstraints");
    const constraintsSection = this.shadowRoot.getElementById("constraintsSection");
    const saveConstraintsBtn = this.shadowRoot.getElementById("saveConstraints");

    if (toggleConstraintsBtn) {
      toggleConstraintsBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const isVisible = constraintsSection.style.display !== 'none';
        constraintsSection.style.display = isVisible ? 'none' : 'block';
        if (saveConstraintsBtn) {
          saveConstraintsBtn.style.display = isVisible ? 'none' : 'inline-block';
        }
        if (saveBtn) {
          saveBtn.style.display = isVisible ? 'inline-block' : 'none';
        }
        toggleConstraintsBtn.textContent = isVisible ? (Object.keys(currentConstraints).length > 0 ? 'Edit' : 'Add') : 'Hide';
      });
    }

    // Save constraints
    if (saveConstraintsBtn) {
      saveConstraintsBtn.addEventListener("click", () => {
        self.saveNodeConstraintsFromModal(nodeData);
      });
    }
  }

  /**
   * Save constraints from modal
   */
  saveNodeConstraintsFromModal(nodeData) {
    const modalBody = this.shadowRoot.getElementById("modalBody");
    const constraintInputs = modalBody.querySelectorAll("[data-constraint-field], [data-constraint-type='alias']");

    const newConstraints = {};

    constraintInputs.forEach((input) => {
      const field = input.dataset.constraintField;
      const type = input.dataset.constraintType;

      // Handle alias separately (node-level, not field-level)
      if (type === 'alias') {
        const aliasValue = input.value.trim();
        if (aliasValue) {
          newConstraints.alias = aliasValue;
        }
        return;
      }

      if (!newConstraints[field]) {
        newConstraints[field] = {};
      }

      if (type === 'required') {
        newConstraints[field].required = input.checked;
      } else if (type === 'enum') {
        const value = input.value.trim();
        if (value) {
          newConstraints[field].enum = value.split(',').map(v => v.trim()).filter(v => v);
        }
      } else {
        const value = input.value.trim();
        if (value) {
          if (type === 'min' || type === 'max' || type === 'minLength' || type === 'maxLength') {
            newConstraints[field][type] = Number(value);
          } else {
            newConstraints[field][type] = value;
          }
        }
      }
    });

    // Remove empty constraint objects
    Object.keys(newConstraints).forEach(key => {
      if (key !== 'alias' && Object.keys(newConstraints[key]).length === 0) {
        delete newConstraints[key];
      }
    });

    // Save constraints
    this.setNodeConstraints(nodeData.data.path, newConstraints);

    // Close constraints section
    const constraintsSection = this.shadowRoot.getElementById("constraintsSection");
    const toggleConstraintsBtn = this.shadowRoot.getElementById("toggleConstraints");
    const saveConstraintsBtn = this.shadowRoot.getElementById("saveConstraints");
    const saveBtn = this.shadowRoot.getElementById("saveEdit");

    if (constraintsSection) {
      constraintsSection.style.display = 'none';
    }
    if (saveConstraintsBtn) {
      saveConstraintsBtn.style.display = 'none';
    }
    if (saveBtn) {
      saveBtn.style.display = 'inline-block';
    }
    if (toggleConstraintsBtn) {
      toggleConstraintsBtn.textContent = Object.keys(newConstraints).length > 0 ? 'Edit' : 'Add';
    }

    // Show success message
    alert(`Constraints saved for node: ${nodeData.data.path}`);
  }

  /**
   * Save node edits
   */
  saveNodeEdits(nodeData) {
    const modalBody = this.shadowRoot.getElementById("modalBody");
    // Get all input types: textareas, selects, and inputs
    const inputs = modalBody.querySelectorAll("textarea[data-prop-key], select[data-prop-key], input[data-prop-key]");

    // Get constraints for this node
    const nodeConstraints = this.getNodeConstraints(nodeData.data.path);
    const validationErrors = [];

    let contentChanged = false;
    let newContentValue = null;

    // Validate all inputs first
    inputs.forEach((input) => {
      if (input.hasAttribute('readonly') || input.hasAttribute('disabled')) {
        return;
      }

      const key = input.dataset.propKey;
      let value;

      if (input.type === 'checkbox') {
        value = input.checked ? 'true' : 'false';
      } else {
        value = input.value;
      }

      // Validate if constraints exist for this field
      if (nodeConstraints && nodeConstraints[key]) {
        const validation = this.validateValue(value, nodeConstraints[key]);
        if (!validation.valid) {
          validationErrors.push(`${key}: ${validation.errors.join(', ')}`);
        }
      }
    });

    // Show validation errors and abort if any
    if (validationErrors.length > 0) {
      alert(`Validation errors:\n\n${validationErrors.join('\n')}`);
      return;
    }

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
