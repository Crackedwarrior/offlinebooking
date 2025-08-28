"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ticketIdService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class TicketIdService {
    constructor() {
        this.configPath = path_1.default.join(process.cwd(), 'ticketId.json');
        this.config = this.loadConfig();
    }
    loadConfig() {
        try {
            if (fs_1.default.existsSync(this.configPath)) {
                const data = fs_1.default.readFileSync(this.configPath, 'utf8');
                return JSON.parse(data);
            }
        }
        catch (error) {
            console.error('Error loading ticket ID config:', error);
        }
        // Default configuration
        return {
            currentId: 0, // Will start from 1 on first use
            prefix: 'TKT',
            padding: 6
        };
    }
    saveConfig() {
        try {
            fs_1.default.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
        }
        catch (error) {
            console.error('Error saving ticket ID config:', error);
        }
    }
    /**
     * Get the next ticket ID
     */
    getNextTicketId() {
        this.config.currentId++;
        this.saveConfig();
        return `${this.config.prefix}${this.config.currentId.toString().padStart(this.config.padding, '0')}`;
    }
    /**
     * Get the current ticket ID without incrementing
     */
    getCurrentTicketId() {
        return `${this.config.prefix}${this.config.currentId.toString().padStart(this.config.padding, '0')}`;
    }
    /**
     * Reset the ticket ID counter to a specific number
     */
    resetTicketId(newId) {
        if (newId < 0) {
            throw new Error('Ticket ID must be a positive number');
        }
        this.config.currentId = newId;
        this.saveConfig();
    }
    /**
     * Get the current configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Update the configuration
     */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
        this.saveConfig();
    }
}
// Export singleton instance
exports.ticketIdService = new TicketIdService();
exports.default = exports.ticketIdService;
