# Velthoric: Vehicles and Mounting

Velthoric includes a comprehensive system for creating vehicles that players can mount, drive, and interact with. This is built on top of Jolt's powerful `VehicleConstraint` and a custom mounting system. The system handles complex physics on the server and ensures smooth, interpolated rendering on the client for a seamless player experience.

This guide covers the creation of the vehicle's physics, making it rideable, and understanding the crucial server-to-client state synchronization loop.

---

## The `VxVehicle` Base Class

The foundation for all vehicles is the `VxVehicle` abstract class. It's a specialized `VxRigidBody` that automatically manages a `VehicleConstraint`. Its key responsibilities are:

*   **Server-Side:** Running the physics simulation for the vehicle and its wheels.
*   **State Synchronization:** Tracking changes in vehicle state (speed, wheel rotation/steering/suspension) and synchronizing this data to clients.
*   **Client-Side:** Receiving state data and interpolating it over time to produce smooth visuals for wheels and movement, even with low server tick rates.

To create a new vehicle, you should extend one of its more specific subclasses:
*   `VxCar`: A base for four-wheeled, car-like vehicles.
*   `VxMotorcycle`: A base for two-wheeled vehicles, using Jolt's `MotorcycleController` for realistic leaning.

### Core Implementation Steps

When creating a vehicle, you need to implement a few key methods:

1.  **`createConstraintSettings()`**: This is the most important method. Here, you define every physical aspect of your vehicle: wheel positions, suspension, engine power, transmission gears, anti-roll bars, etc.
2.  **`createCollisionTester()`**: Defines how the wheels detect the ground. Usually, a `VehicleCollisionTesterCastCylinder` is sufficient.
3.  **`createJoltBody()`**: Defines the shape of the vehicle's main chassis (the rigid body), its mass, and other core physics properties.
4.  **`defineSeats()`**: To make the vehicle rideable, you must define its seats by implementing the `VxMountable` interface (which `VxVehicle` already does).

## Example: Creating a Simple Car

Let's look at the structure of `CarImpl`, Velthoric's built-in car, to understand the process.

### 1. The Class Definition

Your class should extend `VxCar` (or `VxMotorcycle`). Since `VxVehicle` already implements `VxMountable`, you don't need to add it again.

```java
public class MyCar extends VxCar {
    
    // Server-side constructor
    public MyCar(VxBodyType<MyCar> type, VxPhysicsWorld world, UUID id) {
        super(type, world, id);
    }

    // Client-side constructor
    @Environment(EnvType.CLIENT)
    public MyCar(VxBodyType<MyCar> type, UUID id) {
        super(type, id);
    }
    
    // ... implementations of abstract methods ...
}
```

### 2. Configuring the Vehicle (`createConstraintSettings`)

This is where you define the vehicle's behavior. You'll create `WheelSettingsWv` for each wheel and a controller settings object (e.g., `WheeledVehicleControllerSettings`) for the engine and drivetrain.

```java
@Override
protected VehicleConstraintSettings createConstraintSettings() {
    // This list will hold wrappers for our wheel settings.
    this.wheels = new ArrayList<>(4);
    
    // --- 1. Create WheelSettingsWv for each wheel ---
    WheelSettingsWv flWheel = new WheelSettingsWv();
    flWheel.setPosition(new Vec3(-1.0f, -0.2f, 2.0f)); // Position relative to chassis center
    flWheel.setRadius(0.5f);
    flWheel.setWidth(0.3f);
    flWheel.setSuspensionMinLength(0.3f);
    flWheel.setSuspensionMaxLength(0.7f);
    flWheel.setMaxSteerAngle((float) Math.toRadians(35.0)); // Front wheels can steer
    // ... configure other wheels (fr, rl, rr), setting maxSteerAngle to 0 for rear wheels.

    // --- 2. Configure the controller (engine, transmission, etc.) ---
    WheeledVehicleControllerSettings controllerSettings = new WheeledVehicleControllerSettings();
    
    // Engine settings
    controllerSettings.getEngine().setMaxTorque(2500.0f);
    controllerSettings.getEngine().setMaxRpm(6000.0f);

    // Transmission settings (automatic)
    controllerSettings.getTransmission().setMode(ETransmissionMode.Auto);
    controllerSettings.getTransmission().setGearRatios(3.5f, 2.0f, 1.4f, 1.0f); // 4 forward gears
    controllerSettings.getTransmission().setReverseGearRatios(-3.0f);

    // Differential settings (for a rear-wheel drive car)
    controllerSettings.setNumDifferentials(1);
    VehicleDifferentialSettings differential = controllerSettings.getDifferential(0);
    differential.setLeftWheel(2);  // Index of rear-left wheel
    differential.setRightWheel(3); // Index of rear-right wheel

    // --- 3. Assemble the final settings ---
    VehicleConstraintSettings settings = new VehicleConstraintSettings();
    settings.addWheels(flWheel, frWheel, rlWheel, rrWheel);
    settings.setController(controllerSettings);
    
    // --- 4. Store and sync wheel settings ---
    // The VxWheel wrapper holds both static settings and dynamic server-side state.
    this.wheels.add(new VxWheel(flWheel));
    this.wheels.add(new VxWheel(frWheel));
    this.wheels.add(new VxWheel(rlWheel));
    this.wheels.add(new VxWheel(rrWheel));
    // This syncs the static wheel settings to the client, required for rendering.
    this.setSyncData(DATA_WHEELS_SETTINGS, this.wheels.stream().map(VxWheel::getSettings).collect(Collectors.toList()));

    return settings;
}
```

## Mounting and Seats

To allow a player to ride your vehicle, you must define its seats.

### 1. `VxSeat`: The Interaction Point

A **`VxSeat`** defines a spot on a body where a player can sit. It includes:
*   A unique name (e.g., "driver_seat"). The seat's UUID is deterministically generated from this and the parent body's ID.
*   A local-space `AABB` for interaction (the "right-click" zone).
*   A local-space `Vector3f` offset for where the player entity should be positioned.
*   A `boolean` flag `isDriverSeat`.

### 2. Implementing `defineSeats`

You must implement the `defineSeats` method from the `VxMountable` interface. This is called once when your vehicle is created.

```java
// Inside your vehicle class (e.g., MyCar.java)

@Override
public void defineSeats(VxSeat.Builder builder) {
    // Driver's seat
    Vector3f driverOffset = new Vector3f(-0.5f, 0.6f, 0.3f); // Example offset
    AABB driverAABB = new AABB(
            driverOffset.x - 0.4, driverOffset.y - 0.5, driverOffset.z - 0.4,
            driverOffset.x + 0.4, driverOffset.y + 0.5, driverOffset.z + 0.4
    );
    // The physicsId is required to generate a unique seat ID.
    VxSeat driverSeat = new VxSeat(this.getPhysicsId(), "driver_seat", driverAABB, driverOffset, true);
    
    builder.addSeat(driverSeat);

    // You can add more seats, like passenger seats
    // ...
}
```

Once seats are defined, Velthoric's mounting system automatically handles player interaction. When a player right-clicks within the `AABB` of a seat, a request is sent to the server to mount it.

## Driver Input and State Synchronization

A key feature of the vehicle system is how it smoothly translates player input into movement and synchronizes the result to all clients.

### 1. Handling Driver Input (`handleDriverInput`)

If a seat is marked as `isDriverSeat`, the `handleDriverInput` method on your vehicle class is called on the server whenever the player's input changes.

**Crucially, this method should not apply inputs directly.** Instead, it sets the *target state*. The actual physics values are interpolated over time in `physicsTick` for smooth control. `VxCar` and `VxMotorcycle` use a `VxSteering` helper for this.

```java
// Correct implementation pattern in VxCar.java

// This field stores the last input from the player.
private VxMountInput currentInput = VxMountInput.NEUTRAL;
// This helper smoothly interpolates the steering angle.
private final VxSteering steering = new VxSteering(4.0f);

@Override
public void handleDriverInput(ServerPlayer player, VxMountInput input) {
    // Store the latest input state.
    this.currentInput = input;

    // Set the TARGET steering angle. The steering will turn towards this over time.
    float targetRight = 0.0f;
    if (input.isRight()) {
        targetRight = 1.0f;
    } else if (input.isLeft()) {
        targetRight = -1.0f;
    }
    this.steering.setTargetAngle(targetRight);
}
```

### 2. Applying Input in the Physics Tick (`physicsTick`)

The `physicsTick` method is called every server tick. Here, we update the steering interpolation and apply the final, smoothed inputs to the vehicle's physics controller.

```java
// Logic inside VxCar#physicsTick

// Update the steering helper, moving the current angle towards the target.
final float tickDelta = 1.0f / 20.0f; // Assuming 20 TPS
this.steering.update(tickDelta);

// Complex logic can be used, e.g., braking before reversing.
float forwardInput = 0.0f;
float brakeInput = 0.0f;
if (this.currentInput.isForward()) {
    forwardInput = 1.0f;
} else if (this.currentInput.isBackward()) {
    if (getSpeedKmh() > 1.0f) {
        brakeInput = 1.0f; // Brake if moving forward
    } else {
        forwardInput = -1.0f; // Reverse if stationary
    }
}
// ... and so on

// Apply the final, interpolated steering and other inputs to the controller.
this.controller.setInput(forwardInput, this.steering.getCurrentAngle(), brakeInput, handBrakeInput);
```

### 3. State Synchronization and Client-Side Interpolation

For other players to see the vehicle move correctly, its state must be sent from the server to clients.

1.  **Dirty State:** When a vehicle is physically active, the server calls `markVehicleStateDirty()`.
2.  **Dispatcher:** On a network thread, `VxVehicleNetworkDispatcher` gathers all "dirty" vehicles.
3.  **Packet:** It creates an `S2CVehicleStatePacket` containing the vehicle's current speed and the precise rotation, steering, and suspension length for each wheel.
4.  **Client Update:** Clients receive this packet. They do not snap the wheels to the new state instantly. Instead, they store it as a "target state."
5.  **Rendering:** In `calculateRenderState`, which is called every frame, the client smoothly interpolates the wheel's visual state from its previous state towards the target state.

This entire process ensures that even if the server sends updates only 20 times per second, players see perfectly smooth wheel rotation and suspension movement on their high-refresh-rate monitors.