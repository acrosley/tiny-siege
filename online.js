/* Transport only. The server owns room state and resolves orders. */
window.SiegeOnline=(()=>{
  const storage='tiny-siege-seat-v1';let session=null,timer=null,busy=false,callback=null,failures=0;
  try{session=JSON.parse(localStorage.getItem(storage)||'null');}catch{}
  function save(){try{session?localStorage.setItem(storage,JSON.stringify(session)):localStorage.removeItem(storage);}catch{}}
  async function request(path,body,token=session?.token){
    if(location.protocol==='file:')throw new Error('Online play needs the hosted game. Open the online link below.');
    const response=await fetch(path,{method:body===undefined?'GET':'POST',headers:{...(body===undefined?{}:{'Content-Type':'application/json'}),...(token?{Authorization:`Bearer ${token}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(12000)});
    let result;try{result=await response.json();}catch{throw new Error('Online rooms are not available here. Use the hosted game link.');}
    if(!response.ok){const error=new Error(result.error||'Could not contact the room.');error.status=response.status;throw error;}return result;
  }
  function stop(){clearTimeout(timer);timer=null;callback=null;}
  function watch(fn){stop();callback=fn;const current=session;
    async function poll(){if(session!==current||!callback)return;if(!busy){busy=true;try{const state=await request(`/api/rooms/${session.code}`);failures=0;callback?.(state,null);}catch(e){failures++;callback?.(null,e);}finally{busy=false;}}if(callback&&session===current)timer=setTimeout(poll,Math.min(5000,900+failures*700));}
    poll();
  }
  return {
    get session(){return session;},
    async create(name,mode){const state=await request('/api/rooms',{name,mode},null);session={code:state.code,token:state.token};save();return state;},
    async join(code,name){const token=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');session={code,token};save();try{return await request(`/api/rooms/${code}/join`,{name,token},null);}catch(e){if(e.status){session=null;save();}throw e;}},
    async command(action,body={}){return request(`/api/rooms/${session.code}/${action}`,body);},
    watch,stop,
    forget(){stop();session=null;save();},
  };
})();
