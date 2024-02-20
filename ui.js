import { SCREEN_HEIGHT, SCREEN_WIDTH, Chip8 } from "./chip8.js";

const $ = document.querySelector.bind(document);

const dom = {
  volume: $("#volume"),
  size: $("#size"),
  game: $("#game"),
  rom: $("#rom"),
};

function keyCodeToButton(keyCode) {
  switch (keyCode) {
    case "Digit1": return 0x1;
    case "Digit2": return 0x2;
    case "Digit3": return 0x3;
    case "Digit4": return 0xC;
    case "KeyQ": return 0x4;
    case "KeyW": return 0x5;
    case "KeyE": return 0x6;
    case "KeyR": return 0xD;
    case "KeyA": return 0x7;
    case "KeyS": return 0x8;
    case "KeyD": return 0x9;
    case "KeyF": return 0xE;
    case "KeyZ": return 0xA;
    case "KeyX": return 0x0;
    case "KeyC": return 0xB;
    case "KeyV": return 0xF;
    default: return undefined;
  }
}

function beep() {
  return () => {
    const AudioContext = window.AudioContext || window.webkitAutioContext;
    const audioContext = new AudioContext();

    const gain = audioContext.createGain();
    const volume = dom.volume.value;
    gain.connect(audioContext.destination);
    gain.gain.value = volume * 0.01;

    const oscillator = audioContext.createOscillator();
    oscillator.type = "square";

    oscillator.connect(gain);
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
    const button = keyCodeToButton(e.code);
    if (button !== undefined) {
      chip8.keypress(button, true);
    }
  });

  dom.game.addEventListener("keyup", (e) => {
    const button = keyCodeToButton(e.code);
    if (button !== undefined) {
      chip8.keypress(button, false);
    }
  });

  window.requestAnimationFrame(loop);
});
