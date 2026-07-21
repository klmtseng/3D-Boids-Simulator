# 3D Boids Flocking Simulator

An interactive 3D simulation of Craig Reynolds' Boids flocking algorithm, rendered on a 2D canvas through a custom perspective-projection camera. Written in TypeScript with no runtime dependencies.

## Features

- Classic boids steering behaviors: separation, alignment, and cohesion, each adjustable with sliders
- Live controls for boid count (up to 500), perception radius, and wind strength
- Wind system with manual azimuth/elevation control or automatic drifting wind, plus an optional wind-vector overlay
- Chase mode and mouse-based repel interaction
- Optional 3D grid overlay for depth reference

## Run locally

Prerequisite: Node.js

1. Install dependencies: `npm install`
2. Start the dev server: `npm run dev`
