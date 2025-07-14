# 06 - Raycasting Against the World

## Introduction

Raycasting is the process of sending out an invisible line (a "ray") from a point in a certain direction to see what it hits. It's a fundamental tool for detecting objects, aiming, and creating interactive tools.

XBullet provides a powerful and unified raycasting system through the `PhysicsRaytracing` class. Its key feature is that it can simultaneously check for collisions against both **XBullet physics objects** and **standard Minecraft blocks and entities**, automatically returning the closest object hit.

## Understanding the Hit Results

When you perform a raycast, the result is wrapped in a few data-holding classes. It's important to understand what they represent.

### `CombinedHitResult`

This is the main object you get back from a raycast. It acts as a container that holds either a physics hit or a Minecraft hit, but never both. You must check which type of object was hit before processing the data.

```java
Optional<CombinedHitResult> optionalResult = PhysicsRaytracing.rayCast(...);

optionalResult.ifPresent(result -> {
    if (result.isPhysicsHit()) {
        // Handle the physics object hit
    } else if (result.isMinecraftHit()) {
        // Handle the block or entity hit
    }
});
```

### `PhysicsHitInfo`

If the ray hits an XBullet physics object, you'll get this object. It contains:
*   `getBodyId()`: The unique physics ID of the body that was hit. You can use this to find the `IPhysicsObject`.
*   `getHitFraction()`: A value from 0.0 to 1.0 representing how far along the ray the hit occurred.
*   `getHitNormal()`: The surface normal (a vector pointing directly away from the surface) at the point of impact.
*   `calculateHitPoint()`: A helper method to get the exact world coordinates of the impact.

```java
// Inside the isPhysicsHit() block:
PhysicsHitInfo physicsHit = result.getPhysicsHit().get();

// Get the actual object from the ObjectManager
Optional<IPhysicsObject> hitObject = objectManager.getObjectByBodyId(physicsHit.getBodyId());

// Calculate the world coordinates of the hit
RVec3 hitPoint = physicsHit.calculateHitPoint(rayOrigin, rayDirection, maxDistance);
```

### `MinecraftHitInfo`

If the ray hits a standard block or entity, you'll get this object. It contains:
*   `getHitResult()`: The standard vanilla `net.minecraft.world.phys.HitResult` object. You can check if it's a `BlockHitResult` or `EntityHitResult`.
*   `getHitFraction()`: The hit fraction, consistent with the physics hit.

## Performing a Combined Raycast

The easiest and most common way to perform a raycast is by using the static `PhysicsRaytracing.rayCast()` method. It takes the origin, direction, and max distance, and handles everything for you.

Here is a complete example of casting a ray and processing the result:

```java
// 1. Define the ray's parameters
ServerLevel level = /* ... your server level ... */;
RVec3 rayOrigin = new RVec3(player.getX(), player.getEyeY(), player.getZ());
Vec3 rayDirection = new Vec3(player.getLookAngle()); // Make sure this is normalized!
float maxDistance = 10.0f; // The maximum length of the ray

// 2. Perform the raycast
Optional<CombinedHitResult> optionalResult = PhysicsRaytracing.rayCast(level, rayOrigin, rayDirection, maxDistance);

// 3. Process the result
optionalResult.ifPresent(result -> {
    if (result.isPhysicsHit()) {
        PhysicsHitInfo physicsHit = result.getPhysicsHit().get();
        RVec3 hitPoint = physicsHit.calculateHitPoint(rayOrigin, rayDirection, maxDistance);

        System.out.println("Hit a physics object with ID: " + physicsHit.getBodyId());
        System.out.println("Impact at: " + hitPoint);
        
        // You could now apply a force, create a constraint, etc.

    } else if (result.isMinecraftHit()) {
        MinecraftHitInfo mcHit = result.getMinecraftHit().get();
        HitResult vanillaHit = mcHit.getHitResult();
        
        System.out.println("Hit a vanilla Minecraft object at: " + vanillaHit.getLocation());
        if (vanillaHit.getType() == HitResult.Type.BLOCK) {
            System.out.println("It was a block!");
        } else if (vanillaHit.getType() == HitResult.Type.ENTITY) {
            System.out.println("It was an entity!");
        }
    }
});
```

## Advanced: Standalone Raycasts

If you only need to check for one type of object and want to ignore the other, you can call the specialized methods directly. This can be slightly more performant if you don't need the combined result.

**To raycast against only physics objects:**
```java
Optional<PhysicsHitInfo> physicsHit = PhysicsRaytracing.rayCastPhysics(level, rayOrigin, rayDirection, maxDistance);
```

**To raycast against only vanilla blocks and entities:**
```java
Optional<MinecraftHitInfo> minecraftHit = PhysicsRaytracing.rayCastMinecraft(level, rayOrigin, rayDirection, maxDistance);
```