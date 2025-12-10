# Velthoric Synchronized Data

While Velthoric automatically synchronizes the essential physics state of a body, such as position, rotation, and velocity, you often need to share custom data between the server and clients. This could be a vehicle's current gear, the team color of an object, or a visual effect triggered by a player.

Velthoric provides a robust system for this which now supports **Authority Management**. This means you explicitly define who owns the data, the Server or the Client.

## The Concept of Authority

The biggest feature of the new system is the separation of authority. You must decide who controls a specific piece of data.

**Server Authority via VxServerAccessor**
Only the Server can change this data. Updates flow from the Server to the Client. This is used for game state, health, team colors, or inventory contents. If a client tries to change this, the system will block it and log a warning.

**Client Authority via VxClientAccessor**
The Client, or the player, changes this data. Updates flow from the Client to the Server, and the Server then replicates it to other Clients. This is used for user inputs, cosmetic toggles, or strictly client-side visual states that need to be seen by others.

## Step-by-Step Implementation

Let's upgrade our `CrateRigidBody`. We want to add a color that the Server decides and a "glowing" effect that the Client decides.

### Step 1 Define the Accessors

Define your accessors as `public static final` fields in your body class. You use specific factory methods to create them based on the authority you need.

```java
public class CrateRigidBody extends VxRigidBody {

    public enum CrateColor {
        BROWN, GRAY, DARK_OAK
    }

    // Server Authority: Only the server sets the color.
    // We sync the Enum ordinal as an Integer.
    public static final VxServerAccessor<Integer> DATA_COLOR = VxServerAccessor.create(
        CrateRigidBody.class,       // The body class
        VxDataSerializers.INTEGER   // The data serializer
    );

    // Client Authority: The client can toggle this glow effect.
    public static final VxClientAccessor<Boolean> DATA_GLOWING = VxClientAccessor.create(
        CrateRigidBody.class,
        VxDataSerializers.BOOLEAN
    );

    // ... constructors ...
}
```

### Step 2 Register with Default Values

In your `defineSyncData` method, register both accessors. This sets the initial state for the body when it spawns.

```java
@Override
protected void defineSyncData(VxSynchronizedData.Builder builder) {
    // Define initial values
    builder.define(DATA_COLOR, CrateColor.BROWN.ordinal());
    builder.define(DATA_GLOWING, false);
}
```

### Step 3 Getters and Setters

This is where the new API enforces safety. You use `setServerData` for server-authoritative keys and `setClientData` for client-authoritative keys. Note that reading data works the same way on both sides using `get()`.

```java
// --- Color Logic (Server Authoritative)

/**
 * Sets the crate color. 
 * Throws an exception if called on the Client.
 */
public void setColor(CrateColor color) {
    this.setServerData(DATA_COLOR, color.ordinal());
}

public CrateColor getColor() {
    int ordinal = this.get(DATA_COLOR);
    // Safety check for array bounds is always good practice
    if (ordinal >= 0 && ordinal < CrateColor.values().length) {
        return CrateColor.values()[ordinal];
    }
    return CrateColor.BROWN;
}

// --- Glowing Logic (Client Authoritative)

/**
 * Toggles the glow.
 * Throws an exception if called on the Server.
 */
public void setGlowing(boolean glowing) {
    this.setClientData(DATA_GLOWING, glowing);
}

public boolean isGlowing() {
    return this.get(DATA_GLOWING);
}
```

### Step 4 Reacting to Changes

When data changes, whether it arrived from the server or was sent by a client, you often want to trigger an event immediately. This could be playing a sound or spawning particles.

Override the appropriate overloaded `onSyncedDataUpdated` method to catch these updates:

*   **`onSyncedDataUpdated(VxServerAccessor<?> accessor)`:** For Server-authoritative data updates.
*   **`onSyncedDataUpdated(VxClientAccessor<?> accessor)`:** For Client-authoritative data updates.

```java
// Example: Handling Server-Authoritative Data Changes
@Override
public void onSyncedDataUpdated(VxServerAccessor<?> accessor) {
    // Handle Color Change (assuming DATA_COLOR is a VxServerAccessor)
    if (accessor.equals(DATA_COLOR)) {
        // Maybe play a paint sound?
    }
}

// Example: Handling Client-Authoritative Data Changes
@Override
public void onSyncedDataUpdated(VxClientAccessor<?> accessor) {
    // Handle Glow Change (assuming DATA_GLOWING is a VxClientAccessor)
    if (accessor.equals(DATA_GLOWING)) {
        if (isGlowing()) {
             // Spawn some magical particles at the body's position
             this.spawnGlowParticles();
        }
    }
}
```

## Persistence and Saving to Disk

It is important to remember that **Synchronized Data is for networking only**. It does not automatically save to the hard drive.

If you restart the server, the `VxSynchronizedData` will reset to the defaults defined in `defineSyncData`. If you want the Color state to persist across restarts, you must manually write it in the persistence methods.

```java
@Override
public void writePersistenceData(VxByteBuf buf) {
    // Save the current state to disk
    buf.writeVarInt(this.get(DATA_COLOR));
}

@Override
public void readPersistenceData(VxByteBuf buf) {
    // Load state from disk
    int colorOrdinal = buf.readVarInt();
    this.setServerData(DATA_COLOR, colorOrdinal);
}
```

### Available Serializers

`VxDataSerializers` contains most types you will need.

*   **Primitives** `BYTE`, `INTEGER`, `FLOAT`, `BOOLEAN`
*   **Text** `STRING`
*   **Identification** `UUID`
*   **Math** `VEC3` (Jolt), `RVEC3` (Render), `QUAT`, `FLOAT3`, `COLOR`
*   **Collections** `WHEEL_SETTINGS_LIST` (for vehicles)