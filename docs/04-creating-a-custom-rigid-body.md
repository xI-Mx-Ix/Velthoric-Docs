# 04 - Creating a Custom Rigid Body

## Introduction

XBullet allows you to define completely new types of physics objects. This guide will walk you through the process of creating a custom rigid body, from its physical properties to its in-game appearance. We will use a simple **Box** object as our example.

Creating a new rigid body involves four main components:
1.  **Properties:** Defines the physical characteristics (mass, friction, etc.).
2.  **Object Class:** The main logic, defining the collision shape and custom data.
3.  **Renderer:** A client-side class to draw the object in the world.
4.  **Registration:** Telling XBullet about your new object type.

## 1. Defining Physics Properties

First, define a set of default physical properties for your object. The `RigidPhysicsObjectProperties` class provides a builder for this. These values can be used when you don't provide custom ones on spawn.

```java
public class BoxPhysicsProperties {
    public static RigidPhysicsObjectProperties boxProperties = RigidPhysicsObjectProperties.builder()
            .mass(40.0f)
            .friction(0.7f)
            .restitution(0.3f)
            .linearDamping(0.3f)
            .angularDamping(0.3f)
            .build();
}
```

## 2. Creating the Rigid Body Class

This is the core of your object. Create a new class that extends `RigidPhysicsObject`.

```java
public class BoxRigidPhysicsObject extends RigidPhysicsObject {
    // A unique identifier for your object type.
    public static final String TYPE_IDENTIFIER = "xbullet:box_obj";

    // Custom data for this object type.
    private Vec3 halfExtents;

    public BoxRigidPhysicsObject(UUID id, Level level, /* ... other params */) {
        super(id, level, /* ... super params */);
    }

    // This is the most important method. It defines the object's collision shape.
    @Override
    public ShapeSettings buildShapeSettings() {
        // We use a Jolt BoxShapeSettings with the half-extents.
        return new BoxShapeSettings(this.halfExtents);
    }
    
    // Public method to configure the object before spawning.
    public void setHalfExtents(Vec3 halfExtents) {
        this.halfExtents = halfExtents;
    }

    // --- Methods for syncing custom data to the client ---

    @Override
    protected void addAdditionalData(FriendlyByteBuf buf) {
        // Write our custom data to the network buffer.
        buf.writeFloat(this.halfExtents.getX());
        buf.writeFloat(this.halfExtents.getY());
        buf.writeFloat(this.halfExtents.getZ());
    }

    @Override
    protected void readAdditionalData(FriendlyByteBuf buf) {
        // Read the data on the client side.
        this.halfExtents = new Vec3(buf.readFloat(), buf.readFloat(), buf.readFloat());
    }
}
```

## 3. Creating a Renderer (Client-Side)

To see your object in the game, you need a renderer. This class runs only on the client and is responsible for drawing your object each frame.

It must extend `RigidPhysicsObject.Renderer`.

```java
// This class should only be loaded on the client.
@OnlyIn(Dist.CLIENT)
public class BoxRenderer extends RigidPhysicsObject.Renderer {
    @Override
    public void render(ClientRigidPhysicsObjectData data, PoseStack poseStack, MultiBufferSource bufferSource, float partialTicks, int packedLight) {
        // 1. Read the custom data (halfExtents) sent from the server.
        byte[] customData = data.getCustomData();
        if (customData == null || customData.length < 12) return;
        
        FriendlyByteBuf buf = new FriendlyByteBuf(Unpooled.wrappedBuffer(customData));
        float hx = buf.readFloat();
        float hy = buf.readFloat();
        float hz = buf.readFloat();
        buf.release();

        // 2. Use the PoseStack to position and scale the render.
        // The PoseStack is already translated and rotated to the object's physics transform.
        poseStack.pushPose();
        poseStack.translate(-hx, -hy, -hz); // Center the render
        poseStack.scale(hx * 2.0f, hy * 2.0f, hz * 2.0f); // Scale to full size

        // 3. Render something, like a Minecraft block.
        Minecraft.getInstance().getBlockRenderer().renderSingleBlock(
                Blocks.RED_CONCRETE.defaultBlockState(),
                poseStack,
                bufferSource,
                packedLight,
                OverlayTexture.NO_OVERLAY
        );

        poseStack.popPose();
    }
}
```

## 4. Registering Your Object

Finally, you must register your new object and its renderer with the XBullet API. This should be done early in your mod's lifecycle.

*   **For Forge:** Use the `FMLCommonSetupEvent` for object registration and `FMLClientSetupEvent` for renderer registration.
*   **For Fabric:** Use your main mod initializer for object registration and your client mod initializer for renderer registration.

```java
public class MyModRegistration {

    // Call this during common/server setup.
    public static void registerPhysicsObjects() {
        var api = XBulletAPI.getInstance().objects();

        api.registerObjectType(
            BoxRigidPhysicsObject.TYPE_IDENTIFIER,       // The unique ID
            EObjectType.RIGID_BODY,                      // The base type
            BoxPhysicsProperties.boxProperties,          // The default properties
            BoxRigidPhysicsObject.class                  // The object class
        );
    }
    
    // Call this during client setup.
    @OnlyIn(Dist.CLIENT)
    public static void registerClientRenderers() {
        var api = XBulletAPI.getInstance().objects();

        api.registerRigidRenderer(
            BoxRigidPhysicsObject.TYPE_IDENTIFIER,       // The unique ID
            BoxRenderer::new                             // A provider for the renderer
        );
    }
}
```