var M=globalThis,N=M.ShadowRoot&&(M.ShadyCSS===void 0||M.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,z=Symbol(),lt=new WeakMap,E=class{constructor(t,e,s){if(this._$cssResult$=!0,s!==z)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o,e=this.t;if(N&&t===void 0){let s=e!==void 0&&e.length===1;s&&(t=lt.get(e)),t===void 0&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),s&&lt.set(e,t))}return t}toString(){return this.cssText}},ct=i=>new E(typeof i=="string"?i:i+"",void 0,z),q=(i,...t)=>{let e=i.length===1?i[0]:t.reduce((s,n,r)=>s+(o=>{if(o._$cssResult$===!0)return o.cssText;if(typeof o=="number")return o;throw Error("Value passed to 'css' function must be a 'css' function result: "+o+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(n)+i[r+1],i[0]);return new E(e,i,z)},dt=(i,t)=>{if(N)i.adoptedStyleSheets=t.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(let e of t){let s=document.createElement("style"),n=M.litNonce;n!==void 0&&s.setAttribute("nonce",n),s.textContent=e.cssText,i.appendChild(s)}},I=N?i=>i:i=>i instanceof CSSStyleSheet?(t=>{let e="";for(let s of t.cssRules)e+=s.cssText;return ct(e)})(i):i;var{is:Ft,defineProperty:Gt,getOwnPropertyDescriptor:Yt,getOwnPropertyNames:Kt,getOwnPropertySymbols:Jt,getPrototypeOf:Xt}=Object,L=globalThis,ht=L.trustedTypes,Zt=ht?ht.emptyScript:"",te=L.reactiveElementPolyfillSupport,T=(i,t)=>i,Q={toAttribute(i,t){switch(t){case Boolean:i=i?Zt:null;break;case Object:case Array:i=i==null?i:JSON.stringify(i)}return i},fromAttribute(i,t){let e=i;switch(t){case Boolean:e=i!==null;break;case Number:e=i===null?null:Number(i);break;case Object:case Array:try{e=JSON.parse(i)}catch{e=null}}return e}},pt=(i,t)=>!Ft(i,t),ut={attribute:!0,type:String,converter:Q,reflect:!1,useDefault:!1,hasChanged:pt};Symbol.metadata??=Symbol("metadata"),L.litPropertyMetadata??=new WeakMap;var f=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=ut){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){let s=Symbol(),n=this.getPropertyDescriptor(t,s,e);n!==void 0&&Gt(this.prototype,t,n)}}static getPropertyDescriptor(t,e,s){let{get:n,set:r}=Yt(this.prototype,t)??{get(){return this[e]},set(o){this[e]=o}};return{get:n,set(o){let d=n?.call(this);r?.call(this,o),this.requestUpdate(t,d,s)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??ut}static _$Ei(){if(this.hasOwnProperty(T("elementProperties")))return;let t=Xt(this);t.finalize(),t.l!==void 0&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(T("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(T("properties"))){let e=this.properties,s=[...Kt(e),...Jt(e)];for(let n of s)this.createProperty(n,e[n])}let t=this[Symbol.metadata];if(t!==null){let e=litPropertyMetadata.get(t);if(e!==void 0)for(let[s,n]of e)this.elementProperties.set(s,n)}this._$Eh=new Map;for(let[e,s]of this.elementProperties){let n=this._$Eu(e,s);n!==void 0&&this._$Eh.set(n,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){let e=[];if(Array.isArray(t)){let s=new Set(t.flat(1/0).reverse());for(let n of s)e.unshift(I(n))}else t!==void 0&&e.push(I(t));return e}static _$Eu(t,e){let s=e.attribute;return s===!1?void 0:typeof s=="string"?s:typeof t=="string"?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),this.renderRoot!==void 0&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){let t=new Map,e=this.constructor.elementProperties;for(let s of e.keys())this.hasOwnProperty(s)&&(t.set(s,this[s]),delete this[s]);t.size>0&&(this._$Ep=t)}createRenderRoot(){let t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return dt(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,s){this._$AK(t,s)}_$ET(t,e){let s=this.constructor.elementProperties.get(t),n=this.constructor._$Eu(t,s);if(n!==void 0&&s.reflect===!0){let r=(s.converter?.toAttribute!==void 0?s.converter:Q).toAttribute(e,s.type);this._$Em=t,r==null?this.removeAttribute(n):this.setAttribute(n,r),this._$Em=null}}_$AK(t,e){let s=this.constructor,n=s._$Eh.get(t);if(n!==void 0&&this._$Em!==n){let r=s.getPropertyOptions(n),o=typeof r.converter=="function"?{fromAttribute:r.converter}:r.converter?.fromAttribute!==void 0?r.converter:Q;this._$Em=n;let d=o.fromAttribute(e,r.type);this[n]=d??this._$Ej?.get(n)??d,this._$Em=null}}requestUpdate(t,e,s,n=!1,r){if(t!==void 0){let o=this.constructor;if(n===!1&&(r=this[t]),s??=o.getPropertyOptions(t),!((s.hasChanged??pt)(r,e)||s.useDefault&&s.reflect&&r===this._$Ej?.get(t)&&!this.hasAttribute(o._$Eu(t,s))))return;this.C(t,e,s)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(t,e,{useDefault:s,reflect:n,wrapped:r},o){s&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,o??e??this[t]),r!==!0||o!==void 0)||(this._$AL.has(t)||(this.hasUpdated||s||(e=void 0),this._$AL.set(t,e)),n===!0&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}let t=this.scheduleUpdate();return t!=null&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[n,r]of this._$Ep)this[n]=r;this._$Ep=void 0}let s=this.constructor.elementProperties;if(s.size>0)for(let[n,r]of s){let{wrapped:o}=r,d=this[n];o!==!0||this._$AL.has(n)||d===void 0||this.C(n,void 0,r,d)}}let t=!1,e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(s=>s.hostUpdate?.()),this.update(e)):this._$EM()}catch(s){throw t=!1,this._$EM(),s}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(t){}firstUpdated(t){}};f.elementStyles=[],f.shadowRootOptions={mode:"open"},f[T("elementProperties")]=new Map,f[T("finalized")]=new Map,te?.({ReactiveElement:f}),(L.reactiveElementVersions??=[]).push("2.1.2");var Z=globalThis,_t=i=>i,V=Z.trustedTypes,ft=V?V.createPolicy("lit-html",{createHTML:i=>i}):void 0,bt="$lit$",v=`lit$${Math.random().toFixed(9).slice(2)}$`,wt="?"+v,ee=`<${wt}>`,C=document,P=()=>C.createComment(""),k=i=>i===null||typeof i!="object"&&typeof i!="function",tt=Array.isArray,ie=i=>tt(i)||typeof i?.[Symbol.iterator]=="function",F=`[ 	
\f\r]`,R=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,mt=/-->/g,gt=/>/g,b=RegExp(`>|${F}(?:([^\\s"'>=/]+)(${F}*=${F}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),vt=/'/g,yt=/"/g,Ct=/^(?:script|style|textarea|title)$/i,et=i=>(t,...e)=>({_$litType$:i,strings:t,values:e}),c=et(1),ge=et(2),ve=et(3),A=Symbol.for("lit-noChange"),l=Symbol.for("lit-nothing"),$t=new WeakMap,w=C.createTreeWalker(C,129);function At(i,t){if(!tt(i)||!i.hasOwnProperty("raw"))throw Error("invalid template strings array");return ft!==void 0?ft.createHTML(t):t}var se=(i,t)=>{let e=i.length-1,s=[],n,r=t===2?"<svg>":t===3?"<math>":"",o=R;for(let d=0;d<e;d++){let a=i[d],h,u,p=-1,_=0;for(;_<a.length&&(o.lastIndex=_,u=o.exec(a),u!==null);)_=o.lastIndex,o===R?u[1]==="!--"?o=mt:u[1]!==void 0?o=gt:u[2]!==void 0?(Ct.test(u[2])&&(n=RegExp("</"+u[2],"g")),o=b):u[3]!==void 0&&(o=b):o===b?u[0]===">"?(o=n??R,p=-1):u[1]===void 0?p=-2:(p=o.lastIndex-u[2].length,h=u[1],o=u[3]===void 0?b:u[3]==='"'?yt:vt):o===yt||o===vt?o=b:o===mt||o===gt?o=R:(o=b,n=void 0);let g=o===b&&i[d+1].startsWith("/>")?" ":"";r+=o===R?a+ee:p>=0?(s.push(h),a.slice(0,p)+bt+a.slice(p)+v+g):a+v+(p===-2?d:g)}return[At(i,r+(i[e]||"<?>")+(t===2?"</svg>":t===3?"</math>":"")),s]},O=class i{constructor({strings:t,_$litType$:e},s){let n;this.parts=[];let r=0,o=0,d=t.length-1,a=this.parts,[h,u]=se(t,e);if(this.el=i.createElement(h,s),w.currentNode=this.el.content,e===2||e===3){let p=this.el.content.firstChild;p.replaceWith(...p.childNodes)}for(;(n=w.nextNode())!==null&&a.length<d;){if(n.nodeType===1){if(n.hasAttributes())for(let p of n.getAttributeNames())if(p.endsWith(bt)){let _=u[o++],g=n.getAttribute(p).split(v),H=/([.?@])?(.*)/.exec(_);a.push({type:1,index:r,name:H[2],strings:g,ctor:H[1]==="."?Y:H[1]==="?"?K:H[1]==="@"?J:S}),n.removeAttribute(p)}else p.startsWith(v)&&(a.push({type:6,index:r}),n.removeAttribute(p));if(Ct.test(n.tagName)){let p=n.textContent.split(v),_=p.length-1;if(_>0){n.textContent=V?V.emptyScript:"";for(let g=0;g<_;g++)n.append(p[g],P()),w.nextNode(),a.push({type:2,index:++r});n.append(p[_],P())}}}else if(n.nodeType===8)if(n.data===wt)a.push({type:2,index:r});else{let p=-1;for(;(p=n.data.indexOf(v,p+1))!==-1;)a.push({type:7,index:r}),p+=v.length-1}r++}}static createElement(t,e){let s=C.createElement("template");return s.innerHTML=t,s}};function x(i,t,e=i,s){if(t===A)return t;let n=s!==void 0?e._$Co?.[s]:e._$Cl,r=k(t)?void 0:t._$litDirective$;return n?.constructor!==r&&(n?._$AO?.(!1),r===void 0?n=void 0:(n=new r(i),n._$AT(i,e,s)),s!==void 0?(e._$Co??=[])[s]=n:e._$Cl=n),n!==void 0&&(t=x(i,n._$AS(i,t.values),n,s)),t}var G=class{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){let{el:{content:e},parts:s}=this._$AD,n=(t?.creationScope??C).importNode(e,!0);w.currentNode=n;let r=w.nextNode(),o=0,d=0,a=s[0];for(;a!==void 0;){if(o===a.index){let h;a.type===2?h=new D(r,r.nextSibling,this,t):a.type===1?h=new a.ctor(r,a.name,a.strings,this,t):a.type===6&&(h=new X(r,this,t)),this._$AV.push(h),a=s[++d]}o!==a?.index&&(r=w.nextNode(),o++)}return w.currentNode=C,n}p(t){let e=0;for(let s of this._$AV)s!==void 0&&(s.strings!==void 0?(s._$AI(t,s,e),e+=s.strings.length-2):s._$AI(t[e])),e++}},D=class i{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,s,n){this.type=2,this._$AH=l,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=s,this.options=n,this._$Cv=n?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode,e=this._$AM;return e!==void 0&&t?.nodeType===11&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=x(this,t,e),k(t)?t===l||t==null||t===""?(this._$AH!==l&&this._$AR(),this._$AH=l):t!==this._$AH&&t!==A&&this._(t):t._$litType$!==void 0?this.$(t):t.nodeType!==void 0?this.T(t):ie(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==l&&k(this._$AH)?this._$AA.nextSibling.data=t:this.T(C.createTextNode(t)),this._$AH=t}$(t){let{values:e,_$litType$:s}=t,n=typeof s=="number"?this._$AC(t):(s.el===void 0&&(s.el=O.createElement(At(s.h,s.h[0]),this.options)),s);if(this._$AH?._$AD===n)this._$AH.p(e);else{let r=new G(n,this),o=r.u(this.options);r.p(e),this.T(o),this._$AH=r}}_$AC(t){let e=$t.get(t.strings);return e===void 0&&$t.set(t.strings,e=new O(t)),e}k(t){tt(this._$AH)||(this._$AH=[],this._$AR());let e=this._$AH,s,n=0;for(let r of t)n===e.length?e.push(s=new i(this.O(P()),this.O(P()),this,this.options)):s=e[n],s._$AI(r),n++;n<e.length&&(this._$AR(s&&s._$AB.nextSibling,n),e.length=n)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){let s=_t(t).nextSibling;_t(t).remove(),t=s}}setConnected(t){this._$AM===void 0&&(this._$Cv=t,this._$AP?.(t))}},S=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,s,n,r){this.type=1,this._$AH=l,this._$AN=void 0,this.element=t,this.name=e,this._$AM=n,this.options=r,s.length>2||s[0]!==""||s[1]!==""?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=l}_$AI(t,e=this,s,n){let r=this.strings,o=!1;if(r===void 0)t=x(this,t,e,0),o=!k(t)||t!==this._$AH&&t!==A,o&&(this._$AH=t);else{let d=t,a,h;for(t=r[0],a=0;a<r.length-1;a++)h=x(this,d[s+a],e,a),h===A&&(h=this._$AH[a]),o||=!k(h)||h!==this._$AH[a],h===l?t=l:t!==l&&(t+=(h??"")+r[a+1]),this._$AH[a]=h}o&&!n&&this.j(t)}j(t){t===l?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}},Y=class extends S{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===l?void 0:t}},K=class extends S{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==l)}},J=class extends S{constructor(t,e,s,n,r){super(t,e,s,n,r),this.type=5}_$AI(t,e=this){if((t=x(this,t,e,0)??l)===A)return;let s=this._$AH,n=t===l&&s!==l||t.capture!==s.capture||t.once!==s.once||t.passive!==s.passive,r=t!==l&&(s===l||n);n&&this.element.removeEventListener(this.name,this,s),r&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}},X=class{constructor(t,e,s){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=s}get _$AU(){return this._$AM._$AU}_$AI(t){x(this,t)}};var ne=Z.litHtmlPolyfillSupport;ne?.(O,D),(Z.litHtmlVersions??=[]).push("3.3.3");var xt=(i,t,e)=>{let s=e?.renderBefore??t,n=s._$litPart$;if(n===void 0){let r=e?.renderBefore??null;s._$litPart$=n=new D(t.insertBefore(P(),r),r,void 0,e??{})}return n._$AI(i),n};var it=globalThis,y=class extends f{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){let e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=xt(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return A}};y._$litElement$=!0,y.finalized=!0,it.litElementHydrateSupport?.({LitElement:y});var re=it.litElementPolyfillSupport;re?.({LitElement:y});(it.litElementVersions??=[]).push("4.2.2");function Et(i){return i.callWS({type:"siipet/cats"})}function Tt(i,t,e){return i.callWS({type:"siipet/day",date:t,cat:e})}function Rt(i){return i.callWS({type:"siipet/queue"})}function Pt(i,t,e){return i.callWS({type:"siipet/calendar",month:t,cat:e})}function St(i){if(typeof i=="object"&&i!==null&&"message"in i){let{message:t}=i;return typeof t=="string"&&t!==""?t:void 0}}function U(i){let t=typeof i=="object"&&i!==null&&"error"in i?St(i.error):void 0;return St(i)??t??"The request failed."}function kt(i,t,e){let[s,n]=i.split("-").map(Number),r=new Date(Date.UTC(s,n-1,1)),o=new Date(Date.UTC(s,n,0)).getUTCDate(),d=(r.getUTCDay()+6)%7,a=Array.from({length:d},()=>({date:null}));for(let h=1;h<=o;h++){let u=`${i}-${String(h).padStart(2,"0")}`;a.push({date:u,day:h,marked:t?.days[u]?.marked??!1,openable:t!==null&&t.first<=u&&u<=t.last,selected:u===e})}return a}var oe=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],Ot=["January","February","March","April","May","June","July","August","September","October","November","December"];function j(i){let[t,e,s]=i.split("-").map(Number);return new Date(Date.UTC(t,e-1,s))}function Dt(i){return i.toISOString().slice(0,10)}function $(i){let t=j(i),e=Ot[t.getUTCMonth()].slice(0,3);return`${oe[t.getUTCDay()]} ${t.getUTCDate()} ${e}`}function Ut(i){let t=j(`${i}-01`);return`${Ot[t.getUTCMonth()]} ${t.getUTCFullYear()}`}function B(i){return i.slice(11,16)}function Ht(i){let t=Math.floor(i/60),e=i%60;return t===0?`${e} s`:e===0?`${t} min`:`${t} min ${e} s`}function st(i,t){let e=j(i);return e.setUTCDate(e.getUTCDate()+t),Dt(e)}function m(i){return i.slice(0,7)}function nt(i,t){let e=j(`${i}-01`);return e.setUTCMonth(e.getUTCMonth()+t),Dt(e).slice(0,7)}var Mt={poop:{label:"Poop",icon:"mdi:emoticon-poop",color:"var(--brown-color)"},pee:{label:"Pee",icon:"mdi:water",color:"var(--amber-color)"},lingering:{label:"Lingering",icon:"mdi:paw",color:"var(--grey-color)"},unknown:{label:"Unknown",icon:"mdi:help",color:"var(--disabled-color)"}};var ae=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];function Nt(i,t,e){return`${i} ${i===1?t:e}`}function Lt(i,t){let e=[$(i),Nt(t.visits,"visit","visits")];return t.poop>0&&e.push(`${t.poop} poop`),t.pee>0&&e.push(`${t.pee} pee`),t.abnormal>0&&e.push(`${t.abnormal} abnormal`),e.join(" \xB7 ")}function Vt(i){return`${Nt(i,"visit","visits")} waiting`}function rt(i){return c`
    <ha-tile-container class="header">
      <ha-tile-icon slot="icon" .imageUrl=${i.imageUrl} .icon=${i.icon}></ha-tile-icon>
      <ha-tile-info slot="info">
        <span slot="primary">${i.primary}</span>
        <span slot="secondary">${i.secondary}</span>
      </ha-tile-info>
      <div slot="features" class="features">${i.features}</div>
    </ha-tile-container>
  `}function jt(i){return c`
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
        <span>${$(i.date)}</span>
        ${i.marked?c`<span class="dot"></span>`:l}
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
  `}function Bt(i){let t=kt(i.month,i.calendar??null,i.selected);return c`
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
        <div class="month-name">${Ut(i.month)}</div>
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
        ${ae.map(e=>c`<span class="weekday">${e}</span>`)}
        ${t.map(e=>e.date===null?c`<span class="blank"></span>`:c`
                <ha-control-button
                  class="cell ${e.selected?"selected":""}"
                  data-date=${e.date}
                  .label=${$(e.date)}
                  .disabled=${!e.openable}
                  @click=${()=>i.onOpenDay(e.date)}
                >
                  <span>${e.day}</span>
                  ${e.marked?c`<span class="dot"></span>`:l}
                </ha-control-button>
              `)}
      </div>
    </div>
  `}var le="width: 20px; height: 20px; border-radius: 50%; object-fit: cover";function Wt(i,t,e){let s=i.cats.map(n=>({value:n.device_id,label:n.name,icon:n.avatar?c`<img src=${n.avatar} alt="" style=${le} />`:c`<ha-icon icon="mdi:cat"></ha-icon>`}));return i.unknown.waiting>0&&s.push({value:i.unknown.device_id,label:`Unknown (${i.unknown.waiting})`,icon:c`<ha-icon icon="mdi:help"></ha-icon>`}),s.length<2?l:c`
    <ha-control-select
      class="cats"
      .options=${s}
      .value=${t}
      .label=${"Cat"}
      @value-changed=${n=>e(n.detail.value)}
    ></ha-control-select>
  `}function ce(i,t){let e=Mt[i.type],s=B(i.start),n=t?`${$(i.start.slice(0,10))} ${s}`:s,r=i.note?c`<ha-icon class="memo" icon="mdi:note-text-outline"></ha-icon>`:l,o=i.abnormal_reasons[0]??"Abnormal",d=i.abnormal?c`<span slot="features-inline" class="chip">${o}</span>`:l,a=i.cover?c`<img class="cover" src=${i.cover} alt="" loading="lazy" />`:l,h=i.stool?c`<img class="stool" src=${i.stool} alt="Stool photo" loading="lazy" />`:l,u=i.has_video?l:c`<span class="camera-only">On camera only</span>`;return c`
    <ha-tile-container class="visit ${i.type}">
      <ha-tile-icon
        slot="icon"
        .icon=${e.icon}
        style="--tile-icon-color: ${e.color}"
      ></ha-tile-icon>
      <ha-tile-info slot="info">
        <span slot="primary">${n}</span>
        <span slot="secondary">${e.label} · ${Ht(i.duration)} ${r}</span>
      </ha-tile-info>
      ${d}
      <div slot="features" class="poster">${a} ${h} ${u}</div>
    </ha-tile-container>
  `}function ot(i,t){return i===void 0?l:i.length===0?c`<div class="message empty">No visits on this day.</div>`:c`<div class="timeline">${i.map(e=>ce(e,t))}</div>`}var zt=q`
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
  .poster {
    position: relative;
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
`;var de=["ha-card","ha-tile-container","ha-tile-icon","ha-tile-info","ha-control-button","ha-control-button-group","ha-control-select","ha-icon"];async function qt(i=customElements,t=window){return t.loadCardHelpers&&await t.loadCardHelpers(),de.filter(e=>i.get(e)===void 0)}var It=1800*1e3,Qt=3e3*1e3,he=12;function ue(i){return Object.values(i.entities??{}).filter(t=>t.platform==="siipet"&&t.entity_id.startsWith("event.")).map(t=>`${t.entity_id}=${i.states[t.entity_id]?.state??""}`).join("|")}var at=class extends y{constructor(){super();this._started=!1;this._trailing=!1;this._onVisibilityChange=()=>{document.visibilityState==="visible"&&this._lastRead!==void 0&&Date.now()-this._lastRead>It&&this._run(()=>this._refresh())};this._onReady=()=>{this._run(()=>this._refresh())};this._calendars={},this._calendarOpen=!1}static{this.properties={hass:{attribute:!1},_config:{state:!0},_missing:{state:!0},_cats:{state:!0},_cat:{state:!0},_date:{state:!0},_month:{state:!0},_calendars:{state:!0},_first:{state:!0},_calendarOpen:{state:!0},_day:{state:!0},_queue:{state:!0},_error:{state:!0}}}static{this.styles=zt}static getConfigForm(){return{schema:[{name:"cat",selector:{device:{filter:{integration:"siipet",model:"Cat"}}}}],computeLabel:e=>e.name==="cat"?"Cat":void 0,computeHelper:e=>e.name==="cat"?"Optional. Without a cat, the card starts with the first cat.":void 0}}setConfig(e){if(e.cat!==void 0&&(typeof e.cat!="string"||e.cat===""))throw new Error("The cat option must be a device ID.");let s=this._started&&e.cat!==this._config?.cat;this._config=e,s&&(this._started=!1,this._cats=void 0,this._cat=void 0,this._calendars={},this._first=void 0,this._calendarOpen=!1,this._day=void 0,this._queue=void 0,this._error=void 0)}getCardSize(){return 8}getGridOptions(){return{columns:12,min_columns:6,rows:"auto"}}connectedCallback(){if(super.connectedCallback(),document.addEventListener("visibilitychange",this._onVisibilityChange),this._listen(),this._lastRead!==void 0){let e=Date.now()-this._lastRead;e>It?this._run(()=>this._refresh()):this._scheduleRenew(Qt-e)}}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("visibilitychange",this._onVisibilityChange),this._connection?.removeEventListener("ready",this._onReady),this._connection=void 0,this._renewTimer!==void 0&&(clearTimeout(this._renewTimer),this._renewTimer=void 0)}willUpdate(e){if(!(!this.hass||!this._config)&&(this._started||(this._started=!0,this._run(()=>this._start())),e.has("hass"))){this._listen();let s=ue(this.hass);this._signature!==void 0&&s!==this._signature&&this._showsLatest()&&this._run(()=>this._refresh()),this._signature=s}}_run(e){return this._active?(this._trailing=!0,this._active):(this._active=this._execute(e),this._active)}async _execute(e){try{await e()}finally{this._active=void 0,this._trailing&&(this._trailing=!1,this._run(()=>this._refresh()))}}_scheduleRenew(e=Qt){this._renewTimer!==void 0&&(clearTimeout(this._renewTimer),this._renewTimer=void 0),this.isConnected&&(this._renewTimer=setTimeout(()=>{this.isConnected&&document.visibilityState==="visible"&&this._run(()=>this._refresh())},Math.max(e,0)))}_listen(){let e=this.hass?.connection;!this.isConnected||!e||e===this._connection||(this._connection?.removeEventListener("ready",this._onReady),e.addEventListener("ready",this._onReady),this._connection=e)}_isQueue(){return this._cat!==void 0&&this._cat===this._cats?.unknown.device_id}_showsLatest(){return this._isQueue()||this._date!==void 0&&this._date===this._cats?.today}_firstCat(e){return e.cats[0]?.device_id}_fallbackCat(e){return this._firstCat(e)??(e.unknown.waiting>0?e.unknown.device_id:void 0)}_startCat(e){let s=this._config?.cat;return s===e.unknown.device_id&&e.unknown.waiting>0?s:e.cats.find(n=>n.device_id===s)?.device_id??this._fallbackCat(e)}async _start(){let e=await qt();if(e.length>0){this._missing=e;return}await this._readCatsAndInit()}async _readCatsAndInit(){let e=await this._readCats();e&&(this._date=e.today,this._month=m(e.today),this._cat=this._startCat(e),await this._loadSelection())}async _readCats(){try{return this._cats=await Et(this.hass),this._cats}catch(e){this._error=U(e);return}}async _loadSelection(){if(!(this._cat===void 0||this._date===void 0)){if(this._isQueue()){await this._loadQueue();return}await Promise.all([this._loadDay(),this._loadCalendar(m(this._date))])}}async _loadDay(){let e=this._cat,s=this._date,n=()=>e===this._cat&&s===this._date;try{let r=await Tt(this.hass,s,e);n()&&(this._day=r,this._lastRead=Date.now(),this._scheduleRenew())}catch(r){n()&&(this._error=U(r))}}async _loadQueue(){let e=this._cat;try{let s=await Rt(this.hass);if(e!==this._cat)return;if(this._lastRead=Date.now(),this._scheduleRenew(),this._cats&&(this._cats={...this._cats,unknown:{...this._cats.unknown,waiting:s.visits.length}}),s.visits.length===0){let n=this._cats&&this._firstCat(this._cats);if(n!==void 0){this._selectCat(n);return}}this._queue=s}catch(s){e===this._cat&&(this._error=U(s))}}async _loadCalendar(e){let s=this._cat;try{let n=await Pt(this.hass,e,s);s===this._cat&&(this._calendars={...this._calendars,[e]:n},this._first=n.first)}catch(n){s===this._cat&&(this._error=U(n))}}async _refresh(){if(this._error=void 0,this._missing?.length)return;if(!this._cats){await this._readCatsAndInit();return}let e=this._date,s=e===this._cats.today,n=await this._readCats();if(n){if(s&&this._date===e&&e!==n.today&&(this._date=n.today,this._month=m(n.today)),this._cat===void 0){let r=this._fallbackCat(n);r!==void 0&&this._selectCat(r);return}if(this._isQueue()&&n.unknown.waiting===0){let r=this._firstCat(n);if(r!==void 0){this._selectCat(r);return}}await this._loadSelection()}}_selectCat(e){e!==this._cat&&(this._cat=e,this._calendars={},this._first=void 0,this._calendarOpen=!1,this._day=void 0,this._queue=void 0,this._error=void 0,this._loadSelection())}_goToDay(e){this._date=e,this._month=m(e),this._calendarOpen=!1,this._day=void 0,this._error=void 0,this._loadDay(),this._month in this._calendars||this._loadCalendar(this._month)}_shiftMonth(e){this._month=nt(this._month,e),this._error=void 0,this._loadCalendar(this._month)}_toggleCalendar(){this._month=m(this._date),this._calendarOpen=!this._calendarOpen}render(){if(this._missing?.length)return c`
        <ha-card>
          <div class="message alone missing">
            The card cannot start. The Home Assistant frontend has no ${this._missing.join(", ")}.
          </div>
        </ha-card>
      `;let e=this._cats,s=this._cat,n=c`<div class="message alone">The SiiPet account has no cats.</div>`;return c`
      <ha-card style="--tile-color: var(--state-icon-color)">
        ${e&&!e.available?this._renderNotice(e):l}
        ${e&&s===void 0?n:l}
        ${e&&s!==void 0?this._renderView(e,s):l}
        ${this._error?c`<div class="error">${this._error}</div>`:l}
        ${e&&s!==void 0?this._renderVisits():l}
      </ha-card>
    `}_renderNotice(e){let s=$(e.updated_at.slice(0,10));return c`
      <div class="notice">
        SiiPet is not updating. Last update: ${s} ${B(e.updated_at)}.
      </div>
    `}_renderView(e,s){let n=Wt(e,s,_=>this._selectCat(_));if(this._isQueue())return rt({icon:"mdi:help",primary:"Unknown",secondary:Vt(this._queue?.visits.length??e.unknown.waiting),features:c`${n}`});let r=e.cats.find(_=>_.device_id===s),o=this._date,d=this._month??m(o),a=this._first,h=m(e.today),u=jt({date:o,canGoBack:a===void 0||st(o,-1)>=a,canGoForward:o<e.today,marked:this._calendars[m(o)]?.days[o]?.marked??!1,onShift:_=>this._goToDay(st(o,_)),onToggle:()=>this._toggleCalendar()}),p=this._calendarOpen?Bt({month:d,calendar:this._calendars[d],selected:o,canGoBack:d>nt(h,-he),canGoForward:d<h,onShiftMonth:_=>this._shiftMonth(_),onOpenDay:_=>this._goToDay(_)}):l;return rt({imageUrl:r?.avatar??void 0,icon:r?.avatar?void 0:"mdi:cat",primary:r?.name??"",secondary:this._day?Lt(o,this._day.summary):$(o),features:c`${u} ${p} ${n}`})}_renderVisits(){return this._isQueue()?ot(this._queue?.visits,!0):ot(this._day?.visits,!1)}};customElements.get("siipet-visits-card")||customElements.define("siipet-visits-card",at);var W=window;W.customCards=W.customCards??[];W.customCards.some(i=>i.type==="siipet-visits-card")||W.customCards.push({type:"siipet-visits-card",name:"SiiPet visits",description:"The litter box visits of each cat, day by day.",preview:!0});export{at as SiiPetVisitsCard};
