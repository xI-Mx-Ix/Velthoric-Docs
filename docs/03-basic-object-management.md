# 03 - Basic Object Management

## Introduction

Before creating your own custom physics objects, it's important to understand their lifecycle: how to spawn, find, and remove them from the world. This guide covers the fundamental operations for managing any physics object in XBullet.

## The ObjectManager

The `ObjectManager` is your main entry point for interacting with all physics objects within a specific dimension. It handles everything from creating and spawning objects to saving and loading them.

To get the `ObjectManager` for a specific level, you need a `ServerLevel` instance:

```java
// Assuming 'serverLevel' is an instance of ServerLevel
ObjectManager manager = PhysicsWorld.getObjectManager(serverLevel.dimension());
```

## Spawning an Object

Spawning a physics object is a three-step process: **Create**, **Configure**, and **Spawn**.

### Step 1: Create the Object Instance

First, you create an instance of the object using its unique type identifier. The `ObjectManager` uses a factory system to construct the correct object class.

```java
// Define a unique ID and initial position/rotation for the object.
UUID objectId = UUID.randomUUID();
PhysicsTransform transform = new PhysicsTransform(new RVec3(x, y, z), Quat.sIdentity());

// Create the object instance using its registered identifier.
// We use the identifier for our built-in box object here.
IPhysicsObject physicsObject = manager.createPhysicsObject(
    BoxRigidPhysicsObject.TYPE_IDENTIFIER,
    objectId,
    serverLevel,
    transform,
    null // No extra data needed on creation for this object
);
```

At this point, the object exists in memory but is not yet part of the physics simulation.

### Step 2: Configure the Object

Some objects require specific properties to be set *after* creation but *before* being spawned. For example, our box object needs to know its size. This is the time to set that data.

```java
// Safely cast to the specific object type to access its methods.
if (physicsObject instanceof BoxRigidPhysicsObject box) {
    // Set the dimensions of the box. This is crucial for building its collision shape.
    box.setHalfExtents(new com.github.stephengold.joltjni.Vec3(0.5f, 1.0f, 0.5f));
} else {
    // Failed to create or cast the object, handle the error.
    return;
}
```
> **Important:** Configuration must happen before spawning, as the physics engine needs this data to correctly initialize the body.

### Step 3: Spawn the Object into the World

Finally, call `manager.spawnObject()` to add the fully configured object to the physics simulation. This makes it visible to clients and allows it to start interacting with the world.

```java
IPhysicsObject spawnedObject = manager.spawnObject(physicsObject);

if (spawnedObject != null) {
    // The object was successfully added to the simulation.
    System.out.println("Spawned object with ID: " + spawnedObject.getPhysicsId());
} else {
    // Spawning failed, perhaps due to a duplicate UUID.
    System.out.println("Failed to spawn object.");
}
```

## Finding and Removing an Object

You can retrieve a managed object at any time using its `UUID`. To permanently remove an object from the simulation and from storage, use the `deleteObject` method.

```java
UUID objectToFind = /* ... get the UUID from somewhere ... */;

// Find an object
Optional<IPhysicsObject> foundObject = manager.getObject(objectToFind);
if (foundObject.isPresent()) {
    // ... do something with the object ...
}

// Remove an object
manager.deleteObject(objectToFind);
```

---

<br>

> > **A Note on Vector Types: `joltjni.Vec3` vs. `minecraft.Vec3`**
> >
> > When working with XBullet in a Minecraft environment, you will frequently encounter two different vector classes with the same name:
> > *   `com.github.stephengold.joltjni.Vec3`: Used by the Jolt physics engine for positions, velocities, and sizes.
> > *   `net.minecraft.world.phys.Vec3`: Used by Minecraft for game logic, entity positions, and raycasting.
> >
> > These two classes are **not interchangeable**. Accidentally importing or using the wrong `Vec3` will result in compile-time errors, as method signatures will not match.
> >
> > Pay close attention to your `import` statements. When in doubt, it's safest to use the fully qualified class name, as shown in the example above (`new com.github.stephengold.joltjni.Vec3(...)`), to avoid ambiguity.