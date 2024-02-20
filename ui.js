import { SCREEN_HEIGHT, SCREEN_WIDTH, Chip8 } from "./chip8.js";

const $ = document.querySelector.bind(document);

const dom = {
  volume: $("#volume"),
  size: $("#size"),
  game: $("#game"),
  rom: $("#rom"),
};

const keyCodeToButton = {
  Digit1: 0x1,
  Digit2: 0x2,
  Digit3: 0x3,
  Digit4: 0xC,
  KeyQ: 0x4,
  KeyW: 0x5,
  KeyE: 0x6,
  KeyR: 0xD,
  KeyA: 0x7,
  KeyS: 0x8,
  KeyD: 0x9,
  KeyF: 0xE,
  KeyZ: 0xA,
  KeyX: 0x0,
  KeyC: 0xB,
  KeyV: 0xF,
};

const AudioContext = window.AudioContext || window.webkitAudioContext;

function beep() {
  const audioContext = new AudioContext();
  const gain = audioContext.createGain();

  const oscillator = audioContext.createOscillator();
  oscillator.type = "square";

  gain.connect(audioContext.destination);
  oscillator.connect(gain);

  return () => {
    gain.gain.value = Number(dom.volume.value) * 0.01;

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 50 * 0.001);
  }
}

let scale;
let gameWidth;
let gameHeight;

function resize() {
  scale = dom.size.value;
  gameWidth = SCREEN_WIDTH * scale;
  gameHeight = SCREEN_HEIGHT * scale;

  dom.game.width = gameWidth;
  dom.game.height = gameHeight;
}

dom.size.addEventListener("change", resize);
document.addEventListener("DOMContentLoaded", resize);

const chip8 = new Chip8();

dom.rom.addEventListener("change", async() => {
  const rom = dom.rom.files[0];
  const buffer = await rom.arrayBuffer();
  const uint8Buffer = new Uint8Array(buffer);

  chip8.reset()
  chip8.load(uint8Buffer);

  const ctx = dom.game.getContext("2d");

  function draw() {
    ctx.clearRect(0, 0, gameWidth, gameHeight);
    const screen = chip8.screen()

    for (let i = 0; i < screen.length; i++) {
      const pixel = screen[i];
      if (pixel) {
        const x = Math.floor(i % SCREEN_WIDTH);
        const y = Math.floor(i / SCREEN_WIDTH);
        ctx.fillRect(x * scale, y * scale, scale, scale)
      }
    }
  }

  function loop() {
    for (let i = 0; i < 10; i++) {
      chip8.tick()
    }
    chip8.tickTimers(beep());

    draw();
    window.requestAnimationFrame(loop);
  }

  dom.game.addEventListener("keydown", (e) => {
    const button = keyCodeToButton[e.code];
    if (button !== undefined) {
      chip8.keypress(button, true);
    }
  });

  dom.game.addEventListener("keyup", (e) => {
    const button = keyCodeToButton[e.code];
    if (button !== undefined) {
      chip8.keypress(button, false);
    }
  });

  window.requestAnimationFrame(loop);
});
