# 01 - Introduction to the Vortex Physics API

## What is Vortex Physics?

Vortex Physics is not just a tool or library, but a full mod that directly integrates real physics into Minecraft. It enables realistic movement, collisions, and interactions far beyond Minecraft’s default mechanics.

The main goal of Vortex Physics is to give modders direct access to the powerful [Jolt Physics Engine](https://github.com/jrouwe/JoltPhysics), allowing them to create better and faster physics effects in their mods.

## Thank You

Connecting Jolt’s fast physics engine with Minecraft’s Java system is no easy task. This is made possible thanks to the excellent work of **[jolt-jni](https://github.com/stephengold/jolt-jni)** by [Stephen Gold](https://github.com/stephengold), which acts as a bridge between Minecraft’s Java code and Jolt’s native code.

Without this foundation, Vortex Physics wouldn’t be possible — big thanks for that!

## Important: JNI Knowledge Required

To use Vortex Physics effectively, you need at least a basic understanding of the **Jolt JNI API**. This JNI layer is the crucial bridge connecting Minecraft’s Java code with the native Jolt physics engine. Without some familiarity with Jolt JNI, working with Vortex Physics will be much harder.

You can find the Jolt JNI API documentation here:  
https://stephengold.github.io/jolt-jni-docs/jolt-jni-en/English/overview.html

## What is this document for?

This guide is aimed at developers who want to use Vortex Physics. It will take you step-by-step from setup to advanced usage, explaining the key parts of the physics system.

## What’s next?

Next, we will look at the basic concepts behind how Vortex Physics works. Understanding these will help you use the API better.
