# Screenshot credits

These images are browser screenshots of a local showcase player, using the extension's unchanged `content.js`, `content.css`, `core.js`, `renderer.js` and `i18n.js`. The demo supplies a small local settings adapter in place of the Chrome extension storage API. It is not the YouTube website, and it does not prove live YouTube compatibility.

Original film frames remain centered. Modifications consist of reflected edge pixels, progressively blurred background, background brightness, and showcase text overlays. No AI imagery, image retouching, or changes to the renderer are involved. Creators do not endorse this extension.

| Image | Film | Attribution | Frame |
| --- | --- | --- | --- |
| 01-big-buck-bunny.jpg | Big Buck Bunny | © copyright 2008 Blender Foundation · [peach.blender.org](https://peach.blender.org/) | approximately 01:05 |
| 02-sintel.jpg | Sintel | © copyright Blender Foundation · [durian.blender.org](https://durian.blender.org/) | approximately 01:30 |
| 03-tears-of-steel.jpg | Tears of Steel | © copyright Blender Foundation · [mango.blender.org](https://mango.blender.org/) | approximately 01:50 |
| 04-background-off.jpg | Big Buck Bunny | Same attribution as image 01 | Same paused frame as image 01 |

Film imagery: [Creative Commons Attribution 3.0](https://creativecommons.org/licenses/by/3.0/). Keep this credit document and the visible credit overlays with redistributed promotional images. The project's MIT license covers extension code, not the third-party film imagery.

Primary film license information: [Big Buck Bunny](https://peach.blender.org/about/), [Sintel](https://durian.blender.org/sharing/), [Tears of Steel](https://mango.blender.org/about/).

The demo streams the progressive MP4 URLs from [Google's sample media catalog](https://storage.googleapis.com/cpe-sample-media/content.json), as linked by the [official Cast tutorial](https://developers.google.com/cast/codelabs/cast-receiver). Film files are not bundled in this repository or extension ZIP. Screenshot dimensions: 1280 × 720.

To reproduce, serve the repository as a static site and open `docs/showcase.html`. Select a film, wait for Ready, then choose Capture view. Escape returns to the controls. Background on / off preserves the paused frame for comparison.
