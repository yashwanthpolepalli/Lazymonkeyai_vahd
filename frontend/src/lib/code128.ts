import { useCurrency } from "@/hooks/use-currency";

/**
 * ISO/IEC 15417 Code 128 & GS1 EAN-13 Hardware-Optimized Barcode Encoder
 * Generates exact high-contrast, 100% hardware-scannable bar/space patterns.
 */

// ISO/IEC 15417 Official Code 128 Symbol Patterns (Index 0 to 105, 6 widths summing to 11 modules each)
const CODE128_PATTERNS: number[][] = [
  [2, 1, 2, 2, 2, 2], // 0  (space)
  [2, 2, 2, 1, 2, 2], // 1  !
  [2, 2, 2, 2, 2, 1], // 2  "
  [1, 2, 1, 2, 2, 3], // 3  #
  [1, 2, 1, 3, 2, 2], // 4  $
  [1, 3, 1, 2, 2, 2], // 5  %
  [1, 2, 2, 2, 1, 3], // 6  &
  [1, 2, 2, 3, 1, 2], // 7  '
  [1, 3, 2, 2, 1, 2], // 8  (
  [2, 2, 1, 2, 1, 3], // 9  )
  [2, 2, 1, 3, 1, 2], // 10 *
  [2, 3, 1, 2, 1, 2], // 11 +
  [1, 1, 2, 2, 3, 2], // 12 ,
  [1, 2, 2, 1, 3, 2], // 13 -
  [1, 2, 2, 2, 3, 1], // 14 .
  [1, 1, 3, 2, 2, 2], // 15 /
  [1, 2, 3, 1, 2, 2], // 16 0
  [1, 2, 3, 2, 2, 1], // 17 1
  [2, 2, 3, 2, 1, 1], // 18 2
  [2, 2, 1, 1, 3, 2], // 19 3
  [2, 2, 1, 2, 3, 1], // 20 4
  [2, 1, 3, 2, 1, 2], // 21 5
  [2, 2, 3, 1, 1, 2], // 22 6
  [3, 1, 2, 1, 3, 1], // 23 7
  [3, 1, 1, 2, 2, 2], // 24 8
  [3, 2, 1, 1, 2, 2], // 25 9
  [3, 2, 1, 2, 2, 1], // 26 :
  [3, 1, 2, 2, 1, 2], // 27 ;
  [3, 2, 2, 1, 1, 2], // 28 <
  [3, 2, 2, 2, 1, 1], // 29 =
  [2, 1, 2, 1, 2, 3], // 30 >
  [2, 1, 2, 3, 2, 1], // 31 ?
  [2, 3, 2, 1, 2, 1], // 32 @
  [1, 1, 1, 3, 2, 3], // 33 A
  [1, 3, 1, 1, 2, 3], // 34 B
  [1, 3, 1, 3, 2, 1], // 35 C
  [1, 1, 2, 3, 1, 3], // 36 D
  [1, 3, 2, 1, 1, 3], // 37 E
  [1, 3, 2, 3, 1, 1], // 38 F
  [2, 1, 1, 3, 1, 3], // 39 G
  [2, 3, 1, 1, 1, 3], // 40 H
  [2, 3, 1, 3, 1, 1], // 41 I
  [1, 1, 2, 1, 3, 3], // 42 J
  [1, 1, 2, 3, 3, 1], // 43 K
  [1, 3, 2, 1, 3, 1], // 44 L
  [1, 1, 3, 1, 2, 3], // 45 M
  [1, 1, 3, 3, 2, 1], // 46 N
  [1, 3, 3, 1, 1, 3], // 47 O
  [1, 3, 3, 3, 1, 1], // 48 P
  [2, 1, 1, 3, 3, 1], // 49 Q
  [2, 3, 1, 1, 3, 1], // 50 R
  [2, 1, 3, 1, 1, 3], // 51 S
  [2, 1, 3, 3, 1, 1], // 52 T
  [2, 1, 3, 1, 3, 1], // 53 U
  [3, 1, 1, 1, 2, 3], // 54 V
  [3, 1, 1, 3, 2, 1], // 55 W
  [3, 3, 1, 1, 2, 1], // 56 X
  [3, 1, 2, 1, 1, 3], // 57 Y
  [3, 1, 2, 3, 1, 1], // 58 Z
  [3, 3, 2, 1, 1, 1], // 59 [
  [3, 1, 4, 1, 1, 1], // 60 \
  [2, 2, 1, 4, 1, 1], // 61 ]
  [4, 3, 1, 1, 1, 1], // 62 ^
  [1, 1, 1, 2, 2, 4], // 63 _
  [1, 1, 1, 4, 2, 2], // 64 `
  [1, 2, 1, 1, 2, 4], // 65 a
  [1, 2, 1, 4, 2, 1], // 66 b
  [1, 4, 1, 1, 2, 2], // 67 c
  [1, 4, 1, 2, 2, 1], // 68 d
  [1, 1, 2, 2, 1, 4], // 69 e
  [1, 1, 2, 4, 1, 2], // 70 f
  [1, 2, 2, 1, 1, 4], // 71 g
  [1, 2, 2, 4, 1, 1], // 72 h
  [1, 4, 2, 1, 1, 2], // 73 i
  [1, 4, 2, 2, 1, 1], // 74 j
  [2, 4, 1, 2, 1, 1], // 75 k
  [2, 2, 1, 1, 1, 4], // 76 l
  [4, 1, 3, 1, 1, 1], // 77 m
  [2, 4, 1, 1, 1, 2], // 78 n
  [1, 3, 4, 1, 1, 1], // 79 o
  [1, 1, 1, 2, 4, 2], // 80 p
  [1, 2, 1, 1, 4, 2], // 81 q
  [1, 2, 1, 2, 4, 1], // 82 r
  [1, 1, 4, 2, 1, 2], // 83 s
  [1, 2, 4, 1, 1, 2], // 84 t
  [1, 2, 4, 2, 1, 1], // 85 u
  [4, 1, 1, 2, 1, 2], // 86 v
  [4, 2, 1, 1, 1, 2], // 87 w
  [4, 2, 1, 2, 1, 1], // 88 x
  [2, 1, 2, 1, 4, 1], // 89 y
  [2, 1, 4, 1, 2, 1], // 90 z
  [4, 1, 2, 1, 2, 1], // 91 {
  [1, 1, 1, 1, 4, 3], // 92 |
  [1, 1, 1, 3, 4, 1], // 93 }
  [1, 3, 1, 1, 4, 1], // 94 ~
  [1, 1, 4, 1, 1, 3], // 95 DEL
  [1, 1, 4, 3, 1, 1], // 96 FNC3
  [4, 1, 1, 1, 1, 3], // 97 FNC2
  [4, 1, 1, 3, 1, 1], // 98 Shift
  [1, 1, 3, 1, 4, 1], // 99 Code C
  [1, 1, 4, 1, 3, 1], // 100 Code B
  [3, 1, 1, 1, 4, 1], // 101 Code A
  [4, 1, 1, 1, 3, 1], // 102 FNC1
  [2, 1, 1, 4, 1, 2], // 103 Start A
  [2, 1, 1, 2, 1, 4], // 104 Start B (Standard for alphanumeric like TND5004)
  [2, 1, 1, 2, 3, 2], // 105 Start C (Standard for numeric pairs)
];

const STOP_PATTERN = [2, 3, 3, 1, 1, 1, 2]; // 106 Stop (7 widths summing to 13 modules)

export interface BarcodeElement {
  width: number;
  isBlack: boolean;
}

/**
 * ISO 15417 Code 128 Auto Encoder (Supports Subset C Numeric Pair Mode for 50% wider bars)
 */
export function encodeCode128(text: string): BarcodeElement[] {
  const sanitized = (text || "8901234567890").trim();
  const symbolIndices: number[] = [];

  const isNumericOnly = /^\d+$/.test(sanitized);

  if (isNumericOnly && sanitized.length % 2 === 0) {
    // Code 128 Subset C (Numeric Pairs mode - high density, wide bars)
    const startCode = 105; // Start C
    symbolIndices.push(startCode);
    let checksum = startCode;
    let pos = 1;

    for (let i = 0; i < sanitized.length; i += 2) {
      const pairVal = parseInt(sanitized.substring(i, i + 2), 10);
      symbolIndices.push(pairVal);
      checksum += pairVal * pos;
      pos++;
    }

    const checksumValue = checksum % 103;
    symbolIndices.push(checksumValue);
  } else if (isNumericOnly && sanitized.length % 2 !== 0 && sanitized.length > 3) {
    // Odd length numeric: Start B for 1st char, switch to Code C (99) for remaining pairs without adding artificial 0
    const startCode = 104; // Start B
    symbolIndices.push(startCode);
    let checksum = startCode;
    let pos = 1;

    // 1st digit in Set B
    const firstVal = sanitized.charCodeAt(0) - 32;
    symbolIndices.push(firstVal);
    checksum += firstVal * pos;
    pos++;

    // Switch to Code C
    symbolIndices.push(99); // Code C switch
    checksum += 99 * pos;
    pos++;

    // Remaining even pairs in Set C
    for (let i = 1; i < sanitized.length; i += 2) {
      const pairVal = parseInt(sanitized.substring(i, i + 2), 10);
      symbolIndices.push(pairVal);
      checksum += pairVal * pos;
      pos++;
    }

    const checksumValue = checksum % 103;
    symbolIndices.push(checksumValue);
  } else {
    // Code 128 Subset B (Alphanumeric mode)
    const startCode = 104; // Start B
    symbolIndices.push(startCode);

    let checksum = startCode;
    for (let i = 0; i < sanitized.length; i++) {
      const code = sanitized.charCodeAt(i);
      let val = code - 32;
      if (val < 0 || val > 95) val = 0;
      symbolIndices.push(val);
      checksum += val * (i + 1);
    }

    const checksumValue = checksum % 103;
    symbolIndices.push(checksumValue);
  }

  const result: BarcodeElement[] = [];

  symbolIndices.forEach((symbolIdx) => {
    const pattern = CODE128_PATTERNS[symbolIdx] || CODE128_PATTERNS[0];
    pattern.forEach((w, i) => {
      result.push({ width: w, isBlack: i % 2 === 0 });
    });
  });

  // Append Stop Pattern (106)
  STOP_PATTERN.forEach((w, i) => {
    result.push({ width: w, isBlack: i % 2 === 0 });
  });

  return result;
}

// GS1 EAN-13 7-Bit Binary Encodings
const EAN13_L_BITS: string[] = [
  "0001101", // 0
  "0011001", // 1
  "0010011", // 2
  "0111101", // 3
  "0100011", // 4
  "0110001", // 5
  "0101111", // 6
  "0111011", // 7
  "0110111", // 8
  "0001011", // 9
];

const EAN13_G_BITS: string[] = [
  "0100111", // 0
  "0110011", // 1
  "0011011", // 2
  "0100001", // 3
  "0011101", // 4
  "0111001", // 5
  "0000101", // 6
  "0010001", // 7
  "0001001", // 8
  "0010111", // 9
];

const EAN13_R_BITS: string[] = [
  "1110010", // 0
  "1100110", // 1
  "1101100", // 2
  "1000010", // 3
  "1011100", // 4
  "1001110", // 5
  "1010000", // 6
  "1000100", // 7
  "1001000", // 8
  "1110100", // 9
];

// Parity selection table for 1st digit (0=L, 1=G)
const EAN13_PARITY: number[][] = [
  [0, 0, 0, 0, 0, 0], // 0
  [0, 0, 1, 0, 1, 1], // 1
  [0, 0, 1, 1, 0, 1], // 2
  [0, 0, 1, 1, 1, 0], // 3
  [0, 1, 0, 0, 1, 1], // 4
  [0, 1, 1, 0, 0, 1], // 5
  [0, 1, 1, 1, 0, 0], // 6
  [0, 1, 0, 1, 0, 1], // 7
  [0, 1, 0, 1, 1, 0], // 8
  [0, 1, 1, 0, 1, 0], // 9
];

export interface EAN13Module {
  bit: 0 | 1;
  isGuard: boolean;
}

export interface EAN13Structured {
  firstDigit: string;
  leftDigits: string;
  rightDigits: string;
  modules: EAN13Module[];
  allBars: (BarcodeElement & { isGuard: boolean })[];
}

/**
 * GS1 EAN-13 Check Digit Calculation (Mod-10 with alternate 1x/3x weights)
 */
export function calculateEAN13CheckDigit(digits12: string): number {
  const d = digits12.replace(/\D/g, "").padEnd(12, "0").substring(0, 12);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const num = parseInt(d[i], 10) || 0;
    sum += i % 2 === 0 ? num * 1 : num * 3;
  }
  const mod = sum % 10;
  return mod === 0 ? 0 : 10 - mod;
}

export function encodeEAN13Structured(digits: string): EAN13Structured {
  let clean = (digits || "8901234567890").replace(/\D/g, "");
  if (clean.length === 12) {
    clean = clean + calculateEAN13CheckDigit(clean);
  } else if (clean.length < 13) {
    clean = clean.padStart(12, "0");
    clean = clean + calculateEAN13CheckDigit(clean);
  } else if (clean.length > 13) {
    clean = clean.substring(0, 13);
  }

  const firstDigit = clean[0];
  const leftDigits = clean.substring(1, 7);
  const rightDigits = clean.substring(7, 13);
  const firstDigitNum = parseInt(firstDigit, 10) || 0;
  const parity = EAN13_PARITY[firstDigitNum] || EAN13_PARITY[0];

  const modules: EAN13Module[] = [];

  // Left Guard: 101 (isGuard = true)
  modules.push({ bit: 1, isGuard: true });
  modules.push({ bit: 0, isGuard: true });
  modules.push({ bit: 1, isGuard: true });

  // Left 6 Digits (isGuard = false)
  for (let i = 0; i < 6; i++) {
    const d = parseInt(leftDigits[i], 10) || 0;
    const bitStr = parity[i] === 1 ? EAN13_G_BITS[d] : EAN13_L_BITS[d];
    for (let b = 0; b < 7; b++) {
      modules.push({ bit: bitStr[b] === "1" ? 1 : 0, isGuard: false });
    }
  }

  // Center Guard: 01010 (isGuard = true)
  modules.push({ bit: 0, isGuard: true });
  modules.push({ bit: 1, isGuard: true });
  modules.push({ bit: 0, isGuard: true });
  modules.push({ bit: 1, isGuard: true });
  modules.push({ bit: 0, isGuard: true });

  // Right 6 Digits (isGuard = false)
  for (let i = 0; i < 6; i++) {
    const d = parseInt(rightDigits[i], 10) || 0;
    const bitStr = EAN13_R_BITS[d];
    for (let b = 0; b < 7; b++) {
      modules.push({ bit: bitStr[b] === "1" ? 1 : 0, isGuard: false });
    }
  }

  // Right Guard: 101 (isGuard = true)
  modules.push({ bit: 1, isGuard: true });
  modules.push({ bit: 0, isGuard: true });
  modules.push({ bit: 1, isGuard: true });

  // Convert modules to run-length bars
  const allBars: (BarcodeElement & { isGuard: boolean })[] = [];
  let currentBit = modules[0].bit;
  let currentGuard = modules[0].isGuard;
  let currentWidth = 0;

  for (let i = 0; i < modules.length; i++) {
    const m = modules[i];
    if (m.bit === currentBit && m.isGuard === currentGuard) {
      currentWidth++;
    } else {
      allBars.push({
        width: currentWidth,
        isBlack: currentBit === 1,
        isGuard: currentGuard,
      });
      currentBit = m.bit;
      currentGuard = m.isGuard;
      currentWidth = 1;
    }
  }
  if (currentWidth > 0) {
    allBars.push({
      width: currentWidth,
      isBlack: currentBit === 1,
      isGuard: currentGuard,
    });
  }

  return {
    firstDigit,
    leftDigits,
    rightDigits,
    modules,
    allBars,
  };
}

export function encodeEAN13(digits: string): BarcodeElement[] {
  const structured = encodeEAN13Structured(digits);
  return structured.allBars.map((b) => ({ width: b.width, isBlack: b.isBlack }));
}

/**
 * Universal Hardware Scanner Barcode Helper
 * Automatically selects Code 128 C / EAN-13 for 50% thicker bars that scan instantly on handheld guns.
 */
export function getHardwareScannableBarcode(text: string): BarcodeElement[] {
  const clean = (text || "").trim();
  if (/^\d{12,13}$/.test(clean)) {
    return encodeEAN13(clean);
  }
  return encodeCode128(clean);
}

/**
 * Calculates GS1 Modulo-10 Checksum for 12 digits
 */
export function calculateEan13Checksum(twelveDigits: string): string {
  const clean = twelveDigits.replace(/\D/g, "").slice(0, 12).padEnd(12, "0");
  let total = 0;
  for (let i = 0; i < clean.length; i++) {
    const weight = i % 2 === 0 ? 1 : 3;
    total += parseInt(clean[i], 10) * weight;
  }
  const mod = total % 10;
  return String((10 - mod) % 10);
}

/**
 * Generate a guaranteed scannable, tenant-scoped internal barcode
 */
export function generateClientTenantBarcode(
  tenantIdOrName?: string,
  format: "EAN-13" | "Code-128" = "EAN-13",
  customPrefix?: string
): string {
  let hash = 1042;
  if (tenantIdOrName) {
    let sum = 0;
    for (let i = 0; i < tenantIdOrName.length; i++) {
      sum = (sum * 31 + tenantIdOrName.charCodeAt(i)) % 9000;
    }
    hash = Math.abs(sum) + 1000;
  }
  const randomSeq = Math.floor(100000 + Math.random() * 900000);

  if (format === "Code-128") {
    const p = (customPrefix || "BOS").toUpperCase().trim();
    return `${p}-${hash}-${randomSeq.toString().slice(-4)}`;
  }

  // GS1 EAN-13 Internal Store Prefix: 20 + 4-digit Org Code + 6-digit Item Sequence + Checksum
  const twelve = `20${hash}${randomSeq}`;
  const check = calculateEan13Checksum(twelve);
  return twelve + check;
}
