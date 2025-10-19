# Velthoric: Vehicles and Mounting

Velthoric includes a comprehensive system for creating vehicles that players can mount, drive, and interact with. This is built on top of Jolt's powerful `VehicleConstraint` and a custom mounting system.

This guide covers both the creation of the vehicle itself and the process of making it rideable.

---

## The `VxVehicle` Base Class

The foundation for all vehicles is the `VxVehicle` abstract class. It's a specialized `VxRigidBody` that automatically manages a `VehicleConstraint` and handles the synchronization of wheel and speed data to the client.

To create a new vehicle, you should extend one of its more specific subclasses:
*   `VxCar`: A base for four-wheeled, car-like vehicles.
*   `VxMotorcycle`: A base for two-wheeled vehicles, using Jolt's `MotorcycleController` for realistic leaning.

### Core Implementation Steps

When creating a vehicle, you need to implement a few key methods:

1.  **`createConstraintSettings()`**: This is the most important method. Here, you define every physical aspect of your vehicle: wheel positions, suspension, engine power, transmission gears, etc.
2.  **`createJoltBody()`**: Defines the shape of the vehicle's main chassis (the rigid body).
3.  **`defineSeats()`**: To make the vehicle rideable, you must define its seats by implementing the `VxMountable` interface.

## Example: Creating a Simple Car

Let's look at the structure of `CarImpl`, Velthoric's built-in car, to understand the process.

### 1. The Class Definition

Your class should extend `VxCar` (or `VxMotorcycle`) and implement `VxMountable`.

```java
public class MyCar extends VxCar implements VxMountable {
    
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

This is where the magic happens. You'll create and configure `WheelSettingsWv` for each wheel and a `WheeledVehicleControllerSettings` for the engine and drivetrain.

```java
@Override
protected VehicleConstraintSettings createConstraintSettings() {
    // This is where you define your car's physical setup.
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
    
    // --- 4. Sync wheel settings to the client for rendering ---
    // Velthoric needs this list to render the wheels correctly.
    this.wheels.add(new VxWheel(flWheel));
    this.wheels.add(new VxWheel(frWheel));
    this.wheels.add(new VxWheel(rlWheel));
    this.wheels.add(new VxWheel(rrWheel));
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

### 3. Handling Driver Input

If a seat is marked as `isDriverSeat`, the `handleDriverInput` method on your vehicle class will be called on the server whenever the player's input changes.

The `VxCar` and `VxMotorcycle` base classes already provide a default implementation of this method that translates player input into throttle, brake, and steering for the vehicle controller. You can override it for more custom behavior.

```java
// Default implementation in VxCar
@Override
public void handleDriverInput(ServerPlayer player, VxMountInput input) {
    if (this.controller == null) return;

    float forward = input.isForward() ? 1.0f : (input.isBackward() ? -1.0f : 0.0f);
    float right = input.isRight() ? 1.0f : (input.isLeft() ? -1.0f : 0.0f);
    // ... and so on

    this.controller.setInput(forward, right, brake, handBrake);
}
```