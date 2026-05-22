# CueForge Setup Journey Director Script

## Working Title

Panda Soundwalk

## Purpose

This is the first-run setup experience for CueForge. It should feel calm, premium, slightly mysterious, and personal. The player is not watching a random intro. They are becoming the tuned version of themselves before entering the app.

The setup page should guide the player through:

- gear profile
- device detection
- first calibration direction
- final handoff into CueForge

No sci-fi spaceship look. No generic neon tunnel. The world should feel natural, realistic, and audio-aware.

## Core Scene

A realistic panda walks through a misty bamboo forest at night. The camera feels like the player is moving with the panda, almost as if the player is the panda. The forest reacts subtly to sound: bamboo leaves move in waves, tiny floating ferrofluid-like droplets pulse near the path, and distant low-frequency ripples travel through the air.

The panda eventually reaches a quiet pond. The pond reflects the panda, but the reflection is not identical. The reflection shows a slightly mythic panda with bat-like hearing ears. It should feel natural and beautiful, not scary or cartoonish. The meaning is simple: CueForge helps the player hear more clearly.

## Visual Style

Photorealistic cinematic 3D.

Think:

- real bamboo stalks with wet texture
- soft fog in the forest
- moonlight through leaves
- damp ground, stones, moss, and shallow water
- realistic panda fur with subtle movement
- black ferrofluid droplets that react like audio beads
- pond reflection with gentle ripples
- teal and warm amber accent light, matching CueForge branding

Avoid:

- cartoon panda
- anime look
- goofy mascot energy
- cyberpunk overload
- glowing UI everywhere
- horror tone
- overly cute baby animal look
- fake plastic fur

## Shot List

### Shot 1: Opening Breath

Wide shot from low ground level.

The bamboo forest is dark green, wet, and alive. Moonlight cuts through the bamboo. Mist moves slowly. The sound is quiet: soft wind, leaves, distant low bass.

Camera begins behind the panda, close enough to feel personal but not cramped.

### Shot 2: Gear Path

The panda walks forward on a narrow mossy path.

Each step creates a tiny ripple of amber light on the ground. Small ferrofluid droplets float near the panda and pulse like low audio waves.

This matches the first setup step: gear profile.

Feeling: "Tell the app what you are carrying."

### Shot 3: Bamboo Scan

As the player moves to device detection, the camera passes between tall bamboo stalks. The bamboo subtly leans inward, then opens up, like the forest is listening.

Faint teal rings move across the stalks, but they should look like natural reflected light, not hard sci-fi UI.

Feeling: "CueForge is detecting what is connected."

### Shot 4: Calibration Clearing

The path opens into a small clearing. The panda pauses. Ferrofluid droplets gather in the air, forming a soft shape like sound pressure waves.

The droplets stretch and pull toward different directions when sliders are changed:

- footstep focus pulls droplets forward
- comms priority lifts droplets upward
- bass control makes heavier droplets settle lower
- fatigue control smooths the motion

Feeling: "The sound is being shaped around the player."

### Shot 5: Pond Arrival

The panda reaches a still pond. The forest becomes quieter. The camera slows down.

The panda looks into the water. The pond shows the panda reflection first.

Then a ripple passes over the surface and the reflection changes: the panda reflection now has natural bat-like hearing ears. The ears are elegant, organic, and believable. They should read as "enhanced hearing," not monster or costume.

Feeling: "This is the version of you CueForge is helping reveal."

### Shot 6: Final Handoff

The reflection looks back calmly. Soft teal light moves through the water. Bamboo leaves drift past the lens.

The camera gently pushes toward the reflection. The pond reflection becomes the transition into the main CueForge dashboard.

Feeling: "Setup is complete. Enter the app."

## Audio Direction

The sound must be immersive but restrained. It should not blast the user.

Layers:

- soft bamboo wind
- distant low drone around 55-80Hz
- subtle water movement
- light leaf detail around 4-8kHz
- soft stereo movement as camera passes bamboo
- low, rounded pulse when setup step changes
- gentle water ripple when calibration is played
- warm final swell at the pond reveal

Do not use:

- loud jump sounds
- harsh high-frequency chirps
- cartoon music
- generic cinematic trailer hits
- aggressive bass drops

The experience should feel like headphones suddenly matter.

## Text-To-Video Prompt

Photorealistic cinematic 3D scene, a realistic adult panda walking slowly through a misty bamboo forest at night, moonlight through wet bamboo leaves, mossy forest path, damp stones, soft fog, shallow water in the distance, natural teal and warm amber accent light, tiny black ferrofluid droplets floating near the panda and pulsing like audio waves, subtle sound-reactive ripples in the air, premium calm mood, realistic panda fur, realistic bamboo texture, smooth slow camera following behind and beside the panda, cinematic depth of field, high detail, natural motion, no cartoon style, no anime, no horror, no mascot costume, no plastic fur, no neon cyberpunk overload.

The panda reaches a quiet pond. The water is still and reflective. The panda looks down. A gentle ripple moves across the pond and the reflection becomes a mythic but natural panda with elegant bat-like hearing ears, symbolizing enhanced hearing. The reveal is beautiful, calm, and premium, not scary. Bamboo leaves drift across the lens. The pond glow becomes a transition into a modern audio app.

## Negative Prompt

cartoon, anime, childish mascot, horror, monster, aggressive bat creature, scary eyes, plastic fur, fake fur, low detail, blurry, oversaturated neon, cyberpunk city, spaceship, portal, hard sci-fi tunnel, text artifacts, watermark, logo artifacts, distorted panda face, extra limbs, broken ears, human body, goofy expression, comedy, jump scare.

## Short Prompt

Realistic panda soundwalk through a misty bamboo forest at night. Wet bamboo, moss, fog, moonlight, soft teal and amber audio-reactive ferrofluid droplets. The panda reaches a pond and sees a calm reflection of itself with elegant bat-like hearing ears, symbolizing enhanced hearing. Cinematic, premium, natural, beautiful, realistic fur, no cartoon, no horror.

## App Integration Notes

The live app should not autoplay audio. The player clicks `Start soundwalk`, then CueForge starts the local Web Audio bed.

The video or 3D render should sit behind the setup UI. The setup controls stay usable and readable at all sizes.

Best implementation path:

1. Generate or render a 12-20 second seamless loop of the bamboo walk and pond reveal.
2. Export as `webm` and `mp4` fallback.
3. Keep the current Three.js scene as fallback if the video fails or reduced-motion is enabled.
4. Sync setup step changes to audio pulses and subtle overlay states.
5. Keep the final `Enter app` handoff clean and fast.

## Final Feeling

The player should think:

"This does not feel like a settings page. This feels like the app understands why audio matters."
