import type {Metadata,Viewport} from 'next';
import './styles.css';
export const metadata: Metadata = {
  title: 'Beyond Consulting Command Center', applicationName:'Beyond Consulting',
  manifest:'/manifest.webmanifest', icons:{icon:'/icon-192.png',apple:'/icon-192.png'},
  appleWebApp:{capable:true,title:'Beyond Consulting'}, robots:{index:false,follow:false},
};
export const viewport: Viewport = {themeColor:'#101b31'};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en" suppressHydrationWarning><body>{children}</body></html>;
}
