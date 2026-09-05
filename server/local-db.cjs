const {DatabaseSync}=require('node:sqlite');
const fs=require('node:fs'),path=require('node:path');
function openDb(filename){
  if(filename!==':memory:')fs.mkdirSync(path.dirname(filename),{recursive:true});
  const database=new DatabaseSync(filename);
  database.exec('PRAGMA journal_mode = WAL');
  database.exec('CREATE TABLE IF NOT EXISTS __local_migrations (name TEXT PRIMARY KEY)');
  for(const file of fs.readdirSync(path.join(__dirname,'../drizzle')).filter(f=>f.endsWith('.sql')).sort()){
    if(database.prepare('SELECT name FROM __local_migrations WHERE name = ?').get(file))continue;
    database.exec(fs.readFileSync(path.join(__dirname,'../drizzle',file),'utf8'));
    database.prepare('INSERT INTO __local_migrations (name) VALUES (?)').run(file);
  }
  return {prepare(sql){let args=[];return {bind(...values){args=values;return this;},async first(){return database.prepare(sql).get(...args)||null;},async run(){return {meta:{changes:Number(database.prepare(sql).run(...args).changes)}};}};},close(){database.close();}};
}
module.exports={openDb};
