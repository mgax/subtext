import sqlite3 from 'sqlite3'

function connect(dbFile) {
  return new Promise((resolve, reject) => {
    let db = new sqlite3.Database(dbFile, (err) => {
      if(err) reject(err); else resolve(db)
    })
  })
}

function execute(conn, query, ...args) {
  return new Promise((resolve, reject) => {
    conn.all(query, ...args, (err, rows) => {
      if(err) reject(err); else resolve(rows)
    })
  })
}

async function runQuery(conn, query, ...args) {
  let rows = await execute(conn, query, ...args)
  rows.lastInsertId = async function() {
    let [{id}] = await execute(conn, `SELECT last_insert_rowid() as id`)
    return id
  }
  return rows
}

export default class DB {

  constructor(dbFile) {
    this.dbFile = dbFile
  }

  async run(query, ...args) {
    let conn = await connect(this.dbFile)
    return await runQuery(conn, query, ...args)
  }

  async _read_props() {
    await this.run(`CREATE TABLE IF NOT EXISTS prop (
        key TEXT UNIQUE,
        value TEXT
      )`)

    this._props = {}
    for(let {key, value} of await this.run(`SELECT key, value FROM prop`)) {
      this._props[key] = JSON.parse(value)
    }
  }

  async set_prop(key, value) {
    await this.run(`INSERT OR REPLACE INTO prop (key, value)
      VALUES (?, ?)`, key, JSON.stringify(value))
    this._props[key] = value
  }

  get_prop(key) {
    return this._props[key]
  }

  async initialize() {
    await this._read_props()
    await this._migrate()
  }

  async _migrate() {
    let dbVersion = this.get_prop('dbVersion')
    switch(dbVersion) {

      case undefined:
        await this.run(`CREATE TABLE peer (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT UNIQUE,
            card TEXT
          )`)
        await this.run(`CREATE TABLE message (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            peer_id INTEGER,
            time TEXT,
            me BOOL,
            message TEXT,
            unread BOOL,
            FOREIGN KEY(peer_id) REFERENCES peer(id)
          )`)
        await this.set_prop('dbVersion', 3)

      case 3:
        await this.run(`ALTER TABLE peer ADD COLUMN props TEXT`)
        await this.run(`UPDATE peer SET props = '{}'`)
        await this.set_prop('dbVersion', 4)

      case 4:
        await this.run(`ALTER TABLE message ADD COLUMN notified BOOL`)
        await this.run(`UPDATE message SET notified = 1`)
        await this.set_prop('dbVersion', 5)

      case 5:
        await this.run(`CREATE TABLE outbox (
            message_id INTEGER UNIQUE,
            last TEXT,
            destination TEXT,
            envelope TEXT,
            FOREIGN KEY(message_id) REFERENCES message(id)
          )`)
        await this.set_prop('dbVersion', 6)

      case 6:
        return

      default:
        throw Error(`Unknown DB version ${dbVersion}`)

    }
  }

  async _transaction(type, callback) {
    let conn = await connect(this.dbFile)
    let _run = (query, ...args) => runQuery(conn, query, ...args)

    await _run(`BEGIN ${type} TRANSACTION`)
    try {
      await callback(_run)
    }
    catch(e) {
      console.warn('error during transaction, will roll back:', e)
      await _run(`ROLLBACK`)
      throw e
    }
    await _run(`COMMIT`)
  }

  async exclusive(callback) {
    return await this._transaction('EXCLUSIVE', callback)
  }

}
