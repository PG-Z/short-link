require('dotenv').config();
const urlMapOpt = require("./src/db/urlMapOpt")
const urlCodeOpt = require("./src/db/urlCodeOpt")
const urlMd5Opt = require("./src/db/urlMd5Opt")
const express = require('express');
const app = express();

const morgan = require('morgan');
morgan.token('body', (req) => JSON.stringify(req.body));

const Redis = require('redis');
const md5 = require("js-md5");
const mysqlU = require("./src/db/mysqlUtil");
const redis = Redis.createClient({
    socket: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT || 6379
    },
    username: process.env.REDIS_USERNAME || null,
    password: process.env.REDIS_PASSWORD || null,
    pingInterval: 5 * 60 * 1000,
});
redis.on('error', err => console.error(err, 'Redis error'));
redis.on('connect', () => console.log('Redis is connect'));
redis.on('reconnecting', () => console.log('Redis is reconnecting'));
redis.on('ready', () => console.log('Redis is ready'));
const redisKey = {
    code: 'short-url:code',
    map: 'short-url:map',
    md5: 'short-url:md5'
};

const _alphabet = 'GS2w4R6789IbcdHEXhijWZAzopTrxPNq3sLMJalBVyQeDmY0nugtF5Uv1fkOCK';
const _base = _alphabet.length;
const encode = (id) => {
    let code = '';
    while (id > 0) {
        code = _alphabet.charAt(id % _base) + code;
        id = Math.floor(id / _base);
    }
    return code;
};

app.use(express.static('build'));
app.use(express.json());
app.use(morgan(':method :url :status :res[content-length] - :response-time ms :body'));

app.get('/:code', async (request, response) => {
    const code = request.params.code;
    const originUrl = await redis.hGet(redisKey.map, code);
    if (!originUrl) {
        return response.status(404).json({error: 'Unknown URL'}).end();
    }
    response.redirect(originUrl);
});

app.post('/', async (request, response) => {
    const decodedUrl = decodeURI(request.body.url);
    if (!/^((https|http)?:\/\/)[^\s]+/.test(decodedUrl)) {
        return response.status(400).json({error: 'Incorrect URL format'}).end();
    }

    let md5 = require('js-md5');

    let mark = false;

    const hashCode = await redis.get(redisKey.md5 + md5(decodedUrl))
    if (hashCode) {
        const originUrl = await redis.hGet(redisKey.map, hashCode);
        if (originUrl) {
            mark = true;
        }
    }

    let code = hashCode;
    if (!mark) {
        const id = await redis.incrBy(redisKey.code, 1);
        await urlCodeOpt.updateCode(id)
        code = encode(id);
        let url_md5 = redisKey.md5 + md5(decodedUrl);
        urlMd5Opt.insert([code, url_md5, url_md5])
        await redis.set(url_md5, code);
        await urlMapOpt.insert([code, decodedUrl, decodedUrl])
        await redis.hSet(redisKey.map, code, decodedUrl);
    }

    response.json({url: decodedUrl, code});
});

app.get('/sync/redisToMysql', async (req, res) => {
    // 保存 HashMap 所有键值对到 MySQL
    await saveAllHashToMySQL(redisKey.map);
    await syncUrlMd5RedisToMySQL();
});

// 获取 HashMap 所有键值对并保存到 MySQL 的函数
async function saveAllHashToMySQL(hashKey) {
    try {
        const hashData = await redis.hGetAll(hashKey);
        const keys = Object.keys(hashData);

        try {
            for (const key of keys) {
                const value = hashData[key];
                urlMapOpt.insert([key, value, value])
            }
        } catch (error) {
            throw error;
        }
    } catch (error) {
        console.error('Error saving hash to MySQL:', error);
    }
}

async function syncUrlMd5RedisToMySQL() {
    try {
        // 获取所有以 short-url:md5 为前缀的键
        const keys = await redis.keys(redisKey.md5 + '*');

        try {
            for (const key of keys) {
                const urlMd5 = key;
                const urlKey = await redis.get(key);
                urlMd5Opt.insert([urlKey, urlMd5, urlMd5])
            }
        } catch (error) {
            throw error;
        }
    } catch (error) {
        console.error('Error syncing Redis to MySQL:', error);
    }
}

const PORT = 3001;
redis.connect().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});