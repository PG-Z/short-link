const mysqlU = require("./mysqlUtil")

const insert = async (data) => {
    const sql = 'INSERT INTO url_map (url_key, url_value) VALUES (?,?) ON DUPLICATE KEY UPDATE url_value = ?';
    const sqlArr = data;

    try {
        return mysqlU.execute(sql, sqlArr);
    } catch (e) {
        console.log('操作失败（错误信息）:', e);
    }
}

module.exports = {
    insert
}