// File: server/services/authService.js
const { pool, getPool } = require('../config/db');
const db = (typeof getPool === 'function') ? getPool() : pool; 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Finds a user by username or email from the EMPLOYEES table.
 * @param {string} username - The username or email.
 * @returns {object|null} - The user data.
 */
async function findUserByUsername(username) {
    // The query must select all fields needed for the JWT payload.
    // ✅ FIX: Add 'company_id' to the SELECT statement.
    const [rows] = await db.query(
        'SELECT id, username, password_hash, role, employee_code, company_id FROM employees WHERE username = ? LIMIT 1',
        [username]
    );
    return rows && rows[0];
};

/**
 * Compares the input password with the hashed password from the database.
 * @param {string} password - The user's input password.
 * @param {string} hashedPassword - The hashed password.
 * @returns {boolean} - true if the passwords match.
 */
const comparePassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

/**
 * Creates an Access Token and a Refresh Token.
 * @param {object} employee - The employee object containing id, role, company_id.
 * @returns {object} - Contains the accessToken.
 */
const generateTokens = (employee) => {
    // This payload is now correct because the findUserByUsername function provides company_id.
    const payload = { 
        id: employee.id, 
        role: employee.role, 
        company_id: employee.company_id 
    };

    console.log('>>> STEP 1: Payload prepared for signing:', payload); // Detailed log

    const accessToken = jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
    );
    return { accessToken };
};

module.exports = {
    findUserByUsername,
    comparePassword,
    generateTokens,
};