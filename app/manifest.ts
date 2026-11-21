import type {MetadataRoute} from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {id:'/',name:'Beyond Consulting Command Center',short_name:'Beyond Consulting',start_url:'/',scope:'/',display:'standalone',background_color:'#101b31',theme_color:'#101b31',icons:[
    {src:'/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},
    {src:'/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'},
    {src:'/icon-maskable.png',sizes:'512x512',type:'image/png',purpose:'maskable'},
  ]};
}
