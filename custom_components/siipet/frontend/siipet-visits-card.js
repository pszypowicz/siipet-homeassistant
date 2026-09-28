var M=globalThis,N=M.ShadowRoot&&(M.ShadyCSS===void 0||M.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,z=Symbol(),lt=new WeakMap,E=class{constructor(t,e,i){if(this._$cssResult$=!0,i!==z)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o,e=this.t;if(N&&t===void 0){let i=e!==void 0&&e.length===1;i&&(t=lt.get(e)),t===void 0&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),i&&lt.set(e,t))}return t}toString(){return this.cssText}},ct=s=>new E(typeof s=="string"?s:s+"",void 0,z),q=(s,...t)=>{let e=s.length===1?s[0]:t.reduce((i,n,r)=>i+(o=>{if(o._$cssResult$===!0)return o.cssText;if(typeof o=="number")return o;throw Error("Value passed to 'css' function must be a 'css' function result: "+o+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(n)+s[r+1],s[0]);return new E(e,s,z)},dt=(s,t)=>{if(N)s.adoptedStyleSheets=t.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(let e of t){let i=document.createElement("style"),n=M.litNonce;n!==void 0&&i.setAttribute("nonce",n),i.textContent=e.cssText,s.appendChild(i)}},I=N?s=>s:s=>s instanceof CSSStyleSheet?(t=>{let e="";for(let i of t.cssRules)e+=i.cssText;return ct(e)})(s):s;var{is:Qt,defineProperty:Ft,getOwnPropertyDescriptor:Gt,getOwnPropertyNames:Yt,getOwnPropertySymbols:Kt,getPrototypeOf:Jt}=Object,L=globalThis,ht=L.trustedTypes,Xt=ht?ht.emptyScript:"",Zt=L.reactiveElementPolyfillSupport,T=(s,t)=>s,Q={toAttribute(s,t){switch(t){case Boolean:s=s?Xt:null;break;case Object:case Array:s=s==null?s:JSON.stringify(s)}return s},fromAttribute(s,t){let e=s;switch(t){case Boolean:e=s!==null;break;case Number:e=s===null?null:Number(s);break;case Object:case Array:try{e=JSON.parse(s)}catch{e=null}}return e}},pt=(s,t)=>!Qt(s,t),ut={attribute:!0,type:String,converter:Q,reflect:!1,useDefault:!1,hasChanged:pt};Symbol.metadata??=Symbol("metadata"),L.litPropertyMetadata??=new WeakMap;var _=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=ut){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){let i=Symbol(),n=this.getPropertyDescriptor(t,i,e);n!==void 0&&Ft(this.prototype,t,n)}}static getPropertyDescriptor(t,e,i){let{get:n,set:r}=Gt(this.prototype,t)??{get(){return this[e]},set(o){this[e]=o}};return{get:n,set(o){let d=n?.call(this);r?.call(this,o),this.requestUpdate(t,d,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??ut}static _$Ei(){if(this.hasOwnProperty(T("elementProperties")))return;let t=Jt(this);t.finalize(),t.l!==void 0&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(T("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(T("properties"))){let e=this.properties,i=[...Yt(e),...Kt(e)];for(let n of i)this.createProperty(n,e[n])}let t=this[Symbol.metadata];if(t!==null){let e=litPropertyMetadata.get(t);if(e!==void 0)for(let[i,n]of e)this.elementProperties.set(i,n)}this._$Eh=new Map;for(let[e,i]of this.elementProperties){let n=this._$Eu(e,i);n!==void 0&&this._$Eh.set(n,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){let e=[];if(Array.isArray(t)){let i=new Set(t.flat(1/0).reverse());for(let n of i)e.unshift(I(n))}else t!==void 0&&e.push(I(t));return e}static _$Eu(t,e){let i=e.attribute;return i===!1?void 0:typeof i=="string"?i:typeof t=="string"?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),this.renderRoot!==void 0&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){let t=new Map,e=this.constructor.elementProperties;for(let i of e.keys())this.hasOwnProperty(i)&&(t.set(i,this[i]),delete this[i]);t.size>0&&(this._$Ep=t)}createRenderRoot(){let t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return dt(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,i){this._$AK(t,i)}_$ET(t,e){let i=this.constructor.elementProperties.get(t),n=this.constructor._$Eu(t,i);if(n!==void 0&&i.reflect===!0){let r=(i.converter?.toAttribute!==void 0?i.converter:Q).toAttribute(e,i.type);this._$Em=t,r==null?this.removeAttribute(n):this.setAttribute(n,r),this._$Em=null}}_$AK(t,e){let i=this.constructor,n=i._$Eh.get(t);if(n!==void 0&&this._$Em!==n){let r=i.getPropertyOptions(n),o=typeof r.converter=="function"?{fromAttribute:r.converter}:r.converter?.fromAttribute!==void 0?r.converter:Q;this._$Em=n;let d=o.fromAttribute(e,r.type);this[n]=d??this._$Ej?.get(n)??d,this._$Em=null}}requestUpdate(t,e,i,n=!1,r){if(t!==void 0){let o=this.constructor;if(n===!1&&(r=this[t]),i??=o.getPropertyOptions(t),!((i.hasChanged??pt)(r,e)||i.useDefault&&i.reflect&&r===this._$Ej?.get(t)&&!this.hasAttribute(o._$Eu(t,i))))return;this.C(t,e,i)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(t,e,{useDefault:i,reflect:n,wrapped:r},o){i&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,o??e??this[t]),r!==!0||o!==void 0)||(this._$AL.has(t)||(this.hasUpdated||i||(e=void 0),this._$AL.set(t,e)),n===!0&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}let t=this.scheduleUpdate();return t!=null&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[n,r]of this._$Ep)this[n]=r;this._$Ep=void 0}let i=this.constructor.elementProperties;if(i.size>0)for(let[n,r]of i){let{wrapped:o}=r,d=this[n];o!==!0||this._$AL.has(n)||d===void 0||this.C(n,void 0,r,d)}}let t=!1,e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(i=>i.hostUpdate?.()),this.update(e)):this._$EM()}catch(i){throw t=!1,this._$EM(),i}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(t){}firstUpdated(t){}};_.elementStyles=[],_.shadowRootOptions={mode:"open"},_[T("elementProperties")]=new Map,_[T("finalized")]=new Map,Zt?.({ReactiveElement:_}),(L.reactiveElementVersions??=[]).push("2.1.2");var Z=globalThis,ft=s=>s,V=Z.trustedTypes,_t=V?V.createPolicy("lit-html",{createHTML:s=>s}):void 0,bt="$lit$",y=`lit$${Math.random().toFixed(9).slice(2)}$`,wt="?"+y,te=`<${wt}>`,C=document,k=()=>C.createComment(""),P=s=>s===null||typeof s!="object"&&typeof s!="function",tt=Array.isArray,ee=s=>tt(s)||typeof s?.[Symbol.iterator]=="function",F=`[ 	
\f\r]`,R=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,mt=/-->/g,gt=/>/g,b=RegExp(`>|${F}(?:([^\\s"'>=/]+)(${F}*=${F}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),yt=/'/g,vt=/"/g,Ct=/^(?:script|style|textarea|title)$/i,et=s=>(t,...e)=>({_$litType$:s,strings:t,values:e}),c=et(1),ge=et(2),ye=et(3),A=Symbol.for("lit-noChange"),l=Symbol.for("lit-nothing"),$t=new WeakMap,w=C.createTreeWalker(C,129);function At(s,t){if(!tt(s)||!s.hasOwnProperty("raw"))throw Error("invalid template strings array");return _t!==void 0?_t.createHTML(t):t}var se=(s,t)=>{let e=s.length-1,i=[],n,r=t===2?"<svg>":t===3?"<math>":"",o=R;for(let d=0;d<e;d++){let a=s[d],h,u,p=-1,f=0;for(;f<a.length&&(o.lastIndex=f,u=o.exec(a),u!==null);)f=o.lastIndex,o===R?u[1]==="!--"?o=mt:u[1]!==void 0?o=gt:u[2]!==void 0?(Ct.test(u[2])&&(n=RegExp("</"+u[2],"g")),o=b):u[3]!==void 0&&(o=b):o===b?u[0]===">"?(o=n??R,p=-1):u[1]===void 0?p=-2:(p=o.lastIndex-u[2].length,h=u[1],o=u[3]===void 0?b:u[3]==='"'?vt:yt):o===vt||o===yt?o=b:o===mt||o===gt?o=R:(o=b,n=void 0);let g=o===b&&s[d+1].startsWith("/>")?" ":"";r+=o===R?a+te:p>=0?(i.push(h),a.slice(0,p)+bt+a.slice(p)+y+g):a+y+(p===-2?d:g)}return[At(s,r+(s[e]||"<?>")+(t===2?"</svg>":t===3?"</math>":"")),i]},O=class s{constructor({strings:t,_$litType$:e},i){let n;this.parts=[];let r=0,o=0,d=t.length-1,a=this.parts,[h,u]=se(t,e);if(this.el=s.createElement(h,i),w.currentNode=this.el.content,e===2||e===3){let p=this.el.content.firstChild;p.replaceWith(...p.childNodes)}for(;(n=w.nextNode())!==null&&a.length<d;){if(n.nodeType===1){if(n.hasAttributes())for(let p of n.getAttributeNames())if(p.endsWith(bt)){let f=u[o++],g=n.getAttribute(p).split(y),H=/([.?@])?(.*)/.exec(f);a.push({type:1,index:r,name:H[2],strings:g,ctor:H[1]==="."?Y:H[1]==="?"?K:H[1]==="@"?J:S}),n.removeAttribute(p)}else p.startsWith(y)&&(a.push({type:6,index:r}),n.removeAttribute(p));if(Ct.test(n.tagName)){let p=n.textContent.split(y),f=p.length-1;if(f>0){n.textContent=V?V.emptyScript:"";for(let g=0;g<f;g++)n.append(p[g],k()),w.nextNode(),a.push({type:2,index:++r});n.append(p[f],k())}}}else if(n.nodeType===8)if(n.data===wt)a.push({type:2,index:r});else{let p=-1;for(;(p=n.data.indexOf(y,p+1))!==-1;)a.push({type:7,index:r}),p+=y.length-1}r++}}static createElement(t,e){let i=C.createElement("template");return i.innerHTML=t,i}};function x(s,t,e=s,i){if(t===A)return t;let n=i!==void 0?e._$Co?.[i]:e._$Cl,r=P(t)?void 0:t._$litDirective$;return n?.constructor!==r&&(n?._$AO?.(!1),r===void 0?n=void 0:(n=new r(s),n._$AT(s,e,i)),i!==void 0?(e._$Co??=[])[i]=n:e._$Cl=n),n!==void 0&&(t=x(s,n._$AS(s,t.values),n,i)),t}var G=class{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){let{el:{content:e},parts:i}=this._$AD,n=(t?.creationScope??C).importNode(e,!0);w.currentNode=n;let r=w.nextNode(),o=0,d=0,a=i[0];for(;a!==void 0;){if(o===a.index){let h;a.type===2?h=new D(r,r.nextSibling,this,t):a.type===1?h=new a.ctor(r,a.name,a.strings,this,t):a.type===6&&(h=new X(r,this,t)),this._$AV.push(h),a=i[++d]}o!==a?.index&&(r=w.nextNode(),o++)}return w.currentNode=C,n}p(t){let e=0;for(let i of this._$AV)i!==void 0&&(i.strings!==void 0?(i._$AI(t,i,e),e+=i.strings.length-2):i._$AI(t[e])),e++}},D=class s{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,i,n){this.type=2,this._$AH=l,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=i,this.options=n,this._$Cv=n?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode,e=this._$AM;return e!==void 0&&t?.nodeType===11&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=x(this,t,e),P(t)?t===l||t==null||t===""?(this._$AH!==l&&this._$AR(),this._$AH=l):t!==this._$AH&&t!==A&&this._(t):t._$litType$!==void 0?this.$(t):t.nodeType!==void 0?this.T(t):ee(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==l&&P(this._$AH)?this._$AA.nextSibling.data=t:this.T(C.createTextNode(t)),this._$AH=t}$(t){let{values:e,_$litType$:i}=t,n=typeof i=="number"?this._$AC(t):(i.el===void 0&&(i.el=O.createElement(At(i.h,i.h[0]),this.options)),i);if(this._$AH?._$AD===n)this._$AH.p(e);else{let r=new G(n,this),o=r.u(this.options);r.p(e),this.T(o),this._$AH=r}}_$AC(t){let e=$t.get(t.strings);return e===void 0&&$t.set(t.strings,e=new O(t)),e}k(t){tt(this._$AH)||(this._$AH=[],this._$AR());let e=this._$AH,i,n=0;for(let r of t)n===e.length?e.push(i=new s(this.O(k()),this.O(k()),this,this.options)):i=e[n],i._$AI(r),n++;n<e.length&&(this._$AR(i&&i._$AB.nextSibling,n),e.length=n)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){let i=ft(t).nextSibling;ft(t).remove(),t=i}}setConnected(t){this._$AM===void 0&&(this._$Cv=t,this._$AP?.(t))}},S=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,i,n,r){this.type=1,this._$AH=l,this._$AN=void 0,this.element=t,this.name=e,this._$AM=n,this.options=r,i.length>2||i[0]!==""||i[1]!==""?(this._$AH=Array(i.length-1).fill(new String),this.strings=i):this._$AH=l}_$AI(t,e=this,i,n){let r=this.strings,o=!1;if(r===void 0)t=x(this,t,e,0),o=!P(t)||t!==this._$AH&&t!==A,o&&(this._$AH=t);else{let d=t,a,h;for(t=r[0],a=0;a<r.length-1;a++)h=x(this,d[i+a],e,a),h===A&&(h=this._$AH[a]),o||=!P(h)||h!==this._$AH[a],h===l?t=l:t!==l&&(t+=(h??"")+r[a+1]),this._$AH[a]=h}o&&!n&&this.j(t)}j(t){t===l?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}},Y=class extends S{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===l?void 0:t}},K=class extends S{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==l)}},J=class extends S{constructor(t,e,i,n,r){super(t,e,i,n,r),this.type=5}_$AI(t,e=this){if((t=x(this,t,e,0)??l)===A)return;let i=this._$AH,n=t===l&&i!==l||t.capture!==i.capture||t.once!==i.once||t.passive!==i.passive,r=t!==l&&(i===l||n);n&&this.element.removeEventListener(this.name,this,i),r&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}},X=class{constructor(t,e,i){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=i}get _$AU(){return this._$AM._$AU}_$AI(t){x(this,t)}};var ie=Z.litHtmlPolyfillSupport;ie?.(O,D),(Z.litHtmlVersions??=[]).push("3.3.3");var xt=(s,t,e)=>{let i=e?.renderBefore??t,n=i._$litPart$;if(n===void 0){let r=e?.renderBefore??null;i._$litPart$=n=new D(t.insertBefore(k(),r),r,void 0,e??{})}return n._$AI(s),n};var st=globalThis,v=class extends _{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){let e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=xt(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return A}};v._$litElement$=!0,v.finalized=!0,st.litElementHydrateSupport?.({LitElement:v});var ne=st.litElementPolyfillSupport;ne?.({LitElement:v});(st.litElementVersions??=[]).push("4.2.2");function Et(s){return s.callWS({type:"siipet/cats"})}function Tt(s,t,e){return s.callWS({type:"siipet/day",date:t,cat:e})}function Rt(s){return s.callWS({type:"siipet/queue"})}function kt(s,t,e){return s.callWS({type:"siipet/calendar",month:t,cat:e})}function St(s){if(typeof s=="object"&&s!==null&&"message"in s){let{message:t}=s;return typeof t=="string"&&t!==""?t:void 0}}function U(s){let t=typeof s=="object"&&s!==null&&"error"in s?St(s.error):void 0;return St(s)??t??"The request failed."}function Pt(s,t,e){let[i,n]=s.split("-").map(Number),r=new Date(Date.UTC(i,n-1,1)),o=new Date(Date.UTC(i,n,0)).getUTCDate(),d=(r.getUTCDay()+6)%7,a=Array.from({length:d},()=>({date:null}));for(let h=1;h<=o;h++){let u=`${s}-${String(h).padStart(2,"0")}`;a.push({date:u,day:h,marked:t?.days[u]?.marked??!1,openable:t!==null&&t.first<=u&&u<=t.last,selected:u===e})}return a}var re=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],Ot=["January","February","March","April","May","June","July","August","September","October","November","December"];function j(s){let[t,e,i]=s.split("-").map(Number);return new Date(Date.UTC(t,e-1,i))}function Dt(s){return s.toISOString().slice(0,10)}function $(s){let t=j(s),e=Ot[t.getUTCMonth()].slice(0,3);return`${re[t.getUTCDay()]} ${t.getUTCDate()} ${e}`}function Ut(s){let t=j(`${s}-01`);return`${Ot[t.getUTCMonth()]} ${t.getUTCFullYear()}`}function B(s){return s.slice(11,16)}function Ht(s){let t=Math.floor(s/60),e=s%60;return t===0?`${e} s`:e===0?`${t} min`:`${t} min ${e} s`}function it(s,t){let e=j(s);return e.setUTCDate(e.getUTCDate()+t),Dt(e)}function m(s){return s.slice(0,7)}function nt(s,t){let e=j(`${s}-01`);return e.setUTCMonth(e.getUTCMonth()+t),Dt(e).slice(0,7)}var Mt={poop:{label:"Poop",icon:"mdi:emoticon-poop",color:"var(--brown-color)"},pee:{label:"Pee",icon:"mdi:water",color:"var(--amber-color)"},lingering:{label:"Lingering",icon:"mdi:paw",color:"var(--grey-color)"},unknown:{label:"Unknown",icon:"mdi:help",color:"var(--disabled-color)"}};var oe=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];function Nt(s,t,e){return`${s} ${s===1?t:e}`}function Lt(s,t){let e=[$(s),Nt(t.visits,"visit","visits")];return t.poop>0&&e.push(`${t.poop} poop`),t.pee>0&&e.push(`${t.pee} pee`),t.abnormal>0&&e.push(`${t.abnormal} abnormal`),e.join(" \xB7 ")}function Vt(s){return`${Nt(s,"visit","visits")} waiting`}function rt(s){return c`
    <ha-tile-container class="header">
      <ha-tile-icon slot="icon" .imageUrl=${s.imageUrl} .icon=${s.icon}></ha-tile-icon>
      <ha-tile-info slot="info">
        <span slot="primary">${s.primary}</span>
        <span slot="secondary">${s.secondary}</span>
      </ha-tile-info>
      <div slot="features" class="features">${s.features}</div>
    </ha-tile-container>
  `}function jt(s){return c`
    <ha-control-button-group class="date-bar">
      <ha-control-button
        class="arrow prev-day"
        .label=${"Previous day"}
        .disabled=${!s.canGoBack}
        @click=${()=>s.onShift(-1)}
      >
        <ha-icon icon="mdi:chevron-left"></ha-icon>
      </ha-control-button>
      <ha-control-button class="date" .label=${"Pick a day"} @click=${s.onToggle}>
        <span>${$(s.date)}</span>
        ${s.marked?c`<span class="dot"></span>`:l}
      </ha-control-button>
      <ha-control-button
        class="arrow next-day"
        .label=${"Next day"}
        .disabled=${!s.canGoForward}
        @click=${()=>s.onShift(1)}
      >
        <ha-icon icon="mdi:chevron-right"></ha-icon>
      </ha-control-button>
    </ha-control-button-group>
  `}function Bt(s){let t=Pt(s.month,s.calendar??null,s.selected);return c`
    <div class="calendar">
      <ha-control-button-group class="month-bar">
        <ha-control-button
          class="arrow prev-month"
          .label=${"Previous month"}
          .disabled=${!s.canGoBack}
          @click=${()=>s.onShiftMonth(-1)}
        >
          <ha-icon icon="mdi:chevron-left"></ha-icon>
        </ha-control-button>
        <div class="month-name">${Ut(s.month)}</div>
        <ha-control-button
          class="arrow next-month"
          .label=${"Next month"}
          .disabled=${!s.canGoForward}
          @click=${()=>s.onShiftMonth(1)}
        >
          <ha-icon icon="mdi:chevron-right"></ha-icon>
        </ha-control-button>
      </ha-control-button-group>
      <div class="grid">
        ${oe.map(e=>c`<span class="weekday">${e}</span>`)}
        ${t.map(e=>e.date===null?c`<span class="blank"></span>`:c`
                <ha-control-button
                  class="cell ${e.selected?"selected":""}"
                  data-date=${e.date}
                  .label=${$(e.date)}
                  .disabled=${!e.openable}
                  @click=${()=>s.onOpenDay(e.date)}
                >
                  <span>${e.day}</span>
                  ${e.marked?c`<span class="dot"></span>`:l}
                </ha-control-button>
              `)}
      </div>
    </div>
  `}var ae="width: 20px; height: 20px; border-radius: 50%; object-fit: cover";function Wt(s,t,e){let i=s.cats.map(n=>({value:n.device_id,label:n.name,icon:n.avatar?c`<img src=${n.avatar} alt="" style=${ae} />`:c`<ha-icon icon="mdi:cat"></ha-icon>`}));return s.unknown.waiting>0&&i.push({value:s.unknown.device_id,label:`Unknown (${s.unknown.waiting})`,icon:c`<ha-icon icon="mdi:help"></ha-icon>`}),i.length<2?l:c`
    <ha-control-select
      class="cats"
      .options=${i}
      .value=${t}
      .label=${"Cat"}
      @value-changed=${n=>e(n.detail.value)}
    ></ha-control-select>
  `}function le(s,t){let e=Mt[s.type],i=B(s.start),n=t?`${$(s.start.slice(0,10))} ${i}`:i,r=s.note?c`<ha-icon class="memo" icon="mdi:note-text-outline"></ha-icon>`:l,o=s.abnormal_reasons[0]??"Abnormal",d=s.abnormal?c`<span slot="features-inline" class="chip">${o}</span>`:l,a=s.cover?c`<img class="cover" src=${s.cover} alt="" loading="lazy" />`:l,h=s.stool?c`<img class="stool" src=${s.stool} alt="Stool photo" loading="lazy" />`:l,u=s.has_video?l:c`<span class="camera-only">On camera only</span>`;return c`
    <ha-tile-container class="visit ${s.type}">
      <ha-tile-icon
        slot="icon"
        .icon=${e.icon}
        style="--tile-icon-color: ${e.color}"
      ></ha-tile-icon>
      <ha-tile-info slot="info">
        <span slot="primary">${n}</span>
        <span slot="secondary">${e.label} · ${Ht(s.duration)} ${r}</span>
      </ha-tile-info>
      ${d}
      <div slot="features" class="poster">${a} ${h} ${u}</div>
    </ha-tile-container>
  `}function ot(s,t){return s===void 0?l:s.length===0?c`<div class="message empty">No visits on this day.</div>`:c`<div class="timeline">${s.map(e=>le(e,t))}</div>`}var zt=q`
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
`;var ce=["ha-card","ha-tile-container","ha-tile-icon","ha-tile-info","ha-control-button","ha-control-button-group","ha-control-select","ha-icon"];async function qt(s=customElements,t=window){return t.loadCardHelpers&&await t.loadCardHelpers(),ce.filter(e=>s.get(e)===void 0)}var It=1800*1e3,de=3e3*1e3,he=12;function ue(s){return Object.values(s.entities??{}).filter(t=>t.platform==="siipet"&&t.entity_id.startsWith("event.")).map(t=>`${t.entity_id}=${s.states[t.entity_id]?.state??""}`).join("|")}var at=class extends v{constructor(){super();this._started=!1;this._onVisibilityChange=()=>{document.visibilityState==="visible"&&this._lastRead!==void 0&&Date.now()-this._lastRead>It&&this._refresh()};this._onReady=()=>{this._refresh()};this._calendars={},this._calendarOpen=!1}static{this.properties={hass:{attribute:!1},_config:{state:!0},_missing:{state:!0},_cats:{state:!0},_cat:{state:!0},_date:{state:!0},_month:{state:!0},_calendars:{state:!0},_first:{state:!0},_calendarOpen:{state:!0},_day:{state:!0},_queue:{state:!0},_error:{state:!0}}}static{this.styles=zt}static getConfigForm(){return{schema:[{name:"cat",selector:{device:{filter:{integration:"siipet",model:"Cat"}}}}],computeLabel:e=>e.name==="cat"?"Cat":void 0,computeHelper:e=>e.name==="cat"?"Optional. Without a cat, the card starts with the first cat.":void 0}}setConfig(e){if(e.cat!==void 0&&(typeof e.cat!="string"||e.cat===""))throw new Error("The cat option must be a device ID.");let i=this._started&&e.cat!==this._config?.cat;this._config=e,i&&(this._started=!1,this._cats=void 0,this._cat=void 0,this._calendars={},this._first=void 0,this._calendarOpen=!1,this._day=void 0,this._queue=void 0,this._error=void 0)}getCardSize(){return 8}getGridOptions(){return{columns:12,min_columns:6,rows:"auto"}}connectedCallback(){super.connectedCallback(),document.addEventListener("visibilitychange",this._onVisibilityChange),this._listen(),this._lastRead!==void 0&&Date.now()-this._lastRead>It&&this._refresh()}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("visibilitychange",this._onVisibilityChange),this._connection?.removeEventListener("ready",this._onReady),this._connection=void 0,this._renewTimer!==void 0&&(clearTimeout(this._renewTimer),this._renewTimer=void 0)}willUpdate(e){if(!(!this.hass||!this._config)&&(this._started||(this._started=!0,this._start()),e.has("hass"))){this._listen();let i=ue(this.hass);this._signature!==void 0&&i!==this._signature&&this._showsLatest()&&this._refresh(),this._signature=i}}_scheduleRenew(){this._renewTimer!==void 0&&clearTimeout(this._renewTimer),this._renewTimer=setTimeout(()=>{document.visibilityState==="visible"&&this._refresh()},de)}_listen(){let e=this.hass?.connection;!this.isConnected||!e||e===this._connection||(this._connection?.removeEventListener("ready",this._onReady),e.addEventListener("ready",this._onReady),this._connection=e)}_isQueue(){return this._cat!==void 0&&this._cat===this._cats?.unknown.device_id}_showsLatest(){return this._isQueue()||this._date!==void 0&&this._date===this._cats?.today}_firstCat(e){return e.cats[0]?.device_id}_fallbackCat(e){return this._firstCat(e)??(e.unknown.waiting>0?e.unknown.device_id:void 0)}_startCat(e){let i=this._config?.cat;return i===e.unknown.device_id&&e.unknown.waiting>0?i:e.cats.find(n=>n.device_id===i)?.device_id??this._fallbackCat(e)}async _start(){let e=await qt();if(e.length>0){this._missing=e;return}await this._readCatsAndInit()}async _readCatsAndInit(){let e=await this._readCats();e&&(this._date=e.today,this._month=m(e.today),this._cat=this._startCat(e),await this._loadSelection())}async _readCats(){try{return this._cats=await Et(this.hass),this._cats}catch(e){this._error=U(e);return}}async _loadSelection(){if(!(this._cat===void 0||this._date===void 0)){if(this._isQueue()){await this._loadQueue();return}await Promise.all([this._loadDay(),this._loadCalendar(m(this._date))])}}async _loadDay(){let e=this._cat,i=this._date,n=()=>e===this._cat&&i===this._date;try{let r=await Tt(this.hass,i,e);n()&&(this._day=r,this._lastRead=Date.now(),this._scheduleRenew())}catch(r){n()&&(this._error=U(r))}}async _loadQueue(){let e=this._cat;try{let i=await Rt(this.hass);if(e!==this._cat)return;if(this._lastRead=Date.now(),this._scheduleRenew(),this._cats&&(this._cats={...this._cats,unknown:{...this._cats.unknown,waiting:i.visits.length}}),i.visits.length===0){let n=this._cats&&this._firstCat(this._cats);if(n!==void 0){this._selectCat(n);return}}this._queue=i}catch(i){e===this._cat&&(this._error=U(i))}}async _loadCalendar(e){let i=this._cat;try{let n=await kt(this.hass,e,i);i===this._cat&&(this._calendars={...this._calendars,[e]:n},this._first=n.first)}catch(n){i===this._cat&&(this._error=U(n))}}async _refresh(){if(this._error=void 0,this._missing?.length)return;if(!this._cats){await this._readCatsAndInit();return}let e=this._date,i=e===this._cats.today,n=await this._readCats();if(n){if(i&&this._date===e&&e!==n.today&&(this._date=n.today,this._month=m(n.today)),this._cat===void 0){let r=this._fallbackCat(n);r!==void 0&&this._selectCat(r);return}if(this._isQueue()&&n.unknown.waiting===0){let r=this._firstCat(n);if(r!==void 0){this._selectCat(r);return}}await this._loadSelection()}}_selectCat(e){e!==this._cat&&(this._cat=e,this._calendars={},this._first=void 0,this._calendarOpen=!1,this._day=void 0,this._queue=void 0,this._error=void 0,this._loadSelection())}_goToDay(e){this._date=e,this._month=m(e),this._calendarOpen=!1,this._day=void 0,this._error=void 0,this._loadDay(),this._month in this._calendars||this._loadCalendar(this._month)}_shiftMonth(e){this._month=nt(this._month,e),this._error=void 0,this._loadCalendar(this._month)}_toggleCalendar(){this._month=m(this._date),this._calendarOpen=!this._calendarOpen}render(){if(this._missing?.length)return c`
        <ha-card>
          <div class="message alone missing">
            The card cannot start. The Home Assistant frontend has no ${this._missing.join(", ")}.
          </div>
        </ha-card>
      `;let e=this._cats,i=this._cat,n=c`<div class="message alone">The SiiPet account has no cats.</div>`;return c`
      <ha-card style="--tile-color: var(--state-icon-color)">
        ${e&&!e.available?this._renderNotice(e):l}
        ${e&&i===void 0?n:l}
        ${e&&i!==void 0?this._renderView(e,i):l}
        ${this._error?c`<div class="error">${this._error}</div>`:l}
        ${e&&i!==void 0?this._renderVisits():l}
      </ha-card>
    `}_renderNotice(e){let i=$(e.updated_at.slice(0,10));return c`
      <div class="notice">
        SiiPet is not updating. Last update: ${i} ${B(e.updated_at)}.
      </div>
    `}_renderView(e,i){let n=Wt(e,i,f=>this._selectCat(f));if(this._isQueue())return rt({icon:"mdi:help",primary:"Unknown",secondary:Vt(this._queue?.visits.length??e.unknown.waiting),features:c`${n}`});let r=e.cats.find(f=>f.device_id===i),o=this._date,d=this._month??m(o),a=this._first,h=m(e.today),u=jt({date:o,canGoBack:a===void 0||it(o,-1)>=a,canGoForward:o<e.today,marked:this._calendars[m(o)]?.days[o]?.marked??!1,onShift:f=>this._goToDay(it(o,f)),onToggle:()=>this._toggleCalendar()}),p=this._calendarOpen?Bt({month:d,calendar:this._calendars[d],selected:o,canGoBack:d>nt(h,-he),canGoForward:d<h,onShiftMonth:f=>this._shiftMonth(f),onOpenDay:f=>this._goToDay(f)}):l;return rt({imageUrl:r?.avatar??void 0,icon:r?.avatar?void 0:"mdi:cat",primary:r?.name??"",secondary:this._day?Lt(o,this._day.summary):$(o),features:c`${u} ${p} ${n}`})}_renderVisits(){return this._isQueue()?ot(this._queue?.visits,!0):ot(this._day?.visits,!1)}};customElements.get("siipet-visits-card")||customElements.define("siipet-visits-card",at);var W=window;W.customCards=W.customCards??[];W.customCards.some(s=>s.type==="siipet-visits-card")||W.customCards.push({type:"siipet-visits-card",name:"SiiPet visits",description:"The litter box visits of each cat, day by day.",preview:!0});export{at as SiiPetVisitsCard};
