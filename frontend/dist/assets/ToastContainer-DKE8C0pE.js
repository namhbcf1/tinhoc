import{c as f}from"./createLucideIcon-CSgPgRz7.js";import{j as o}from"./index-CTPydP4p.js";import{r as n}from"./react-vendor-CNpt29n2.js";/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const v=[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]],w=f("chevron-left",v);/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const b=[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]],N=f("chevron-right",b),x=({message:c,type:a="info",onClose:s,duration:e=3e3})=>{n.useEffect(()=>{if(e>0){const t=setTimeout(()=>{s()},e);return()=>clearTimeout(t)}},[e,s]);const i=a==="error"||a==="warning",l=i?"alert":"status",u=i?"assertive":"polite",m={success:"✅",error:"❌",warning:"⚠️",info:"ℹ️"};return o.jsxs("div",{className:`toast toast-${a}`,role:l,"aria-live":u,"aria-atomic":"true",children:[o.jsxs("div",{className:"toast-content",children:[o.jsx("span",{className:"toast-icon","aria-hidden":"true",children:m[a]??"ℹ️"}),o.jsx("span",{className:"toast-message",children:c})]}),o.jsx("button",{className:"toast-close",onClick:s,"aria-label":"Đóng thông báo",children:"×"})]})};let C=0;const _=()=>{const[c,a]=n.useState([]),s=n.useCallback((t,r="info",d=3e3)=>{const h=C++,g={id:h,message:t,type:r,duration:d};return a(p=>[...p,g]),h},[]),e=n.useCallback(t=>{a(r=>r.filter(d=>d.id!==t))},[]),i=n.useCallback((t,r)=>s(t,"success",r),[s]),l=n.useCallback((t,r)=>s(t,"error",r),[s]),u=n.useCallback((t,r)=>s(t,"warning",r),[s]),m=n.useCallback((t,r)=>s(t,"info",r),[s]);return{toasts:c,removeToast:e,success:i,error:l,warning:u,info:m}},y=({toasts:c,removeToast:a})=>{const s=Array.isArray(c)?c:[];return s.length===0?null:o.jsx("div",{className:"toast-container","aria-label":"Thông báo","aria-relevant":"additions removals",children:s.map(e=>!e||!e.id?null:o.jsx(x,{message:e.message,type:e.type,duration:e.duration,onClose:()=>a&&a(e.id)},e.id))})};export{w as C,y as T,N as a,_ as u};
