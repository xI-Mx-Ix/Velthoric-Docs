# Vehicles and Mounting

Velthoric provides a high-level abstraction over Jolt's `VehicleConstraint` system, allowing you to create complex drivable vehicles like cars and motorcycles. The system handles the heavy lifting of physics simulation, input processing, network synchronization, and client-side interpolation.

To create a vehicle, you extend one of the specific base classes **`VxCar`** or **`VxMotorcycle`** rather than the generic `VxBody`.

## Implementing a Car (`VxCar`)

To create a standard four-wheeled vehicle, you should extend the `VxCar` class. A functional vehicle requires three main steps: defining the mechanical configuration, creating the physical chassis, and fine-tuning the suspension.

### 1. Configuration (`createConfig`)

In the new system, mechanical properties are separated from the logic. You must implement `createConfig` to define the engine, transmission, and wheels.

You typically create a `VxCarConfig`, add your wheels to it, and then apply it using `this.applyCarConfig()`.

**Key details:**
*   **Transmission:** Can be set to `Manual` (Java logic) or `Auto` (Jolt logic).
*   **Wheel Position:** Defined relative to the chassis center.

```java
public class CarImpl extends VxCar {

    // ... Constructors ...

    @Override
    protected VxVehicleConfig createConfig() {
        // 1. Define Engine and Transmission specs
        float maxTorque = 7500.0f;
        float maxRpm = 9000.0f;
        // Gear ratios from 1st to 6th gear
        float[] gears = new float[]{8.5f, 5.2f, 3.6f, 2.7f, 2.1f, 1.7f};

        // 2. Create the Config (e.g., Manual Transmission)
        VxCarConfig config = new VxCarConfig(1600.0f, maxTorque, maxRpm, gears, ETransmissionMode.Manual);

        // 3. Add Wheels
        // Parameters: Position, Radius, Width, isPowered, isSteerable
        float yPos = -0.2f;
        config.addWheel(new Vec3(-1.15f, yPos,  2.0f), 0.55f, 0.35f, false, true); // Front Left
        config.addWheel(new Vec3( 1.15f, yPos,  2.0f), 0.55f, 0.35f, false, true); // Front Right
        config.addWheel(new Vec3(-1.15f, yPos, -2.0f), 0.55f, 0.35f, true, false); // Rear Left
        config.addWheel(new Vec3( 1.15f, yPos, -2.0f), 0.55f, 0.35f, true, false); // Rear Right

        // 4. Important: Apply the config to initialize components
        this.applyCarConfig(config);
        
        return config;
    }
}
```

### 2. The Chassis & Center of Mass

Vehicles require a stable center of mass (CoM) to prevent flipping during turns. It is **highly recommended** to use Jolt's `OffsetCenterOfMassShapeSettings` to artificially lower the CoM below the geometric center of your model.

In `createJoltBody`, you define the shape and mass:

```java
@Override
public int createJoltBody(VxRigidBodyFactory factory) {
    // Define the visual shape dimensions (half-extents)
    Vec3 halfExtents = new Vec3(1.1f, 0.5f, 2.4f);
    
    try (ShapeSettings chassisShape = new BoxShapeSettings(halfExtents)) {
        // Offset the Center of Mass downwards (e.g., -0.6 on Y axis)
        Vec3 centerOfMassOffset = new Vec3(0f, -0.6f, 0f);

        try (
                // Wrap the shape to apply the offset
                ShapeSettings finalShape = new OffsetCenterOfMassShapeSettings(centerOfMassOffset, chassisShape);
                BodyCreationSettings bcs = new BodyCreationSettings()
        ) {
            bcs.setShapeSettings(finalShape);
            bcs.setMotionType(EMotionType.Dynamic);
            bcs.setObjectLayer(VxLayers.DYNAMIC);
            
            // LinearCast is recommended for fast moving vehicles to prevent tunneling
            bcs.setMotionQuality(EMotionQuality.LinearCast); 
            
            // Calculate inertia based on the config mass
            bcs.getMassPropertiesOverride().setMass(config.getMass());
            bcs.setOverrideMassProperties(EOverrideMassProperties.CalculateInertia);

            return factory.create(finalShape, bcs);
        }
    }
}
```

### 3. Fine-Tuning Suspension (`onBodyAdded`)

The `onBodyAdded` method is called after the Jolt constraint has been created. This is the ideal place to configure dynamic properties like suspension stiffness (frequency), damping, and brake torque for individual wheels.

```java
@Override
public void onBodyAdded(VxPhysicsWorld world) {
    super.onBodyAdded(world); // Important: Creates the constraint first

    for (VxVehicleWheel wheel : this.getWheels()) {
        WheelSettingsWv settings = wheel.getSettings();
        
        // Suspension travel limits
        settings.setSuspensionMinLength(0.3f);
        settings.setSuspensionMaxLength(0.7f);
        
        // Spring properties
        settings.getSuspensionSpring().setFrequency(1.8f); // Stiffness
        settings.getSuspensionSpring().setDamping(0.8f);   // Bounciness damping (0.0 - 1.0)

        // Differential brake setup
        if (wheel.isSteerable()) {
            settings.setMaxSteerAngle((float) Math.toRadians(35.0));
            settings.setMaxBrakeTorque(8000.0f); // Stronger brakes on front
        } else {
            settings.setMaxBrakeTorque(4000.0f);
        }
    }
}
```

## Implementing a Motorcycle (`VxMotorcycle`)

Motorcycles extend `VxMotorcycle`. The setup is very similar to a car, but it requires specific geometry adjustments in `onBodyAdded` to handle the **Caster Angle**.

The caster angle (the angle of the front fork) is essential for steering stability. Without it, the bike will be unstable.

```java
public class MotorcycleImpl extends VxMotorcycle {
    // ... createConfig (similar to car, but with 2 wheels) ...

    @Override
    public void onBodyAdded(VxPhysicsWorld world) {
        super.onBodyAdded(world);

        // --- 1. Calculate Caster Angle for Front Wheel ---
        float casterAngle = degreesToRadians(30);
        
        // Suspension moves along this vector (angled back)
        Vec3 suspensionDir = new Vec3(0, -1, (float) Math.tan(casterAngle)).normalized();
        // Steering rotates around this axis (angled accordingly)
        Vec3 steeringAxis = new Vec3(0, 1, -(float) Math.tan(casterAngle)).normalized();

        // Apply to the front wheel (Index 0)
        VxVehicleWheel front = this.getWheels().get(0);
        WheelSettingsWv frontSettings = front.getSettings();
        
        frontSettings.setSuspensionDirection(suspensionDir);
        frontSettings.setSteeringAxis(steeringAxis);
        frontSettings.setMaxSteerAngle(degreesToRadians(30));

        // --- 2. Rear Wheel Setup ---
        // Rear wheels usually don't steer
        VxVehicleWheel back = this.getWheels().get(1);
        back.getSettings().setMaxSteerAngle(0.0f);
    }
}
```

## Defining Seats

Both Cars and Motorcycles act as `VxMountable` objects. You do not need to implement any interface manually; simply override the `defineSeats` method.

*   **`VxSeat`**: Requires a unique string identifier (e.g., "driver_seat"), an interaction AABB (hitbox), and a visual offset for the player model.
*   **`isDriverSeat`**: If set to `true`, input from the player in this seat will control the vehicle.

```java
@Override
public void defineSeats(VxSeat.Builder builder) {
    // Driver Seat
    Vector3f offset = new Vector3f(0.0f, 0.5f, 0.5f);
    AABB interactBox = new AABB(/* coordinates relative to body center */);
    
    // Seat ID is combined with Body ID automatically
    VxSeat driverSeat = new VxSeat(this.getPhysicsId(), "driver_seat", interactBox, offset, true);
    
    builder.addSeat(driverSeat);
    // You can add passenger seats here as well
}
```

## Rendering Vehicles

Vehicle rendering requires two passes: one for the chassis (the rigid body) and a loop for the wheels.

The `VxVehicleWheel` object handles the client-side interpolation of suspension compression, steering angle, and wheel rotation for you. This ensures smooth animations even if the server tick rate is low.

### The Rendering Loop

In your `VxRigidBodyRenderer` implementation:

1.  **Render the Chassis:** Standard rigid body rendering using the body's transform.
2.  **Iterate Wheels:** Loop through `body.getWheels()`.
3.  **Apply Transformations:** You must apply transforms in a specific order: Position -> Suspension -> Steering -> Rotation.

```java
public class CarRenderer extends VxRigidBodyRenderer<CarImpl> {

    @Override
    public void render(CarImpl body, PoseStack poseStack, ..., VxRenderState renderState) {
        poseStack.pushPose();

        // 1. Apply Main Body Transform (Interpolated)
        RVec3 pos = renderState.transform.getTranslation();
        Quat rot = renderState.transform.getRotation();
        poseStack.translate(pos.x(), pos.y(), pos.z());
        poseStack.mulPose(new Quaternionf(rot.getX(), rot.getY(), rot.getZ(), rot.getW()));

        // 2. Render Chassis Model here...
        // ...

        // 3. Render Wheels
        for (VxVehicleWheel wheel : body.getWheels()) {
            WheelSettingsWv settings = wheel.getSettings();
            poseStack.pushPose();

            // A. Translate to wheel hardpoint (attachment position)
            Vec3 attach = settings.getPosition();
            poseStack.translate(attach.getX(), attach.getY(), attach.getZ());

            // B. Apply Suspension (Translate along suspension direction)
            // The wheel helper provides the interpolated suspension length
            float suspLength = wheel.getRenderSuspension(partialTicks);
            Vec3 suspDir = settings.getSuspensionDirection();
            poseStack.translate(suspDir.getX() * suspLength, suspDir.getY() * suspLength, suspDir.getZ() * suspLength);

            // C. Apply Steering (Rotate around steering axis)
            float steer = wheel.getRenderSteer(partialTicks);
            Vec3 steerAxis = settings.getSteeringAxis();
            poseStack.mulPose(Axis.of(new Vector3f(steerAxis.getX(), ...)).rotation(steer));

            // D. Apply Wheel Rotation (Rolling)
            float roll = wheel.getRenderRotation(partialTicks);
            poseStack.mulPose(Axis.XP.rotation(roll));

            // E. Render the Wheel Model
            // Use settings.getRadius() and settings.getWidth() to scale your model
            renderWheelModel(...);

            poseStack.popPose();
        }

        poseStack.popPose();
    }
}
```