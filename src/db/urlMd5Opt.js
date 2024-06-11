const mysqlU = require("./mysqlUtil")

const insert = async (data) => {
    const sql = 'INSERT INTO url_md5 (url_key, url_md5) VALUES (?,?) ON DUPLICATE KEY UPDATE url_md5 = ?';
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