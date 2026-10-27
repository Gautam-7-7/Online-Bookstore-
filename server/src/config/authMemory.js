const memoryUsers = new Map();

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const isEnabled = () => process.env.NODE_ENV !== "production" && !process.env.MONGODB_URI;

const createMemoryUser = ({ name, email, password, failedLoginAttempts = 0, lockUntil = null }) => {
    const normalizedEmail = normalizeEmail(email);
    const id = globalThis.crypto?.randomUUID
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const user = {
        _id: id,
        name,
        email: normalizedEmail,
        password,
        failedLoginAttempts,
        lockUntil
    };

    memoryUsers.set(normalizedEmail, user);
    memoryUsers.set(String(id), user);

    return user;
};

const getUserByEmail = (email) => {
    const normalizedEmail = normalizeEmail(email);
    return memoryUsers.get(normalizedEmail) || null;
};

const getUserById = (userId) => memoryUsers.get(String(userId)) || null;

const removeUserByEmail = (email) => {
    const user = getUserByEmail(email);
    if (!user) return null;

    memoryUsers.delete(normalizeEmail(user.email));
    memoryUsers.delete(String(user._id));

    return user;
};

module.exports = {
    memoryUsers,
    createMemoryUser,
    getUserByEmail,
    getUserById,
    isEnabled,
    removeUserByEmail,
    normalizeEmail
};
