const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

exports.register = async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: 'pls provide all fields' });
    }

    try {
        // check if user exist already
        const exist = await User.findOne({ email });
        if (exist) return res.status(400).json({ message: 'user already exist' });

        const user = await User.create({ name, email, password });
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            token: generateToken(user._id)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const usr = await User.findOne({ email });

        if (usr && (await usr.matchPassword(password))) {
            res.json({
                _id: usr._id,
                name: usr.name,
                email: usr.email,
                token: generateToken(usr._id)
            });
        } else {
            res.status(401).json({ message: 'wrong email/pwd' });
        }
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
};
