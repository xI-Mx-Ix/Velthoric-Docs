# Velthoric: Rigid Bodies

A **Rigid Body** is a fundamental object in a physics simulation. It represents a solid, non-deformable object that can be moved, rotated, and can collide with other objects. In Velthoric, you create rigid bodies by extending the `VxRigidBody` class.

This guide assumes you have read `The Basics`.

---

## Core Method: `createJoltBody()`

The most important method you must implement for any `VxRigidBody` is `createJoltBody()`. This is where you define the physical essence of your object for the Jolt engine.

**Purpose:** To configure and create the underlying Jolt physics body.

**Parameters:**
*   `factory` (`VxRigidBodyFactory`): A factory provided by Velthoric that you use to perform the final creation of the Jolt body.

**Return Value:**
*   An `int` representing the Jolt `bodyId`.

Inside this method, you will typically use JoltJNI's `ShapeSettings` (like `BoxShapeSettings` or `SphereShapeSettings`) and `BodyCreationSettings`.

### Example: A Simple Box

Here is the implementation for a basic 1x1x1 cube. This demonstrates the core pattern you will use for all rigid bodies.

```java
// Inside your VxRigidBody class

@Override
public int createJoltBody(VxRigidBodyFactory factory) {
    // 1. Define the geometric shape of the object.
    //    We use a try-with-resources block to ensure native memory is freed.
    try (ShapeSettings shapeSettings = new BoxShapeSettings(new Vec3(0.5f, 0.5f, 0.5f))) {
        
        // 2. Define the physical properties of the body.
        try (BodyCreationSettings bodySettings = new BodyCreationSettings()) {
            
            // Make it a dynamic body that moves and collides.
            bodySettings.setMotionType(EMotionType.Dynamic);
            
            // Assign it to a physics layer. VxLayers.DYNAMIC is the standard for movable objects.
            bodySettings.setObjectLayer(VxLayers.DYNAMIC);
            
            // Set bounciness (0 = no bounce, 1 = perfectly elastic).
            bodySettings.setRestitution(0.2f);
            
            // Set surface friction.
            bodySettings.setFriction(0.5f);
            
            // 3. Pass the settings to the factory to create the Jolt body.
            //    The factory handles the rest, including setting the initial position.
            return factory.create(shapeSettings, bodySettings);
        }
    }
}
```

### Example: Using a `VoxelShape`

Velthoric provides a utility to convert a standard Minecraft `VoxelShape` into a Jolt `CompoundShape`. This is perfect for creating physics bodies from complex block models. The built-in `BlockRigidBody` uses this.

```java
// Inside a body class like BlockRigidBody.java

@Override
public int createJoltBody(VxRigidBodyFactory factory) {
    BlockState stateForShape = getRepresentedBlockState(); // A method that returns the desired BlockState
    VoxelShape voxelShape = stateForShape.getCollisionShape(this.physicsWorld.getLevel(), BlockPos.ZERO);

    // VxVoxelShapeUtil converts the VoxelShape into a Jolt compound shape.
    try (ShapeSettings shapeSettings = VxVoxelShapeUtil.toMutableCompoundShape(voxelShape)) {
        
        // If conversion fails (e.g., for an empty shape), fall back to a default.
        if (shapeSettings == null) {
            // ... handle error or use a default shape ...
        }
        
        try (BodyCreationSettings bcs = new BodyCreationSettings()) {
            bcs.setMotionType(EMotionType.Dynamic);
            bcs.setObjectLayer(VxLayers.DYNAMIC);
            return factory.create(shapeSettings, bcs);
        }
    }
}
```

---

## Rendering: `VxRigidBodyRenderer`

The `VxRigidBodyRenderer` is responsible for drawing your object on the client. It is called every frame with the smoothly interpolated position and rotation.

The `render` method receives a `VxRenderState` object, which contains the final `VxTransform` for the current frame.

### Key Steps for Rendering

1.  **Push Pose**: Call `poseStack.pushPose()` to isolate your transformations.
2.  **Get Transform**: Retrieve the interpolated position (`RVec3`) and rotation (`Quat`) from `renderState.transform`.
3.  **Apply Transform**: Apply the translation and rotation to the `poseStack`.
4.  **Local Transform**: Apply any additional transformations needed to align your model (e.g., translating by -0.5 to center a 1x1x1 block model).
5.  **Render**: Use Minecraft's rendering systems to draw your model, block, or custom mesh.
6.  **Pop Pose**: Call `poseStack.popPose()` to restore the previous transformation state.

### Example: Rendering a Colored Box

The built-in `BoxRenderer` provides a clear example. It reads a synchronized color from the body and uses it to select a `BlockState` to render.

```java
// Inside BoxRenderer.java

@Override
public void render(BoxRigidBody body, PoseStack poseStack, ..., VxRenderState renderState) {
    // Get synchronized data from the body
    BoxColor color = body.getColor(); 
    BlockState blockState = color.getBlock().defaultBlockState();
    Vec3 halfExtents = body.getHalfExtents();
    
    poseStack.pushPose();

    // Get and apply the interpolated transform
    RVec3 renderPosition = renderState.transform.getTranslation();
    Quat renderRotation = renderState.transform.getRotation();
    poseStack.translate(renderPosition.x(), renderPosition.y(), renderPosition.z());
    poseStack.mulPose(new Quaternionf(renderRotation.getX(), ...));

    // Apply local transform to center and scale the block model
    poseStack.translate(-halfExtents.getX(), -halfExtents.getY(), -halfExtents.getZ());
    poseStack.scale(halfExtents.getX() * 2.0f, halfExtents.getY() * 2.0f, halfExtents.getZ() * 2.0f);

    // Render the chosen block
    Minecraft.getInstance().getBlockRenderer().renderSingleBlock(
            blockState,
            poseStack,
            bufferSource,
            packedLight,
            OverlayTexture.NO_OVERLAY
    );

    poseStack.popPose();
}
```

---

## Lifecycle & Ticking Methods

Velthoric provides a robust set of callback methods to handle logic at different points in the game loop and simulation. You can override these in your `VxRigidBody` class.

### Server-Side Callbacks

*   **`onBodyAdded(VxPhysicsWorld world)`**
    Called once when the body is created or loaded. This is the ideal place to initialize state or create constraints (joints) that attach this body to others.

*   **`onBodyRemoved(VxPhysicsWorld world, VxRemovalReason reason)`**
    Called just before the body is removed from the simulation (e.g., chunk unload or destruction). Use this for cleanup logic.

*   **`onPhysicsTick(VxPhysicsWorld world)`**
    Called **every physics step** (typically 60 times/sec) on the **Physics Thread**.
    *   *Use for:* Applying forces, checking immediate collisions, or logic that requires high precision.
    *   *Warning:* Do not interact with standard Minecraft classes (like `Level` or `Entity`) here without synchronization, as this runs off the main thread.

*   **`onServerTick(ServerLevel level)`**
    Called **every game tick** (20 times/sec) on the **Main Server Thread**.
    *   *Use for:* Game logic, interacting with entities, playing sounds, or updating block states.

### Client-Side Callbacks

*   **`onBodyAdded(ClientLevel level)`** / **`onBodyRemoved(ClientLevel level)`**
    Equivalent to the server versions, but for initializing client-side specific visuals (like spawning a particle emitter).

*   **`onClientTick()`**
    Called every frame on the client.
    *   *Use for:* Updating client-only animations or managing sound loops.

*   **`onSyncedDataUpdated(VxDataAccessor<?> accessor)`**
    Called whenever a piece of synchronized data changes (received from the server).
    *   *Use for:* Triggering effects when state changes (e.g., playing a "clang" sound when a `HIT_BOOLEAN` updates).