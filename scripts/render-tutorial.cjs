const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process'),{pathToFileURL}=require('node:url');
const {chromium}=require('@playwright/test');
(async()=>{
  const chapters=require('./tutorial-chapters.json');let cursor=0;
  for(let i=0;i<chapters.length;i++){const duration=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',`artifacts/tutorial/voice-${i}.wav`],{encoding:'utf8'}).trim());chapters[i].start=cursor;cursor+=duration;chapters[i].end=cursor;}
  fs.mkdirSync('assets',{recursive:true});fs.writeFileSync('artifacts/tutorial/timeline.json',JSON.stringify(chapters));
  const timestamp=t=>`${String(Math.floor(t/3600)).padStart(2,'0')}:${String(Math.floor(t/60)%60).padStart(2,'0')}:${(t%60).toFixed(3).padStart(6,'0')}`;
  let cues='WEBVTT\n\n';chapters.forEach(ch=>{const sentences=ch.speech.match(/[^.!?]+[.!?]+/g)||[ch.speech];let at=ch.start;const total=sentences.reduce((n,s)=>n+s.length,0);sentences.forEach(s=>{let end=at+(ch.end-ch.start)*s.length/total;cues+=`${timestamp(at)} --> ${timestamp(end)}\n${s.trim()}\n\n`;at=end;});});fs.writeFileSync('assets/tutorial.vtt',cues);
  const browser=await chromium.launch({channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']});const page=await browser.newPage({viewport:{width:1280,height:720}});await page.goto(pathToFileURL(path.resolve('scripts/render-tutorial.html')).href);
  await page.evaluate(ch=>draw(1,ch),chapters);await page.locator('canvas').screenshot({path:'assets/tutorial-poster.jpg'});
  const recording=await page.evaluate(async chapters=>{
    const canvas=document.querySelector('canvas'),stream=canvas.captureStream(24),chunks=[];const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:1800000});
    const result=new Promise(resolve=>{recorder.ondataavailable=e=>chunks.push(e.data);recorder.onstop=async()=>{const bytes=new Uint8Array(await new Blob(chunks).arrayBuffer());let binary='';for(let at=0;at<bytes.length;at+=32768)binary+=String.fromCharCode(...bytes.subarray(at,at+32768));resolve(btoa(binary));};});
    recorder.start();const start=performance.now();await new Promise(resolve=>{function frame(now){const time=(now-start)/1000;draw(Math.min(time,chapters.at(-1).end),chapters);if(time<chapters.at(-1).end)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});recorder.stop();return result;
  },chapters);
  fs.writeFileSync('artifacts/tutorial/visual.webm',Buffer.from(recording,'base64'));await browser.close();
  fs.writeFileSync('artifacts/tutorial/audio-list.txt',chapters.map((_,i)=>`file 'voice-${i}.wav'`).join('\n'));
  execFileSync('ffmpeg',['-y','-f','concat','-safe','0','-i','artifacts/tutorial/audio-list.txt','-c','copy','artifacts/tutorial/narration.wav'],{stdio:'ignore'});
  execFileSync('ffmpeg',['-y','-i','artifacts/tutorial/visual.webm','-i','artifacts/tutorial/narration.wav','-c:v','libx264','-preset','fast','-crf','23','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-movflags','+faststart','-shortest','assets/tutorial.mp4'],{stdio:'ignore'});
  console.log(`Narrated tutorial complete: ${cursor.toFixed(1)} seconds.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
