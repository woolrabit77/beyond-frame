(function (api) {
  'use strict';
  const vertex = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main() { v_uv = (a_position + 1.0) * 0.5; gl_Position = vec4(a_position, 0.0, 1.0); }
  `;
  const blurFragment = `
    precision mediump float;
    varying vec2 v_uv;
    uniform sampler2D u_image;
    uniform vec2 u_step;
    void main() {
      vec3 c = texture2D(u_image, v_uv).rgb * 0.227027;
      c += texture2D(u_image, v_uv + u_step * 1.384615).rgb * 0.316216;
      c += texture2D(u_image, v_uv - u_step * 1.384615).rgb * 0.316216;
      c += texture2D(u_image, v_uv + u_step * 3.230769).rgb * 0.070270;
      c += texture2D(u_image, v_uv - u_step * 3.230769).rgb * 0.070270;
      gl_FragColor = vec4(c, 1.0);
    }
  `;
  const composeFragment = `
    precision highp float;
    varying vec2 v_uv;
    uniform sampler2D u_image;
    uniform sampler2D u_blurred;
    uniform vec4 u_rect;
    uniform vec2 u_guard;
    uniform float u_brightness;
    float extend(float p) {
      // Reflect one edge strip at 1:1 scale, then hold its final color.
      if (p < 0.0) return min(-p, 0.2);
      if (p > 1.0) return 1.0 - min(p - 1.0, 0.2);
      return p;
    }
    void main() {
      vec2 screen = vec2(v_uv.x, 1.0 - v_uv.y);
      vec2 p = (screen - u_rect.xy) / u_rect.zw;
      // Keep a guard band under the exact CSS hole so upscaling never blends
      // transparent texels into the visible left/right boundary.
      if (p.x >= u_guard.x && p.x <= 1.0 - u_guard.x && p.y >= u_guard.y && p.y <= 1.0 - u_guard.y) discard;
      vec2 distance = max(max(-p, p - 1.0), 0.0);
      float outer = smoothstep(0.0, 0.2, length(distance));
      vec2 q = vec2(extend(p.x), extend(p.y));
      vec3 sharp = texture2D(u_image, q).rgb;
      vec3 soft = texture2D(u_blurred, q).rgb;
      gl_FragColor = vec4(mix(sharp, soft, outer) * mix(1.0, u_brightness, outer), 1.0);
    }
  `;
  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'low-power' });
      if (!this.gl) throw api.failure('errorGpu');
      this.programs = [];
      this.textures = [];
      this.targets = [];
      try { this.initialize(); } catch (error) { this.dispose(); throw error; }
    }
    initialize() {
      const gl = this.gl;
      this.blur = this.program(blurFragment, ['u_image', 'u_step']);
      this.compose = this.program(composeFragment, ['u_image', 'u_blurred', 'u_rect', 'u_guard', 'u_brightness']);
      this.buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      this.source = this.texture();
      this.targets = [this.target(), this.target()];
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);
      gl.clearColor(0, 0, 0, 0);
      this.maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    }
    shader(type, source) {
      const gl = this.gl, shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw api.failure('errorInit', [message]);
      }
      return shader;
    }
    program(fragment, names) {
      const gl = this.gl;
      const vs = this.shader(gl.VERTEX_SHADER, vertex), fs = this.shader(gl.FRAGMENT_SHADER, fragment);
      const value = gl.createProgram();
      gl.attachShader(value, vs); gl.attachShader(value, fs); gl.linkProgram(value);
      gl.deleteShader(vs); gl.deleteShader(fs);
      if (!gl.getProgramParameter(value, gl.LINK_STATUS)) {
        const message = gl.getProgramInfoLog(value); gl.deleteProgram(value);
        throw api.failure('errorLink', [message]);
      }
      this.programs.push(value);
      return { value, position: gl.getAttribLocation(value, 'a_position'), uniforms: Object.fromEntries(names.map(name => [name, gl.getUniformLocation(value, name)])) };
    }
    texture() {
      const gl = this.gl, texture = gl.createTexture();
      this.textures.push(texture);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return texture;
    }
    target() {
      const gl = this.gl, texture = this.texture(), framebuffer = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      return { texture, framebuffer, width: 0, height: 0 };
    }
    resizeTarget(target, width, height) {
      if (target.width === width && target.height === height) return;
      const gl = this.gl;
      gl.bindTexture(gl.TEXTURE_2D, target.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw api.failure('errorBuffer');
      target.width = width; target.height = height;
    }
    use(program) {
      const gl = this.gl;
      gl.useProgram(program.value);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.enableVertexAttribArray(program.position);
      gl.vertexAttribPointer(program.position, 2, gl.FLOAT, false, 0, 0);
    }
    bind(texture, unit) {
      const gl = this.gl;
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
    }
    render(video, rect, viewport, settings, upload = true) {
      const gl = this.gl;
      if (gl.isContextLost()) throw api.failure('errorLost');
      if (video.videoWidth > this.maxTexture || video.videoHeight > this.maxTexture) throw api.failure('errorSize');
      const profile = api.profiles[settings.quality];
      const size = api.outputSize(viewport.width, viewport.height, profile.renderWidth);
      // CSS pixels preserve fractional video edges independently of GPU quality.
      // Backfill one CSS pixel under the video edge: two complementary
      // antialiased clips otherwise reveal the page color as a hairline.
      const underlap = Math.min(1, rect.width / 4, rect.height / 4);
      const left = rect.x + underlap, top = rect.y + underlap;
      const right = rect.x + rect.width - underlap, bottom = rect.y + rect.height - underlap;
      this.canvas.style.clipPath = `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${left}px ${top}px, ${left}px ${bottom}px, ${right}px ${bottom}px, ${right}px ${top}px, ${left}px ${top}px)`;
      if (this.canvas.width !== size.width || this.canvas.height !== size.height) {
        this.canvas.width = size.width; this.canvas.height = size.height;
      }
      this.bind(this.source, 0);
      if (upload || !this.hasSource) {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
        this.hasSource = true;
      }
      const bw = Math.min(profile.blurWidth, video.videoWidth);
      const bh = Math.max(1, Math.round(bw * video.videoHeight / video.videoWidth));
      for (const target of this.targets) this.resizeTarget(target, bw, bh);
      const radius = settings.blur / 100 * 24;
      this.use(this.blur);
      gl.uniform1i(this.blur.uniforms.u_image, 0);
      for (let i = 0; i < 2; i++) {
        const target = this.targets[i];
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
        gl.viewport(0, 0, bw, bh);
        this.bind(i === 0 ? this.source : this.targets[0].texture, 0);
        gl.uniform2f(this.blur.uniforms.u_step, i === 0 ? radius / video.videoWidth : 0, i === 1 ? radius / video.videoHeight : 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, size.width, size.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      this.use(this.compose);
      this.bind(this.source, 0); this.bind(this.targets[1].texture, 1);
      gl.uniform1i(this.compose.uniforms.u_image, 0);
      gl.uniform1i(this.compose.uniforms.u_blurred, 1);
      gl.uniform4f(this.compose.uniforms.u_rect, rect.x / viewport.width, rect.y / viewport.height, rect.width / viewport.width, rect.height / viewport.height);
      gl.uniform2f(this.compose.uniforms.u_guard, 2 * viewport.width / size.width / rect.width, 2 * viewport.height / size.height / rect.height);
      gl.uniform1f(this.compose.uniforms.u_brightness, settings.brightness / 100);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    dispose() {
      const gl = this.gl;
      for (const target of this.targets) gl.deleteFramebuffer(target.framebuffer);
      for (const texture of this.textures) gl.deleteTexture(texture);
      for (const program of this.programs) gl.deleteProgram(program);
      if (this.buffer) gl.deleteBuffer(this.buffer);
      const lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    }
  }
  api.Renderer = Renderer;
})(globalThis.YTBackgroundExpand);
