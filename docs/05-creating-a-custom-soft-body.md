# 05 - Creating a Custom Soft Body

## Introduction

Soft bodies are dynamic, deformable objects simulated as a collection of particles (vertices) connected by constraints (edges). Unlike rigid bodies, they can stretch, bend, and compress, making them perfect for creating things like cloth, ropes, or inflatable objects.

This guide will walk you through creating a custom **Rope** soft body. The process is very similar to creating a rigid body, but focuses on constructing the object from vertices and edges instead of a single collision shape.

The main components are:
1.  **Properties:** Defines the physical behavior (damping, pressure, etc.).
2.  **Object Class:** The main logic, where you procedurally build the object's structure.
3.  **Renderer:** A client-side class to draw the deforming object.
4.  **Registration:** Making Vortex Physics aware of your new soft body type.

## 1. Defining Soft Body Properties

First, define the default physical properties for your soft body. The `SoftPhysicsObjectProperties` class provides a builder for characteristics specific to deformable objects.

```java
// In a class like RopePhysicsProperties.java

public static SoftPhysicsObjectProperties ropeProperties = SoftPhysicsObjectProperties.builder()
        .linearDamping(0.2f)
        .gravityFactor(1.0f)
        .numIterations(10) // More iterations lead to a stiffer, more stable simulation
        .pressure(0.0f)    // For inflatable objects, a value > 0 will make it expand
        .build();
```

## 2. Creating the Soft Body Class

This is the most important part. Create a new class that extends `SoftPhysicsObject`. Your main task here is to implement the `buildSharedSettings()` method, which programmatically defines the structure of your object.

For our rope, we will create a series of vertices in a line and connect them with edge constraints.

```java
public class RopeSoftBody extends SoftPhysicsObject {
    public static final String TYPE_IDENTIFIER = "modid:rope";

    // Custom parameters needed to build this specific object
    private float ropeLength;
    private int numSegments;
    private float ropeRadius;
    private float mass;

    // Constructor to set these parameters
    public RopeSoftBody(UUID id, Level level, ..., float length, int segments, float radius, float mass) {
        super(id, level, ...);
        this.ropeLength = length;
        this.numSegments = segments;
        // ... and so on
    }
    
    // This is where you build the object's structure
    @Override
    protected SoftBodySharedSettings buildSharedSettings() {
        SoftBodySharedSettings settings = new SoftBodySharedSettings();
        int numNodes = this.numSegments + 1;
        float segmentLength = this.ropeLength / (float)this.numSegments;
        float invMassPerNode = (this.mass > 0) ? numNodes / this.mass : 0f;

        // 1. Create all the vertices (particles)
        for (int i = 0; i < numNodes; i++) {
            Vertex v = new Vertex();
            // Position them in a line along the Y-axis
            v.setPosition(new Vec3(0, -i * segmentLength, 0));
            v.setInvMass(invMassPerNode);
            settings.addVertex(v);
        }

        // 2. Connect the vertices with edge constraints
        for (int i = 0; i < numSegments; i++) {
            try (Edge edge = new Edge()) {
                edge.setVertex(0, i);
                edge.setVertex(1, i + 1);
                settings.addEdgeConstraint(edge);
            }
        }

        settings.optimize(); // Important: Finalize the settings for performance
        return settings;
    }

    // --- Methods for syncing custom data (like radius) to the client ---
    @Override
    protected void addAdditionalData(FriendlyByteBuf buf) {
        buf.writeFloat(this.ropeRadius);
        // ... write other custom data if needed
    }

    @Override
    protected void readAdditionalData(FriendlyByteBuf buf) {
        this.ropeRadius = buf.readFloat();
        // ... read other custom data
    }
}
```

## 3. Creating a Renderer (Client-Side)

Rendering a soft body involves drawing geometry based on a list of vertex positions that changes every frame. Your renderer will extend `SoftPhysicsObject.Renderer`.

The key is to get the updated vertex positions from `ClientSoftPhysicsObjectData.getRenderVertexData()` and use them to draw your object.

```java
// This class should only be loaded on the client
@OnlyIn(Dist.CLIENT)
public class RopeSoftBodyRenderer extends SoftPhysicsObject.Renderer {

    @Override
    public void render(ClientSoftPhysicsObjectData data, PoseStack poseStack, ...) {
        // 1. Get the vertex positions, interpolated for smooth rendering.
        // This is an array of floats: [x0, y0, z0, x1, y1, z1, ...]
        float[] renderVertexData = data.getRenderVertexData(partialTicks);
        if (renderVertexData == null || renderVertexData.length < 6) {
            return; // Not enough data to draw anything
        }

        // 2. (Optional) Get custom data sent from the server.
        float ropeRadius = 0.1f;
        // ... logic to read ropeRadius from data.getCustomData() ...
        
        // 3. Use the vertex data to draw the object.
        // The PoseStack is already at the object's root position, but the vertices
        // are in world space, so we usually render from the world origin (0,0,0).
        int numNodes = renderVertexData.length / 3;

        // Example: Draw a series of textured cylinders or quads between the vertices
        for (int i = 0; i < numNodes - 1; i++) {
            Vec3 startPoint = new Vec3(renderVertexData[i*3], renderVertexData[i*3+1], renderVertexData[i*3+2]);
            Vec3 endPoint = new Vec3(renderVertexData[(i+1)*3], renderVertexData[(i+1)*3+1], renderVertexData[(i+1)*3+2]);

            // ... your custom rendering logic to draw a segment between startPoint and endPoint ...
        }
    }
}
```
> **Tip:** The `poseStack` passed to a soft body renderer is often less useful than for a rigid body, since the vertices are already in world-space coordinates. It's common to perform rendering relative to the camera's position.

## 4. Registering Your Soft Body

Finally, register your new soft body and its renderer with the Vortex Physics API. This follows the same pattern as for rigid bodies, but uses a different object type and renderer registration method.

```java
public class MyModRegistration {

    // Call this during common/server setup (e.g., FMLCommonSetupEvent).
    public static void registerPhysicsObjects() {
        var api = VortexAPI.getInstance().objects();

        api.registerObjectType(
            RopeSoftBody.TYPE_IDENTIFIER,          // The unique ID
            EObjectType.SOFT_BODY,                 // The object type is SOFT_BODY
            RopePhysicsProperties.ropeProperties,  // Default properties
            RopeSoftBody.class                     // The factory constructor
        );
    }
    
    // Call this during client setup (e.g., FMLClientSetupEvent).
    @OnlyIn(Dist.CLIENT)
    public static void registerClientRenderers() {
        var api = VortexAPI.getInstance().objects();

        api.registerSoftRenderer(                  // Use the soft renderer method
            RopeSoftBody.TYPE_IDENTIFIER,          // The unique ID
            RopeSoftBodyRenderer::new              // A provider for the renderer
        );
    }
}
```