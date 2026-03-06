import{c as s}from"./createLucideIcon-CSgPgRz7.js";import{j as i}from"./index-De6mkxYX.js";/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u=[["path",{d:"M18 6 7 17l-5-5",key:"116fxf"}],["path",{d:"m22 10-7.5 7.5L13 16",key:"ke71qq"}]],f=s("check-check",u);/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d=[["path",{d:"m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2",key:"usdka0"}]],k=s("folder-open",d);/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const o=[["path",{d:"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z",key:"1kt360"}]],p=s("folder",o);/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const g=[["rect",{width:"7",height:"9",x:"3",y:"3",rx:"1",key:"10lvy0"}],["rect",{width:"7",height:"5",x:"14",y:"3",rx:"1",key:"16une8"}],["rect",{width:"7",height:"9",x:"14",y:"12",rx:"1",key:"1hutg5"}],["rect",{width:"7",height:"5",x:"3",y:"16",rx:"1",key:"ldoo1y"}]],x=s("layout-dashboard",g);function h(n){if(!n)return"Đã xảy ra lỗi không xác định";if(typeof n=="string")return n;if(n.message){const e=n.message.toLowerCase();return e.includes("network")||e.includes("fetch")?"Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet của bạn.":e.includes("timeout")?"Yêu cầu quá thời gian chờ. Vui lòng thử lại.":e.includes("401")||e.includes("unauthorized")||e.includes("chưa đăng nhập")?"Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.":e.includes("403")||e.includes("forbidden")||e.includes("không có quyền")?"Bạn không có quyền thực hiện hành động này.":e.includes("404")||e.includes("not found")||e.includes("không tìm thấy")?"Không tìm thấy dữ liệu yêu cầu.":e.includes("500")||e.includes("server error")||e.includes("lỗi server")?"Lỗi máy chủ. Vui lòng thử lại sau hoặc liên hệ quản trị viên.":(e.includes("validation")||e.includes("thiếu")||e.includes("invalid"),n.message)}return n.error?h(n.error):"Đã xảy ra lỗi. Vui lòng thử lại."}function v(n,e){const t=h(n);e&&e.error?e.error(t):(console.error("Error:",n),alert(t))}function N({icon:n="📭",title:e="Không có dữ liệu",message:t="",actions:r=[],className:a=""}){return i.jsxs("div",{className:`empty-state ${a}`,children:[i.jsx("div",{className:"empty-icon",children:n}),i.jsx("h3",{children:e}),t&&i.jsx("p",{children:t}),r.length>0&&i.jsx("div",{className:"empty-actions",children:r.map((c,l)=>i.jsx("button",{onClick:c.onClick,className:c.className||"btn-action-primary",children:c.label},l))})]})}export{f as C,N as E,p as F,x as L,k as a,v as s};
