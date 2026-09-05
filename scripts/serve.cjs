const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {openDb}=require('../server/local-db.cjs');
const root=path.resolve(__dirname,'..'),DB=openDb(path.join(root,'.data/rooms.sqlite'));
const assets=new Set(['index.html','style.css','app.js','engine.js','scene.js','icon.svg','online.js','assets/tutorial.mp4','assets/tutorial.vtt','assets/tutorial-poster.jpg']);
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.mp4':'video/mp4','.vtt':'text/vtt','.jpg':'image/jpeg'};
const handler=import('../server/rooms.mjs');
const server=http.createServer(async(req,res)=>{
  try{
    const origin=`http://${req.headers.host}`,url=new URL(req.url,origin);
    if(url.pathname.startsWith('/api/')){
      const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>8192){res.writeHead(413);res.end();return;}chunks.push(chunk);}
      const request=new Request(url,{method:req.method,headers:req.headers,...(req.method==='GET'?{}:{body:Buffer.concat(chunks)})});
      const response=await (await handler).api(request,{DB});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
    }
    const relative=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname).slice(1);
    if(!assets.has(relative)){res.writeHead(404);res.end('Not found');return;}
    const file=path.join(root,relative),stat=await fs.promises.stat(file);
    const headers={'Content-Type':mime[path.extname(file)],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes'};
    const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    if(range){const start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),stat.size-1):stat.size-1;if(start>end||start>=stat.size){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`});res.end();return;}res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${stat.size}`,'Content-Length':end-start+1});fs.createReadStream(file,{start,end}).pipe(res);}
    else{res.writeHead(200,{...headers,'Content-Length':stat.size});fs.createReadStream(file).pipe(res);}
  }catch{res.writeHead(500);res.end('Unable to serve this request.');}
});
server.listen(process.env.PORT||4173,process.env.HOST||'127.0.0.1',()=>console.log(`Tiny Siege: http://127.0.0.1:${process.env.PORT||4173}`));
