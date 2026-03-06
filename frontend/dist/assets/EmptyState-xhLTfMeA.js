import{c as t}from"./createLucideIcon-CSgPgRz7.js";import{j as i}from"./index-CTPydP4p.js";/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const l=[["path",{d:"M18 6 7 17l-5-5",key:"116fxf"}],["path",{d:"m22 10-7.5 7.5L13 16",key:"ke71qq"}]],m=t("check-check",l);/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const o=[["rect",{width:"8",height:"4",x:"8",y:"2",rx:"1",ry:"1",key:"tgr4d6"}],["path",{d:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",key:"116196"}],["path",{d:"M12 11h4",key:"1jrz19"}],["path",{d:"M12 16h4",key:"n85exb"}],["path",{d:"M8 11h.01",key:"1dfujw"}],["path",{d:"M8 16h.01",key:"18s6g9"}]],x=t("clipboard-list",o);/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u=[["path",{d:"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",key:"1oefj6"}],["path",{d:"M14 2v5a1 1 0 0 0 1 1h5",key:"wfsgrz"}]],v=t("file",u);/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y=[["path",{d:"m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2",key:"usdka0"}]],_=t("folder-open",y);/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const g=[["path",{d:"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z",key:"1kt360"}]],b=t("folder",g);/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k=[["rect",{width:"7",height:"9",x:"3",y:"3",rx:"1",key:"10lvy0"}],["rect",{width:"7",height:"5",x:"14",y:"3",rx:"1",key:"16une8"}],["rect",{width:"7",height:"9",x:"14",y:"12",rx:"1",key:"1hutg5"}],["rect",{width:"7",height:"5",x:"3",y:"16",rx:"1",key:"ldoo1y"}]],j=t("layout-dashboard",k);function h(n){if(!n)return"Đã xảy ra lỗi không xác định";if(typeof n=="string")return n;if(n.message){const e=n.message.toLowerCase();return e.includes("network")||e.includes("fetch")?"Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet của bạn.":e.includes("timeout")?"Yêu cầu quá thời gian chờ. Vui lòng thử lại.":e.includes("401")||e.includes("unauthorized")||e.includes("chưa đăng nhập")?"Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.":e.includes("403")||e.includes("forbidden")||e.includes("không có quyền")?"Bạn không có quyền thực hiện hành động này.":e.includes("404")||e.includes("not found")||e.includes("không tìm thấy")?"Không tìm thấy dữ liệu yêu cầu.":e.includes("500")||e.includes("server error")||e.includes("lỗi server")?"Lỗi máy chủ. Vui lòng thử lại sau hoặc liên hệ quản trị viên.":(e.includes("validation")||e.includes("thiếu")||e.includes("invalid"),n.message)}return n.error?h(n.error):"Đã xảy ra lỗi. Vui lòng thử lại."}function N(n,e){const s=h(n);e&&e.error?e.error(s):(console.error("Error:",n),alert(s))}function w({icon:n="📭",title:e="Không có dữ liệu",message:s="",actions:a=[],className:r=""}){return i.jsxs("div",{className:`empty-state ${r}`,children:[i.jsx("div",{className:"empty-icon",children:n}),i.jsx("h3",{children:e}),s&&i.jsx("p",{children:s}),a.length>0&&i.jsx("div",{className:"empty-actions",children:a.map((c,d)=>i.jsx("button",{onClick:c.onClick,className:c.className||"btn-action-primary",children:c.label},d))})]})}export{x as C,w as E,b as F,j as L,_ as a,v as b,m as c,N as s};
