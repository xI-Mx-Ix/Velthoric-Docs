# 02 - Getting Started with XBullet

## Setting Up Your Project

To use XBullet in your Minecraft mod, you first need to add it to your project. If you use Gradle as your build system, add this dependency to your build.gradle file:

```gradle
dependencies {
    implementation '...' 
}
```

## The Golden Rule: Managing Native Memory

Before you write a single line of XBullet code, it is critical to understand how memory is handled. XBullet uses the **Jolt Physics Engine** through a JNI bridge. This means that for many objects you create in Java, a corresponding object is created in "native" C++ code, which lives outside the Java Virtual Machine's (JVM) standard garbage collector.

**If you do not manage this native memory correctly, your game will suffer from memory leaks and eventually crash.**

### JVM Objects vs. Native Objects

It's important to distinguish between two types of objects:
*   **JVM Objects:** Standard Java objects (like `new Vec3()`). The Java garbage collector automatically cleans these up when they are no longer used.
*   **Native-Backed Objects:** These are special Java objects (subclasses of `JoltPhysicsObject`) that have a corresponding piece of native memory assigned to them. Examples include `PhysicsSystem`, `Body`, `Shape`, `Constraint`, and `MotorSettings`.

**The Java garbage collector does NOT automatically free the native memory associated with these objects.** You are responsible for freeing it.

### How to Free Native Memory in XBullet

The Jolt JNI library provides several mechanisms for memory management, but to keep things safe and simple, XBullet encourages a single, explicit approach: **The `try-with-resources` statement (or manual `.close()` calls).**

Most native-backed Jolt JNI objects implement the `AutoCloseable` interface. This means you should almost always create and use them within a `try-with-resources` block. This guarantees that their native memory is freed as soon as the block is exited, preventing leaks.

**A Practical Example:**

Let's say you need a `SpringSettings` object to configure a constraint. This is a `JoltPhysicsObject` with native memory.

**Correct Way (Safe):**
```java
// The SpringSettings object is created inside the try() block.
try (SpringSettings mySpring = new SpringSettings()) {
    mySpring.setFrequency(20.0f);
    mySpring.setDamping(1.0f);

    // Use mySpring to configure your constraint here...

} // mySpring.close() is automatically called here, freeing native memory.
```

**Incorrect Way (Memory Leak!):**
```java
// This creates a native object that is never freed.
SpringSettings mySpring = new SpringSettings(); 
mySpring.setFrequency(20.0f);
mySpring.setDamping(1.0f);
// ... use the spring ...

// The native memory for mySpring now leaks forever.
```

### Reference-Counted Objects (`RefTarget`)

Some of the most important Jolt objects, like `Shape`, `ShapeSettings`, and `Constraint`, use a memory management system called "reference counting". Think of them as special targets that cannot be closed directly.

To manage their lifecycle, you use a **reference** to them. The simplest way to get a reference is by calling `.toRef()`. It is this reference object that you must close.

XBullet's `ObjectManager` and `ConstraintManager` handle most of this complexity for you. When you create a `RigidPhysicsObject` or a `Constraint`, the manager takes ownership and ensures it is cleaned up properly when unloaded or removed. You do not need to manually call `close()` on objects returned by `manager.getObject()` or `manager.getConstraint()`.

However, when you create temporary `ShapeSettings` or other `RefTarget` objects yourself, you are responsible for them.

**Example: Creating a temporary shape**
```java
// Create shape settings. This is a RefTarget.
try (BoxShapeSettings shapeSettings = new BoxShapeSettings(new Vec3(1, 1, 1))) {
    
    // Create a shape from the settings. This is also a RefTarget.
    // The create() method returns a Result object containing the shape.
    try (ShapeResult result = shapeSettings.create()) {
        Shape shape = result.get();
        // Use the shape here...
    }
    
} // Both shapeSettings and the result (and its inner shape) are now closed and freed.
```

> **Summary:**
>
> 1.  Be aware of which objects are native-backed (`JoltPhysicsObject`).
> 2.  **Always** create and use these temporary objects inside a `try-with-resources` block.
> 3.  The `ObjectManager` and `ConstraintManager` will handle the memory for the objects they manage. Do not `close()` them yourself.

> For a comprehensive and detailed explanation of these concepts, please refer to the official Jolt JNI documentation on **[Freeing Native Memory](https://stephengold.github.io/jolt-jni-docs/jolt-jni-en/English/free.html)**.

## What’s Next?

With this crucial understanding of memory management, you are ready to start creating and managing physics objects in the world.