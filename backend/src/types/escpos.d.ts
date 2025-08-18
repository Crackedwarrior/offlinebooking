declare module 'escpos' {
  export interface USBDevice {
    open(callback: (error: any) => void): void;
  }

  export interface NetworkDevice {
    open(callback: (error: any) => void): void;
  }

  export interface Printer {
    initialize(): void;
    align(alignment: 'left' | 'center' | 'right'): void;
    style(style: 'normal' | 'b' | 'u' | 'i'): void;
    size(width: number, height: number): void;
    text(text: string): void;
    cut(): void;
    close(): Promise<void>;
  }

  export class USB implements USBDevice {
    constructor();
    open(callback: (error: any) => void): void;
  }

  export class Network implements NetworkDevice {
    constructor(host: string, port?: number);
    open(callback: (error: any) => void): void;
  }

  export class Printer {
    constructor(device: USBDevice | NetworkDevice);
    initialize(): void;
    align(alignment: 'left' | 'center' | 'right'): void;
    style(style: 'normal' | 'b' | 'u' | 'i'): void;
    size(width: number, height: number): void;
    text(text: string): void;
    cut(): void;
    close(): Promise<void>;
  }

  export let USB: typeof USB;
  export let Network: typeof Network;
}

declare module 'escpos-usb' {
  const usb: any;
  export = usb;
}

declare module 'escpos-network' {
  const network: any;
  export = network;
}
