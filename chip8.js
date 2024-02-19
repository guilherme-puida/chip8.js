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

  tickTimers(onBeep) {
    if (this.#dt > 0) {
      this.#dt--;
    }

    if (this.#st > 0) {
      if (this.#st === 1) {
        onBeep();
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

  keypress(index, pressed) {
    this.#keys[index] = pressed;
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
      const newVf = newVx > 255 ? 1 : 0;
      this.#vreg[d2] = mod(newVx, 256);
      this.#vreg[0xF] = newVf;
      return;
    }

    // 8XY5: VX -= VY
    if (d1 === 8 && d4 === 5) {
      const newVx = this.#vreg[d2] - this.#vreg[d3];
      const newVf = newVx < 0 ? 0 : 1;
      this.#vreg[d2] = mod(newVx, 256);
      this.#vreg[0xF] = newVf;
      return;
    }

    // 8XY6: VX = VY >> 1
    if (d1 === 8 && d4 === 6) {
      const lsb = this.#vreg[d2] & 1;
      this.#vreg[d2] = this.#vreg[d3] >>> 1;
      this.#vreg[0xF] = lsb;
      return;
    }

    // 8XY7: VX =- VY
    if (d1 === 8 && d4 === 7) {
      const newVx = this.#vreg[d3] - this.#vreg[d2];
      const newVf = newVx < 0 ? 0 : 1;
      this.#vreg[d2] = mod(newVx, 256);
      this.#vreg[0xF] = newVf;
      return;
    }

    // 8XYE: VX = VY << 1
    if (d1 === 8 && d4 === 0XE) {
      const msb = (this.#vreg[d2] >>> 7) & 1;
      this.#vreg[d2] = this.#vreg[d3] << 1;
      this.#vreg[0xF] = msb;
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

    // BNNN: JUMP NNN + V0
    if (d1 === 0xB) {
      const nnn = op & 0xFFF;
      this.#pc = this.#vreg[0] + nnn;
      return;
    }

    // CXNN: VX = RAND() & NN
    if (d1 === 0xC) {
      const nn = op & 0xFF;
      // TODO: make this seedable.
      const rand = Math.random() * 256;
      this.#vreg[d2] = rand & nn;
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

    // EX9E: SKIP IF VX PRESSED
    if (d1 === 0xE && d3 === 9 && d4 === 0xE) {
      if (this.#keys[this.#vreg[d2]]) {
        this.#pc += 2;
      }
      return;
    }

    // EXA1: SKIP IF VX NOT PRESSED
    if (d1 === 0xE && d3 === 0xA && d4 === 1) {
      if (!this.#keys[this.#vreg[d2]]) {
        this.#pc += 2;
      }
      return;
    }

    // FX07: VX = DT
    if (d1 === 0xF && d3 === 0 && d4 === 7) {
      this.#vreg[d2] = this.#dt;
      return;
    }

    // FX0A: WAIT FOR KEYPRESS
    if (d1 === 0xF && d3 === 0 && d4 === 0xA) {
      for (let i = 0; i < NUM_KEYS; i++) {
        if (this.#keys[i]) {
          this.#vreg[d2] = i;
          return;
        }
      }
      this.#pc -= 2;
      return;
    }

    // FX15: DT = VX
    if (d1 === 0xF && d3 === 1 && d4 === 5) {
      this.#dt = this.#vreg[d2];
      return;
    }

    // FX18: ST = VX
    if (d1 === 0xF && d3 === 1 && d4 === 8) {
      this.#st = this.#vreg[d2];
      return;
    }

    // FX1E: I += VX
    if (d1 === 0xF && d3 === 1 && d4 === 0xE) {
      const newI = this.#ireg + this.#vreg[d2];
      this.#ireg = mod(newI, 32768);
      return;
    }

    // FX29: SET I TO FONT ADDRESS
    if (d1 === 0xF && d3 === 2 && d4 === 9) {
      this.#ireg = this.#vreg[d2] * 5;
      return;
    }

    // FX33: STORE BCD
    if (d1 === 0xF && d3 === 3 && d4 === 3) {
      const vx = this.#vreg[d2];

      const hundreds = Math.floor(vx / 100);
      const tens = Math.floor((vx / 10) % 10);
      const ones = Math.floor(vx % 10);

      this.#ram[this.#ireg] = hundreds;
      this.#ram[this.#ireg + 1] = tens;
      this.#ram[this.#ireg + 2] = ones;
      return;
    }

    // FX55: STORE V0-VX
    if (d1 === 0xF && d3 === 5 && d4 === 5) {
      for (let i = 0; i <= d2; i++) {
        this.#ram[this.#ireg + i] = this.#vreg[i];
      }
      this.#ireg += d2 + 1;
      return;
    }

    // FX65: LOAD I INTO V0-VX
    if (d1 === 0xF && d3 === 6 && d4 === 5) {
      for (let i = 0; i <= d2; i++) {
        this.#vreg[i] = this.#ram[this.#ireg + i];
      }
      this.#ireg += d2 + 1;
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
  const AudioContext = window.AudioContext || window.webkitAutioContext;
  const audioContext = new AudioContext();
  const oscillator = audioContext.createOscillator();

  const type = 4; // Square wave

  oscillator.type = type;
  oscillator.connect(audioContext.destination);

  oscillator.start();
  setTimeout(() => {
    oscillator.stop();
  }, 100);
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
    for (let i = 0; i < 10; i++) {
      chip8.tick()
    }
    chip8.tickTimers(beep);

    draw();
    window.requestAnimationFrame(loop);
  }

  $game.addEventListener("keydown", (e) => {
    const button = keyCodeToButton(e.code);
    if (button !== undefined) {
      chip8.keypress(button, true);
    }
  });

  $game.addEventListener("keyup", (e) => {
    const button = keyCodeToButton(e.code);
    if (button !== undefined) {
      chip8.keypress(button, false);
    }
  });

  window.requestAnimationFrame(loop);
});
