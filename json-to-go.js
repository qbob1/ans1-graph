/**
 * JSON to D3 Graph Module
 * Converts nested JSON objects into interactive D3 tree diagrams
 */

export class JsonToD3Graph {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.options = {
      width: options.width || 1200,
      height: options.height || 800,
      nodeWidth: options.nodeWidth || 200,
      nodeHeight: options.nodeHeight || "auto",
      levelSeparation: options.levelSeparation || 150,
      nodeSeparation: options.nodeSeparation || 50,
      ...options,
    };
    this.svg = null;
    this.g = null;
    this.tree = null;
    this.root = null;
  }

  /**
   * Initialize the SVG canvas
   */
  initSVG() {
    const container = d3.select(`#${this.containerId}`);
    container.selectAll("*").remove();

    this.svg = container
      .append("svg")
      .attr("width", this.options.width)
      .attr("height", this.options.height)
      .style("border", "1px solid #ddd");

    // Add zoom behavior
    const zoom = d3
      .zoom()
      .scaleExtent([0.1, 3])
      .on("zoom", (event) => {
        this.g.attr("transform", event.transform);
      });

    this.svg.call(zoom);

    this.g = this.svg
      .append("g")
      .attr("transform", `translate(${this.options.nodeWidth / 2 + 20}, 40)`);
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

      // Separate properties
      Object.entries(obj).forEach(([key, value]) => {
        if (value === null) {
          node.properties.push({ key, value: "null" });
        } else if (typeof value !== "object") {
          node.properties.push({ key, value: String(value) });
        } else {
          node.children.push(
            this.jsonToHierarchy(value, key, `${path}.${key}`)
          );
        }
      });
    }

    return node;
  }

  /**
   * Render the graph
   */
  renderJson(jsonObj) {
    if (!this.svg) {
      this.initSVG();
    }

    // Convert JSON to hierarchy
    const hierarchyData = this.jsonToHierarchy(jsonObj);
    this.root = d3.hierarchy(hierarchyData);

    // Create tree layout
    this.tree = d3
      .tree()
      .nodeSize([
        this.options.nodeWidth + this.options.nodeSeparation,
        this.options.levelSeparation,
      ]);

    // Generate tree
    this.tree(this.root);

    // Clear previous render
    this.g.selectAll("*").remove();

    // Draw links
    this.g
      .selectAll(".link")
      .data(this.root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr(
        "d",
        d3
          .linkVertical()
          .x((d) => d.x)
          .y((d) => d.y)
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
      .data(this.root.descendants())
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
    nodes.call(
      d3
        .drag()
        .on("start", this.dragStarted.bind(this))
        .on("drag", this.dragged.bind(this))
        .on("end", this.dragEnded.bind(this))
    );
  }

  dragStarted(event, d) {
    d3.select(event.sourceEvent.target.parentNode).raise();
  }

  dragged(event, d) {
    d.x = event.x;
    d.y = event.y;
    d3.select(event.sourceEvent.target.parentNode).attr(
      "transform",
      `translate(${d.x}, ${d.y})`
    );

    // Update links
    this.g.selectAll(".link").attr(
      "d",
      d3
        .linkVertical()
        .x((d) => d.x)
        .y((d) => d.y)
    );

    this.g
      .selectAll(".link-label")
      .attr("x", (d) => d.target.x)
      .attr("y", (d) => (d.source.y + d.target.y) / 2);
  }

  dragEnded(event, d) {
    // Optional: snap to grid or other end behaviors
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
   * Export as SVG string
   */
  exportSVG() {
    return this.svg.node().outerHTML;
  }
}

// Export for use in different module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = JsonToD3Graph;
}

// Example usage:
/*
  const graph = new JsonToD3Graph('myContainer', {
    width: 1200,
    height: 800,
    nodeWidth: 200,
    levelSeparation: 150
  });
  
  const sampleData = {
    fruits: [
      {
        name: 'Apple',
        color: '#FF0000',
        details: { type: 'Pome', season: 'Fall' },
        nutrients: { calories: 52, fiber: '2.4g', vitaminC: '4.6mg' }
      },
      {
        name: 'Banana',
        color: '#FFFF00',
        details: { type: 'Berry', season: 'Year-round' },
        nutrients: { calories: 89, fiber: '2.6g', potassium: '358mg' }
      }
    ]
  };
  
  graph.renderJson(sampleData);
  */
