import{c as s}from"./createLucideIcon-CSgPgRz7.js";import{j as i}from"./index-bkl1GNdp.js";/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const a=[["path",{d:"M18 6 7 17l-5-5",key:"116fxf"}],["path",{d:"m22 10-7.5 7.5L13 16",key:"ke71qq"}]],m=s("check-check",a);/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d=[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",ry:"2",key:"1m3agn"}],["circle",{cx:"9",cy:"9",r:"2",key:"af1f0g"}],["path",{d:"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21",key:"1xmnt7"}]],f=s("image",d);/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const o=[["rect",{width:"7",height:"9",x:"3",y:"3",rx:"1",key:"10lvy0"}],["rect",{width:"7",height:"5",x:"14",y:"3",rx:"1",key:"16une8"}],["rect",{width:"7",height:"9",x:"14",y:"12",rx:"1",key:"1hutg5"}],["rect",{width:"7",height:"5",x:"3",y:"16",rx:"1",key:"ldoo1y"}]],x=s("layout-dashboard",o);function h(n){if(!n)return"Đã xảy ra lỗi không xác định";if(typeof n=="string")return n;if(n.message){const e=n.message.toLowerCase();return e.includes("network")||e.includes("fetch")?"Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet của bạn.":e.includes("timeout")?"Yêu cầu quá thời gian chờ. Vui lòng thử lại.":e.includes("401")||e.includes("unauthorized")||e.includes("chưa đăng nhập")?"Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.":e.includes("403")||e.includes("forbidden")||e.includes("không có quyền")?"Bạn không có quyền thực hiện hành động này.":e.includes("404")||e.includes("not found")||e.includes("không tìm thấy")?"Không tìm thấy dữ liệu yêu cầu.":e.includes("500")||e.includes("server error")||e.includes("lỗi server")?"Lỗi máy chủ. Vui lòng thử lại sau hoặc liên hệ quản trị viên.":(e.includes("validation")||e.includes("thiếu")||e.includes("invalid"),n.message)}return n.error?h(n.error):"Đã xảy ra lỗi. Vui lòng thử lại."}function k(n,e){const t=h(n);e&&e.error?e.error(t):(console.error("Error:",n),alert(t))}function p({icon:n="📭",title:e="Không có dữ liệu",message:t="",actions:r=[],className:u=""}){return i.jsxs("div",{className:`empty-state ${u}`,children:[i.jsx("div",{className:"empty-icon",children:n}),i.jsx("h3",{children:e}),t&&i.jsx("p",{children:t}),r.length>0&&i.jsx("div",{className:"empty-actions",children:r.map((c,l)=>i.jsx("button",{onClick:c.onClick,className:c.className||"btn-action-primary",children:c.label},l))})]})}export{m as C,p as E,f as I,x as L,k as s};
