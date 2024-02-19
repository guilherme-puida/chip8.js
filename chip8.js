function mod(n, m) {
  return ((n % m) + m) % m;
}

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

  screen() {
    return this.#screen.slice();
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

    // 00E0: CLEAR SCREEN
    if (d1 === 0 && d2 === 0 && d3 === 0xE && d4 === 0) {
      this.#screen = new Array(SCREEN_WIDTH * SCREEN_HEIGHT).fill(false);
      return;
    }

    // 00EE: RETURN
    if (d1 === 0 && d2 === 0 && d3 === 0xE && d4 === 0xE) {
      this.#pc = this.#pop();
      return;
    }

    // 1NNN: JUMP
    if (d1 === 1) {
      const nnn = op & 0xFFF;
      this.#pc = nnn;
      return;
    }

    // 2NNN: CALL
    if (d1 === 2) {
      const nnn = op & 0xFFF;
      this.#push(this.#pc);
      this.#pc = nnn;
      return;
    }

    // 3XNN: SKIP VX == NN
    if (d1 === 3) {
      const nn = op & 0xFF;
      if (this.#vreg[d2] === nn) {
        this.#pc += 2;
      }
      return;
    }

    // 4XNN: SKIP VX != NN
    if (d1 === 4) {
      const nn = op & 0xFF;
      if (this.#vreg[d2] !== nn) {
        this.#pc += 2;
      }
      return;
    }

    // 5XY0: SKIP VX == VY
    if (d1 === 5 && d4 === 0) {
      if (this.#vreg[d2] === this.#vreg[d3]) {
        this.#pc += 2;
      }
      return;
    }

    // 6XNN: VX = NN
    if (d1 === 6) {
      const nn = (op & 0xFF);
      this.#vreg[d2] = nn;
      return;
    }

    // 7XNN: VX += NN
    if (d1 === 7) {
      const nn = op & 0xFF;
      this.#vreg[d2] = mod(this.#vreg[d2] + nn, 256);
      return;
    }

    // 8XY0: VX = VY
    if (d1 === 8 && d4 === 0) {
      this.#vreg[d2] = this.#vreg[d3];
      return;
    }

    // 8XY1: VX |= VY
    if (d1 === 8 && d4 === 1) {
      this.#vreg[d2] |= this.#vreg[d3];
      return;
    }

    // 8XY2: VX &= VY
    if (d1 === 8 && d4 === 2) {
      this.#vreg[d2] &= this.#vreg[d3];
      return;
    }

    // 8XY3: VX ^= VY
    if (d1 === 8 && d4 === 3) {
      this.#vreg[d2] ^= this.#vreg[d3];
      return;
    }

    // 8XY4: VX += VY
    if (d1 === 8 && d4 === 4) {
      const newVx = this.#vreg[d2] + this.#vreg[d3];
      if (newVx > 255) {
        this.#vreg[0xF] = 1;
      }
      this.#vreg[d2] = mod(newVx, 256);
      return;
    }

    // 9XY0: SKIP VX != VY
    if (d1 === 9 && d4 === 0) {
      if (this.#vreg[d2] !== this.#vreg[d3]) {
        this.#pc += 2;
      }
      return;
    }

    // ANNN: I = NNN
    if (d1 === 0xA) {
      const nnn = (op & 0xFFF);
      this.#ireg = nnn;
      return;
    }

    // DXYN: DRAW SPRITE
    if (d1 === 0xD) {
      const xCoord = this.#vreg[d2];
      const yCoord = this.#vreg[d3];
      const numRows = d4;

      let flipped = false;

      for (let yLine = 0; yLine < numRows; yLine++) {
        const address = this.#ireg + yLine;
        const pixels = this.#ram[address];

        for (let xLine = 0; xLine < 8; xLine++) {
          if ((pixels & (0b1000_0000 >>> xLine)) !== 0) {
            const x = (xCoord + xLine) % SCREEN_WIDTH;
            const y = (yCoord + yLine) % SCREEN_HEIGHT;
            const i = x + SCREEN_WIDTH * y;

            flipped = Boolean(flipped | this.#screen[i]);
            this.#screen[i] = Boolean(this.#screen[i] ^ true);
          }
        }
      }

      if (flipped) {
        this.#vreg[0xF] = 1;
      } else {
        this.#vreg[0xF] = 0;
      }

      return;
    }

    const ds = [d1, d2, d3, d4].map((x) => x.toString(16));
    throw new Error(`Uninplemented opcode ${op} (${ds})`)
  }

  #push(value) {
    this.#stack[this.#sp] = value;
    this.#sp++;
  }

  #pop() {
    this.#sp--;
    return this.#stack[this.#sp];
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

  const ctx = $game.getContext("2d");

  function draw() {
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    const screen = chip8.screen()

    for (let i = 0; i < screen.length; i++) {
      const pixel = screen[i];
      if (pixel) {
        const x = i % SCREEN_WIDTH;
        const y = i / SCREEN_WIDTH;
        ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE)
      }
    }
  }

  function loop() {
    chip8.tick();
    draw();
    window.requestAnimationFrame(loop);
  }

  window.requestAnimationFrame(loop);
});
