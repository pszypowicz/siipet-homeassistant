var N=globalThis,j=N.ShadowRoot&&(N.ShadyCSS===void 0||N.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,Q=Symbol(),_t=new WeakMap,R=class{constructor(e,t,i){if(this._$cssResult$=!0,i!==Q)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o,t=this.t;if(j&&e===void 0){let i=t!==void 0&&t.length===1;i&&(e=_t.get(t)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),i&&_t.set(t,e))}return e}toString(){return this.cssText}},ft=s=>new R(typeof s=="string"?s:s+"",void 0,Q),P=(s,...e)=>{let t=s.length===1?s[0]:e.reduce((i,n,r)=>i+(o=>{if(o._$cssResult$===!0)return o.cssText;if(typeof o=="number")return o;throw Error("Value passed to 'css' function must be a 'css' function result: "+o+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(n)+s[r+1],s[0]);return new R(t,s,Q)},mt=(s,e)=>{if(j)s.adoptedStyleSheets=e.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(let t of e){let i=document.createElement("style"),n=N.litNonce;n!==void 0&&i.setAttribute("nonce",n),i.textContent=t.cssText,s.appendChild(i)}},G=j?s=>s:s=>s instanceof CSSStyleSheet?(e=>{let t="";for(let i of e.cssRules)t+=i.cssText;return ft(t)})(s):s;var{is:re,defineProperty:oe,getOwnPropertyDescriptor:ae,getOwnPropertyNames:le,getOwnPropertySymbols:de,getPrototypeOf:ce}=Object,q=globalThis,vt=q.trustedTypes,he=vt?vt.emptyScript:"",ue=q.reactiveElementPolyfillSupport,D=(s,e)=>s,Y={toAttribute(s,e){switch(e){case Boolean:s=s?he:null;break;case Object:case Array:s=s==null?s:JSON.stringify(s)}return s},fromAttribute(s,e){let t=s;switch(e){case Boolean:t=s!==null;break;case Number:t=s===null?null:Number(s);break;case Object:case Array:try{t=JSON.parse(s)}catch{t=null}}return t}},yt=(s,e)=>!re(s,e),gt={attribute:!0,type:String,converter:Y,reflect:!1,useDefault:!1,hasChanged:yt};Symbol.metadata??=Symbol("metadata"),q.litPropertyMetadata??=new WeakMap;var y=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=gt){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){let i=Symbol(),n=this.getPropertyDescriptor(e,i,t);n!==void 0&&oe(this.prototype,e,n)}}static getPropertyDescriptor(e,t,i){let{get:n,set:r}=ae(this.prototype,e)??{get(){return this[t]},set(o){this[t]=o}};return{get:n,set(o){let c=n?.call(this);r?.call(this,o),this.requestUpdate(e,c,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??gt}static _$Ei(){if(this.hasOwnProperty(D("elementProperties")))return;let e=ce(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(D("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(D("properties"))){let t=this.properties,i=[...le(t),...de(t)];for(let n of i)this.createProperty(n,t[n])}let e=this[Symbol.metadata];if(e!==null){let t=litPropertyMetadata.get(e);if(t!==void 0)for(let[i,n]of t)this.elementProperties.set(i,n)}this._$Eh=new Map;for(let[t,i]of this.elementProperties){let n=this._$Eu(t,i);n!==void 0&&this._$Eh.set(n,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){let t=[];if(Array.isArray(e)){let i=new Set(e.flat(1/0).reverse());for(let n of i)t.unshift(G(n))}else e!==void 0&&t.push(G(e));return t}static _$Eu(e,t){let i=t.attribute;return i===!1?void 0:typeof i=="string"?i:typeof e=="string"?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),this.renderRoot!==void 0&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){let e=new Map,t=this.constructor.elementProperties;for(let i of t.keys())this.hasOwnProperty(i)&&(e.set(i,this[i]),delete this[i]);e.size>0&&(this._$Ep=e)}createRenderRoot(){let e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return mt(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,i){this._$AK(e,i)}_$ET(e,t){let i=this.constructor.elementProperties.get(e),n=this.constructor._$Eu(e,i);if(n!==void 0&&i.reflect===!0){let r=(i.converter?.toAttribute!==void 0?i.converter:Y).toAttribute(t,i.type);this._$Em=e,r==null?this.removeAttribute(n):this.setAttribute(n,r),this._$Em=null}}_$AK(e,t){let i=this.constructor,n=i._$Eh.get(e);if(n!==void 0&&this._$Em!==n){let r=i.getPropertyOptions(n),o=typeof r.converter=="function"?{fromAttribute:r.converter}:r.converter?.fromAttribute!==void 0?r.converter:Y;this._$Em=n;let c=o.fromAttribute(t,r.type);this[n]=c??this._$Ej?.get(n)??c,this._$Em=null}}requestUpdate(e,t,i,n=!1,r){if(e!==void 0){let o=this.constructor;if(n===!1&&(r=this[e]),i??=o.getPropertyOptions(e),!((i.hasChanged??yt)(r,t)||i.useDefault&&i.reflect&&r===this._$Ej?.get(e)&&!this.hasAttribute(o._$Eu(e,i))))return;this.C(e,t,i)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(e,t,{useDefault:i,reflect:n,wrapped:r},o){i&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,o??t??this[e]),r!==!0||o!==void 0)||(this._$AL.has(e)||(this.hasUpdated||i||(t=void 0),this._$AL.set(e,t)),n===!0&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}let e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[n,r]of this._$Ep)this[n]=r;this._$Ep=void 0}let i=this.constructor.elementProperties;if(i.size>0)for(let[n,r]of i){let{wrapped:o}=r,c=this[n];o!==!0||this._$AL.has(n)||c===void 0||this.C(n,void 0,r,c)}}let e=!1,t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(i=>i.hostUpdate?.()),this.update(t)):this._$EM()}catch(i){throw e=!1,this._$EM(),i}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(e){}firstUpdated(e){}};y.elementStyles=[],y.shadowRootOptions={mode:"open"},y[D("elementProperties")]=new Map,y[D("finalized")]=new Map,ue?.({ReactiveElement:y}),(q.reactiveElementVersions??=[]).push("2.1.2");var it=globalThis,$t=s=>s,B=it.trustedTypes,bt=B?B.createPolicy("lit-html",{createHTML:s=>s}):void 0,Et="$lit$",b=`lit$${Math.random().toFixed(9).slice(2)}$`,kt="?"+b,pe=`<${kt}>`,x=document,M=()=>x.createComment(""),H=s=>s===null||typeof s!="object"&&typeof s!="function",st=Array.isArray,_e=s=>st(s)||typeof s?.[Symbol.iterator]=="function",K=`[ 	
\f\r]`,O=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,wt=/-->/g,Ct=/>/g,w=RegExp(`>|${K}(?:([^\\s"'>=/]+)(${K}*=${K}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),xt=/'/g,At=/"/g,Tt=/^(?:script|style|textarea|title)$/i,nt=s=>(e,...t)=>({_$litType$:s,strings:e,values:t}),a=nt(1),Oe=nt(2),Me=nt(3),A=Symbol.for("lit-noChange"),l=Symbol.for("lit-nothing"),St=new WeakMap,C=x.createTreeWalker(x,129);function Rt(s,e){if(!st(s)||!s.hasOwnProperty("raw"))throw Error("invalid template strings array");return bt!==void 0?bt.createHTML(e):e}var fe=(s,e)=>{let t=s.length-1,i=[],n,r=e===2?"<svg>":e===3?"<math>":"",o=O;for(let c=0;c<t;c++){let d=s[c],h,p,u=-1,_=0;for(;_<d.length&&(o.lastIndex=_,p=o.exec(d),p!==null);)_=o.lastIndex,o===O?p[1]==="!--"?o=wt:p[1]!==void 0?o=Ct:p[2]!==void 0?(Tt.test(p[2])&&(n=RegExp("</"+p[2],"g")),o=w):p[3]!==void 0&&(o=w):o===w?p[0]===">"?(o=n??O,u=-1):p[1]===void 0?u=-2:(u=o.lastIndex-p[2].length,h=p[1],o=p[3]===void 0?w:p[3]==='"'?At:xt):o===At||o===xt?o=w:o===wt||o===Ct?o=O:(o=w,n=void 0);let $=o===w&&s[c+1].startsWith("/>")?" ":"";r+=o===O?d+pe:u>=0?(i.push(h),d.slice(0,u)+Et+d.slice(u)+b+$):d+b+(u===-2?c:$)}return[Rt(s,r+(s[t]||"<?>")+(e===2?"</svg>":e===3?"</math>":"")),i]},L=class s{constructor({strings:e,_$litType$:t},i){let n;this.parts=[];let r=0,o=0,c=e.length-1,d=this.parts,[h,p]=fe(e,t);if(this.el=s.createElement(h,i),C.currentNode=this.el.content,t===2||t===3){let u=this.el.content.firstChild;u.replaceWith(...u.childNodes)}for(;(n=C.nextNode())!==null&&d.length<c;){if(n.nodeType===1){if(n.hasAttributes())for(let u of n.getAttributeNames())if(u.endsWith(Et)){let _=p[o++],$=n.getAttribute(u).split(b),V=/([.?@])?(.*)/.exec(_);d.push({type:1,index:r,name:V[2],strings:$,ctor:V[1]==="."?X:V[1]==="?"?Z:V[1]==="@"?tt:E}),n.removeAttribute(u)}else u.startsWith(b)&&(d.push({type:6,index:r}),n.removeAttribute(u));if(Tt.test(n.tagName)){let u=n.textContent.split(b),_=u.length-1;if(_>0){n.textContent=B?B.emptyScript:"";for(let $=0;$<_;$++)n.append(u[$],M()),C.nextNode(),d.push({type:2,index:++r});n.append(u[_],M())}}}else if(n.nodeType===8)if(n.data===kt)d.push({type:2,index:r});else{let u=-1;for(;(u=n.data.indexOf(b,u+1))!==-1;)d.push({type:7,index:r}),u+=b.length-1}r++}}static createElement(e,t){let i=x.createElement("template");return i.innerHTML=e,i}};function S(s,e,t=s,i){if(e===A)return e;let n=i!==void 0?t._$Co?.[i]:t._$Cl,r=H(e)?void 0:e._$litDirective$;return n?.constructor!==r&&(n?._$AO?.(!1),r===void 0?n=void 0:(n=new r(s),n._$AT(s,t,i)),i!==void 0?(t._$Co??=[])[i]=n:t._$Cl=n),n!==void 0&&(e=S(s,n._$AS(s,e.values),n,i)),e}var J=class{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){let{el:{content:t},parts:i}=this._$AD,n=(e?.creationScope??x).importNode(t,!0);C.currentNode=n;let r=C.nextNode(),o=0,c=0,d=i[0];for(;d!==void 0;){if(o===d.index){let h;d.type===2?h=new U(r,r.nextSibling,this,e):d.type===1?h=new d.ctor(r,d.name,d.strings,this,e):d.type===6&&(h=new et(r,this,e)),this._$AV.push(h),d=i[++c]}o!==d?.index&&(r=C.nextNode(),o++)}return C.currentNode=x,n}p(e){let t=0;for(let i of this._$AV)i!==void 0&&(i.strings!==void 0?(i._$AI(e,i,t),t+=i.strings.length-2):i._$AI(e[t])),t++}},U=class s{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,i,n){this.type=2,this._$AH=l,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=i,this.options=n,this._$Cv=n?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode,t=this._$AM;return t!==void 0&&e?.nodeType===11&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=S(this,e,t),H(e)?e===l||e==null||e===""?(this._$AH!==l&&this._$AR(),this._$AH=l):e!==this._$AH&&e!==A&&this._(e):e._$litType$!==void 0?this.$(e):e.nodeType!==void 0?this.T(e):_e(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==l&&H(this._$AH)?this._$AA.nextSibling.data=e:this.T(x.createTextNode(e)),this._$AH=e}$(e){let{values:t,_$litType$:i}=e,n=typeof i=="number"?this._$AC(e):(i.el===void 0&&(i.el=L.createElement(Rt(i.h,i.h[0]),this.options)),i);if(this._$AH?._$AD===n)this._$AH.p(t);else{let r=new J(n,this),o=r.u(this.options);r.p(t),this.T(o),this._$AH=r}}_$AC(e){let t=St.get(e.strings);return t===void 0&&St.set(e.strings,t=new L(e)),t}k(e){st(this._$AH)||(this._$AH=[],this._$AR());let t=this._$AH,i,n=0;for(let r of e)n===t.length?t.push(i=new s(this.O(M()),this.O(M()),this,this.options)):i=t[n],i._$AI(r),n++;n<t.length&&(this._$AR(i&&i._$AB.nextSibling,n),t.length=n)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){let i=$t(e).nextSibling;$t(e).remove(),e=i}}setConnected(e){this._$AM===void 0&&(this._$Cv=e,this._$AP?.(e))}},E=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,i,n,r){this.type=1,this._$AH=l,this._$AN=void 0,this.element=e,this.name=t,this._$AM=n,this.options=r,i.length>2||i[0]!==""||i[1]!==""?(this._$AH=Array(i.length-1).fill(new String),this.strings=i):this._$AH=l}_$AI(e,t=this,i,n){let r=this.strings,o=!1;if(r===void 0)e=S(this,e,t,0),o=!H(e)||e!==this._$AH&&e!==A,o&&(this._$AH=e);else{let c=e,d,h;for(e=r[0],d=0;d<r.length-1;d++)h=S(this,c[i+d],t,d),h===A&&(h=this._$AH[d]),o||=!H(h)||h!==this._$AH[d],h===l?e=l:e!==l&&(e+=(h??"")+r[d+1]),this._$AH[d]=h}o&&!n&&this.j(e)}j(e){e===l?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}},X=class extends E{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===l?void 0:e}},Z=class extends E{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==l)}},tt=class extends E{constructor(e,t,i,n,r){super(e,t,i,n,r),this.type=5}_$AI(e,t=this){if((e=S(this,e,t,0)??l)===A)return;let i=this._$AH,n=e===l&&i!==l||e.capture!==i.capture||e.once!==i.once||e.passive!==i.passive,r=e!==l&&(i===l||n);n&&this.element.removeEventListener(this.name,this,i),r&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}},et=class{constructor(e,t,i){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=i}get _$AU(){return this._$AM._$AU}_$AI(e){S(this,e)}};var me=it.litHtmlPolyfillSupport;me?.(L,U),(it.litHtmlVersions??=[]).push("3.3.3");var Pt=(s,e,t)=>{let i=t?.renderBefore??e,n=i._$litPart$;if(n===void 0){let r=t?.renderBefore??null;i._$litPart$=n=new U(e.insertBefore(M(),r),r,void 0,t??{})}return n._$AI(s),n};var rt=globalThis,f=class extends y{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){let t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=Pt(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return A}};f._$litElement$=!0,f.finalized=!0,rt.litElementHydrateSupport?.({LitElement:f});var ve=rt.litElementPolyfillSupport;ve?.({LitElement:f});(rt.litElementVersions??=[]).push("4.2.2");function Mt(s){return s.callWS({type:"siipet/cats"})}function Ht(s,e,t){return s.callWS({type:"siipet/day",date:e,cat:t})}function Lt(s){return s.callWS({type:"siipet/queue"})}function Ut(s,e){return s.callWS({type:"siipet/visit",event_id:e})}function Vt(s,e,t){return s.callWS({type:"siipet/calendar",month:e,cat:t})}async function Nt(s,e){return(await s.callWS({type:"media_source/resolve_media",media_content_id:`media-source://siipet/visit/${e}`})).url}function jt(s,e){return s.callService("siipet","update_visit",e,void 0,!1)}function qt(s,e){return s.callService("siipet","delete_visit",{event_id:e},void 0,!1)}function Dt(s){if(typeof s=="object"&&s!==null&&"message"in s){let{message:e}=s;return typeof e=="string"&&e!==""?e:void 0}}function Ot(s){if(typeof s=="object"&&s!==null&&"translation_key"in s){let{translation_key:e}=s;return typeof e=="string"?e:void 0}}function m(s){let e=typeof s=="object"&&s!==null&&"error"in s?Dt(s.error):void 0;return Dt(s)??e??"The request failed."}function Bt(s){let e=typeof s=="object"&&s!==null&&"error"in s?Ot(s.error):void 0;return(Ot(s)??e)==="edit_partial"}function Ft(s,e,t){let[i,n]=s.split("-").map(Number),r=new Date(Date.UTC(i,n-1,1)),o=new Date(Date.UTC(i,n,0)).getUTCDate(),c=(r.getUTCDay()+6)%7,d=Array.from({length:c},()=>({date:null}));for(let h=1;h<=o;h++){let p=`${s}-${String(h).padStart(2,"0")}`;d.push({date:p,day:h,marked:e?.days[p]?.marked??!1,openable:e!==null&&e.first<=p&&p<=e.last,selected:p===t})}return d}var ge=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],Wt=["January","February","March","April","May","June","July","August","September","October","November","December"];function F(s){let[e,t,i]=s.split("-").map(Number);return new Date(Date.UTC(e,t-1,i))}function zt(s){return s.toISOString().slice(0,10)}function v(s){let e=F(s),t=Wt[e.getUTCMonth()].slice(0,3);return`${ge[e.getUTCDay()]} ${e.getUTCDate()} ${t}`}function It(s){let e=F(`${s}-01`);return`${Wt[e.getUTCMonth()]} ${e.getUTCFullYear()}`}function k(s){return s.slice(11,16)}function W(s){let e=Math.floor(s/60),t=s%60;return e===0?`${t} s`:t===0?`${e} min`:`${e} min ${t} s`}function ot(s,e){let t=F(s);return t.setUTCDate(t.getUTCDate()+e),zt(t)}function g(s){return s.slice(0,7)}function at(s,e){let t=F(`${s}-01`);return t.setUTCMonth(t.getUTCMonth()+e),zt(t).slice(0,7)}var T={poop:{label:"Poop",icon:"mdi:emoticon-poop",color:"var(--brown-color)"},pee:{label:"Pee",icon:"mdi:water",color:"var(--amber-color)"},lingering:{label:"Lingering",icon:"mdi:paw",color:"var(--grey-color)"},unknown:{label:"Unknown",icon:"mdi:help",color:"var(--disabled-color)"}};var ye=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];function Qt(s,e,t){return`${s} ${s===1?e:t}`}function Gt(s,e){let t=[v(s),Qt(e.visits,"visit","visits")];return e.poop>0&&t.push(`${e.poop} poop`),e.pee>0&&t.push(`${e.pee} pee`),e.abnormal>0&&t.push(`${e.abnormal} abnormal`),t.join(" \xB7 ")}function Yt(s){return`${Qt(s,"visit","visits")} waiting`}function lt(s){return a`
    <ha-tile-container class="header">
      <ha-tile-icon slot="icon" .imageUrl=${s.imageUrl} .icon=${s.icon}></ha-tile-icon>
      <ha-tile-info slot="info">
        <span slot="primary">${s.primary}</span>
        <span slot="secondary">${s.secondary}</span>
      </ha-tile-info>
      <div slot="features" class="features">${s.features}</div>
    </ha-tile-container>
  `}function Kt(s){return a`
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
        <span>${v(s.date)}</span>
        ${s.marked?a`<span class="dot"></span>`:l}
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
  `}function Jt(s){let e=Ft(s.month,s.calendar??null,s.selected);return a`
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
        <div class="month-name">${It(s.month)}</div>
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
        ${ye.map(t=>a`<span class="weekday">${t}</span>`)}
        ${e.map(t=>t.date===null?a`<span class="blank"></span>`:a`
                <ha-control-button
                  class="cell ${t.selected?"selected":""}"
                  data-date=${t.date}
                  .label=${v(t.date)}
                  .disabled=${!t.openable}
                  @click=${()=>s.onOpenDay(t.date)}
                >
                  <span>${t.day}</span>
                  ${t.marked?a`<span class="dot"></span>`:l}
                </ha-control-button>
              `)}
      </div>
    </div>
  `}var $e="width: 20px; height: 20px; border-radius: 50%; object-fit: cover";function Xt(s,e,t,i){if(t)return l;let n=s.cats.map(r=>({value:r.device_id,label:r.name,icon:r.avatar?a`<img src=${r.avatar} alt="" style=${$e} />`:a`<ha-icon icon="mdi:cat"></ha-icon>`}));return s.unknown.waiting>0&&n.push({value:s.unknown.device_id,label:`Unknown (${s.unknown.waiting})`,icon:a`<ha-icon icon="mdi:help"></ha-icon>`}),n.length<2?l:a`
    <ha-control-select
      class="cats"
      .options=${n}
      .value=${e}
      .label=${"Cat"}
      @value-changed=${r=>i(r.detail.value)}
    ></ha-control-select>
  `}function be(s,e,t){let i=T[s.type],n=k(s.start),r=e?`${v(s.start.slice(0,10))} ${n}`:n,o=s.note?a`<ha-icon class="memo" icon="mdi:note-text-outline"></ha-icon>`:l,c=s.abnormal_reasons[0]??"Abnormal",d=s.abnormal?a`<span slot="features-inline" class="chip">${c}</span>`:l,h=s.cover?a`<img class="cover" src=${s.cover} alt="" loading="lazy" />`:l,p=s.stool?a`<img class="stool" src=${s.stool} alt="Stool photo" loading="lazy" />`:l,u=s.has_video?l:a`<span class="camera-only">On camera only</span>`;return a`
    <ha-tile-container
      class="visit ${s.type}"
      data-event=${s.event_id}
      .interactive=${!0}
      @action=${()=>t(s)}
    >
      <ha-tile-icon
        slot="icon"
        .icon=${i.icon}
        style="--tile-icon-color: ${i.color}"
      ></ha-tile-icon>
      <ha-tile-info slot="info">
        <span slot="primary">${r}</span>
        <span slot="secondary">${i.label} · ${W(s.duration)} ${o}</span>
      </ha-tile-info>
      ${d}
      <div slot="features" class="poster">${h} ${p} ${u}</div>
    </ha-tile-container>
  `}function dt(s,e,t){return s===void 0?l:s.length===0?a`<div class="message empty">${e?"No visits are waiting.":"No visits on this day."}</div>`:a`<div class="timeline">
    ${s.map(i=>be(i,e,t))}
  </div>`}function ct(s){return{cats:s.cats.flatMap(e=>e.device_id?[e.device_id]:[]),type:s.type==="unknown"?null:s.type,note:s.note}}function we(s,e){return s.length===e.length&&s.every(t=>e.includes(t))}function Zt(s,e,t={}){let i=ct(s),n={event_id:s.event_id},r=!we(i.cats,e.cats);if(r){if(e.cats.length===0)return{data:null,reason:"no_cat"};n.cats=e.cats}if(e.type!==null&&(t.sendType||e.type!==i.type)&&(n.type=e.type),r&&s.type==="unknown"&&n.type===void 0)return{data:null,reason:"type_required"};let o=e.note.trim();return o!==s.note&&(n.note=o),Object.keys(n).length===1?{data:null,reason:"no_change"}:{data:n,reason:null}}var z=P`
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
`;var te=200,Ce=5e3,xe=["pee","poop","lingering"],ht=class extends f{constructor(){super();this._resolveSeq=0;this.cats=[],this._busy=!1,this._armed=!1,this._partialEdit=!1}static{this.properties={hass:{attribute:!1},visit:{attribute:!1},cats:{attribute:!1},_baseline:{state:!0},_form:{state:!0},_video:{state:!0},_videoNote:{state:!0},_error:{state:!0},_busy:{state:!0},_armed:{state:!0},_partialEdit:{state:!0}}}static{this.styles=[z,P`
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
    `]}disconnectedCallback(){super.disconnectedCallback(),clearTimeout(this._disarm),this._armed=!1}willUpdate(t){if(!t.has("visit")||!this.visit)return;if(t.get("visit")?.event_id===this.visit.event_id){this.visit.has_video&&!this._isVideoPlaying()&&this._resolveVideo(this.visit.event_id);return}this._baseline=this.visit,this._form=ct(this.visit),this._video=void 0,this._videoNote=this.visit.has_video?void 0:"Recording is on the camera only.",this._error=void 0,this._partialEdit=!1,this.visit.has_video&&this._resolveVideo(this.visit.event_id)}_isVideoPlaying(){let t=this.renderRoot.querySelector("video");return t!==null&&!t.paused}_isVideoActive(){let t=this.renderRoot.querySelector("video");return t!==null&&(!t.paused||t.currentTime>0)}async _resolveVideo(t){let i=++this._resolveSeq,n=this._video!==void 0;try{let r=await Nt(this.hass,t);if(this.visit?.event_id!==t||i!==this._resolveSeq||this._isVideoActive())return;this._video=r,this._videoNote=void 0}catch(r){this.visit?.event_id===t&&i===this._resolveSeq&&!n&&(this._videoNote=m(r))}}_close(t){let i={changed:t,eventId:this.visit.event_id};this.dispatchEvent(new CustomEvent("siipet-close",{detail:i}))}_back(){this._busy||this._close(!1)}_toggleCat(t){if(this._busy)return;let i=this._form,n=i.cats.includes(t);if(n&&i.cats.length===1)return;let r=n?i.cats.filter(o=>o!==t):[...i.cats,t];this._form={...i,cats:r}}async _save(t){this._busy=!0,this._error=void 0;try{await jt(this.hass,t),this._partialEdit=!1,this._close(!0)}catch(i){this._error=m(i),Bt(i)&&(this._partialEdit=!0)}finally{this._busy=!1}}async _delete(){if(!this._armed){this._armed=!0,this._disarm=setTimeout(()=>{this._armed=!1},Ce);return}clearTimeout(this._disarm),this._armed=!1,this._busy=!0,this._error=void 0;try{await qt(this.hass,this.visit.event_id),this._close(!0)}catch(t){this._error=m(t)}finally{this._busy=!1}}render(){let t=this._baseline,i=this.visit,n=this._form;if(!t||!i||!n)return l;let r=Zt(t,n,{sendType:this._partialEdit}),o=r.reason==="type_required"?"Pick a type as well.":void 0;return a`
      ${this._renderHeader(t)}
      <div class="editor">
        ${this._renderVideo(i.cover)} ${this._renderStool(t,i.stool)}
        ${this._renderCats(n)} ${this._renderType(n)} ${this._renderMemo(n)}
        ${o?a`<div class="hint">${o}</div>`:l}
        ${this._error?a`<div class="error">${this._error}</div>`:l}
        ${this._renderActions(r.data)}
      </div>
    `}_renderHeader(t){let i=T[t.type],n=t.cats.map(o=>o.name).join(", ")||"Unknown",r=[v(t.start.slice(0,10)),i.label,W(t.duration),...t.abnormal_reasons.slice(0,1)].join(" \xB7 ");return a`
      <ha-tile-container class="header" .interactive=${!0} @action=${()=>this._back()}>
        <ha-tile-icon slot="icon" .icon=${"mdi:arrow-left"}></ha-tile-icon>
        <ha-tile-info slot="info">
          <span slot="primary">${k(t.start)} · ${n}</span>
          <span slot="secondary">${r}</span>
        </ha-tile-info>
      </ha-tile-container>
    `}_renderType(t){let i=xe.map(n=>({value:n,label:T[n].label,icon:a`<ha-icon icon=${T[n].icon}></ha-icon>`}));return a`
      <ha-control-select
        class="type"
        .options=${i}
        .value=${t.type??void 0}
        .label=${"Type"}
        .disabled=${this._busy}
        @value-changed=${n=>{this._busy||(this._form={...t,type:n.detail.value})}}
      ></ha-control-select>
    `}_renderMemo(t){return a`
      <div class="memo-field">
        <input
          class="memo-input"
          type="text"
          maxlength=${te}
          placeholder="Memo"
          aria-label="Memo"
          .value=${t.note}
          .disabled=${this._busy}
          @input=${i=>{this._busy||(this._form={...t,note:i.target.value})}}
        />
        <span class="counter">${t.note.length}/${te}</span>
      </div>
    `}_renderActions(t){let i=this.hass?.user?.is_admin?a`
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
        ${i}
      </ha-control-button-group>
    `}_renderVideo(t){return this._videoNote!==void 0?a`<div class="video-note">${this._videoNote}</div>`:a`
      <video
        controls
        playsinline
        preload="none"
        poster=${t??l}
        src=${this._video??l}
        @error=${()=>{this._videoNote="This browser cannot play the recording. Safari and the Home Assistant app can."}}
      ></video>
    `}_renderStool(t,i){return!i&&t.abnormal_reasons.length===0?l:a`
      <div class="stool-row">
        ${i?a`<img class="stool-photo" src=${i} alt="Stool photo" />`:l}
        <span class="reasons">${t.abnormal_reasons.join(", ")}</span>
      </div>
    `}_renderCats(t){return a`
      <ha-control-button-group class="cat-toggles">
        ${this.cats.map(i=>a`
            <ha-control-button
              class="cat ${t.cats.includes(i.device_id)?"on":""}"
              .label=${i.name}
              .disabled=${this._busy}
              @click=${()=>this._toggleCat(i.device_id)}
            >
              ${i.avatar?a`<img src=${i.avatar} alt="" />`:l}
              <span>${i.name}</span>
            </ha-control-button>
          `)}
      </ha-control-button-group>
    `}};customElements.get("siipet-visit-editor")||customElements.define("siipet-visit-editor",ht);var Ae=["ha-card","ha-tile-container","ha-tile-icon","ha-tile-info","ha-control-button","ha-control-button-group","ha-control-select","ha-icon"];async function ee(s=customElements,e=window){return e.loadCardHelpers&&await e.loadCardHelpers(),Ae.filter(t=>s.get(t)===void 0)}var ie=1800*1e3,se=3e3*1e3,Se=12,ne="siipet_visit";function ut(){return new URLSearchParams(window.location.search).get(ne)||void 0}function Ee(){let s=new URL(window.location.href);s.searchParams.delete(ne),history.replaceState(history.state,"",`${s.pathname}${s.search}${s.hash}`)}function ke(s){return Object.values(s.entities??{}).filter(e=>e.platform==="siipet"&&e.entity_id.startsWith("event.")).map(e=>`${e.entity_id}=${s.states[e.entity_id]?.state??""}`).join("|")}var pt=class extends f{constructor(){super();this._started=!1;this._trailing=!1;this._onVisibilityChange=()=>{document.visibilityState==="visible"&&this._lastRead!==void 0&&Date.now()-this._lastRead>ie&&this._run(()=>this._refresh())};this._onReady=()=>{this._run(()=>this._refresh())};this._onLocationChange=()=>{this._newLink()!==void 0&&this._cats&&this._run(()=>this._followLink())};this._calendars={},this._calendarOpen=!1}static{this.properties={hass:{attribute:!1},_config:{state:!0},_missing:{state:!0},_cats:{state:!0},_cat:{state:!0},_date:{state:!0},_month:{state:!0},_calendars:{state:!0},_first:{state:!0},_calendarOpen:{state:!0},_day:{state:!0},_queue:{state:!0},_error:{state:!0},_editing:{state:!0}}}static{this.styles=z}static getConfigForm(){return{schema:[{name:"cat",selector:{device:{filter:{integration:"siipet",model:"Cat"}}}},{name:"hide_cat_picker",selector:{boolean:{}}}],computeLabel:t=>t.name==="cat"?"Cat":t.name==="hide_cat_picker"?"Hide the cat picker":void 0,computeHelper:t=>t.name==="cat"?"Optional. Without a cat, the card starts with the first cat.":t.name==="hide_cat_picker"?"Keep the card on one cat.":void 0}}setConfig(t){if(t.cat!==void 0&&(typeof t.cat!="string"||t.cat===""))throw new Error("The cat option must be a device ID.");if(t.hide_cat_picker!==void 0&&typeof t.hide_cat_picker!="boolean")throw new Error("The hide_cat_picker option must be true or false.");let i=this._started&&(t.cat!==this._config?.cat||!!t.hide_cat_picker!=!!this._config?.hide_cat_picker);this._config=t,i&&(this._started=!1,this._cats=void 0,this._cat=void 0,this._calendars={},this._first=void 0,this._calendarOpen=!1,this._day=void 0,this._queue=void 0,this._error=void 0,this._editing=void 0,this._linkEvent=void 0)}getCardSize(){return 8}getGridOptions(){return{columns:12,min_columns:6,rows:"auto"}}connectedCallback(){if(super.connectedCallback(),document.addEventListener("visibilitychange",this._onVisibilityChange),window.addEventListener("location-changed",this._onLocationChange),window.addEventListener("popstate",this._onLocationChange),this._listen(),this._onLocationChange(),this._lastRead!==void 0){let t=Date.now()-this._lastRead;t>ie?this._run(()=>this._refresh()):this._scheduleRenew(se-t)}}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("visibilitychange",this._onVisibilityChange),window.removeEventListener("location-changed",this._onLocationChange),window.removeEventListener("popstate",this._onLocationChange),this._connection?.removeEventListener("ready",this._onReady),this._connection=void 0,this._renewTimer!==void 0&&(clearTimeout(this._renewTimer),this._renewTimer=void 0)}willUpdate(t){if(!(!this.hass||!this._config)&&(this._started||(this._started=!0,this._run(()=>this._start())),t.has("hass"))){this._listen();let i=ke(this.hass);this._signature!==void 0&&i!==this._signature&&this._showsLatest()&&this._run(()=>this._refresh()),this._signature=i}}_run(t){return this._active?(this._trailing=!0,this._active):(this._active=this._execute(t),this._active)}async _execute(t){try{await t()}finally{this._active=void 0,this._trailing&&(this._trailing=!1,this._run(()=>this._refresh()))}}_scheduleRenew(t=se){this._renewTimer!==void 0&&(clearTimeout(this._renewTimer),this._renewTimer=void 0),this.isConnected&&(this._renewTimer=setTimeout(()=>{this.isConnected&&document.visibilityState==="visible"&&this._run(()=>this._refresh())},Math.max(t,0)))}_listen(){let t=this.hass?.connection;!this.isConnected||!t||t===this._connection||(this._connection?.removeEventListener("ready",this._onReady),t.addEventListener("ready",this._onReady),this._connection=t)}_refreshEditing(t){if(!this._editing)return;let i=t.find(n=>n.event_id===this._editing.event_id);i&&(this._editing=i)}_isQueue(){return this._cat!==void 0&&this._cat===this._cats?.unknown.device_id}_fixed(){return this._config?.hide_cat_picker===!0}_showsLatest(){return this._isQueue()||this._date!==void 0&&this._date===this._cats?.today}_firstCat(t){return t.cats[0]?.device_id}_fallbackCat(t){return this._firstCat(t)??(t.unknown.waiting>0?t.unknown.device_id:void 0)}_startCat(t){let i=this._config?.cat;return i===t.unknown.device_id&&(this._fixed()||t.unknown.waiting>0)?i:t.cats.find(n=>n.device_id===i)?.device_id??this._fallbackCat(t)}async _start(){let t=await ee();if(t.length>0){this._missing=t;return}await this._readCatsAndInit(),await this._followLink()}async _readCatsAndInit(){let t=await this._readCats();t&&await this._init(t)}async _init(t){this._date=t.today,this._month=g(t.today),this._cat=this._startCat(t),await this._loadSelection()}async _readCats(){try{return this._cats=await Mt(this.hass),this._cats}catch(t){this._error=m(t);return}}async _loadSelection(){if(!(this._cat===void 0||this._date===void 0)){if(this._isQueue()){await this._loadQueue();return}await Promise.all([this._loadDay(),this._loadCalendar(g(this._date))])}}async _loadDay(){let t=this._cat,i=this._date,n=()=>t===this._cat&&i===this._date;try{let r=await Ht(this.hass,i,t);n()&&(this._day=r,this._lastRead=Date.now(),this._scheduleRenew(),this._refreshEditing(r.visits))}catch(r){n()&&(this._error=m(r))}}async _loadQueue(){let t=this._cat;try{let i=await Lt(this.hass);if(t!==this._cat)return;if(this._lastRead=Date.now(),this._scheduleRenew(),this._cats&&(this._cats={...this._cats,unknown:{...this._cats.unknown,waiting:i.visits.length}}),i.visits.length===0&&!this._fixed()){let n=this._cats&&this._firstCat(this._cats);if(n!==void 0){this._selectCat(n);return}}this._queue=i,this._refreshEditing(i.visits)}catch(i){t===this._cat&&(this._error=m(i))}}async _loadCalendar(t){let i=this._cat;try{let n=await Vt(this.hass,t,i);i===this._cat&&(this._calendars={...this._calendars,[t]:n},this._first=n.first)}catch(n){i===this._cat&&(this._error=m(n))}}async _refresh(){await this._readAgain(),await this._followLink()}async _readAgain(){if(this._error=void 0,this._missing?.length)return;if(!this._cats){await this._readCatsAndInit();return}let t=this._date,i=t===this._cats.today,n=await this._readCats();if(n){if(i&&this._date===t&&t!==n.today&&(this._date=n.today,this._month=g(n.today)),this._cat===void 0){await this._init(n);return}if(this._isQueue()&&n.unknown.waiting===0&&!this._fixed()){let r=this._firstCat(n);if(r!==void 0){this._selectCat(r);return}}await this._loadSelection()}}_newLink(){let t=ut();return t===void 0&&(this._linkEvent=void 0),t!==this._linkEvent?t:void 0}async _followLink(){let t=this._newLink();if(t===void 0||!this._cats)return;this._linkEvent=t;let i;try{i=await Ut(this.hass,t)}catch(r){this._linkEvent=void 0,ut()===t&&(this._error=m(r));return}if(!this._cats||ut()!==t)return;let n=this._linkedCat(this._cats,i.visit);n!==void 0&&(Ee(),this._linkEvent=void 0,this._openLinked(n,i))}_linkedCat(t,i){let n=i.cats.length>0?i.cats.flatMap(r=>r.device_id!==null?[r.device_id]:[]):[t.unknown.device_id];return this._fixed()?this._cat!==void 0&&n.includes(this._cat)?this._cat:void 0:n[0]}_openLinked(t,{date:i,visit:n}){let r=t===this._cats?.unknown.device_id;t!==this._cat?(r||(this._date=i,this._month=g(i)),this._selectCat(t)):!r&&i!==this._date&&this._goToDay(i),this._editing=n}_selectCat(t){t!==this._cat&&(this._cat=t,this._calendars={},this._first=void 0,this._calendarOpen=!1,this._day=void 0,this._queue=void 0,this._error=void 0,this._loadSelection())}_goToDay(t){this._date=t,this._month=g(t),this._calendarOpen=!1,this._day=void 0,this._error=void 0,this._loadDay(),this._month in this._calendars||this._loadCalendar(this._month)}_shiftMonth(t){this._month=at(this._month,t),this._error=void 0,this._loadCalendar(this._month)}async _closeEditor({changed:t,eventId:i}){let n=this._editing?.event_id===i;if(n&&(this._editing=void 0),t&&await this._run(()=>this._refresh()),!n)return;await this.updateComplete,[...this.shadowRoot?.querySelectorAll(".visit")??[]].find(o=>o.dataset.event===i)?.scrollIntoView({block:"nearest"})}_toggleCalendar(){this._month=g(this._date),this._calendarOpen=!this._calendarOpen}render(){if(this._missing?.length)return a`
        <ha-card>
          <div class="message alone missing">
            The card cannot start. The Home Assistant frontend has no ${this._missing.join(", ")}.
          </div>
        </ha-card>
      `;let t=this._cats,i=this._cat,n=t!==void 0&&i!==void 0,r=a`<div class="message alone">The SiiPet account has no cats.</div>`;return a`
      <ha-card style="--tile-color: var(--state-icon-color)">
        ${t&&!t.available?this._renderNotice(t):l}
        ${t&&i===void 0?r:l}
        ${t&&i!==void 0?this._renderMain(t,i):l}
        ${!n&&this._error?a`<div class="error">${this._error}</div>`:l}
      </ha-card>
    `}_renderNotice(t){let i=v(t.updated_at.slice(0,10));return a`
      <div class="notice">
        SiiPet is not updating. Last update: ${i} ${k(t.updated_at)}.
      </div>
    `}_renderMain(t,i){return this._editing?a`
        <siipet-visit-editor
          .hass=${this.hass}
          .visit=${this._editing}
          .cats=${t.cats}
          @siipet-close=${n=>this._closeEditor(n.detail)}
        ></siipet-visit-editor>
      `:a`
      ${this._renderView(t,i)}
      ${this._error?a`<div class="error">${this._error}</div>`:l}
      ${this._renderVisits()}
    `}_renderView(t,i){let n=Xt(t,i,this._fixed(),_=>this._selectCat(_));if(this._isQueue())return lt({icon:"mdi:help",primary:"Unknown",secondary:Yt(this._queue?.visits.length??t.unknown.waiting),features:a`${n}`});let r=t.cats.find(_=>_.device_id===i),o=this._date,c=this._month??g(o),d=this._first,h=g(t.today),p=Kt({date:o,canGoBack:d===void 0||ot(o,-1)>=d,canGoForward:o<t.today,marked:this._calendars[g(o)]?.days[o]?.marked??!1,onShift:_=>this._goToDay(ot(o,_)),onToggle:()=>this._toggleCalendar()}),u=this._calendarOpen?Jt({month:c,calendar:this._calendars[c],selected:o,canGoBack:c>at(h,-Se),canGoForward:c<h,onShiftMonth:_=>this._shiftMonth(_),onOpenDay:_=>this._goToDay(_)}):l;return lt({imageUrl:r?.avatar??void 0,icon:r?.avatar?void 0:"mdi:cat",primary:r?.name??"",secondary:this._day?Gt(o,this._day.summary):v(o),features:a`${p} ${u} ${n}`})}_renderVisits(){let t=i=>{this._editing=i};return this._isQueue()?dt(this._queue?.visits,!0,t):dt(this._day?.visits,!1,t)}};customElements.get("siipet-visits-card")||customElements.define("siipet-visits-card",pt);var I=window;I.customCards=I.customCards??[];I.customCards.some(s=>s.type==="siipet-visits-card")||I.customCards.push({type:"siipet-visits-card",name:"SiiPet visits",description:"The litter box visits of each cat, day by day.",preview:!0});export{pt as SiiPetVisitsCard};
