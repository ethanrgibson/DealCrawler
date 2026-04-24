function getWeekOfMonth(date) {
    const day = date.getDate();
    let weekOfMonth = Math.ceil(day / 7);
    if (weekOfMonth > 4) weekOfMonth = 4; // Group 22nd onwards into week 4
    return weekOfMonth;
}

function cleanLink(link) {
    if (!link) return link;
    return link.split('?')[0].split('/ref=')[0];
}

module.exports = {
    getWeekOfMonth,
    cleanLink
};
