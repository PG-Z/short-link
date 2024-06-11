const mysql = require('mysql2/promise');

module.exports = {
    // 数据库配置
    config: {
        host: process.env.MYSQL_HOST || '127.0.0.1',
        port: process.env.MYSQL_PORT || '3306',
        user: process.env.MYSQL_USERNAME || null,
        password: process.env.MYSQL_PASSWORD || null,
        database: process.env.MYSQL_DATABASE || null
    },

    // 连接数据库 使用数据库连接池方式连接
    async execute(sql, sqlParams) {
        const connection = await mysql.createConnection({
            host: this.config.host,
            port: this.config.port,
            user: this.config.user,
            password: this.config.password,
            database: this.config.database
        });

        try {
            console.log('数据库连接成功');
            const [rows, fields] = await connection.execute(sql, sqlParams);
            return { success: true, data: rows };
        } catch (err) {
            console.log('数据库连接失败', err);
            return { success: false, error: err };
        } finally {
            await connection.end();
        }
    }
};