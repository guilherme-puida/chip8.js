const SCREEN_WIDTH = 64;
const SCREEN_HEIGHT = 32;

const RAM_SIZE = 4096;
const NUM_REGS = 16;
const NUM_KEYS = 16;
const STACK_SIZE = 16;

const START_ADDRESS = 0x200;

const FONTSET = [
  0xF0, 0x90, 0x90, 0x90, 0xF0, // 0
  0x20, 0x60, 0x20, 0x20, 0x70, // 1
  0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
  0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
  0x90, 0x90, 0xF0, 0x10, 0x10, // 4
  0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
  0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
  0xF0, 0x10, 0x20, 0x40, 0x40, // 7
  0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
  0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
  0xF0, 0x90, 0xF0, 0x90, 0x90, // A
  0xE0, 0x90, 0xE0, 0x90, 0xE0, // B
  0xF0, 0x80, 0x80, 0x80, 0xF0, // C
  0xE0, 0x90, 0x90, 0x90, 0xE0, // D
  0xF0, 0x80, 0xF0, 0x80, 0xF0, // E
  0xF0, 0x80, 0xF0, 0x80, 0x80, // F
];

class Chip8 {
  #pc;
  #ireg;
  #ram;
  #vreg;
  #screen;
  #keys;
  #stack;
  #sp;
  #dt;
  #st;

  constructor() {
    this.reset();
  }

  reset() {
    this.#pc = START_ADDRESS;
    this.#ireg = 0;

    this.#ram = new Uint8Array(RAM_SIZE);
    this.#vreg = new Uint8Array(NUM_REGS);

    this.#screen = new Array(SCREEN_WIDTH * SCREEN_HEIGHT).fill(false);
    this.#keys = new Array(NUM_KEYS).fill(false);

    this.#stack = new Uint16Array(STACK_SIZE);
    this.#sp = 0;

    this.#dt = 0;
    this.#st = 0;

    for (let i = 0; i < FONTSET.length; i++) {
      this.#ram[i] = FONTSET[i];
    }
  }

  tick() {
    const op = this.#fetch();
    this.#execute(op);
  }

  tickTimers() {
    if (this.#dt > 0) {
      this.#dt--;
    }

    if (this.#st > 0) {
      if (this.#st === 1) {
        // TODO: beep here
      }

      this.#st--;
    }
  }

  load(data) {
    for (let i = 0; i < data.length; i++) {
      this.#ram[START_ADDRESS + i] = data[i];
    }
  }

  #fetch() {
    const high = this.#ram[this.#pc];
    const low = this.#ram[this.#pc + 1];
    const op = (high << 8) | low;

    this.#pc += 2;
    return op;
  }

  #execute(op) {
    const d1 = (op & 0xF000) >>> 12;
    const d2 = (op & 0x0F00) >>> 8;
    const d3 = (op & 0x00F0) >>> 4;
    const d4 = (op & 0x000F);

    // 0000: NOP
    if (d1 === 0 && d2 === 0 && d3 === 0 && d4 === 0) {
      return;
    }

    throw new Error(`Uninplemented opcode ${op} (${d1} ${d2} ${d3} ${d4})`)
  }
}

const SCALE = 5;
const GAME_WIDTH = SCREEN_WIDTH * SCALE;
const GAME_HEIGHT = SCREEN_HEIGHT * SCALE;

const $game = document.getElementById("game");
$game.width = GAME_WIDTH;
$game.height = GAME_HEIGHT;

const $rom = document.getElementById("rom");
$rom.addEventListener("change", async() => {
  const rom = $rom.files[0];
  const buffer = await rom.arrayBuffer();
  const uint8Buffer = new Uint8Array(buffer);

  const chip8 = new Chip8();
  chip8.load(uint8Buffer);

  function loop() {
    chip8.tick();
    window.requestAnimationFrame(loop);
  }

  window.requestAnimationFrame(loop);
});
