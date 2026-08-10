const { Client } = require('pg');

function decode(value) {
    return JSON.parse(Buffer.from(value, 'base64').toString('utf8'));
}

function encode(value) {
    return Buffer.from(JSON.stringify(value), 'utf8').toString('base64');
}

function getSslConfig() {
    if (process.env.PGSSL === 'disable') {
        return false;
    }
    return process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false;
}

function serialize(value) {
    if (Buffer.isBuffer(value)) {
        return { __type: 'buffer', data: value.toString('base64') };
    }

    if (Array.isArray(value)) {
        return value.map(serialize);
    }

    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, serialize(entry)]));
    }

    return value;
}

function revive(value) {
    if (Array.isArray(value)) {
        return value.map(revive);
    }

    if (value && typeof value === 'object') {
        if (value.type === 'Buffer' && Array.isArray(value.data)) {
            return Buffer.from(value.data);
        }

        if (value.__type === 'buffer' && typeof value.data === 'string') {
            return Buffer.from(value.data, 'base64');
        }

        return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, revive(entry)]));
    }

    return value;
}

(async () => {
    const [, , action, sqlToken, paramsToken] = process.argv;
    const sql = decode(sqlToken);
    const params = revive(decode(paramsToken || encode([])));
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: getSslConfig()
    });

    await client.connect();

    try {
        let text = sql;
        if (action === 'run' && /^\s*insert/i.test(text) && !/returning/i.test(text)) {
            text = `${text} RETURNING *`;
        }

        const result = await client.query(text, params);
        process.stdout.write(JSON.stringify({
            rows: serialize(result.rows),
            rowCount: result.rowCount
        }));
    } finally {
        await client.end();
    }
})().catch(error => {
    console.error(error.stack || error.message || String(error));
    process.exit(1);
});