let validations = {
    isNullOrUndef: (data) => {
        return typeof data == 'undefined' || data == null;
    },
    hasValue: (data) => {
        return data.length > 0 || !this.isNullOrUndef(data);
    }
}

module.exports = validations;