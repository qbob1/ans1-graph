# ASN.1 Graph Viewer

A standalone web component for visualizing ASN.1 data structures as interactive D3 graphs. Built with vanilla JavaScript and Web Components, these components can be used in any framework or vanilla HTML.

## Features

- ✨ **Framework-agnostic**: Use in React, Vue, Angular, or vanilla HTML
- 🎨 **Interactive D3 visualization**: Zoom and pan the graph
- 🏷️ **Custom label management**: Define custom names for ASN.1 tags
- 📋 **Schema import**: Load ASN.1 schema definitions to auto-apply field names and constraints
- 📱 **Responsive**: Full-screen graph with left-side drawer panel
- 🎯 **Clean drawer UI**: All controls in a beautiful slide-out drawer
- ⌨️ **Keyboard shortcuts**: Quick access to controls
- 🚀 **Quick samples**: Built-in examples to get started instantly
- ➡️ **Horizontal layout**: Graph flows left-to-right for better readability
- 🔍 **Search & filter**: Real-time search bar to find nodes
- ✏️ **Editable nodes**: Click any node to view and edit its properties
- 🔧 **Auto-length calculation**: Length field updates automatically when content is edited
- ⚙️ **Configurable display**: Toggle edge labels and adjust node spacing with slider controls
- 🛡️ **Constraint validation**: Define and enforce validation rules for node fields

## Live Demo

Simply open `index.html` in your browser to try it out!

```bash
# Clone and open
git clone <repo-url>
cd ans1-graph
open index.html
```

The interface includes:
- Welcome screen with quick sample buttons
- Three built-in examples (simple, nested, custom labels)
- Keyboard shortcuts guide
- Full-screen interactive graph

## Quick Start

### Standalone HTML

```html
<!DOCTYPE html>
<html>
  <head>
    <title>ASN.1 Viewer</title>
  </head>
  <body>
    <!-- Graph Viewer (full screen) -->
    <asn1-graph-viewer id="graphViewer"></asn1-graph-viewer>

    <!-- Floating Control Panel -->
    <asn1-control-panel id="controlPanel"></asn1-control-panel>

    <!-- Load D3.js -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js"></script>

    <!-- Load Web Components -->
    <script type="module">
      import { ASN1GraphViewer } from "./asn1-graph-viewer.js";
      import { ASN1ControlPanel } from "./asn1-control-panel.js";

      const graphViewer = document.getElementById("graphViewer");
      const controlPanel = document.getElementById("controlPanel");

      // Set dimensions
      graphViewer.setAttribute("width", window.innerWidth);
      graphViewer.setAttribute("height", window.innerHeight);

      // Listen for decoded data
      controlPanel.addEventListener("decoded", (event) => {
        graphViewer.setData(event.detail.data);
      });
    </script>
  </body>
</html>
```

### React

```jsx
import { useEffect, useRef } from 'react';

function ASN1Viewer() {
  const graphRef = useRef(null);
  const controlRef = useRef(null);

  useEffect(() => {
    // Import components
    import('./asn1-graph-viewer.js');
    import('./asn1-control-panel.js');

    // Set dimensions
    if (graphRef.current) {
      graphRef.current.setAttribute('width', window.innerWidth);
      graphRef.current.setAttribute('height', window.innerHeight);
    }

    // Listen for decoded data
    const handleDecoded = (event) => {
      if (graphRef.current) {
        graphRef.current.setData(event.detail.data);
      }
    };

    if (controlRef.current) {
      controlRef.current.addEventListener('decoded', handleDecoded);
    }

    return () => {
      if (controlRef.current) {
        controlRef.current.removeEventListener('decoded', handleDecoded);
      }
    };
  }, []);

  return (
    <>
      <asn1-graph-viewer ref={graphRef} />
      <asn1-control-panel ref={controlRef} />
    </>
  );
}

export default ASN1Viewer;
```

### Vue

```vue
<template>
  <div>
    <asn1-graph-viewer ref="graphViewer" />
    <asn1-control-panel ref="controlPanel" />
  </div>
</template>

<script>
import { onMounted, ref } from 'vue';

export default {
  setup() {
    const graphViewer = ref(null);
    const controlPanel = ref(null);

    onMounted(async () => {
      // Import components
      await import('./asn1-graph-viewer.js');
      await import('./asn1-control-panel.js');

      // Set dimensions
      graphViewer.value.setAttribute('width', window.innerWidth);
      graphViewer.value.setAttribute('height', window.innerHeight);

      // Listen for decoded data
      controlPanel.value.addEventListener('decoded', (event) => {
        graphViewer.value.setData(event.detail.data);
      });
    });

    return {
      graphViewer,
      controlPanel
    };
  }
};
</script>
```

## Web Components API

### `<asn1-graph-viewer>`

The main graph visualization component.

#### Attributes

- `width` - Graph width in pixels (default: window.innerWidth)
- `height` - Graph height in pixels (default: window.innerHeight)

#### Methods

- `setData(data)` - Set the ASN.1 data to visualize
- `setEdgeLabels(show)` - Toggle edge label visibility (boolean)
- `setSpacing(nodeSep, levelSep)` - Set node spacing (vertical and horizontal)
- `clear()` - Clear the current graph
- `exportSVG()` - Export the graph as SVG string
- `handleResize()` - Re-render with new dimensions
- `searchNodes(query)` - Programmatically search/filter nodes

#### Events

- `nodeEdited` - Fired when a node is edited and saved
  - `event.detail.node` - The edited node data
  - `event.detail.data` - The complete updated data structure

#### Example

```javascript
const viewer = document.getElementById('graphViewer');
viewer.setData(myData);

// Listen for node edits
viewer.addEventListener('nodeEdited', (event) => {
  console.log('Node edited:', event.detail.node);
  console.log('Updated data:', event.detail.data);
});

// Programmatically search
viewer.searchNodes('SEQUENCE');

// Export graph
const svg = viewer.exportSVG();
```

### `<asn1-control-panel>`

Left-side drawer panel for decoding ASN.1 data and managing labels.

#### Events

- `decoded` - Fired when ASN.1 data is decoded successfully
  - `event.detail.data` - The decoded ASN.1 data

#### Example

```javascript
const panel = document.getElementById('controlPanel');
panel.addEventListener('decoded', (event) => {
  console.log('Decoded data:', event.detail.data);
});
```

## Keyboard Shortcuts

- `Ctrl/Cmd + K` - Toggle control panel
- `Escape` - Close control panel

## Graph Interactions

- **Zoom**: Scroll wheel or pinch gesture
- **Pan**: Click and drag on background
- **Search nodes**: Type in the search bar to filter nodes
- **Edit nodes**: Click on any node to open the edit modal
  - View node type, path, and all properties
  - Edit property values in textarea fields
  - View raw JSON data (this node only, excluding children)
  - Save or cancel changes

### Search Feature

The search bar at the top-left allows you to filter nodes in real-time:
- Searches both node names and property values
- Matching nodes are highlighted with a red border and glow
- Non-matching nodes are dimmed (30% opacity)
- Clear the search to show all nodes again

### Edit Feature

Nodes display only structural information (type, length, name) to keep the graph clean. Click any node to open an edit popup with:
- **Node Type**: The ASN.1 type name
- **Path**: The hierarchical path to the node
- **Class**: The tag class (Universal, Application, Context-specific, Private)
- **Child Nodes**: Full list of child nodes by name (for SEQUENCE/SET nodes)
- **Editable Fields**: Smart input fields automatically selected based on ASN.1 type:
  - **INTEGER**: Number input with step controls
  - **BOOLEAN**: Checkbox input
  - **Date/Time**: Date, time, or datetime-local pickers for UTCTime, GeneralizedTime
  - **String types**: Text input for IA5String, PrintableString, UTF8String
  - **OID fields**: Dropdown selector showing all OIDs in the payload
  - **Length field**: Number input, read-only for nodes with children (auto-calculated)
  - **Complex types**: Textarea for OCTET STRING, BIT STRING, and other complex data
- **Raw Data**: Read-only JSON view of the complete node data
- **Actions**: Save changes or cancel

When you save changes:
- The graph automatically re-renders with updated values
- If you edit the "content" field, the "length" field is automatically recalculated based on the byte length of the new content
- Length fields are protected from editing when the node has children (SEQUENCE/SET types)

### Schema Import

Import ASN.1 schema definitions to automatically apply field names and constraints to your decoded data:

**Schema Format**
- JSON format defining structure, field names, tags, and constraints
- See `schema-format.md` for complete documentation
- Example schema provided in `sample-schema.json`

**How to Use**
1. Decode your hex DER data first
2. Open the "Schema Management" section in the control panel
3. Click "📋 Import Schema" and select your JSON schema file
4. Select the imported schema from the dropdown
5. Click "✓ Apply Schema to Data"
6. Field names and constraints will be applied to your data

**Schema Features**
- **Field Naming**: Replace generic tag names with meaningful field names
- **Tag Mapping**: Match schema fields to DER data by tag class and number
- **Auto Constraints**: Apply validation rules from schema definitions
- **Nested Structures**: Support for complex hierarchical data structures
- **Multiple Schemas**: Import and switch between different schema definitions

**Example Schema**
```json
{
  "name": "UserRecord",
  "version": "1.0",
  "description": "User authentication record",
  "root": {
    "type": "SEQUENCE",
    "fields": [
      {
        "name": "userId",
        "type": "INTEGER",
        "tag": { "class": 2, "number": 0 },
        "constraints": {
          "required": true,
          "min": 0,
          "max": 999999
        }
      },
      {
        "name": "userName",
        "type": "UTF8String",
        "tag": { "class": 2, "number": 1 },
        "constraints": {
          "required": true,
          "minLength": 1,
          "maxLength": 100
        }
      }
    ]
  }
}
```

For complete schema documentation, see [schema-format.md](schema-format.md).

### Display Settings

The control panel includes display settings to customize the graph visualization:

**Edge Labels**
- Toggle edge labels on/off with the checkbox
- Edge labels show the relationship names between nodes
- Default: Hidden (for cleaner visualization)

**Node Spacing**
- Adjust spacing between nodes using the slider
- Range: 40-200 pixels
- Default: 80 pixels
- Changes apply in real-time

## Features in Detail

### Hex Input

Paste hex-encoded ASN.1 data into the input field and click "Decode" to visualize the structure.

### Custom Labels

ASN.1 tags that aren't standard (context-specific, application, or private tags) can be given custom names:

1. Decode your ASN.1 data
2. Open the "Custom Labels" section in the control panel
3. Enter custom names for unlabeled tags
4. Click "Apply Labels" to update the visualization

### Label Persistence

Custom labels are stored in the control panel component and persist across re-decodes of the same data structure.

## Data Format

The components expect ASN.1 data in the following JSON format:

```json
{
  "type": "SEQUENCE",
  "tagClass": 0,
  "tagNumber": 16,
  "tagConstructed": true,
  "length": 123,
  "subCount": 2,
  "sub": [
    {
      "type": "INTEGER",
      "content": "42"
    },
    {
      "type": "OCTET STRING",
      "content": "Hello"
    }
  ]
}
```

## Browser Support

- Chrome 53+
- Firefox 63+
- Safari 10.1+
- Edge 79+

Requires support for:
- Custom Elements v1
- Shadow DOM v1
- ES6 Modules

## Dependencies

- D3.js v7.8.5+ (loaded via CDN)
- @lapo/asn1js v2.0.0+ (loaded via CDN in control panel)

## License

MIT

## Contributing

Contributions are welcome! The web components are built with vanilla JavaScript and use the Shadow DOM for encapsulation.

## Architecture

```
asn1-graph-viewer.js     - Graph visualization component
asn1-control-panel.js    - Control panel component
json-to-go.js            - Legacy D3 graph module (deprecated)
asn1-graph.html          - Demo application
```

The components use Shadow DOM to encapsulate styles and structure, making them safe to use in any environment without CSS conflicts.
