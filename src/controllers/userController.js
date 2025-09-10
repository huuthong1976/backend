// File: server/controllers/userController.js

const db = require('../models');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize'); // Import Operator for OR queries

/**
 * @desc    Create a new user
 * @route   POST /api/users
 * @access  Private (Admin)
 */
const createUser = async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
        const { full_name, employee_code, email, password, company_id, position_id, start_date, role } = req.body;

        if (!full_name || !employee_code || !email || !password || !company_id || !position_id) {
            return res.status(400).json({ error: 'Vui lòng điền đầy đủ các trường bắt buộc.' });
        }

        const userExists = await db.User.findOne({
            where: { [Op.or]: [{ email: email }, { employee_code: employee_code }] },
            transaction: t
        });

        if (userExists) {
            await t.rollback();
            const field = userExists.email === email ? 'Email' : 'Mã nhân viên';
            return res.status(400).json({ error: `${field} đã tồn tại.` });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await db.User.create({
            full_name,
            employee_code,
            email,
            password: hashedPassword,
            company_id,
            position_id,
            start_date,
            role: role || 'Employee',
        }, { transaction: t });

        await t.commit();
        const userResponse = { ...newUser.toJSON() };
        delete userResponse.password;
        res.status(201).json(userResponse);

    } catch (error) {
        await t.rollback();
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Lỗi máy chủ' });
    }
};

/**
 * @desc    Get a list of all users
 * @route   GET /api/users
 */
const listUsers = async (req, res) => {
    // Placeholder: Add your logic to fetch and return all users
    res.status(500).json({ message: 'Function not implemented.' });
};

/**
 * @desc    Update a user
 * @route   PUT /api/users/:id
 */
const updateUser = async (req, res) => {
    // Placeholder: Add your logic to update a user by their ID
    res.status(500).json({ message: 'Function not implemented.' });
};

/**
 * @desc    Delete a user
 * @route   DELETE /api/users/:id
 */
const deleteUser = async (req, res) => {
    // Placeholder: Add your logic to delete a user by their ID
    res.status(500).json({ message: 'Function not implemented.' });
};

module.exports = {
    createUser,
    listUsers,
    updateUser,
    deleteUser,
};