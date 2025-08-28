"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveBooking = saveBooking;
exports.getAllBookings = getAllBookings;
exports.getBookingById = getBookingById;
exports.updateBookingById = updateBookingById;
const prismaClient_1 = __importDefault(require("../db/prismaClient"));
// Save a booking snapshot
async function saveBooking(bookingData) {
    return await prismaClient_1.default.booking.create({
        data: bookingData,
    });
}
// Get all past bookings (for Booking History)
async function getAllBookings() {
    return await prismaClient_1.default.booking.findMany({
        orderBy: { createdAt: 'desc' },
    });
}
// Get a single booking by ID (for 'View' button)
async function getBookingById(id) {
    return await prismaClient_1.default.booking.findUnique({
        where: { id },
    });
}
// Update an existing booking by ID
async function updateBookingById(id, updateData) {
    return await prismaClient_1.default.booking.update({
        where: { id },
        data: updateData,
    });
}
