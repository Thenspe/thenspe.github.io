import{A as e,D as t,E as n,F as r,I as i,L as a,M as o,N as s,O as c,P as l,R as u,S as d,T as f,_ as p,b as ee,c as te,d as m,f as h,g,h as _,i as v,j as ne,k as re,m as y,n as ie,o as b,p as ae,r as x,s as S,v as C,w,x as T,y as oe,z as E}from"./shared-CqqExxAM.js";var D=document.querySelector(`#app`),O=`Ready.`,k=!1;try{k=localStorage.getItem(`tomcrawl-setup-open`)===`1`}catch{}var A,j=`#3a2a4a`,M=`#c084fc`,N=5,P=100,F=null,se=[`#ffffff`,`#9e9e9e`,`#424242`,`#000000`,`#ff5252`,`#ff9800`,`#ffeb3b`,`#8bc34a`,`#4caf50`,`#26c6da`,`#2196f3`,`#3f51b5`,`#9c27b0`,`#e91e63`,`#795548`,`#3a2a4a`],ce=300,le=820;async function I(){try{await E.action.setHeight(k?le:ce)}catch(e){console.error(`TOMcrawl setHeight failed:`,e)}}async function ue(e){k=e,localStorage.setItem(`tomcrawl-setup-open`,e?`1`:`0`),e||(await y(),await re(),await h(await C())),await I()}var L=e=>String(e).replace(/[&<>"]/g,e=>({"&":`&amp;`,"<":`&lt;`,">":`&gt;`,'"':`&quot;`})[e]);async function R(){let e=await C(),t=await ee(),r=new Set((await Promise.all(t.map(async e=>[e,await w(e)]))).filter(([,e])=>e).map(([e])=>e)),i=await E.player.getSelection(),a=i?.length?await E.scene.items.getItems(i):[],o=await d(),s=await T();if(e!==A){A=e,F=null;let t=e==null?null:await oe(e);j=t?.fill??`#3a2a4a`,M=t?.border??`#c084fc`,N=t?.width??5,P=Math.round((t?.opacity??1)*100)}let c=new Set,l=!1;for(let e of a){e.metadata[S]&&(l=!0);for(let t of n(e))c.add(t)}let u=n=>t.map(t=>{let i=n===`view`&&r.has(t),a=(n===`view`?t===e:l||c.has(t))?n===`view`?`active`:`assigned`:``;return`<button data-action="${n}" data-floor="${t}" data-empty="${i?`1`:`0`}" class="${a} ${i?`empty`:``}">Floor ${t}</button>`}).join(``),f=`
    <div class="section">
      <div class="label">Viewing floor</div>
      <div class="button-row">
        <button data-action="view" data-floor="none" class="${e===null?`active`:``}">No floor</button>
        ${u(`view`)}
        ${k?`<button data-action="newfloor">+ New</button>`:``}
      </div>
    </div>`,p=`
    <div class="section">
      <div class="label">Fog — active floor</div>
      <div class="button-row">
        <button data-action="fogfloor">Fog all</button>
        <button data-action="unfogfloor">Unfog all</button>
        <button data-action="reveal">Reveal room</button>
      </div>
      <div class="button-row">
        <button data-action="revealmode" class="${o?`active`:``}">
          Reveal mode: ${o?`ON (click a room)`:`OFF`}
        </button>
      </div>
    </div>`,m=(e,t,n)=>`
    <div class="style-field">
      <div class="field-name">${t}</div>
      <button type="button" class="color-trigger ${F===e?`open`:``}" data-action="togglepicker" data-target="${e}">
        <span class="swatch-preview" id="preview-${e}" style="background:${n}"></span>
        <span class="hex" id="hex-${e}">${n.toUpperCase()}</span>
      </button>
    </div>
    ${F===e?`<div class="palette">
            ${se.map(t=>`<button type="button" class="swatch ${t.toLowerCase()===n.toLowerCase()?`selected`:``}" data-action="pickcolor" data-target="${e}" data-color="${t}" style="background:${t}" aria-label="${t}"></button>`).join(``)}
            <label class="swatch custom" title="Custom colour">+<input type="color" id="floorcolor-${e}-custom" value="${n}"></label>
          </div>`:``}`,h=e==null?``:`
    <div class="section">
      <div class="label">Floor colour — Floor ${e}, unless an item overrides it</div>
      ${m(`fill`,`Fill`,j)}
      <div class="style-field">
        <div class="field-name">Fill opacity</div>
        <div class="width-control">
          <input type="range" id="floorcolor-opacity" min="0" max="100" step="1" value="${P}">
          <span class="width-value" id="flooropacity-val">${P}%</span>
        </div>
      </div>
      ${m(`border`,`Stroke`,M)}
      <div class="style-field">
        <div class="field-name">Stroke width</div>
        <div class="width-control">
          <input type="range" id="floorcolor-width" min="0" max="24" step="1" value="${N}">
          <span class="width-value" id="floorwidth-val">${N}</span>
        </div>
      </div>
      <div class="button-row">
        <button data-action="setfloorcolor">Set colour</button>
        <button data-action="clearfloorcolor">Clear colour</button>
      </div>
    </div>`,g=`
    <div class="section">
      <div class="label">Toggle floor(s) for selection — a room can belong to more than one</div>
      <div class="button-row">${u(`assign`)}</div>
    </div>
    <div class="section">
      <div class="label">Selection</div>
      <div class="button-row">
        <button data-action="persist">All floors</button>
        <button data-action="unassign">Unassign floor</button>
      </div>
      <div class="button-row">
        <button data-action="override">Toggle colour override</button>
        <button data-action="hidden">Toggle hidden passage</button>
      </div>
    </div>
    ${h}
    <div class="section">
      <div class="label">Attach — select a room plus item(s), e.g. a label</div>
      <div class="button-row">
        <button data-action="attach">Attach to room</button>
        <button data-action="detach">Detach</button>
      </div>
    </div>
    <div class="section">
      <div class="label">Player-facing floor label — drag it into place once, it updates itself</div>
      <div class="button-row">
        <button data-action="toggleindicator" class="${s?`active`:``}">
          Floor indicator: ${s?`ON`:`OFF`}
        </button>
        <button data-action="removeindicator">Remove indicator</button>
      </div>
    </div>
    <div class="section">
      <button data-action="dump" class="wide-button">Dump selection to console</button>
      <button data-action="removecurtain" class="wide-button">Remove curtain (if not needed)</button>
    </div>
    <div class="section">
      <div class="label">Selected objects</div>
      <div class="selection-info">${a.length?a.map(e=>{let t=n(e),r=e.metadata[S]?`All floors`:t.length?`Floor ${t.slice().sort((e,t)=>e-t).join(`, `)}`:`Unassigned`,i=[e.metadata[te]?`revealed`:null,e.metadata[b]?`override`:null,e.metadata[v]?`hidden passage`:null].filter(Boolean),a=i.length?` · ${i.join(` · `)}`:``;return`<div class="selection-item"><span>${L(e.name||e.type)} (${e.layer})</span><span>${r}${a}</span></div>`}).join(``):`<div class="selection-item"><span>None selected</span></div>`}</div>
    </div>
    <div class="status">${L(O)}</div>`;D.innerHTML=`
    <div class="title-row">
      <h1>TOMcrawl</h1>
      <button data-action="togglesetup" class="mode-button">
        ${k?`▾ Setup`:`▸ Setup`}
      </button>
    </div>
    ${f}
    ${p}
    ${k?g:``}`}async function z(e){let t=await E.player.getSelection();if(!t?.length)return O=`Nothing selected.`;let n;await E.scene.items.updateItems(t,t=>{n=ae(t,e);for(let e of t)n&&g(e),ie.has(e.type)&&e.layer===`DRAWING`&&(e.layer=`MAP`)}),await c(t),await h(await C()),O=`${n?`Added`:`Removed`} Floor ${e} for ${t.length} item(s).`}async function B(e,t){let n=await E.player.getSelection();if(!n?.length)return O=`Nothing selected.`;await E.scene.items.updateItems(n,t=>t.forEach(e)),await c(n),O=`${t} (${n.length} item(s)).`}function V(e){e.metadata[b]?delete e.metadata[b]:e.metadata[b]=!0}function H(e){e.metadata[v]?delete e.metadata[v]:e.metadata[v]=!0}async function de(){let e=await E.player.getSelection(),t=(await E.scene.items.getItems(e??[])).filter(e=>f(e)&&e.metadata[x]!=null);if(!t.length)return O=`Select a room (or hidden passage) with a floor first.`;for(let e of t)await l(e);await h(await C()),O=`Revealed ${t.length} item(s) and their connections.`}async function fe(){let e=await E.player.getSelection();if(!e||e.length<2)return O=`Select a room plus the item(s) to attach to it.`;let t=await E.scene.items.getItems(e),n=t.filter(e=>f(e));if(n.length!==1)return O=`Select exactly one room, plus the item(s) to attach to it.`;let r=n[0],i=t.filter(e=>e.id!==r.id).map(e=>e.id);await E.scene.items.updateItems(i,e=>{for(let t of e)t.attachedTo=r.id}),await c([r.id]),O=`Attached ${i.length} item(s) to the room.`}async function pe(){let e=await E.player.getSelection();if(!e?.length)return O=`Nothing selected.`;await E.scene.items.updateItems(e,e=>{for(let t of e)t.attachedTo=void 0}),O=`Detached ${e.length} item(s).`}async function me(){let e=await C();e!=null&&(await i(e,{fill:j,border:M,width:N,opacity:P/100}),await h(e),O=`Set colour for Floor ${e}.`)}async function he(){let e=await C();e!=null&&(await _(e),O=`Cleared colour for Floor ${e}.`)}async function U(){let e=await E.player.getSelection();if(!e?.length)return O=`Nothing selected.`;let t=await E.scene.items.getItems(e);console.log(`TOMcrawl selection dump:`,JSON.stringify(t,null,2)),O=`Dumped ${t.length} item(s) to the console (F12).`}D.addEventListener(`input`,e=>{let t=e.target.id;if(t===`floorcolor-fill-custom`||t===`floorcolor-border-custom`){let n=t===`floorcolor-fill-custom`?`fill`:`border`;n===`fill`?j=e.target.value:M=e.target.value;let r=document.getElementById(`preview-${n}`),i=document.getElementById(`hex-${n}`);r&&(r.style.background=e.target.value),i&&(i.textContent=e.target.value.toUpperCase())}else if(t===`floorcolor-opacity`){P=Number(e.target.value);let t=document.getElementById(`flooropacity-val`);t&&(t.textContent=`${P}%`)}else if(t===`floorcolor-width`){N=Number(e.target.value)||0;let t=document.getElementById(`floorwidth-val`);t&&(t.textContent=String(N))}}),D.addEventListener(`click`,async n=>{let i=n.target.closest(`[data-action]`);if(!i)return;let c=i.dataset.floor,l=c===`none`?null:Number(c);try{switch(i.dataset.action){case`togglesetup`:await ue(!k);break;case`view`:if(l!==null&&await w(l)){O=`Floor ${l} has nothing assigned yet — add something to it first.`;break}await r(l);break;case`assign`:await z(l);break;case`persist`:await B(t,`Now shown on all floors`);break;case`unassign`:await B(e,`Floor assignment removed`),await h(await C());break;case`override`:await B(V,`Toggled colour override`),await h(await C());break;case`hidden`:await B(H,`Toggled hidden passage`);break;case`fogfloor`:{let e=await C();if(e==null){O=`Select a floor first.`;break}await p(e),await h(e),O=`Active floor fogged.`;break}case`unfogfloor`:{let e=await C();if(e==null){O=`Select a floor first.`;break}await s(e),await h(e),O=`Entire active floor revealed.`;break}case`reveal`:await de();break;case`togglepicker`:F=F===i.dataset.target?null:i.dataset.target;break;case`pickcolor`:i.dataset.target===`fill`?j=i.dataset.color:M=i.dataset.color;break;case`setfloorcolor`:await me();break;case`clearfloorcolor`:await he();break;case`attach`:await fe();break;case`detach`:await pe();break;case`revealmode`:await u(!await d());break;case`dump`:await U();break;case`removecurtain`:O=await ne()?`Curtain removed.`:`No curtain exists right now.`;break;case`toggleindicator`:{let e=await T();await a(!e),await h(await C());break}case`removeindicator`:O=await o()?`Indicator removed.`:`No indicator exists right now.`;break;case`newfloor`:O=`Created Floor ${await m()}.`}}catch(e){console.error(`TOMcrawl action failed:`,e),O=`Something went wrong (see console): ${e?.message??e}`}W()});async function W(){try{await R()}catch(e){console.error(`TOMcrawl refresh failed:`,e)}}var G=null;function K(){G||=setTimeout(()=>{G=null,W()},50)}function q(e,t){let n=/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(e??``);if(!n)return null;let[r,i,a]=n.slice(1).map(e=>parseInt(e,16));return`rgba(${r}, ${i}, ${a}, ${t})`}function J(e){let t=document.documentElement.style,n=q(e?.background?.default,.88),r=q(e?.background?.paper,.9);n&&t.setProperty(`--bg`,n),r&&t.setProperty(`--bg-paper`,r),e?.text?.primary&&t.setProperty(`--text`,e.text.primary),e?.text?.secondary&&t.setProperty(`--text-secondary`,e.text.secondary)}var Y=!1,X=[];async function ge(){if(!Y){Y=!0;try{try{J(await E.theme.getTheme()),X.push(E.theme.onChange(J))}catch(e){console.error(`TOMcrawl theme setup failed:`,e)}await I(),W(),X.push(E.player.onChange(K),E.scene.onMetadataChange(K),E.scene.items.onChange(K))}catch(e){throw Z(),e}}}function Z(){X.forEach(e=>e()),X=[],Y=!1}function Q(e){console.error(`TOMcrawl startup failed:`,e),D.innerHTML=`
    <h1>TOMcrawl</h1>
    <p>Startup failed: ${L(e?.message??String(e))}</p>
    <p>Check the console (F12) for details.</p>
    <button id="tomcrawl-retry">Retry</button>`,document.getElementById(`tomcrawl-retry`)?.addEventListener(`click`,()=>location.reload())}async function $(e){e?await ge():(Z(),D.innerHTML=`<h1>TOMcrawl</h1><p>Open a scene first.</p>`)}E.onReady(async()=>{try{if(await E.player.getRole()!==`GM`){D.innerHTML=`<h1>TOMcrawl</h1><p>GM only.</p>`;return}E.scene.onReadyChange(e=>{$(e).catch(Q)}),await $(await E.scene.isReady())}catch(e){Q(e)}});