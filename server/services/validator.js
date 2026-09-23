function isValidAttempt(data) {
    if (!data.site || typeof data.energy !== 'number' || !data.excuse) {
        return false;
    }
    return true;
}

module.exports = {
    isValidAttempt
};
