# Velthoric: Soft Bodies

While rigid bodies have a fixed shape, **Soft Bodies** are dynamic and deformable. They are simulated as a collection of interconnected particles (or vertices), making them perfect for objects like cloth, ropes, and other flexible materials.

In Velthoric, you create soft bodies by extending the `VxSoftBody` class.

This guide assumes you have read `The Basics` and `Rigid Bodies`.

---

## Core Concept: Vertices and Constraints

The fundamental difference between a rigid and a soft body is its construction. Instead of a single, solid shape, a soft body is defined by:

1.  **Vertices**: A set of points in space, each with its own mass, position, and velocity.
2.  **Constraints (Edges)**: "Springs" or "struts" that connect pairs of vertices. These constraints try to maintain a specific distance (the `restLength`) between the vertices they connect, which is what gives the soft body its structure and resistance to stretching or tearing.

Creating a soft body involves defining all these vertices and the network of constraints that holds them together.

## Core Method: `createJoltBody()` for Soft Bodies

Just like rigid bodies, the main server-side method is `createJoltBody()`. However, the process is quite different. You will use JoltJNI's `SoftBodySharedSettings` to define the vertices and constraints.

**Key JoltJNI Classes:**
*   `SoftBodySharedSettings`: Defines the "blueprint" of the soft body, its vertices and the constraints between them.
*   `SoftBodyCreationSettings`: Defines the instance-specific properties, like its initial position, rotation, and physics layer.
*   `Vertex`: A single particle in the soft body. Its `invMass` (inverse mass) is important: a value greater than 0 means it's movable, while `0` means it's infinitely heavy and thus "pinned" in place.
*   `Edge`: A distance constraint between two vertices.

### Example: Building a Cloth Soft Body

The built-in `ClothSoftBody` is a perfect example of how to construct a grid-based soft body.

```java
// Inside ClothSoftBody.java

@Override
public int createJoltBody(VxSoftBodyFactory factory) {
    // Get configuration details
    int widthSegments = getSyncData(DATA_WIDTH_SEGMENTS);
    int heightSegments = getSyncData(DATA_HEIGHT_SEGMENTS);
    int numVerticesX = widthSegments + 1;
    int numVerticesY = heightSegments + 1;
    
    try (
            SoftBodySharedSettings sharedSettings = new SoftBodySharedSettings();
            SoftBodyCreationSettings creationSettings = new SoftBodyCreationSettings()
    ) {
        // --- 1. Create a grid of vertices ---
        for (int y = 0; y < numVerticesY; ++y) {
            for (int x = 0; x < numVerticesX; ++x) {
                // Calculate position for a flat grid
                Vec3 position = new Vec3((x * segmentWidth) - (clothWidth / 2.0f), 0, ...);
                Vertex v = new Vertex();
                v.setPosition(position);
                v.setInvMass(isPinned ? 0f : totalVertices / mass); // Set invMass to 0 to pin a vertex
                sharedSettings.addVertex(v);
            }
        }

        // --- 2. Create constraints (edges) between vertices ---
        for (int y = 0; y < numVerticesY; ++y) {
            for (int x = 0; x < numVerticesX; ++x) {
                // Structural constraints (connect to direct neighbors)
                if (x < widthSegments) addEdge(sharedSettings, getIndex(x, y), getIndex(x + 1, y), ...);
                if (y < heightSegments) addEdge(sharedSettings, getIndex(x, y), getIndex(x, y + 1), ...);

                // Shear constraints (connect diagonally to prevent shearing)
                if (x < widthSegments && y < heightSegments) {
                    addEdge(sharedSettings, getIndex(x, y), getIndex(x + 1, y + 1), ...);
                    addEdge(sharedSettings, getIndex(x + 1, y), getIndex(x, y + 1), ...);
                }
            }
        }
        
        // --- 3. Finalize and create ---
        creationSettings.setSettings(sharedSettings);
        creationSettings.setObjectLayer(VxLayers.DYNAMIC);
        return factory.create(sharedSettings, creationSettings);
    }
}
```

## Lifecycle and Logic

Just like `VxRigidBody`, `VxSoftBody` inherits from the base `VxBody` class. This means you have access to the same powerful callback methods for your game logic:

*   **`onPhysicsTick(VxPhysicsWorld)`**: Useful for applying wind forces or custom gravity to specific vertices of your soft body.
*   **`onServerTick(ServerLevel)`**: Useful for game interactions, like tearing the cloth if a player hits it.
*   **`onSyncedDataUpdated(...)`**: React to configuration changes on the client.

## Rendering: `VxSoftBodyRenderer`

Rendering a soft body is fundamentally different from rendering a rigid one. The `VxSoftBodyRenderer` receives the live, interpolated positions of all the body's vertices in a flat `float` array.

### The `renderState.vertexData` Array

The `renderState` object passed to your renderer will contain a non-null `vertexData` field. This is an array of floats where every three consecutive floats represent the `x`, `y`, and `z` coordinates of a single vertex in world space.

`[v0_x, v0_y, v0_z,  v1_x, v1_y, v1_z,  v2_x, v2_y, v2_z, ...]`

Your renderer's job is to read from this array and construct a mesh (usually a series of quads or triangles) to draw the object.

### Example: The `ClothRenderer`

The `ClothRenderer` reconstructs the grid of quads from the vertex data.

```java
// Inside ClothRenderer.java
@Override
public void render(ClothSoftBody body, PoseStack poseStack, ..., VxRenderState renderState) {
    float[] renderVertexData = renderState.vertexData;
    
    // Get the grid dimensions from synchronized data
    int widthSegments = body.getSyncData(ClothSoftBody.DATA_WIDTH_SEGMENTS);
    int heightSegments = body.getSyncData(ClothSoftBody.DATA_HEIGHT_SEGMENTS);
    int numVerticesX = widthSegments + 1;

    if (renderVertexData == null) {
        return;
    }

    // Helper function to get a vertex's position from the flat array
    BiFunction<Integer, Integer, Vector3f> getVertexWorldPos = (x, y) -> {
        int index = (y * numVerticesX + x) * 3;
        return new Vector3f(renderVertexData[index], renderVertexData[index + 1], renderVertexData[index + 2]);
    };

    // Iterate through each quad of the cloth
    for (int y = 0; y < heightSegments; ++y) {
        for (int x = 0; x < widthSegments; ++x) {
            // Get the 3D world positions of the four corners of this quad
            Vector3f v1 = getVertexWorldPos.apply(x, y);
            Vector3f v2 = getVertexWorldPos.apply(x + 1, y);
            Vector3f v3 = getVertexWorldPos.apply(x + 1, y + 1);
            Vector3f v4 = getVertexWorldPos.apply(x, y + 1);

            // Add these four vertices to a VertexConsumer to draw the quad
            addVertex(buffer, poseStack, v1, ...);
            addVertex(buffer, poseStack, v2, ...);
            addVertex(buffer, poseStack, v3, ...);
            addVertex(buffer, poseStack, v4, ...);
        }
    }
}
```

## Persistence

Soft bodies also support persistence. You must implement `writePersistenceData` and `readPersistenceData` to save and load any configuration properties that are not part of the standard synchronized data but are required to rebuild the body from storage.

```java
// Inside ClothSoftBody.java

@Override
public void writePersistenceData(VxByteBuf buf) {
    // Write the configuration that isn't synced every tick but is needed for creation
    buf.writeInt(getSyncData(DATA_WIDTH_SEGMENTS));
    buf.writeInt(getSyncData(DATA_HEIGHT_SEGMENTS));
    buf.writeFloat(this.clothWidth);
    buf.writeFloat(this.clothHeight);
    buf.writeFloat(this.mass);
}

@Override
public void readPersistenceData(VxByteBuf buf) {
    // Read the configuration back in the same order
    setSyncData(DATA_WIDTH_SEGMENTS, buf.readInt());
    setSyncData(DATA_HEIGHT_SEGMENTS, buf.readInt());
    this.clothWidth = buf.readFloat();
    this.clothHeight = buf.readFloat();
    this.mass = buf.readFloat();
}
```