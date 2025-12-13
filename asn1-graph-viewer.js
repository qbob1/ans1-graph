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
      </style>
      <div id="container"></div>
    `;
  }

  initGraph() {
    const container = this.shadowRoot.getElementById("container");

    // Get dimensions from the component
    const width = this.getAttribute("width") || window.innerWidth;
    const height = this.getAttribute("height") || window.innerHeight;

    // Create D3 graph directly on the container element
    this.graphOptions = {
      width: parseInt(width),
      height: parseInt(height),
      levelSeparation: 150,
      nodeSeparation: 50,
    };

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
      .attr("transform", `translate(${this.graphOptions.nodeWidth || 100}, 40)`);
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
   * Convert JSON to hierarchical structure
   */
  jsonToHierarchy(obj, name = "root", path = "root") {
    const node = {
      name: name,
      path: path,
      properties: [],
      children: [],
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
          node.properties.push({ key: `[${index}]`, value: String(item) });
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
          node.properties.push({ key, value: "null" });
        } else if (typeof value !== "object") {
          // Skip internal properties that aren't useful for display
          if (!["tagClass", "tagNumber", "tagConstructed", "subCount"].includes(key)) {
            node.properties.push({ key, value: String(value) });
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
    const root = d3.hierarchy(hierarchyData);

    // Create tree layout
    const tree = d3.tree()
      .nodeSize([
        (this.graphOptions.nodeWidth || 200) + (this.graphOptions.nodeSeparation || 50),
        this.graphOptions.levelSeparation || 150,
      ]);

    // Generate tree
    tree(root);

    // Clear previous render
    this.g.selectAll("*").remove();

    // Draw links
    this.g
      .selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr(
        "d",
        d3.linkVertical()
          .x((d) => d.x)
          .y((d) => d.y)
      )
      .attr("fill", "none")
      .attr("stroke", "#999")
      .attr("stroke-width", 1.5);

    // Draw link labels
    this.g
      .selectAll(".link-label")
      .data(root.links())
      .enter()
      .append("text")
      .attr("class", "link-label")
      .attr("x", (d) => d.target.x)
      .attr("y", (d) => (d.source.y + d.target.y) / 2)
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
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (d) => `translate(${d.x}, ${d.y})`);

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
        .attr("stroke-width", 2);

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

    // Add drag behavior
    const self = this;
    nodes.call(
      d3.drag()
        .on("start", function(event, d) {
          d3.select(this).raise();
        })
        .on("drag", function(event, d) {
          d.x = event.x;
          d.y = event.y;
          d3.select(this).attr("transform", `translate(${d.x}, ${d.y})`);

          // Update links
          self.g.selectAll(".link").attr(
            "d",
            d3.linkVertical()
              .x((d) => d.x)
              .y((d) => d.y)
          );

          self.g
            .selectAll(".link-label")
            .attr("x", (d) => d.target.x)
            .attr("y", (d) => (d.source.y + d.target.y) / 2);
        })
    );
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
