# 01 - Introduction to the XBullet API

## What is XBullet?

XBullet is a tool that helps you add real physics to Minecraft mods. It lets objects in the game move, collide, and interact in a more realistic way than the normal Minecraft physics.

The main goal of XBullet is to give modders direct access to the powerful [Jolt Physics Engine](https://github.com/jrouwe/JoltPhysics), so you can create better and faster physics effects.

## Thank You

Connecting Jolt’s fast physics engine to Minecraft’s Java system is pretty hard. This is possible thanks to the great work of **[jolt-jni](https://github.com/stephengold/jolt-jni)** by [Stephen Gold](https://github.com/stephengold). It acts as a bridge between Minecraft’s Java code and Jolt’s native code.

We really appreciate this work because it makes XBullet possible.

## Important: JNI Knowledge Required

To use the XBullet API effectively, it’s necessary to have at least a basic understanding of the **Jolt JNI API**. This JNI layer is the crucial bridge that connects Minecraft’s Java code with the native Jolt physics engine. Without some familiarity with Jolt JNI’s concepts and usage, working with XBullet will be much harder.

You can find the Jolt JNI API docs here:  
https://stephengold.github.io/jolt-jni-docs/jolt-jni-en/English/overview.html

## What is this document for?

This guide is for developers who want to use XBullet. It will take you step-by-step from setting up to advanced use, explaining the important parts of the physics system.

## What’s next?

Next, we will look at the basic ideas behind how XBullet works. Knowing these will help you use the API better.
