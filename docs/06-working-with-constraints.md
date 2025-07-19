# 06 - Working with Constraints

## Introduction

Constraints are the backbone of any dynamic physics simulation. Think of them as the rules that govern how two physics objects interact. They can be digital glue, hinges, ropes, pistons, or any other type of joint that connects objects and restricts their movement.

With constraints, you can build complex machines, ragdolls, destructible structures, and vehicles. This guide will cover how to create, manage, and configure constraints using the XBullet API.

## The ConstraintManager

Similar to how the `ObjectManager` handles physics objects, the `ConstraintManager` is your central point for managing all constraints within a specific dimension. It handles their creation, persistence, and removal.

To get the `ConstraintManager` for a specific level:

```java
// Assuming 'serverLevel' is an instance of ServerLevel
ConstraintManager constraintManager = PhysicsWorld.getConstraintManager(serverLevel.dimension());
```

## Creating Constraints: The Builder Pattern

Creating a constraint in Jolt can involve many parameters. To make this process clean and readable, XBullet uses a **builder pattern**. Instead of a massive constructor, you chain methods together to configure your constraint step-by-step.

The general workflow is always the same:
1.  **Get a Builder:** Call a `create...()` method on the `ConstraintManager`.
2.  **Configure:** Use the builder's methods (like `between()`, `atPoints()`, `withLimits()`) to set its properties.
3.  **Build:** Call `.build()` to finalize the configuration and queue the constraint for creation in the physics world.

```java
// General Pattern
constraintManager.createHinge()              // 1. Get a Hinge builder
    .between(object1, object2)         // 2. Configure who it connects
    .atPoints(pivotPoint, pivotPoint)  // 2. Configure where it pivots
    .build();                          // 3. Queue for creation
```

## A Practical Example: The Hinge Constraint

Let's create a simple hinge connecting two physics objects (`box1` and `box2`). A hinge allows rotation around a single axis, like a door.

```java
// Assume box1 and box2 are IPhysicsObject instances that already exist
// Assume constraintManager is your ConstraintManager instance

// Define where the hinge will be and what axis it rotates around
RVec3 pivotPointInWorld = new RVec3(10, 64, 20);
Vec3 rotationAxis = new Vec3(0, 1, 0); // Rotate around the Y-axis

// Use the builder to create the constraint
constraintManager.createHinge()
    .between(box1, box2)
    .inSpace(EConstraintSpace.WorldSpace)
    .atPoints(pivotPointInWorld, pivotPointInWorld)
    .withHingeAxes(rotationAxis, rotationAxis)
    .build();
```

Let's break down the builder methods:
*   `.between(box1, box2)`: Specifies the two physics objects to connect.
*   `.inSpace(EConstraintSpace.WorldSpace)`: This is important. It tells the builder that the points and axes we provide are in world coordinates. The alternative, `LocalToBodyCOM`, means the coordinates are relative to each object's center of mass. World space is often easier to start with.
*   `.atPoints(...)`: Defines the pivot point for the hinge. Since it's a single point in world space, we provide the same `RVec3` for both objects.
*   `.withHingeAxes(...)`: Defines the axis of rotation. Again, since it's in world space, the axis is the same for both.
*   `.build()`: Submits the configured constraint to be created in the next physics tick.

## The "Magic" Behind Stiffness: `SpringSettings`

You might notice that some constraints seem "soft" or "wobbly" by default. This is because their limits (e.g., the end of a rope's length or a hinge's rotation limit) are not infinitely hard walls. Instead, they are enforced by a powerful, simulated spring. **Controlling this spring is the key to controlling the stiffness of your constraints.**

The `SpringSettings` class is used everywhere for this. It has two main modes:
1.  **Frequency and Damping (Recommended)**: This mode is intuitive for artists and designers.
    *   **Frequency (Hz):** How fast the spring wants to oscillate. A higher frequency means a tighter, stiffer spring. Think of a guitar string: a high-frequency note comes from a very taut string.
    *   **Damping:** How quickly the oscillation dies down. A value of `1.0` is **critically damped**, meaning it returns to its target position as fast as possible without overshooting. This is the magic number for creating rigid, stable joints. A value of `0.0` means it will bounce forever.

2.  **Stiffness and Damping:** A more physics-heavy approach where you define the spring constant (`k`) directly.

> **Rule of Thumb:** For a joint that should feel solid and not wobble, use a high frequency (e.g., `20.0f`) and a damping of `1.0f`.

Let's make our hinge's angular limits very stiff:

```java
try (SpringSettings stiffSpring = new SpringSettings()) {
    stiffSpring.setMode(ESpringMode.FrequencyAndDamping);
    stiffSpring.setFrequency(20.0f);
    stiffSpring.setDamping(1.0f);

    constraintManager.createHinge()
        .between(box1, box2)
        // ... other settings ...
        .withLimits(-90, 90) // Limit rotation to +/- 90 degrees
        .withLimitsSpringSettings(stiffSpring) // Apply our stiff spring settings
        .build();
}
```

## Adding Power: `MotorSettings`

Many constraints can be motorized, meaning you can apply force or torque to make them move to a target position or velocity. This is controlled by `MotorSettings`.

A motor also uses its own internal `SpringSettings` to drive towards its target. This means you can have a "soft" motor that gently pushes an object, or a "strong" motor that aggressively forces it into position.

Let's take our hinge and add a motor to make it spin:

```java
// Assume 'myHinge' is a live HingeConstraint object

// Set the motor to be velocity-controlled
myHinge.setMotorState(EMotorState.Velocity);
// Tell it to rotate at 2.0 radians per second
myHinge.setTargetAngularVelocity(2.0f);
```

You can also configure the motor's strength and behavior in the builder:

```java
try (MotorSettings powerfulMotor = new MotorSettings()) {
    // Make the motor very strong
    powerfulMotor.getSpringSettings().setFrequency(30.0f);
    powerfulMotor.getSpringSettings().setDamping(1.0f);
    // Allow it to use a lot of torque
    powerfulMotor.setTorqueLimits(-10000.0f, 10000.0f);

    constraintManager.createHinge()
        // ...
        .withMotorSettings(powerfulMotor)
        .build();
}
```

## Other Common Constraints

XBullet provides builders for all major Jolt constraints. Here are a few more common ones:

*   **Fixed Constraint:** The "superglue" of constraints. It locks two objects together completely, allowing no relative movement or rotation. Use `createFixed()`.
*   **Distance Constraint:** Keeps two points on two bodies at a specific distance, or within a min/max range. Perfect for ropes, chains, or rigid links. Use `createDistance().withDistanceRange(min, max)`. Its limits are also controlled by `SpringSettings`.
*   **Slider Constraint:** Allows movement along a single axis, like a piston or a drawer. It can have limits and a motor. Use `createSlider()`.

## Finding and Removing Constraints

If you store the `UUID` of a constraint when you create it, you can remove it later.

```java
// You must get the UUID when you create the constraint, as there is no builder.getId()
// This requires a more advanced approach beyond the simple .build()
UUID myConstraintId = /* ... get UUID from a custom creation flow ... */;

// To remove the constraint temporarily (it will be reloaded with the world)
constraintManager.removeConstraint(myConstraintId, false);

// To remove the constraint permanently
constraintManager.removeConstraint(myConstraintId, true);
```