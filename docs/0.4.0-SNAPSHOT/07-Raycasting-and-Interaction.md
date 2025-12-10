# Raycasting and Interaction

Standard Minecraft raycasting, what happens when you look at or right-click on something, is limited to vanilla blocks and entities. It has no knowledge of the physics bodies simulated by Velthoric. To allow players to seamlessly interact with your custom physics objects, Velthoric provides a powerful, unified raycasting system.

This guide will show you how to use the `VxRaycaster` to detect and target physics bodies in the world.

This guide assumes you have read the previous documentation files.

---

## The `VxRaycaster` Utility

The `VxRaycaster` is the central utility for performing comprehensive raycasts. It's designed to query both the standard Minecraft world (blocks and entities) and the Jolt physics world simultaneously, then return the single closest hit. This ensures that a player looking at a scene containing both blocks and physics objects will interact with whatever is visually in front of them, just as they would expect.

### How to Perform a Raycast

The main method is `VxRaycaster.raycast()`. It takes the `Level` and a `VxClipContext`. The clip context is an extension of Minecraft's `ClipContext` that includes a crucial flag to enable or disable checking against physics bodies.

```java
// On the server, inside a command or event handler
ServerPlayer player = ...;
double reachDistance = 5.0;

// 1. Define the ray from the player's eyes outward
Vec3 from = player.getEyePosition();
Vec3 look = player.getLookAngle();
Vec3 to = from.add(look.scale(reachDistance));

// 2. Create the context. The final `true` enables the physics check.
//    This tells the raycaster to also check against Velthoric's physics world.
VxClipContext context = new VxClipContext(from, to, ClipContext.Block.COLLIDER, ClipContext.Fluid.NONE, player, true);

// 3. Perform the raycast. It returns the closest hit from all sources (blocks, entities, physics bodies).
Optional<VxHitResult> hitResult = VxRaycaster.raycast(player.level(), context);
```

---

## Handling the Result: `VxHitResult`

The `VxRaycaster` returns a `VxHitResult`, a specialized `HitResult` that can represent three different types of hits:

1.  A standard **block** hit (`BlockHitResult`).
2.  A standard **entity** hit (`EntityHitResult`).
3.  A **physics body** hit (`VxHitResult.PhysicsHit`).

You can easily check what you've hit and get the specific details for each case.

```java
hitResult.ifPresent(hit -> {
    // A. Check for a physics body hit first.
    if (hit.isPhysicsHit()) {
        VxHitResult.PhysicsHit physicsHit = hit.getPhysicsHit().get();
        int joltBodyId = physicsHit.bodyId();
        
        // You can get the VxBody from the Jolt body ID.
        VxBody body = physicsWorld.getBodyManager().getByJoltBodyId(joltBodyId);
        
        if (body != null) {
            player.sendSystemMessage(Component.literal("You hit a physics body with ID: " + body.getPhysicsId()));
        }
    
    // B. Check for a standard block hit.
    } else if (hit.getBlockHit().isPresent()) {
        BlockPos pos = hit.getBlockHit().get().getBlockPos();
        player.sendSystemMessage(Component.literal("You hit a block at: " + pos));
        
    // C. Check for a standard entity hit.
    } else if (hit.getEntityHit().isPresent()) {
        Entity entity = hit.getEntityHit().get().getEntity();
        player.sendSystemMessage(Component.literal("You hit an entity: " + entity.getName().getString()));
    }
});
```

---

## Practical Example: The Chain Creator

A perfect real-world example is the `VxChainCreatorManager`. It uses the raycaster to determine where to attach the start and end points of a chain.

It performs a raycast and then uses the `VxHitResult` to decide whether to create a constraint to the static **world** (if it hits a block) or to another **physics body**.

```java
// Simplified logic from VxChainCreatorManager.java

// Perform the raycast as shown above.
Optional<VxHitResult> hitResult = VxRaycaster.raycast(player.level(), context);

hitResult.ifPresent(hit -> {
    RVec3 worldPosition = new RVec3(hit.getLocation().x, hit.getLocation().y, hit.getLocation().z);

    // If the hit was on a physics body...
    if (hit.isPhysicsHit()) {
        VxHitResult.PhysicsHit physicsHit = hit.getPhysicsHit().get();
        VxBody hitBody = bodyManager.getByJoltBodyId(physicsHit.bodyId());
        
        if (hitBody != null) {
            // ...we get the body's UUID to create a constraint to it.
            UUID bodyToAttachTo = hitBody.getPhysicsId();
            // ... (calculate local anchor point and create constraint) ...
        }
    
    // If the hit was on a block or anything else...
    } else {
        // ...we use the special WORLD_BODY_ID to create a constraint to the static world.
        UUID bodyToAttachTo = VxConstraintManager.WORLD_BODY_ID;
        // ... (use worldPosition as the anchor point and create constraint) ...
    }
});
```

This demonstrates how the unified `VxRaycaster` enables complex interactions that seamlessly blend the vanilla world with the physics world.

---

## Advanced: Physics-Only Raycasting

For more specialized cases where you *only* want to query the physics simulation and ignore all Minecraft blocks and entities, you can use the `VxPhysicsRaycaster`. This class talks directly to Jolt.

It also allows for more fine-grained control using **filters**. For example, when the raycaster is used internally, it often applies `VxObjectLayerFilters.IGNORE_TERRAIN` to ensure the ray only hits dynamic objects, not the static world geometry.

```java
// This performs a raycast ONLY against physics bodies, ignoring terrain.
Optional<VxPhysicsRaycaster.Result> physicsOnlyHit = VxPhysicsRaycaster.raycast(
    physicsWorld,
    rayOrigin,
    rayDirection,
    maxDistance,
    VxObjectLayerFilters.IGNORE_TERRAIN // The filter to apply
);

physicsOnlyHit.ifPresent(hit -> {
    // The result here is a raw physics result with a Jolt bodyId.
    int joltBodyId = hit.bodyId();
    // ...
});
```