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

  #fetch() {
    const high = this.#ram[this.#pc];
    const low = this.#ram[this.#pc + 1];
    const op = (high << 8) | low;

    this.#pc += 2;
    return op;
  }
}

const SCALE = 5;
const GAME_WIDTH = SCREEN_WIDTH * SCALE;
const GAME_HEIGHT = SCREEN_HEIGHT * SCALE;

const $game = document.getElementById("game");
$game.width = GAME_WIDTH;
$game.height = GAME_HEIGHT;
