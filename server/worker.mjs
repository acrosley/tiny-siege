import {api} from './rooms.mjs';
export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname.startsWith('/api/'))return api(request,env);
    return env.ASSETS.fetch(request);
  }
};
