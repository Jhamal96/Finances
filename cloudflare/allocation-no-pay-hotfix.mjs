const oldLine="        const paychecks = getMonthData(data, monthPicker.value)[`${person}Pay`] || [];";
const newLines="        const recorded = data.months?.[monthPicker.value]?.[`${person}Pay`];\n        const paychecks = Array.isArray(recorded) ? recorded : [];";
export default {
  async fetch(request,env){
    const upstream=await env.ASSETS.fetch(request),path=new URL(request.url).pathname;
    if(request.method!=='GET'||!['/','/index.html'].includes(path)||!upstream.ok||!(upstream.headers.get('content-type')||'').includes('text/html'))return upstream;
    const original=await upstream.text();let html=original;
    if(!html.includes(newLines)){
      const i=html.indexOf(oldLine);
      if(i<0||html.indexOf(oldLine,i+oldLine.length)!==-1)return new Response(original,{status:upstream.status,statusText:upstream.statusText,headers:upstream.headers});
      html=html.slice(0,i)+newLines+html.slice(i+oldLine.length);
    }
    const headers=new Headers(upstream.headers);headers.delete('etag');headers.delete('content-length');headers.set('cache-control','no-store');
    return new Response(html,{status:upstream.status,statusText:upstream.statusText,headers});
  }
};