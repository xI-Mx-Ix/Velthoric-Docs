# Velthoric: Synchronized Data

While Velthoric automatically synchronizes the essential physics state of a body (position, rotation, velocity), you often need to sync custom data to the client. This could be anything from a vehicle's current gear, the color of a box, to the remaining health of a destructible object.

Velthoric provides a flexible and efficient system for this, inspired by Minecraft's own `SynchedEntityData`.

This guide assumes you have read `The Basics`.

---

## The Core Components

The synchronized data system has three main parts:

1.  **`VxDataAccessor<T>`**: A static, type-safe key for a piece of data. Think of it as a unique ID for a variable you want to sync. It is tied to a specific data type `<T>`.

2.  **`VxDataSerializers`**: A registry of serializers. Each serializer knows how to write a specific data type (like `Integer` or `Vec3`) to the network buffer and read it back. Velthoric provides serializers for many common types.

3.  **`VxSynchronizedData`**: A container object held by every `VxBody`. It stores the actual values for all the data accessors defined for that body.

## Step-by-Step Implementation

Let's add a custom color to our `CrateRigidBody` from the basics guide.

### Step 1: Define the `VxDataAccessor`

First, you must define a `VxDataAccessor` as a `public static final` field in your `VxBody` class. This is the key you will use to get and set the data.

The `create` method requires the body's class to ensure unique and deterministic IDs across the server and client.

```java
// Inside your CrateRigidBody.java

public class CrateRigidBody extends VxRigidBody {

    // An enum for our colors. Using an enum is good practice.
    public enum CrateColor {
        BROWN, GRAY, DARK_OAK
    }

    // Define the accessor. We will sync an Integer representing the enum's ordinal.
    public static final VxDataAccessor<Integer> DATA_COLOR_ORDINAL = VxDataAccessor.create(
        CrateRigidBody.class,       // The class this data belongs to
        VxDataSerializers.INTEGER   // The serializer for the data type
    );
    
    // ... constructors and other methods ...
}
```

### Step 2: Register the Accessor with a Default Value

Next, you must tell Velthoric about your new data accessor by defining it in the `defineSyncData` method. This is where you provide its default value. This method is called in the `VxBody` constructor.

```java
// Inside CrateRigidBody.java

@Override
protected void defineSyncData(VxSynchronizedData.Builder builder) {
    // Register our accessor with a default value of BROWN.
    builder.define(DATA_COLOR_ORDINAL, CrateColor.BROWN.ordinal());
}
```

### Step 3: Create Getters and Setters

To make working with the data easier and safer, create simple getter and setter methods.

The crucial part is the setter: on the server, you **must** use `this.setSyncData()`. This method not only updates the value but also marks it as "dirty," which tells the network dispatcher to send an update to clients.

```java
// Inside CrateRigidBody.java

/**
 * Sets the color of the crate. Server-side only.
 * This will automatically sync the new color to all tracking clients.
 */
public void setColor(CrateColor color) {
    // Use the inherited setSyncData method to update the value.
    this.setSyncData(DATA_COLOR_ORDINAL, color.ordinal());
}

/**
 * Gets the current color of the crate. Can be called on both server and client.
 */
public CrateColor getColor() {
    // Use the inherited getSyncData method to retrieve the value.
    int ordinal = this.getSyncData(DATA_COLOR_ORDINAL);
    
    // It's good practice to add bounds checking for safety.
    if (ordinal >= 0 && ordinal < CrateColor.values().length) {
        return CrateColor.values()[ordinal];
    }
    return CrateColor.BROWN; // Fallback to default
}
```

---

## Reacting to Changes on the Client

When the server sends a data update, the client receives it and automatically updates the value in its local `VxSynchronizedData` container. But what if you want to *do* something when the data changes, like play a sound or spawn a particle?

You can do this by overriding the `onSyncedDataUpdated()` method in your `VxBody` class. This method is a hook that fires on the client *after* a value has been updated.

```java
// Inside CrateRigidBody.java

@Override
@Environment(EnvType.CLIENT) // This is a client-side only method
public void onSyncedDataUpdated(VxDataAccessor<?> accessor) {
    // Check if the accessor that was updated is the one we care about.
    if (accessor.equals(DATA_COLOR_ORDINAL)) {
        
        // The color has changed! Let's play a sound effect.
        Minecraft mc = Minecraft.getInstance();
        if (mc.player != null) {
            mc.getSoundManager().play(
                SimpleSoundInstance.forUI(SoundEvents.BARREL_CLOSE, 1.0F)
            );
        }
    }
}
```

## Persistence and Synchronized Data

**Important:** Synchronized data is for networking, **not** for saving to disk. It is not automatically persisted when a chunk is saved.

If a piece of synchronized data is essential for recreating your body when it's loaded from the world save, you must manually save and load it in the persistence methods.

```java
// Inside CrateRigidBody.java

@Override
public void writePersistenceData(VxByteBuf buf) {
    // Manually write the color ordinal to the persistence buffer.
    buf.writeVarInt(this.getSyncData(DATA_COLOR_ORDINAL));
}

@Override
public void readPersistenceData(VxByteBuf buf) {
    // Read the color ordinal and set it. This will NOT trigger a network sync,
    // as the body is still being loaded and is not yet tracked by any clients.
    this.setSyncData(DATA_COLOR_ORDINAL, buf.readVarInt());
}
```