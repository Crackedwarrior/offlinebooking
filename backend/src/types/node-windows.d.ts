declare module 'node-windows' {
  export class Service {
    constructor(options: {
      name: string;
      description: string;
      script: string;
      nodeOptions?: string[];
    });

    on(event: 'install', callback: () => void): void;
    on(event: 'alreadyinstalled', callback: () => void): void;
    on(event: 'start', callback: () => void): void;
    on(event: 'stop', callback: () => void): void;
    on(event: 'error', callback: (error: any) => void): void;

    install(): void;
    start(): void;
    stop(): void;
    uninstall(): void;
  }
}
