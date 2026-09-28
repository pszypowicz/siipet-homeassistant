var L=globalThis,j=L.ShadowRoot&&(L.ShadyCSS===void 0||L.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,Q=Symbol(),pt=new WeakMap,k=class{constructor(t,e,s){if(this._$cssResult$=!0,s!==Q)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o,e=this.t;if(j&&t===void 0){let s=e!==void 0&&e.length===1;s&&(t=pt.get(e)),t===void 0&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),s&&pt.set(e,t))}return t}toString(){return this.cssText}},_t=i=>new k(typeof i=="string"?i:i+"",void 0,Q),P=(i,...t)=>{let e=i.length===1?i[0]:t.reduce((s,n,r)=>s+(o=>{if(o._$cssResult$===!0)return o.cssText;if(typeof o=="number")return o;throw Error("Value passed to 'css' function must be a 'css' function result: "+o+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(n)+i[r+1],i[0]);return new k(e,i,Q)},mt=(i,t)=>{if(j)i.adoptedStyleSheets=t.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(let e of t){let s=document.createElement("style"),n=L.litNonce;n!==void 0&&s.setAttribute("nonce",n),s.textContent=e.cssText,i.appendChild(s)}},G=j?i=>i:i=>i instanceof CSSStyleSheet?(t=>{let e="";for(let s of t.cssRules)e+=s.cssText;return _t(e)})(i):i;var{is:te,defineProperty:ee,getOwnPropertyDescriptor:ie,getOwnPropertyNames:se,getOwnPropertySymbols:ne,getPrototypeOf:re}=Object,B=globalThis,ft=B.trustedTypes,oe=ft?ft.emptyScript:"",ae=B.reactiveElementPolyfillSupport,D=(i,t)=>i,Y={toAttribute(i,t){switch(t){case Boolean:i=i?oe:null;break;case Object:case Array:i=i==null?i:JSON.stringify(i)}return i},fromAttribute(i,t){let e=i;switch(t){case Boolean:e=i!==null;break;case Number:e=i===null?null:Number(i);break;case Object:case Array:try{e=JSON.parse(i)}catch{e=null}}return e}},vt=(i,t)=>!te(i,t),gt={attribute:!0,type:String,converter:Y,reflect:!1,useDefault:!1,hasChanged:vt};Symbol.metadata??=Symbol("metadata"),B.litPropertyMetadata??=new WeakMap;var g=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=gt){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){let s=Symbol(),n=this.getPropertyDescriptor(t,s,e);n!==void 0&&ee(this.prototype,t,n)}}static getPropertyDescriptor(t,e,s){let{get:n,set:r}=ie(this.prototype,t)??{get(){return this[e]},set(o){this[e]=o}};return{get:n,set(o){let d=n?.call(this);r?.call(this,o),this.requestUpdate(t,d,s)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??gt}static _$Ei(){if(this.hasOwnProperty(D("elementProperties")))return;let t=re(this);t.finalize(),t.l!==void 0&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(D("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(D("properties"))){let e=this.properties,s=[...se(e),...ne(e)];for(let n of s)this.createProperty(n,e[n])}let t=this[Symbol.metadata];if(t!==null){let e=litPropertyMetadata.get(t);if(e!==void 0)for(let[s,n]of e)this.elementProperties.set(s,n)}this._$Eh=new Map;for(let[e,s]of this.elementProperties){let n=this._$Eu(e,s);n!==void 0&&this._$Eh.set(n,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){let e=[];if(Array.isArray(t)){let s=new Set(t.flat(1/0).reverse());for(let n of s)e.unshift(G(n))}else t!==void 0&&e.push(G(t));return e}static _$Eu(t,e){let s=e.attribute;return s===!1?void 0:typeof s=="string"?s:typeof t=="string"?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),this.renderRoot!==void 0&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){let t=new Map,e=this.constructor.elementProperties;for(let s of e.keys())this.hasOwnProperty(s)&&(t.set(s,this[s]),delete this[s]);t.size>0&&(this._$Ep=t)}createRenderRoot(){let t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return mt(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,s){this._$AK(t,s)}_$ET(t,e){let s=this.constructor.elementProperties.get(t),n=this.constructor._$Eu(t,s);if(n!==void 0&&s.reflect===!0){let r=(s.converter?.toAttribute!==void 0?s.converter:Y).toAttribute(e,s.type);this._$Em=t,r==null?this.removeAttribute(n):this.setAttribute(n,r),this._$Em=null}}_$AK(t,e){let s=this.constructor,n=s._$Eh.get(t);if(n!==void 0&&this._$Em!==n){let r=s.getPropertyOptions(n),o=typeof r.converter=="function"?{fromAttribute:r.converter}:r.converter?.fromAttribute!==void 0?r.converter:Y;this._$Em=n;let d=o.fromAttribute(e,r.type);this[n]=d??this._$Ej?.get(n)??d,this._$Em=null}}requestUpdate(t,e,s,n=!1,r){if(t!==void 0){let o=this.constructor;if(n===!1&&(r=this[t]),s??=o.getPropertyOptions(t),!((s.hasChanged??vt)(r,e)||s.useDefault&&s.reflect&&r===this._$Ej?.get(t)&&!this.hasAttribute(o._$Eu(t,s))))return;this.C(t,e,s)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(t,e,{useDefault:s,reflect:n,wrapped:r},o){s&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,o??e??this[t]),r!==!0||o!==void 0)||(this._$AL.has(t)||(this.hasUpdated||s||(e=void 0),this._$AL.set(t,e)),n===!0&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}let t=this.scheduleUpdate();return t!=null&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[n,r]of this._$Ep)this[n]=r;this._$Ep=void 0}let s=this.constructor.elementProperties;if(s.size>0)for(let[n,r]of s){let{wrapped:o}=r,d=this[n];o!==!0||this._$AL.has(n)||d===void 0||this.C(n,void 0,r,d)}}let t=!1,e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(s=>s.hostUpdate?.()),this.update(e)):this._$EM()}catch(s){throw t=!1,this._$EM(),s}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(t){}firstUpdated(t){}};g.elementStyles=[],g.shadowRootOptions={mode:"open"},g[D("elementProperties")]=new Map,g[D("finalized")]=new Map,ae?.({ReactiveElement:g}),(B.reactiveElementVersions??=[]).push("2.1.2");var it=globalThis,yt=i=>i,z=it.trustedTypes,$t=z?z.createPolicy("lit-html",{createHTML:i=>i}):void 0,St="$lit$",b=`lit$${Math.random().toFixed(9).slice(2)}$`,Et="?"+b,le=`<${Et}>`,x=document,M=()=>x.createComment(""),H=i=>i===null||typeof i!="object"&&typeof i!="function",st=Array.isArray,ce=i=>st(i)||typeof i?.[Symbol.iterator]=="function",K=`[ 	
\f\r]`,O=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,bt=/-->/g,wt=/>/g,w=RegExp(`>|${K}(?:([^\\s"'>=/]+)(${K}*=${K}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),Ct=/'/g,xt=/"/g,Tt=/^(?:script|style|textarea|title)$/i,nt=i=>(t,...e)=>({_$litType$:i,strings:t,values:e}),a=nt(1),Ee=nt(2),Te=nt(3),A=Symbol.for("lit-noChange"),l=Symbol.for("lit-nothing"),At=new WeakMap,C=x.createTreeWalker(x,129);function Rt(i,t){if(!st(i)||!i.hasOwnProperty("raw"))throw Error("invalid template strings array");return $t!==void 0?$t.createHTML(t):t}var de=(i,t)=>{let e=i.length-1,s=[],n,r=t===2?"<svg>":t===3?"<math>":"",o=O;for(let d=0;d<e;d++){let c=i[d],h,p,u=-1,_=0;for(;_<c.length&&(o.lastIndex=_,p=o.exec(c),p!==null);)_=o.lastIndex,o===O?p[1]==="!--"?o=bt:p[1]!==void 0?o=wt:p[2]!==void 0?(Tt.test(p[2])&&(n=RegExp("</"+p[2],"g")),o=w):p[3]!==void 0&&(o=w):o===w?p[0]===">"?(o=n??O,u=-1):p[1]===void 0?u=-2:(u=o.lastIndex-p[2].length,h=p[1],o=p[3]===void 0?w:p[3]==='"'?xt:Ct):o===xt||o===Ct?o=w:o===bt||o===wt?o=O:(o=w,n=void 0);let $=o===w&&i[d+1].startsWith("/>")?" ":"";r+=o===O?c+le:u>=0?(s.push(h),c.slice(0,u)+St+c.slice(u)+b+$):c+b+(u===-2?d:$)}return[Rt(i,r+(i[e]||"<?>")+(t===2?"</svg>":t===3?"</math>":"")),s]},U=class i{constructor({strings:t,_$litType$:e},s){let n;this.parts=[];let r=0,o=0,d=t.length-1,c=this.parts,[h,p]=de(t,e);if(this.el=i.createElement(h,s),C.currentNode=this.el.content,e===2||e===3){let u=this.el.content.firstChild;u.replaceWith(...u.childNodes)}for(;(n=C.nextNode())!==null&&c.length<d;){if(n.nodeType===1){if(n.hasAttributes())for(let u of n.getAttributeNames())if(u.endsWith(St)){let _=p[o++],$=n.getAttribute(u).split(b),V=/([.?@])?(.*)/.exec(_);c.push({type:1,index:r,name:V[2],strings:$,ctor:V[1]==="."?X:V[1]==="?"?Z:V[1]==="@"?tt:E}),n.removeAttribute(u)}else u.startsWith(b)&&(c.push({type:6,index:r}),n.removeAttribute(u));if(Tt.test(n.tagName)){let u=n.textContent.split(b),_=u.length-1;if(_>0){n.textContent=z?z.emptyScript:"";for(let $=0;$<_;$++)n.append(u[$],M()),C.nextNode(),c.push({type:2,index:++r});n.append(u[_],M())}}}else if(n.nodeType===8)if(n.data===Et)c.push({type:2,index:r});else{let u=-1;for(;(u=n.data.indexOf(b,u+1))!==-1;)c.push({type:7,index:r}),u+=b.length-1}r++}}static createElement(t,e){let s=x.createElement("template");return s.innerHTML=t,s}};function S(i,t,e=i,s){if(t===A)return t;let n=s!==void 0?e._$Co?.[s]:e._$Cl,r=H(t)?void 0:t._$litDirective$;return n?.constructor!==r&&(n?._$AO?.(!1),r===void 0?n=void 0:(n=new r(i),n._$AT(i,e,s)),s!==void 0?(e._$Co??=[])[s]=n:e._$Cl=n),n!==void 0&&(t=S(i,n._$AS(i,t.values),n,s)),t}var J=class{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){let{el:{content:e},parts:s}=this._$AD,n=(t?.creationScope??x).importNode(e,!0);C.currentNode=n;let r=C.nextNode(),o=0,d=0,c=s[0];for(;c!==void 0;){if(o===c.index){let h;c.type===2?h=new N(r,r.nextSibling,this,t):c.type===1?h=new c.ctor(r,c.name,c.strings,this,t):c.type===6&&(h=new et(r,this,t)),this._$AV.push(h),c=s[++d]}o!==c?.index&&(r=C.nextNode(),o++)}return C.currentNode=x,n}p(t){let e=0;for(let s of this._$AV)s!==void 0&&(s.strings!==void 0?(s._$AI(t,s,e),e+=s.strings.length-2):s._$AI(t[e])),e++}},N=class i{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,s,n){this.type=2,this._$AH=l,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=s,this.options=n,this._$Cv=n?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode,e=this._$AM;return e!==void 0&&t?.nodeType===11&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=S(this,t,e),H(t)?t===l||t==null||t===""?(this._$AH!==l&&this._$AR(),this._$AH=l):t!==this._$AH&&t!==A&&this._(t):t._$litType$!==void 0?this.$(t):t.nodeType!==void 0?this.T(t):ce(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==l&&H(this._$AH)?this._$AA.nextSibling.data=t:this.T(x.createTextNode(t)),this._$AH=t}$(t){let{values:e,_$litType$:s}=t,n=typeof s=="number"?this._$AC(t):(s.el===void 0&&(s.el=U.createElement(Rt(s.h,s.h[0]),this.options)),s);if(this._$AH?._$AD===n)this._$AH.p(e);else{let r=new J(n,this),o=r.u(this.options);r.p(e),this.T(o),this._$AH=r}}_$AC(t){let e=At.get(t.strings);return e===void 0&&At.set(t.strings,e=new U(t)),e}k(t){st(this._$AH)||(this._$AH=[],this._$AR());let e=this._$AH,s,n=0;for(let r of t)n===e.length?e.push(s=new i(this.O(M()),this.O(M()),this,this.options)):s=e[n],s._$AI(r),n++;n<e.length&&(this._$AR(s&&s._$AB.nextSibling,n),e.length=n)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){let s=yt(t).nextSibling;yt(t).remove(),t=s}}setConnected(t){this._$AM===void 0&&(this._$Cv=t,this._$AP?.(t))}},E=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,s,n,r){this.type=1,this._$AH=l,this._$AN=void 0,this.element=t,this.name=e,this._$AM=n,this.options=r,s.length>2||s[0]!==""||s[1]!==""?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=l}_$AI(t,e=this,s,n){let r=this.strings,o=!1;if(r===void 0)t=S(this,t,e,0),o=!H(t)||t!==this._$AH&&t!==A,o&&(this._$AH=t);else{let d=t,c,h;for(t=r[0],c=0;c<r.length-1;c++)h=S(this,d[s+c],e,c),h===A&&(h=this._$AH[c]),o||=!H(h)||h!==this._$AH[c],h===l?t=l:t!==l&&(t+=(h??"")+r[c+1]),this._$AH[c]=h}o&&!n&&this.j(t)}j(t){t===l?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}},X=class extends E{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===l?void 0:t}},Z=class extends E{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==l)}},tt=class extends E{constructor(t,e,s,n,r){super(t,e,s,n,r),this.type=5}_$AI(t,e=this){if((t=S(this,t,e,0)??l)===A)return;let s=this._$AH,n=t===l&&s!==l||t.capture!==s.capture||t.once!==s.once||t.passive!==s.passive,r=t!==l&&(s===l||n);n&&this.element.removeEventListener(this.name,this,s),r&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}},et=class{constructor(t,e,s){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=s}get _$AU(){return this._$AM._$AU}_$AI(t){S(this,t)}};var he=it.litHtmlPolyfillSupport;he?.(U,N),(it.litHtmlVersions??=[]).push("3.3.3");var kt=(i,t,e)=>{let s=e?.renderBefore??t,n=s._$litPart$;if(n===void 0){let r=e?.renderBefore??null;s._$litPart$=n=new N(t.insertBefore(M(),r),r,void 0,e??{})}return n._$AI(i),n};var rt=globalThis,m=class extends g{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){let e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=kt(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return A}};m._$litElement$=!0,m.finalized=!0,rt.litElementHydrateSupport?.({LitElement:m});var ue=rt.litElementPolyfillSupport;ue?.({LitElement:m});(rt.litElementVersions??=[]).push("4.2.2");function Dt(i){return i.callWS({type:"siipet/cats"})}function Ot(i,t,e){return i.callWS({type:"siipet/day",date:t,cat:e})}function Mt(i){return i.callWS({type:"siipet/queue"})}function Ht(i,t,e){return i.callWS({type:"siipet/calendar",month:t,cat:e})}async function Ut(i,t){return(await i.callWS({type:"media_source/resolve_media",media_content_id:`media-source://siipet/visit/${t}`})).url}function Nt(i,t){return i.callService("siipet","update_visit",t,void 0,!1)}function Vt(i,t){return i.callService("siipet","delete_visit",{event_id:t},void 0,!1)}function Pt(i){if(typeof i=="object"&&i!==null&&"message"in i){let{message:t}=i;return typeof t=="string"&&t!==""?t:void 0}}function v(i){let t=typeof i=="object"&&i!==null&&"error"in i?Pt(i.error):void 0;return Pt(i)??t??"The request failed."}function Lt(i,t,e){let[s,n]=i.split("-").map(Number),r=new Date(Date.UTC(s,n-1,1)),o=new Date(Date.UTC(s,n,0)).getUTCDate(),d=(r.getUTCDay()+6)%7,c=Array.from({length:d},()=>({date:null}));for(let h=1;h<=o;h++){let p=`${i}-${String(h).padStart(2,"0")}`;c.push({date:p,day:h,marked:t?.days[p]?.marked??!1,openable:t!==null&&t.first<=p&&p<=t.last,selected:p===e})}return c}var pe=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],jt=["January","February","March","April","May","June","July","August","September","October","November","December"];function F(i){let[t,e,s]=i.split("-").map(Number);return new Date(Date.UTC(t,e-1,s))}function Bt(i){return i.toISOString().slice(0,10)}function f(i){let t=F(i),e=jt[t.getUTCMonth()].slice(0,3);return`${pe[t.getUTCDay()]} ${t.getUTCDate()} ${e}`}function zt(i){let t=F(`${i}-01`);return`${jt[t.getUTCMonth()]} ${t.getUTCFullYear()}`}function T(i){return i.slice(11,16)}function W(i){let t=Math.floor(i/60),e=i%60;return t===0?`${e} s`:e===0?`${t} min`:`${t} min ${e} s`}function ot(i,t){let e=F(i);return e.setUTCDate(e.getUTCDate()+t),Bt(e)}function y(i){return i.slice(0,7)}function at(i,t){let e=F(`${i}-01`);return e.setUTCMonth(e.getUTCMonth()+t),Bt(e).slice(0,7)}var R={poop:{label:"Poop",icon:"mdi:emoticon-poop",color:"var(--brown-color)"},pee:{label:"Pee",icon:"mdi:water",color:"var(--amber-color)"},lingering:{label:"Lingering",icon:"mdi:paw",color:"var(--grey-color)"},unknown:{label:"Unknown",icon:"mdi:help",color:"var(--disabled-color)"}};var _e=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];function Ft(i,t,e){return`${i} ${i===1?t:e}`}function Wt(i,t){let e=[f(i),Ft(t.visits,"visit","visits")];return t.poop>0&&e.push(`${t.poop} poop`),t.pee>0&&e.push(`${t.pee} pee`),t.abnormal>0&&e.push(`${t.abnormal} abnormal`),e.join(" \xB7 ")}function qt(i){return`${Ft(i,"visit","visits")} waiting`}function lt(i){return a`
    <ha-tile-container class="header">
      <ha-tile-icon slot="icon" .imageUrl=${i.imageUrl} .icon=${i.icon}></ha-tile-icon>
      <ha-tile-info slot="info">
        <span slot="primary">${i.primary}</span>
        <span slot="secondary">${i.secondary}</span>
      </ha-tile-info>
      <div slot="features" class="features">${i.features}</div>
    </ha-tile-container>
  `}function It(i){return a`
    <ha-control-button-group class="date-bar">
      <ha-control-button
        class="arrow prev-day"
        .label=${"Previous day"}
        .disabled=${!i.canGoBack}
        @click=${()=>i.onShift(-1)}
      >
        <ha-icon icon="mdi:chevron-left"></ha-icon>
      </ha-control-button>
      <ha-control-button class="date" .label=${"Pick a day"} @click=${i.onToggle}>
        <span>${f(i.date)}</span>
        ${i.marked?a`<span class="dot"></span>`:l}
      </ha-control-button>
      <ha-control-button
        class="arrow next-day"
        .label=${"Next day"}
        .disabled=${!i.canGoForward}
        @click=${()=>i.onShift(1)}
      >
        <ha-icon icon="mdi:chevron-right"></ha-icon>
      </ha-control-button>
    </ha-control-button-group>
  `}function Qt(i){let t=Lt(i.month,i.calendar??null,i.selected);return a`
    <div class="calendar">
      <ha-control-button-group class="month-bar">
        <ha-control-button
          class="arrow prev-month"
          .label=${"Previous month"}
          .disabled=${!i.canGoBack}
          @click=${()=>i.onShiftMonth(-1)}
        >
          <ha-icon icon="mdi:chevron-left"></ha-icon>
        </ha-control-button>
        <div class="month-name">${zt(i.month)}</div>
        <ha-control-button
          class="arrow next-month"
          .label=${"Next month"}
          .disabled=${!i.canGoForward}
          @click=${()=>i.onShiftMonth(1)}
        >
          <ha-icon icon="mdi:chevron-right"></ha-icon>
        </ha-control-button>
      </ha-control-button-group>
      <div class="grid">
        ${_e.map(e=>a`<span class="weekday">${e}</span>`)}
        ${t.map(e=>e.date===null?a`<span class="blank"></span>`:a`
                <ha-control-button
                  class="cell ${e.selected?"selected":""}"
                  data-date=${e.date}
                  .label=${f(e.date)}
                  .disabled=${!e.openable}
                  @click=${()=>i.onOpenDay(e.date)}
                >
                  <span>${e.day}</span>
                  ${e.marked?a`<span class="dot"></span>`:l}
                </ha-control-button>
              `)}
      </div>
    </div>
  `}var me="width: 20px; height: 20px; border-radius: 50%; object-fit: cover";function Gt(i,t,e){let s=i.cats.map(n=>({value:n.device_id,label:n.name,icon:n.avatar?a`<img src=${n.avatar} alt="" style=${me} />`:a`<ha-icon icon="mdi:cat"></ha-icon>`}));return i.unknown.waiting>0&&s.push({value:i.unknown.device_id,label:`Unknown (${i.unknown.waiting})`,icon:a`<ha-icon icon="mdi:help"></ha-icon>`}),s.length<2?l:a`
    <ha-control-select
      class="cats"
      .options=${s}
      .value=${t}
      .label=${"Cat"}
      @value-changed=${n=>e(n.detail.value)}
    ></ha-control-select>
  `}function fe(i,t,e){let s=R[i.type],n=T(i.start),r=t?`${f(i.start.slice(0,10))} ${n}`:n,o=i.note?a`<ha-icon class="memo" icon="mdi:note-text-outline"></ha-icon>`:l,d=i.abnormal_reasons[0]??"Abnormal",c=i.abnormal?a`<span slot="features-inline" class="chip">${d}</span>`:l,h=i.cover?a`<img class="cover" src=${i.cover} alt="" loading="lazy" />`:l,p=i.stool?a`<img class="stool" src=${i.stool} alt="Stool photo" loading="lazy" />`:l,u=i.has_video?l:a`<span class="camera-only">On camera only</span>`;return a`
    <ha-tile-container
      class="visit ${i.type}"
      data-event=${i.event_id}
      .interactive=${!0}
      @action=${()=>e(i)}
    >
      <ha-tile-icon
        slot="icon"
        .icon=${s.icon}
        style="--tile-icon-color: ${s.color}"
      ></ha-tile-icon>
      <ha-tile-info slot="info">
        <span slot="primary">${r}</span>
        <span slot="secondary">${s.label} · ${W(i.duration)} ${o}</span>
      </ha-tile-info>
      ${c}
      <div slot="features" class="poster">${h} ${p} ${u}</div>
    </ha-tile-container>
  `}function ct(i,t,e){return i===void 0?l:i.length===0?a`<div class="message empty">No visits on this day.</div>`:a`<div class="timeline">
    ${i.map(s=>fe(s,t,e))}
  </div>`}function dt(i){return{cats:i.cats.flatMap(t=>t.device_id?[t.device_id]:[]),type:i.type==="unknown"?null:i.type,note:i.note}}function ge(i,t){return i.length===t.length&&i.every(e=>t.includes(e))}function Yt(i,t){let e=dt(i),s={event_id:i.event_id},n=!ge(e.cats,t.cats);if(n){if(t.cats.length===0)return{data:null,reason:"no_cat"};s.cats=t.cats}if(t.type!==e.type&&t.type!==null&&(s.type=t.type),n&&i.type==="unknown"&&s.type===void 0)return{data:null,reason:"type_required"};let r=t.note.trim();return r!==i.note&&(s.note=r),Object.keys(s).length===1?{data:null,reason:"no_change"}:{data:s,reason:null}}var q=P`
  ha-card {
    height: 100%;
    overflow: hidden;
  }
  /* The tap area of a tile row is absolutely positioned, so each row must hold its own. */
  ha-tile-container {
    position: relative;
    height: auto;
  }
  ha-tile-icon {
    --tile-icon-color: var(--tile-color);
  }
  .features {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  ha-control-button-group {
    --control-button-group-spacing: 12px;
    --control-button-group-thickness: 42px;
  }
  ha-control-button {
    --control-button-border-radius: var(--ha-border-radius-lg, 12px);
    --control-button-focus-color: var(--tile-color);
  }
  ha-control-button.arrow {
    flex: 0 0 42px;
  }
  .date {
    font-weight: var(--ha-font-weight-medium, 500);
  }
  .dot {
    width: 6px;
    height: 6px;
    margin-left: 6px;
    border-radius: 50%;
    background-color: var(--error-color);
  }
  .calendar {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .month-name {
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: var(--ha-font-weight-medium, 500);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 4px;
  }
  .weekday {
    text-align: center;
    font-size: var(--ha-font-size-s, 12px);
    color: var(--secondary-text-color);
  }
  ha-control-button.cell {
    position: relative;
    width: 100%;
    height: 36px;
    --control-button-border-radius: var(--ha-border-radius-md, 8px);
    --control-button-padding: 0;
  }
  ha-control-button.cell.selected {
    --control-button-background-color: var(--tile-color);
    --control-button-background-opacity: 1;
    --control-button-icon-color: white;
  }
  .cell .dot {
    position: absolute;
    bottom: 4px;
    left: 50%;
    margin: 0;
    transform: translateX(-50%);
  }
  ha-control-select {
    --control-select-color: var(--tile-color);
    --control-select-thickness: 42px;
    --control-select-border-radius: var(--ha-border-radius-lg, 12px);
  }
  .notice,
  .error {
    margin: 0 12px 12px;
    padding: 8px 12px;
    border-radius: var(--ha-border-radius-md, 8px);
    background-color: color-mix(in srgb, var(--warning-color) 20%, transparent);
  }
  .notice {
    margin-top: 12px;
  }
  .message {
    padding: 0 12px 12px;
    color: var(--secondary-text-color);
  }
  .message.alone {
    padding-top: 12px;
  }
  .visit.lingering {
    opacity: 0.6;
  }
  .memo {
    --mdc-icon-size: 14px;
  }
  .chip {
    align-self: center;
    margin-right: 10px;
    padding: 2px 8px;
    border-radius: var(--ha-border-radius-pill, 9999px);
    font-size: var(--ha-font-size-s, 12px);
    font-weight: var(--ha-font-weight-medium, 500);
    white-space: nowrap;
    color: var(--error-color);
    background-color: color-mix(in srgb, var(--error-color) 20%, transparent);
  }
  /* Taps on the poster pass through to the tap area of the row. */
  .poster {
    position: relative;
    pointer-events: none;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    border-radius: var(--ha-border-radius-lg, 12px);
    background-color: var(--secondary-background-color);
  }
  .lingering .poster {
    width: 50%;
  }
  .cover {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .stool {
    position: absolute;
    right: 8px;
    bottom: 8px;
    width: 28%;
    aspect-ratio: 1;
    object-fit: cover;
    border: 2px solid var(--card-background-color, white);
    border-radius: var(--ha-border-radius-md, 8px);
  }
  .camera-only {
    position: absolute;
    left: 8px;
    bottom: 8px;
    padding: 2px 8px;
    border-radius: var(--ha-border-radius-pill, 9999px);
    font-size: var(--ha-font-size-s, 12px);
    color: white;
    background-color: rgba(0, 0, 0, 0.6);
  }
`;var Kt=200,ve=5e3,ye=["pee","poop","lingering"],ht=class extends m{static{this.properties={hass:{attribute:!1},visit:{attribute:!1},cats:{attribute:!1},_form:{state:!0},_video:{state:!0},_videoNote:{state:!0},_error:{state:!0},_busy:{state:!0},_armed:{state:!0}}}static{this.styles=[q,P`
      :host {
        display: block;
      }
      .editor {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 0 12px 12px;
      }
      video {
        display: block;
        width: 100%;
        aspect-ratio: 16 / 9;
        border-radius: var(--ha-border-radius-lg, 12px);
        background-color: black;
      }
      .video-note,
      .hint,
      .reasons {
        color: var(--secondary-text-color);
      }
      .stool-row {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .stool-photo {
        width: 40%;
        aspect-ratio: 1;
        object-fit: cover;
        border-radius: var(--ha-border-radius-lg, 12px);
      }
      ha-control-button.cat img {
        width: 20px;
        height: 20px;
        margin-right: 8px;
        border-radius: 50%;
        object-fit: cover;
      }
      ha-control-button.cat.on,
      ha-control-button.save {
        --control-button-background-color: var(--tile-color);
        --control-button-background-opacity: 1;
        --control-button-icon-color: white;
      }
      ha-control-button.delete {
        --control-button-icon-color: var(--error-color);
      }
      ha-control-button.delete.armed {
        --control-button-background-color: var(--error-color);
        --control-button-background-opacity: 1;
        --control-button-icon-color: white;
      }
      .memo-field {
        position: relative;
      }
      /* No tile feature has a text field, so the memo input copies the look of a feature. */
      .memo-input {
        box-sizing: border-box;
        width: 100%;
        height: 42px;
        padding: 0 64px 0 12px;
        border: none;
        border-radius: var(--ha-border-radius-lg, 12px);
        font: inherit;
        color: var(--primary-text-color);
        background-color: color-mix(in srgb, var(--disabled-color) 20%, transparent);
      }
      .counter {
        position: absolute;
        top: 50%;
        right: 12px;
        transform: translateY(-50%);
        font-size: var(--ha-font-size-s, 12px);
        color: var(--secondary-text-color);
      }
      .error {
        margin: 0;
      }
    `]}constructor(){super(),this.cats=[],this._busy=!1,this._armed=!1}disconnectedCallback(){super.disconnectedCallback(),clearTimeout(this._disarm)}willUpdate(t){t.has("visit")&&this.visit&&(this._form=dt(this.visit),this._video=void 0,this._videoNote=this.visit.has_video?void 0:"Recording is on the camera only.",this._error=void 0,this.visit.has_video&&this._resolveVideo(this.visit.event_id))}async _resolveVideo(t){try{let e=await Ut(this.hass,t);this.visit?.event_id===t&&(this._video=e)}catch(e){this.visit?.event_id===t&&(this._videoNote=v(e))}}_close(t){this.dispatchEvent(new CustomEvent("siipet-close",{detail:{changed:t}}))}_toggleCat(t){let e=this._form,s=e.cats.includes(t);if(s&&e.cats.length===1)return;let n=s?e.cats.filter(r=>r!==t):[...e.cats,t];this._form={...e,cats:n}}async _save(t){this._busy=!0,this._error=void 0;try{await Nt(this.hass,t),this._close(!0)}catch(e){this._error=v(e)}finally{this._busy=!1}}async _delete(){if(!this._armed){this._armed=!0,this._disarm=setTimeout(()=>{this._armed=!1},ve);return}clearTimeout(this._disarm),this._armed=!1,this._busy=!0,this._error=void 0;try{await Vt(this.hass,this.visit.event_id),this._close(!0)}catch(t){this._error=v(t)}finally{this._busy=!1}}render(){let t=this.visit,e=this._form;if(!t||!e)return l;let s=Yt(t,e),n=s.reason==="type_required"?"Pick a type as well.":void 0;return a`
      ${this._renderHeader(t)}
      <div class="editor">
        ${this._renderVideo(t)} ${this._renderStool(t)} ${this._renderCats(e)}
        ${this._renderType(e)} ${this._renderMemo(e)}
        ${n?a`<div class="hint">${n}</div>`:l}
        ${this._error?a`<div class="error">${this._error}</div>`:l}
        ${this._renderActions(s.data)}
      </div>
    `}_renderHeader(t){let e=R[t.type],s=t.cats.map(r=>r.name).join(", ")||"Unknown",n=[f(t.start.slice(0,10)),e.label,W(t.duration),...t.abnormal_reasons.slice(0,1)].join(" \xB7 ");return a`
      <ha-tile-container class="header" .interactive=${!0} @action=${()=>this._close(!1)}>
        <ha-tile-icon slot="icon" .icon=${"mdi:arrow-left"}></ha-tile-icon>
        <ha-tile-info slot="info">
          <span slot="primary">${T(t.start)} · ${s}</span>
          <span slot="secondary">${n}</span>
        </ha-tile-info>
      </ha-tile-container>
    `}_renderType(t){let e=ye.map(s=>({value:s,label:R[s].label,icon:a`<ha-icon icon=${R[s].icon}></ha-icon>`}));return a`
      <ha-control-select
        class="type"
        .options=${e}
        .value=${t.type??void 0}
        .label=${"Type"}
        @value-changed=${s=>{this._form={...t,type:s.detail.value}}}
      ></ha-control-select>
    `}_renderMemo(t){return a`
      <div class="memo-field">
        <input
          class="memo-input"
          type="text"
          maxlength=${Kt}
          placeholder="Memo"
          aria-label="Memo"
          .value=${t.note}
          @input=${e=>{this._form={...t,note:e.target.value}}}
        />
        <span class="counter">${t.note.length}/${Kt}</span>
      </div>
    `}_renderActions(t){let e=this.hass?.user?.is_admin?a`
          <ha-control-button
            class="delete ${this._armed?"armed":""}"
            .label=${"Delete"}
            .disabled=${this._busy}
            @click=${()=>this._delete()}
          >
            ${this._armed?"Tap again to delete":"Delete"}
          </ha-control-button>
        `:l;return a`
      <ha-control-button-group class="actions">
        <ha-control-button
          class="save"
          .label=${"Save"}
          .disabled=${t===null||this._busy}
          @click=${()=>t&&this._save(t)}
        >
          Save
        </ha-control-button>
        ${e}
      </ha-control-button-group>
    `}_renderVideo(t){return this._videoNote!==void 0?a`<div class="video-note">${this._videoNote}</div>`:a`
      <video
        controls
        playsinline
        preload="none"
        poster=${t.cover??l}
        src=${this._video??l}
        @error=${()=>{this._videoNote="This browser cannot play the recording. Safari and the Home Assistant app can."}}
      ></video>
    `}_renderStool(t){return!t.stool&&t.abnormal_reasons.length===0?l:a`
      <div class="stool-row">
        ${t.stool?a`<img class="stool-photo" src=${t.stool} alt="Stool photo" />`:l}
        <span class="reasons">${t.abnormal_reasons.join(", ")}</span>
      </div>
    `}_renderCats(t){return a`
      <ha-control-button-group class="cat-toggles">
        ${this.cats.map(e=>a`
            <ha-control-button
              class="cat ${t.cats.includes(e.device_id)?"on":""}"
              .label=${e.name}
              @click=${()=>this._toggleCat(e.device_id)}
            >
              ${e.avatar?a`<img src=${e.avatar} alt="" />`:l}
              <span>${e.name}</span>
            </ha-control-button>
          `)}
      </ha-control-button-group>
    `}};customElements.get("siipet-visit-editor")||customElements.define("siipet-visit-editor",ht);var $e=["ha-card","ha-tile-container","ha-tile-icon","ha-tile-info","ha-control-button","ha-control-button-group","ha-control-select","ha-icon"];async function Jt(i=customElements,t=window){return t.loadCardHelpers&&await t.loadCardHelpers(),$e.filter(e=>i.get(e)===void 0)}var Xt=1800*1e3,Zt=3e3*1e3,be=12;function we(i){return Object.values(i.entities??{}).filter(t=>t.platform==="siipet"&&t.entity_id.startsWith("event.")).map(t=>`${t.entity_id}=${i.states[t.entity_id]?.state??""}`).join("|")}var ut=class extends m{constructor(){super();this._started=!1;this._trailing=!1;this._onVisibilityChange=()=>{document.visibilityState==="visible"&&this._lastRead!==void 0&&Date.now()-this._lastRead>Xt&&this._run(()=>this._refresh())};this._onReady=()=>{this._run(()=>this._refresh())};this._calendars={},this._calendarOpen=!1}static{this.properties={hass:{attribute:!1},_config:{state:!0},_missing:{state:!0},_cats:{state:!0},_cat:{state:!0},_date:{state:!0},_month:{state:!0},_calendars:{state:!0},_first:{state:!0},_calendarOpen:{state:!0},_day:{state:!0},_queue:{state:!0},_error:{state:!0},_editing:{state:!0}}}static{this.styles=q}static getConfigForm(){return{schema:[{name:"cat",selector:{device:{filter:{integration:"siipet",model:"Cat"}}}}],computeLabel:e=>e.name==="cat"?"Cat":void 0,computeHelper:e=>e.name==="cat"?"Optional. Without a cat, the card starts with the first cat.":void 0}}setConfig(e){if(e.cat!==void 0&&(typeof e.cat!="string"||e.cat===""))throw new Error("The cat option must be a device ID.");let s=this._started&&e.cat!==this._config?.cat;this._config=e,s&&(this._started=!1,this._cats=void 0,this._cat=void 0,this._calendars={},this._first=void 0,this._calendarOpen=!1,this._day=void 0,this._queue=void 0,this._error=void 0)}getCardSize(){return 8}getGridOptions(){return{columns:12,min_columns:6,rows:"auto"}}connectedCallback(){if(super.connectedCallback(),document.addEventListener("visibilitychange",this._onVisibilityChange),this._listen(),this._lastRead!==void 0){let e=Date.now()-this._lastRead;e>Xt?this._run(()=>this._refresh()):this._scheduleRenew(Zt-e)}}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("visibilitychange",this._onVisibilityChange),this._connection?.removeEventListener("ready",this._onReady),this._connection=void 0,this._renewTimer!==void 0&&(clearTimeout(this._renewTimer),this._renewTimer=void 0)}willUpdate(e){if(!(!this.hass||!this._config)&&(this._started||(this._started=!0,this._run(()=>this._start())),e.has("hass"))){this._listen();let s=we(this.hass);this._signature!==void 0&&s!==this._signature&&this._showsLatest()&&this._run(()=>this._refresh()),this._signature=s}}_run(e){return this._active?(this._trailing=!0,this._active):(this._active=this._execute(e),this._active)}async _execute(e){try{await e()}finally{this._active=void 0,this._trailing&&(this._trailing=!1,this._run(()=>this._refresh()))}}_scheduleRenew(e=Zt){this._renewTimer!==void 0&&(clearTimeout(this._renewTimer),this._renewTimer=void 0),this.isConnected&&(this._renewTimer=setTimeout(()=>{this.isConnected&&document.visibilityState==="visible"&&this._run(()=>this._refresh())},Math.max(e,0)))}_listen(){let e=this.hass?.connection;!this.isConnected||!e||e===this._connection||(this._connection?.removeEventListener("ready",this._onReady),e.addEventListener("ready",this._onReady),this._connection=e)}_isQueue(){return this._cat!==void 0&&this._cat===this._cats?.unknown.device_id}_showsLatest(){return this._isQueue()||this._date!==void 0&&this._date===this._cats?.today}_firstCat(e){return e.cats[0]?.device_id}_fallbackCat(e){return this._firstCat(e)??(e.unknown.waiting>0?e.unknown.device_id:void 0)}_startCat(e){let s=this._config?.cat;return s===e.unknown.device_id&&e.unknown.waiting>0?s:e.cats.find(n=>n.device_id===s)?.device_id??this._fallbackCat(e)}async _start(){let e=await Jt();if(e.length>0){this._missing=e;return}await this._readCatsAndInit()}async _readCatsAndInit(){let e=await this._readCats();e&&await this._init(e)}async _init(e){this._date=e.today,this._month=y(e.today),this._cat=this._startCat(e),await this._loadSelection()}async _readCats(){try{return this._cats=await Dt(this.hass),this._cats}catch(e){this._error=v(e);return}}async _loadSelection(){if(!(this._cat===void 0||this._date===void 0)){if(this._isQueue()){await this._loadQueue();return}await Promise.all([this._loadDay(),this._loadCalendar(y(this._date))])}}async _loadDay(){let e=this._cat,s=this._date,n=()=>e===this._cat&&s===this._date;try{let r=await Ot(this.hass,s,e);n()&&(this._day=r,this._lastRead=Date.now(),this._scheduleRenew())}catch(r){n()&&(this._error=v(r))}}async _loadQueue(){let e=this._cat;try{let s=await Mt(this.hass);if(e!==this._cat)return;if(this._lastRead=Date.now(),this._scheduleRenew(),this._cats&&(this._cats={...this._cats,unknown:{...this._cats.unknown,waiting:s.visits.length}}),s.visits.length===0){let n=this._cats&&this._firstCat(this._cats);if(n!==void 0){this._selectCat(n);return}}this._queue=s}catch(s){e===this._cat&&(this._error=v(s))}}async _loadCalendar(e){let s=this._cat;try{let n=await Ht(this.hass,e,s);s===this._cat&&(this._calendars={...this._calendars,[e]:n},this._first=n.first)}catch(n){s===this._cat&&(this._error=v(n))}}async _refresh(){if(this._error=void 0,this._missing?.length)return;if(!this._cats){await this._readCatsAndInit();return}let e=this._date,s=e===this._cats.today,n=await this._readCats();if(n){if(s&&this._date===e&&e!==n.today&&(this._date=n.today,this._month=y(n.today)),this._cat===void 0){await this._init(n);return}if(this._isQueue()&&n.unknown.waiting===0){let r=this._firstCat(n);if(r!==void 0){this._selectCat(r);return}}await this._loadSelection()}}_selectCat(e){e!==this._cat&&(this._cat=e,this._calendars={},this._first=void 0,this._calendarOpen=!1,this._day=void 0,this._queue=void 0,this._error=void 0,this._loadSelection())}_goToDay(e){this._date=e,this._month=y(e),this._calendarOpen=!1,this._day=void 0,this._error=void 0,this._loadDay(),this._month in this._calendars||this._loadCalendar(this._month)}_shiftMonth(e){this._month=at(this._month,e),this._error=void 0,this._loadCalendar(this._month)}async _closeEditor(e){let s=this._editing?.event_id;this._editing=void 0,e&&await this._run(()=>this._refresh()),await this.updateComplete,[...this.shadowRoot?.querySelectorAll(".visit")??[]].find(r=>r.dataset.event===s)?.scrollIntoView({block:"nearest"})}_toggleCalendar(){this._month=y(this._date),this._calendarOpen=!this._calendarOpen}render(){if(this._missing?.length)return a`
        <ha-card>
          <div class="message alone missing">
            The card cannot start. The Home Assistant frontend has no ${this._missing.join(", ")}.
          </div>
        </ha-card>
      `;let e=this._cats,s=this._cat,n=a`<div class="message alone">The SiiPet account has no cats.</div>`;return a`
      <ha-card style="--tile-color: var(--state-icon-color)">
        ${e&&!e.available?this._renderNotice(e):l}
        ${e&&s===void 0?n:l}
        ${e&&s!==void 0?this._renderMain(e,s):l}
        ${!e&&this._error?a`<div class="error">${this._error}</div>`:l}
      </ha-card>
    `}_renderNotice(e){let s=f(e.updated_at.slice(0,10));return a`
      <div class="notice">
        SiiPet is not updating. Last update: ${s} ${T(e.updated_at)}.
      </div>
    `}_renderMain(e,s){return this._editing?a`
        <siipet-visit-editor
          .hass=${this.hass}
          .visit=${this._editing}
          .cats=${e.cats}
          @siipet-close=${n=>this._closeEditor(n.detail.changed)}
        ></siipet-visit-editor>
      `:a`
      ${this._renderView(e,s)}
      ${this._error?a`<div class="error">${this._error}</div>`:l}
      ${this._renderVisits()}
    `}_renderView(e,s){let n=Gt(e,s,_=>this._selectCat(_));if(this._isQueue())return lt({icon:"mdi:help",primary:"Unknown",secondary:qt(this._queue?.visits.length??e.unknown.waiting),features:a`${n}`});let r=e.cats.find(_=>_.device_id===s),o=this._date,d=this._month??y(o),c=this._first,h=y(e.today),p=It({date:o,canGoBack:c===void 0||ot(o,-1)>=c,canGoForward:o<e.today,marked:this._calendars[y(o)]?.days[o]?.marked??!1,onShift:_=>this._goToDay(ot(o,_)),onToggle:()=>this._toggleCalendar()}),u=this._calendarOpen?Qt({month:d,calendar:this._calendars[d],selected:o,canGoBack:d>at(h,-be),canGoForward:d<h,onShiftMonth:_=>this._shiftMonth(_),onOpenDay:_=>this._goToDay(_)}):l;return lt({imageUrl:r?.avatar??void 0,icon:r?.avatar?void 0:"mdi:cat",primary:r?.name??"",secondary:this._day?Wt(o,this._day.summary):f(o),features:a`${p} ${u} ${n}`})}_renderVisits(){let e=s=>{this._editing=s};return this._isQueue()?ct(this._queue?.visits,!0,e):ct(this._day?.visits,!1,e)}};customElements.get("siipet-visits-card")||customElements.define("siipet-visits-card",ut);var I=window;I.customCards=I.customCards??[];I.customCards.some(i=>i.type==="siipet-visits-card")||I.customCards.push({type:"siipet-visits-card",name:"SiiPet visits",description:"The litter box visits of each cat, day by day.",preview:!0});export{ut as SiiPetVisitsCard};
