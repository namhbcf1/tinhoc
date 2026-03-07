import{j as o}from"./index-DQBRK5hr.js";import{r}from"./react-vendor-CNpt29n2.js";import{c as n,B as a}from"./Button-CXs_YikY.js";import{c as l}from"./createLucideIcon-CSgPgRz7.js";/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const c=[["path",{d:"m5 12 7-7 7 7",key:"hav0vg"}],["path",{d:"M12 19V5",key:"x0mq9r"}]],d=l("arrow-up",c);function w(){const[s,t]=r.useState(!1);r.useEffect(()=>{const e=()=>{window.scrollY>400?t(!0):t(!1)};return window.addEventListener("scroll",e),()=>window.removeEventListener("scroll",e)},[]);const i=()=>{window.scrollTo({top:0,behavior:"smooth"})};return o.jsx("div",{className:n("fixed bottom-8 right-8 z-50 transition-all duration-300 transform",s?"opacity-100 translate-y-0":"opacity-0 translate-y-10 pointer-events-none"),children:o.jsx(a,{onClick:i,size:"icon",className:"rounded-full shadow-lg bg-green-600 hover:bg-green-700 text-white w-12 h-12","aria-label":"Scroll to top",children:o.jsx(d,{size:24})})})}export{d as A,w as S};
