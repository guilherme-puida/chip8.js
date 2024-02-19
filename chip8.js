const SCREEN_WIDTH = 64;
const SCREEN_HEIGHT = 32;

const RAM_SIZE = 4096;
const NUM_REGS = 16;
const NUM_KEYS = 16;
const STACK_SIZE = 16;

const START_ADDRESS = 0x200;

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
    this.#pc = 0;
    this.#ireg = 0;

    this.#ram = new Uint8Array(RAM_SIZE);
    this.#vreg = new Uint8Array(NUM_REGS);

    this.#screen = new Array(SCREEN_WIDTH * SCREEN_HEIGHT).fill(false);
    this.#keys = new Array(NUM_KEYS).fill(false);

    this.#stack = new Uint16Array(STACK_SIZE);
    this.#sp = 0;

    this.#dt = 0;
    this.#st = 0;
  }
}

const SCALE = 5;
const GAME_WIDTH = SCREEN_WIDTH * SCALE;
const GAME_HEIGHT = SCREEN_HEIGHT * SCALE;

const $game = document.getElementById("game");
$game.width = GAME_WIDTH;
$game.height = GAME_HEIGHT;
