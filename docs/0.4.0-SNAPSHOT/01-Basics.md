# The Basics

Welcome to the documentation for Velthoric, a server-side physics modification for Minecraft built upon the powerful **Jolt Physics Engine**. This guide will walk you through the fundamental concepts you need to know to start creating your own physical objects in the world.

## Prerequisites

This documentation assumes you have a basic understanding of the **JoltJNI** library. You should be familiar with core concepts such as:

*   `Body`, `BodyCreationSettings`, and `ShapeSettings`
*   The physics simulation loop (`PhysicsSystem.update()`)
*   Rigid bodies vs. Soft bodies

If you're new to Jolt, it is highly recommended to read the official JoltJNI overview before diving into Velthoric:
*   **[JoltJNI English Documentation](https://stephengold.github.io/jolt-jni-docs/jolt-jni-en/English/overview.html)**

---

## Core Concepts

Velthoric is designed as a high-level, Minecraft-friendly API over Jolt. Here are the main components you'll interact with.

### The Physics World: `VxPhysicsWorld`

Every server-side dimension in Minecraft has its own `VxPhysicsWorld`. This object is the heart of the simulation. It contains all the physics bodies for that dimension, manages the Jolt `PhysicsSystem`, and runs the simulation on a dedicated thread, independent of the server's tick rate.

You can get the instance for a specific dimension like this:
```java
// On the server
ServerLevel level = ...;
VxPhysicsWorld physicsWorld = VxPhysicsWorld.get(level.dimension());
```

### Physics Bodies: `VxBody`

`VxBody` is the base class for any object simulated by Velthoric. It's an abstraction that exists on both the server and the client.

*   On the **server**, it holds a reference to the underlying Jolt body and handles game logic.
*   On the **client**, it holds no Jolt objects. Its purpose is to receive state updates from the server and provide interpolated data for rendering.

There are two primary types of bodies you will work with, which will be covered in detail in their own documentation files:
*   `VxRigidBody`: For objects with a fixed, non-deformable shape, like rocks, cars, or blocks.
*   `VxSoftBody`: For deformable objects, like cloth or ropes.

### The Body Lifecycle

Because Velthoric runs physics on its own thread, `VxBody` offers several specific callback methods to help you organize your logic. You don't need to hook into Minecraft's tick loops manually; the body does it for you.

1.  **`onPhysicsTick(VxPhysicsWorld)`**: Runs on the **Physics Thread**. Use this for logic that affects the simulation directly, like applying forces.
2.  **`onServerTick(ServerLevel)`**: Runs on the **Main Server Thread**. Use this for standard Minecraft logic, like damaging entities or checking block states.
3.  **`onClientTick()`**: Runs on the **Client Game Loop**. Use this for client-side animations or particle effects.
4.  **`onBodyAdded` / `onBodyRemoved`**: Called on both client and server when the body enters or leaves the world.

### A Note on IDs: `physicsId` vs. `bodyId`

It's important to understand the two identifiers every `VxBody` has:

*   **`physicsId` (`UUID`)**: This is the body's **persistent** and **unique** identifier. It works just like a Minecraft Entity's UUID. You use it for networking, saving, creating constraints, and almost all high-level interactions in Velthoric. It remains the same throughout the body's entire lifetime.

*   **`bodyId` (`int`)**: This is the **temporary** handle for the body within the Jolt physics simulation. It's a simple integer that is only valid while the body is actively loaded in the physics world. When a chunk unloads and the body is removed, its `bodyId` is destroyed. When it's loaded again, it gets a new `bodyId`. You will encounter this ID in low-level contexts like physics raycast results, but you will almost always work with the `physicsId`.

### The Body Registry: `VxBodyRegistry` and `VxBodyType`

To create a new kind of physics object, you must first define its **type**. In Velthoric, this is done through `VxBodyType`. A `VxBodyType` bundles together everything needed to define a body:

*   A unique `ResourceLocation` identifier (e.g., `velthoric:box`).
*   A factory for creating new server-side instances of your `VxBody` class.
*   Metadata, such as whether the body can be spawned with the `/vxsummon` command.

All `VxBodyType`s are registered in the central `VxBodyRegistry`.

---

## Your First Custom Body: A Simple Crate

Let's walk through creating a simple, cube-shaped rigid body called "Crate".

### 1. The Body Class (`CrateRigidBody.java`)

First, create the class for your body. It must extend `VxRigidBody` and have two constructors: one for the server and one for the client.

```java
public class CrateRigidBody extends VxRigidBody {

    /**
     * Server-side constructor.
     */
    public CrateRigidBody(VxBodyType<CrateRigidBody> type, VxPhysicsWorld world, UUID id) {
        super(type, world, id);
    }

    /**
     * Client-side constructor.
     */
    @Environment(EnvType.CLIENT)
    public CrateRigidBody(VxBodyType<CrateRigidBody> type, UUID id) {
        super(type, id);
    }

    // We will add more methods here...
}
```

### 2. Defining the Jolt Shape

The most important server-side method is `createJoltBody()`. This is where you define your object's physical properties using JoltJNI. Velthoric provides a `VxRigidBodyFactory` to abstract away the final creation steps.

For our crate, we'll use a simple `BoxShape`.

```java
// Inside CrateRigidBody.java

@Override
public int createJoltBody(VxRigidBodyFactory factory) {
    // Define the shape: a 1x1x1 cube (0.5 half-extents).
    try (
            ShapeSettings shapeSettings = new BoxShapeSettings(new Vec3(0.5f, 0.5f, 0.5f));
            BodyCreationSettings bcs = new BodyCreationSettings()
    ) {
        // Set basic physics properties.
        bcs.setMotionType(EMotionType.Dynamic);
        bcs.setObjectLayer(VxLayers.DYNAMIC); // Makes it collide with other dynamic objects and terrain.
        bcs.setRestitution(0.2f); // Bounciness
        bcs.setFriction(0.5f);

        // The factory handles the final Jolt object creation.
        return factory.create(shapeSettings, bcs);
    }
}
```

### 3. Registration

The final step is to register your new body type so Velthoric knows about it. This is typically done in a central registration class.

```java
public class ModBodies {

    public static final VxBodyType<CrateRigidBody> CRATE = VxBodyType.Builder
            .<CrateRigidBody>create(CrateRigidBody::new) // Pass the server-side constructor reference.
            .build(new ResourceLocation("mymod", "crate"));

    public static void register() {
        // Server-side registration
        VxBodyRegistry.getInstance().register(CRATE);
    }

    @Environment(EnvType.CLIENT)
    public static void registerClient() {
        var registry = VxBodyRegistry.getInstance();

        // Client-side factory registration
        registry.registerClientFactory(CRATE.getTypeId(), (type, id) -> new CrateRigidBody((VxBodyType<CrateRigidBody>) type, id));

        // Client-side renderer registration
        registry.registerClientRenderer(CRATE.getTypeId(), new CrateRenderer());
    }
}
```

Remember to call `ModBodies.register()` in your mod's main initializer and `ModBodies.registerClient()` in your client initializer.

### 4. The Renderer (`CrateRenderer.java`)

On the client, the renderer is responsible for drawing your object. It receives the interpolated position and rotation every frame, so you don't need to worry about smoothing.

```java
@Environment(EnvType.CLIENT)
public class CrateRenderer extends VxRigidBodyRenderer<CrateRigidBody> {
    @Override
    public void render(CrateRigidBody body, PoseStack poseStack, MultiBufferSource.BufferSource bufferSource, float partialTicks, int packedLight, VxRenderState renderState) {
        poseStack.pushPose();

        // 1. Apply the interpolated transform from the render state.
        RVec3 renderPosition = renderState.transform.getTranslation();
        Quat renderRotation = renderState.transform.getRotation();
        poseStack.translate(renderPosition.x(), renderPosition.y(), renderPosition.z());
        poseStack.mulPose(new Quaternionf(renderRotation.getX(), renderRotation.getY(), renderRotation.getZ(), renderRotation.getW()));

        // 2. Center and scale the model. Our box is 1x1x1.
        poseStack.translate(-0.5, -0.5, -0.5);
        poseStack.scale(1.0f, 1.0f, 1.0f);

        // 3. Render a simple block model.
        Minecraft.getInstance().getBlockRenderer().renderSingleBlock(
                Blocks.OAK_WOOD.defaultBlockState(),
                poseStack,
                bufferSource,
                packedLight,
                OverlayTexture.NO_OVERLAY
        );

        poseStack.popPose();
    }
}
```

### 5. Spawning the Crate

You can now spawn your crate in the world! The easiest way for testing is with the `/vxsummon` command:
`/vxsummon mymod:crate`

Or, you can spawn it programmatically:
```java
VxPhysicsWorld world = ...;
RVec3 position = new RVec3(x, y, z);
Quat rotation = Quat.sIdentity();
VxTransform transform = new VxTransform(position, rotation);

// The body manager is the main entry point for creating bodies.
world.getBodyManager().createRigidBody(
    ModBodies.CRATE,
    transform,
    crate -> {
        // This is a lambda to configure the body right after creation.
        // We don't need to do anything for this simple crate.
    }
);
```

You've now created a complete, custom physics body from scratch.