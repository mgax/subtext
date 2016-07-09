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

}
