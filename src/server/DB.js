import sqlite3 from 'sqlite3'

export default class DB {

  constructor(dbFile) {
    this.dbFile = dbFile
  }

  async run(query, ...args) {
    let conn = await new Promise((resolve, reject) => {
      let db = new sqlite3.Database(this.dbFile, (err) => {
        if(err) reject(err); else resolve(db)
      })
    })
    async function run(query, ...args) {
      return await new Promise((resolve, reject) => {
        conn.all(query, ...args, (err, rows) => {
          if(err) reject(err); else resolve(rows)
        })
      })
    }
    let rows = await run(query, ...args)
    rows.lastInsertId = async function() {
      let [{id}] = await run(`SELECT last_insert_rowid() as id`)
      return id
    }
    return rows
  }

  async prop(key, value) {
    if(value === undefined) {
      let res = await this.run(`SELECT value FROM prop WHERE key = ?`, key)
      if(res.length > 0) value = JSON.parse(res[0].value)
    }
    else {
      await this.run(`INSERT OR REPLACE INTO prop (key, value)
        VALUES (?, ?)`, key, JSON.stringify(value))
    }
    return value
  }

  async migrate() {
    await this.run(`CREATE TABLE IF NOT EXISTS prop (
        key TEXT UNIQUE,
        value TEXT
      )`)

    let dbVersion = await this.prop('dbVersion')
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
        await this.prop('dbVersion', 3)

      case 3:
        await this.run(`ALTER TABLE peer ADD COLUMN props TEXT`)
        await this.run(`UPDATE peer SET props = '{}'`)
        await this.prop('dbVersion', 4)

      case 4:
        return

      default:
        throw Error(`Unknown DB version ${dbVersion}`)

    }
  }

}
