# Velthoric: Constraints (Joints)

Constraints (also known as joints) are an essential tool in physics simulation. They connect two bodies and restrict their relative motion. With constraints, you can build everything from simple chains and pendulums to complex mechanisms like doors, pistons, or vehicle suspensions.

Velthoric provides a simple yet powerful API to leverage the diverse constraint types offered by the Jolt Physics Engine.

This guide assumes you have read `The Basics`.

---

## The Core Concept: `VxConstraintManager`

Every `VxPhysicsWorld` has its own `VxConstraintManager`. This manager is your central entry point for all operations related to constraints.

**The Manager's Main Responsibilities:**
*   **Creation**: Creates new constraints between bodies.
*   **Lifecycle**: Automatically activates constraints as soon as their associated bodies are loaded into the world.
*   **Persistence**: Automatically saves and loads constraints along with the chunks, ensuring they are restored after a server restart.

You can get the manager's instance directly from your physics world:
```java
VxPhysicsWorld world = ...;
VxConstraintManager constraintManager = world.getConstraintManager();
```

---

## Creating a Constraint: The Workflow

Creating a constraint always follows the same pattern:

1.  **Create a Settings Object**: Choose the appropriate `ConstraintSettings` type from the JoltJNI library (e.g., `PointConstraintSettings`, `HingeConstraintSettings`).
2.  **Configure the Settings**: Define the properties of the joint, most importantly the **anchor points** on both bodies.
3.  **Create the Constraint**: Call `constraintManager.createConstraint()` with the settings object and the UUIDs of the two bodies.

### Example: Connecting Two Crates with a Ball-and-Socket Joint

Let's imagine we have two `BoxRigidBody` instances, `body1` and `body2`, and we want to connect them like a chain. We'll use a `PointConstraint` (a ball-and-socket joint), which allows all rotation but enforces a fixed distance between the anchor points.

```java
// Assuming body1 and body2 are already created VxBody instances.

// Use PointConstraintSettings for a ball-and-socket joint.
try (PointConstraintSettings settings = new PointConstraintSettings()) {
    settings.setSpace(EConstraintSpace.LocalToBodyCom);
    
    // Define the anchor points in the LOCAL space of the bodies.
    // We'll connect the center of body1's top face to the center of body2's bottom face.
    // Assuming our boxes are 1x1x1, their local center is at (0,0,0).
    
    // Anchor point on body1: 0.5 units down on the Y axis.
    settings.setPoint1(new RVec3(0, -0.5, 0)); 
    
    // Anchor point on body2: 0.5 units up on the Y axis.
    settings.setPoint2(new RVec3(0, 0.5, 0));

    // Create the constraint. It will be activated automatically once both bodies are loaded.
    constraintManager.createConstraint(settings, body1.getPhysicsId(), body2.getPhysicsId());
}
```

That's it! The `VxConstraintManager` handles the rest. It will wait until both `body1` and `body2` are fully loaded into the physics simulation and then create the actual Jolt constraint.

---

## The Coordinate System: `Local` vs. `World` Space

A crucial concept when configuring constraints is the `EConstraintSpace`. It defines the coordinate system in which the anchor points (`Point1` and `Point2`) are interpreted.

### `EConstraintSpace.LocalToBodyCom`

*   **Meaning**: The anchor points are defined **relative to the center of mass (CoM) of their respective body**.
*   **Usage**: This is the most common and recommended use case. It makes the constraint independent of the bodies' current position and rotation in the world. The crate example above uses this mode.

### `EConstraintSpace.WorldSpace` (Default)

*   **Meaning**: The anchor points are interpreted as **absolute world coordinates**.
*   **Usage**: Useful when you want to "snap" two bodies together at a specific point in the world. Jolt will calculate the correct local offsets internally. This is especially important when attaching a body to the static world.

---

## Constraining a Body to the World

Sometimes you want to attach a body to a fixed point in the world, like hanging a rope from a ceiling. For this, the `VxConstraintManager` provides a special constant: `VxConstraintManager.WORLD_BODY_ID`.

When you use this ID as one of the two body IDs, the constraint will be created between your body and the immovable, static world.

### Example: Hanging a Chain

The built-in `VxChainCreatorManager` uses this principle to attach the start of a chain to a wall or ceiling.

```java
// Let's assume 'chainLink' is our first chain body.
VxChainPartRigidBody chainLink = ...; 
// The point in the world from which the chain should hang.
RVec3 hangPoint = new RVec3(10, 70, 20); 

try (PointConstraintSettings settings = new PointConstraintSettings()) {
    // It's essential to keep the space within the WorldSpace!

    // When using WorldSpace, both anchor points are the same world coordinate.
    // The first point is the anchor in the world, the second is the anchor on the body.
    settings.setPoint1(hangPoint);
    settings.setPoint2(hangPoint);
    
    // Create the constraint between the static world and the chain link.
    constraintManager.createConstraint(settings, VxConstraintManager.WORLD_BODY_ID, chainLink.getPhysicsId());
}
```

---

## Other Constraint Types

Velthoric supports all of Jolt's two-body constraints. The process is always the same: create the appropriate `Settings` object, configure it, and pass it to `createConstraint`.