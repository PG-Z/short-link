const mysqlU = require("./mysqlUtil")

const incrCode = async (data) => {
    const sql = 'UPDATE url_conf SET url_code = url_code + 1 where  conf_id = ?';
    const sqlArr = ['code'];

    try {
        return mysqlU.execute(sql, sqlArr);
    } catch (e) {
        console.log('操作失败（错误信息）:', e);
    }
}

const updateCode = async (data) => {
    const sql = 'UPDATE url_conf SET url_code = ? where  conf_id = ?';
    const sqlArr = [data, 'code'];

    try {
        return mysqlU.execute(sql, sqlArr);
    } catch (e) {
        console.log('操作失败（错误信息）:', e);
    }
}

module.exports = {
    incrCode,
    updateCode
}