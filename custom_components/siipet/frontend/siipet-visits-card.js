var U=globalThis,I=U.ShadowRoot&&(U.ShadyCSS===void 0||U.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,X=Symbol(),bt=new WeakMap,P=class{constructor(e,t,s){if(this._$cssResult$=!0,s!==X)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o,t=this.t;if(I&&e===void 0){let s=t!==void 0&&t.length===1;s&&(e=bt.get(t)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),s&&bt.set(t,e))}return e}toString(){return this.cssText}},Ct=i=>new P(typeof i=="string"?i:i+"",void 0,X),L=(i,...e)=>{let t=i.length===1?i[0]:e.reduce((s,n,r)=>s+(o=>{if(o._$cssResult$===!0)return o.cssText;if(typeof o=="number")return o;throw Error("Value passed to 'css' function must be a 'css' function result: "+o+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(n)+i[r+1],i[0]);return new P(t,i,X)},wt=(i,e)=>{if(I)i.adoptedStyleSheets=e.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(let t of e){let s=document.createElement("style"),n=U.litNonce;n!==void 0&&s.setAttribute("nonce",n),s.textContent=t.cssText,i.appendChild(s)}},tt=I?i=>i:i=>i instanceof CSSStyleSheet?(e=>{let t="";for(let s of e.cssRules)t+=s.cssText;return Ct(t)})(i):i;var{is:ye,defineProperty:$e,getOwnPropertyDescriptor:be,getOwnPropertyNames:Ce,getOwnPropertySymbols:we,getPrototypeOf:xe}=Object,B=globalThis,xt=B.trustedTypes,Ee=xt?xt.emptyScript:"",Ae=B.reactiveElementPolyfillSupport,D=(i,e)=>i,et={toAttribute(i,e){switch(e){case Boolean:i=i?Ee:null;break;case Object:case Array:i=i==null?i:JSON.stringify(i)}return i},fromAttribute(i,e){let t=i;switch(e){case Boolean:t=i!==null;break;case Number:t=i===null?null:Number(i);break;case Object:case Array:try{t=JSON.parse(i)}catch{t=null}}return t}},At=(i,e)=>!ye(i,e),Et={attribute:!0,type:String,converter:et,reflect:!1,useDefault:!1,hasChanged:At};Symbol.metadata??=Symbol("metadata"),B.litPropertyMetadata??=new WeakMap;var y=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=Et){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){let s=Symbol(),n=this.getPropertyDescriptor(e,s,t);n!==void 0&&$e(this.prototype,e,n)}}static getPropertyDescriptor(e,t,s){let{get:n,set:r}=be(this.prototype,e)??{get(){return this[t]},set(o){this[t]=o}};return{get:n,set(o){let c=n?.call(this);r?.call(this,o),this.requestUpdate(e,c,s)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??Et}static _$Ei(){if(this.hasOwnProperty(D("elementProperties")))return;let e=xe(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(D("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(D("properties"))){let t=this.properties,s=[...Ce(t),...we(t)];for(let n of s)this.createProperty(n,t[n])}let e=this[Symbol.metadata];if(e!==null){let t=litPropertyMetadata.get(e);if(t!==void 0)for(let[s,n]of t)this.elementProperties.set(s,n)}this._$Eh=new Map;for(let[t,s]of this.elementProperties){let n=this._$Eu(t,s);n!==void 0&&this._$Eh.set(n,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){let t=[];if(Array.isArray(e)){let s=new Set(e.flat(1/0).reverse());for(let n of s)t.unshift(tt(n))}else e!==void 0&&t.push(tt(e));return t}static _$Eu(e,t){let s=t.attribute;return s===!1?void 0:typeof s=="string"?s:typeof e=="string"?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),this.renderRoot!==void 0&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){let e=new Map,t=this.constructor.elementProperties;for(let s of t.keys())this.hasOwnProperty(s)&&(e.set(s,this[s]),delete this[s]);e.size>0&&(this._$Ep=e)}createRenderRoot(){let e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return wt(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,s){this._$AK(e,s)}_$ET(e,t){let s=this.constructor.elementProperties.get(e),n=this.constructor._$Eu(e,s);if(n!==void 0&&s.reflect===!0){let r=(s.converter?.toAttribute!==void 0?s.converter:et).toAttribute(t,s.type);this._$Em=e,r==null?this.removeAttribute(n):this.setAttribute(n,r),this._$Em=null}}_$AK(e,t){let s=this.constructor,n=s._$Eh.get(e);if(n!==void 0&&this._$Em!==n){let r=s.getPropertyOptions(n),o=typeof r.converter=="function"?{fromAttribute:r.converter}:r.converter?.fromAttribute!==void 0?r.converter:et;this._$Em=n;let c=o.fromAttribute(t,r.type);this[n]=c??this._$Ej?.get(n)??c,this._$Em=null}}requestUpdate(e,t,s,n=!1,r){if(e!==void 0){let o=this.constructor;if(n===!1&&(r=this[e]),s??=o.getPropertyOptions(e),!((s.hasChanged??At)(r,t)||s.useDefault&&s.reflect&&r===this._$Ej?.get(e)&&!this.hasAttribute(o._$Eu(e,s))))return;this.C(e,t,s)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(e,t,{useDefault:s,reflect:n,wrapped:r},o){s&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,o??t??this[e]),r!==!0||o!==void 0)||(this._$AL.has(e)||(this.hasUpdated||s||(t=void 0),this._$AL.set(e,t)),n===!0&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}let e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[n,r]of this._$Ep)this[n]=r;this._$Ep=void 0}let s=this.constructor.elementProperties;if(s.size>0)for(let[n,r]of s){let{wrapped:o}=r,c=this[n];o!==!0||this._$AL.has(n)||c===void 0||this.C(n,void 0,r,c)}}let e=!1,t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(s=>s.hostUpdate?.()),this.update(t)):this._$EM()}catch(s){throw e=!1,this._$EM(),s}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(e){}firstUpdated(e){}};y.elementStyles=[],y.shadowRootOptions={mode:"open"},y[D("elementProperties")]=new Map,y[D("finalized")]=new Map,Ae?.({ReactiveElement:y}),(B.reactiveElementVersions??=[]).push("2.1.2");var st=globalThis,St=i=>i,q=st.trustedTypes,Tt=q?q.createPolicy("lit-html",{createHTML:i=>i}):void 0,nt="$lit$",$=`lit$${Math.random().toFixed(9).slice(2)}$`,rt="?"+$,Se=`<${rt}>`,x=document,M=()=>x.createComment(""),H=i=>i===null||typeof i!="object"&&typeof i!="function",ot=Array.isArray,Ot=i=>ot(i)||typeof i?.[Symbol.iterator]=="function",it=`[ 	
\f\r]`,O=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,kt=/-->/g,Rt=/>/g,C=RegExp(`>|${it}(?:([^\\s"'>=/]+)(${it}*=${it}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),Pt=/'/g,Lt=/"/g,Mt=/^(?:script|style|textarea|title)$/i,at=i=>(e,...t)=>({_$litType$:i,strings:e,values:t}),a=at(1),ni=at(2),ri=at(3),E=Symbol.for("lit-noChange"),d=Symbol.for("lit-nothing"),Dt=new WeakMap,w=x.createTreeWalker(x,129);function Ht(i,e){if(!ot(i)||!i.hasOwnProperty("raw"))throw Error("invalid template strings array");return Tt!==void 0?Tt.createHTML(e):e}var Nt=(i,e)=>{let t=i.length-1,s=[],n,r=e===2?"<svg>":e===3?"<math>":"",o=O;for(let c=0;c<t;c++){let l=i[c],h,p,u=-1,_=0;for(;_<l.length&&(o.lastIndex=_,p=o.exec(l),p!==null);)_=o.lastIndex,o===O?p[1]==="!--"?o=kt:p[1]!==void 0?o=Rt:p[2]!==void 0?(Mt.test(p[2])&&(n=RegExp("</"+p[2],"g")),o=C):p[3]!==void 0&&(o=C):o===C?p[0]===">"?(o=n??O,u=-1):p[1]===void 0?u=-2:(u=o.lastIndex-p[2].length,h=p[1],o=p[3]===void 0?C:p[3]==='"'?Lt:Pt):o===Lt||o===Pt?o=C:o===kt||o===Rt?o=O:(o=C,n=void 0);let b=o===C&&i[c+1].startsWith("/>")?" ":"";r+=o===O?l+Se:u>=0?(s.push(h),l.slice(0,u)+nt+l.slice(u)+$+b):l+$+(u===-2?c:b)}return[Ht(i,r+(i[t]||"<?>")+(e===2?"</svg>":e===3?"</math>":"")),s]},N=class i{constructor({strings:e,_$litType$:t},s){let n;this.parts=[];let r=0,o=0,c=e.length-1,l=this.parts,[h,p]=Nt(e,t);if(this.el=i.createElement(h,s),w.currentNode=this.el.content,t===2||t===3){let u=this.el.content.firstChild;u.replaceWith(...u.childNodes)}for(;(n=w.nextNode())!==null&&l.length<c;){if(n.nodeType===1){if(n.hasAttributes())for(let u of n.getAttributeNames())if(u.endsWith(nt)){let _=p[o++],b=n.getAttribute(u).split($),V=/([.?@])?(.*)/.exec(_);l.push({type:1,index:r,name:V[2],strings:b,ctor:V[1]==="."?W:V[1]==="?"?F:V[1]==="@"?z:S}),n.removeAttribute(u)}else u.startsWith($)&&(l.push({type:6,index:r}),n.removeAttribute(u));if(Mt.test(n.tagName)){let u=n.textContent.split($),_=u.length-1;if(_>0){n.textContent=q?q.emptyScript:"";for(let b=0;b<_;b++)n.append(u[b],M()),w.nextNode(),l.push({type:2,index:++r});n.append(u[_],M())}}}else if(n.nodeType===8)if(n.data===rt)l.push({type:2,index:r});else{let u=-1;for(;(u=n.data.indexOf($,u+1))!==-1;)l.push({type:7,index:r}),u+=$.length-1}r++}}static createElement(e,t){let s=x.createElement("template");return s.innerHTML=e,s}};function A(i,e,t=i,s){if(e===E)return e;let n=s!==void 0?t._$Co?.[s]:t._$Cl,r=H(e)?void 0:e._$litDirective$;return n?.constructor!==r&&(n?._$AO?.(!1),r===void 0?n=void 0:(n=new r(i),n._$AT(i,t,s)),s!==void 0?(t._$Co??=[])[s]=n:t._$Cl=n),n!==void 0&&(e=A(i,n._$AS(i,e.values),n,s)),e}var j=class{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){let{el:{content:t},parts:s}=this._$AD,n=(e?.creationScope??x).importNode(t,!0);w.currentNode=n;let r=w.nextNode(),o=0,c=0,l=s[0];for(;l!==void 0;){if(o===l.index){let h;l.type===2?h=new k(r,r.nextSibling,this,e):l.type===1?h=new l.ctor(r,l.name,l.strings,this,e):l.type===6&&(h=new G(r,this,e)),this._$AV.push(h),l=s[++c]}o!==l?.index&&(r=w.nextNode(),o++)}return w.currentNode=x,n}p(e){let t=0;for(let s of this._$AV)s!==void 0&&(s.strings!==void 0?(s._$AI(e,s,t),t+=s.strings.length-2):s._$AI(e[t])),t++}},k=class i{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,s,n){this.type=2,this._$AH=d,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=s,this.options=n,this._$Cv=n?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode,t=this._$AM;return t!==void 0&&e?.nodeType===11&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=A(this,e,t),H(e)?e===d||e==null||e===""?(this._$AH!==d&&this._$AR(),this._$AH=d):e!==this._$AH&&e!==E&&this._(e):e._$litType$!==void 0?this.$(e):e.nodeType!==void 0?this.T(e):Ot(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==d&&H(this._$AH)?this._$AA.nextSibling.data=e:this.T(x.createTextNode(e)),this._$AH=e}$(e){let{values:t,_$litType$:s}=e,n=typeof s=="number"?this._$AC(e):(s.el===void 0&&(s.el=N.createElement(Ht(s.h,s.h[0]),this.options)),s);if(this._$AH?._$AD===n)this._$AH.p(t);else{let r=new j(n,this),o=r.u(this.options);r.p(t),this.T(o),this._$AH=r}}_$AC(e){let t=Dt.get(e.strings);return t===void 0&&Dt.set(e.strings,t=new N(e)),t}k(e){ot(this._$AH)||(this._$AH=[],this._$AR());let t=this._$AH,s,n=0;for(let r of e)n===t.length?t.push(s=new i(this.O(M()),this.O(M()),this,this.options)):s=t[n],s._$AI(r),n++;n<t.length&&(this._$AR(s&&s._$AB.nextSibling,n),t.length=n)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){let s=St(e).nextSibling;St(e).remove(),e=s}}setConnected(e){this._$AM===void 0&&(this._$Cv=e,this._$AP?.(e))}},S=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,s,n,r){this.type=1,this._$AH=d,this._$AN=void 0,this.element=e,this.name=t,this._$AM=n,this.options=r,s.length>2||s[0]!==""||s[1]!==""?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=d}_$AI(e,t=this,s,n){let r=this.strings,o=!1;if(r===void 0)e=A(this,e,t,0),o=!H(e)||e!==this._$AH&&e!==E,o&&(this._$AH=e);else{let c=e,l,h;for(e=r[0],l=0;l<r.length-1;l++)h=A(this,c[s+l],t,l),h===E&&(h=this._$AH[l]),o||=!H(h)||h!==this._$AH[l],h===d?e=d:e!==d&&(e+=(h??"")+r[l+1]),this._$AH[l]=h}o&&!n&&this.j(e)}j(e){e===d?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}},W=class extends S{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===d?void 0:e}},F=class extends S{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==d)}},z=class extends S{constructor(e,t,s,n,r){super(e,t,s,n,r),this.type=5}_$AI(e,t=this){if((e=A(this,e,t,0)??d)===E)return;let s=this._$AH,n=e===d&&s!==d||e.capture!==s.capture||e.once!==s.once||e.passive!==s.passive,r=e!==d&&(s===d||n);n&&this.element.removeEventListener(this.name,this,s),r&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}},G=class{constructor(e,t,s){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=s}get _$AU(){return this._$AM._$AU}_$AI(e){A(this,e)}},Vt={M:nt,P:$,A:rt,C:1,L:Nt,R:j,D:Ot,V:A,I:k,H:S,N:F,U:z,B:W,F:G},Te=st.litHtmlPolyfillSupport;Te?.(N,k),(st.litHtmlVersions??=[]).push("3.3.3");var Ut=(i,e,t)=>{let s=t?.renderBefore??e,n=s._$litPart$;if(n===void 0){let r=t?.renderBefore??null;s._$litPart$=n=new k(e.insertBefore(M(),r),r,void 0,t??{})}return n._$AI(i),n};var dt=globalThis,m=class extends y{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){let t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=Ut(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return E}};m._$litElement$=!0,m.finalized=!0,dt.litElementHydrateSupport?.({LitElement:m});var ke=dt.litElementPolyfillSupport;ke?.({LitElement:m});(dt.litElementVersions??=[]).push("4.2.2");var It=i=>(...e)=>({_$litDirective$:i,values:e}),Y=class{constructor(e){}get _$AU(){return this._$AM._$AU}_$AT(e,t,s){this._$Ct=e,this._$AM=t,this._$Ci=s}_$AS(e,t){return this.update(e,t)}update(e,t){return this.render(...t)}};var{I:$i}=Vt;var Re={},Bt=(i,e=Re)=>i._$AH=e;var qt=It(class extends Y{constructor(){super(...arguments),this.key=d}render(i,e){return this.key=i,e}update(i,[e,t]){return e!==this.key&&(Bt(i),this.key=e),t}});function zt(i){return i.callWS({type:"siipet/cats"})}function Gt(i,e,t){return i.callWS({type:"siipet/day",date:e,cat:t})}function Yt(i){return i.callWS({type:"siipet/queue"})}function Qt(i,e){return i.callWS({type:"siipet/visit",event_id:e})}function Kt(i,e,t){return i.callWS({type:"siipet/calendar",month:e,cat:t})}async function Jt(i,e){return(await i.callWS({type:"media_source/resolve_media",media_content_id:`media-source://siipet/visit/${e}`})).url}function Zt(i,e){return i.callService("siipet","update_visit",e,void 0,!1)}function Xt(i,e){return i.callService("siipet","delete_visit",{event_id:e},void 0,!1)}function jt(i){if(typeof i=="object"&&i!==null&&"message"in i){let{message:e}=i;return typeof e=="string"&&e!==""?e:void 0}}function Wt(i){if(typeof i=="object"&&i!==null&&"translation_key"in i){let{translation_key:e}=i;return typeof e=="string"?e:void 0}}function Ft(i){if(typeof i=="object"&&i!==null&&"code"in i){let{code:e}=i;return typeof e=="string"?e:void 0}}function Pe(i){let e=typeof i=="object"&&i!==null&&"error"in i?Ft(i.error):void 0;return Ft(i)??e}function f(i){let e=typeof i=="object"&&i!==null&&"error"in i?jt(i.error):void 0;return jt(i)??e??"The request failed."}function lt(i){let e=typeof i=="object"&&i!==null&&"error"in i?Wt(i.error):void 0;return Wt(i)??e}function te(i){return lt(i)==="edit_partial"}function ee(i){return lt(i)==="visit_not_in_window"}function ie(i){return Pe(i)==="service_validation_error"&&lt(i)!=="not_loaded"}function se(i,e,t){let[s,n]=i.split("-").map(Number),r=new Date(Date.UTC(s,n-1,1)),o=new Date(Date.UTC(s,n,0)).getUTCDate(),c=(r.getUTCDay()+6)%7,l=Array.from({length:c},()=>({date:null}));for(let h=1;h<=o;h++){let p=`${i}-${String(h).padStart(2,"0")}`;l.push({date:p,day:h,marked:e?.days[p]?.marked??!1,openable:e!==null&&e.first<=p&&p<=e.last,selected:p===t})}return l}var Le=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],ne=["January","February","March","April","May","June","July","August","September","October","November","December"];function Q(i){let[e,t,s]=i.split("-").map(Number);return new Date(Date.UTC(e,t-1,s))}function re(i){return i.toISOString().slice(0,10)}function v(i){let e=Q(i),t=ne[e.getUTCMonth()].slice(0,3);return`${Le[e.getUTCDay()]} ${e.getUTCDate()} ${t}`}function oe(i){let e=Q(`${i}-01`);return`${ne[e.getUTCMonth()]} ${e.getUTCFullYear()}`}function R(i){return i.slice(11,16)}function K(i){let e=Math.floor(i/60),t=i%60;return e===0?`${t} s`:t===0?`${e} min`:`${e} min ${t} s`}function ct(i,e){let t=Q(i);return t.setUTCDate(t.getUTCDate()+e),re(t)}function g(i){return i.slice(0,7)}function ht(i,e){let t=Q(`${i}-01`);return t.setUTCMonth(t.getUTCMonth()+e),re(t).slice(0,7)}var T={poop:{label:"Poop",icon:"mdi:emoticon-poop",color:"var(--brown-color)"},pee:{label:"Pee",icon:"mdi:water",color:"var(--amber-color)"},lingering:{label:"Lingering",icon:"mdi:paw",color:"var(--grey-color)"},unknown:{label:"Unknown",icon:"mdi:help",color:"var(--disabled-color)"}};var De=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];function de(i,e,t){return`${i} ${i===1?e:t}`}function le(i,e){let t=[v(i),de(e.visits,"visit","visits")];return e.poop>0&&t.push(`${e.poop} poop`),e.pee>0&&t.push(`${e.pee} pee`),e.abnormal>0&&t.push(`${e.abnormal} abnormal`),t.join(" \xB7 ")}function ce(i){return`${de(i,"visit","visits")} waiting`}function ut(i){return a`
    <ha-tile-container class="header">
      <ha-tile-icon slot="icon" .imageUrl=${i.imageUrl} .icon=${i.icon}></ha-tile-icon>
      <ha-tile-info slot="info">
        <span slot="primary">${i.primary}</span>
        <span slot="secondary">${i.secondary}</span>
      </ha-tile-info>
      <div slot="features" class="features">${i.features}</div>
    </ha-tile-container>
  `}function he(i){return a`
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
        <span>${v(i.date)}</span>
        ${i.marked?a`<span class="dot"></span>`:d}
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
  `}function ue(i){let e=se(i.month,i.calendar??null,i.selected);return a`
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
        <div class="month-name">${oe(i.month)}</div>
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
        ${De.map(t=>a`<span class="weekday">${t}</span>`)}
        ${e.map(t=>t.date===null?a`<span class="blank"></span>`:a`
                <ha-control-button
                  class="cell ${t.selected?"selected":""}"
                  data-date=${t.date}
                  .label=${v(t.date)}
                  .disabled=${!t.openable}
                  @click=${()=>i.onOpenDay(t.date)}
                >
                  <span>${t.day}</span>
                  ${t.marked?a`<span class="dot"></span>`:d}
                </ha-control-button>
              `)}
      </div>
    </div>
  `}var Oe="width: 20px; height: 20px; border-radius: 50%; object-fit: cover; flex: none",Me="display: inline-flex; align-items: center; gap: 8px; max-width: 100%; white-space: nowrap",He="overflow: hidden; text-overflow: ellipsis; min-width: 0";function ae(i,e){return a`<span style=${Me}
    >${i}<span style=${He}>${e}</span></span
  >`}function pe(i,e,t,s){if(t)return d;let n=i.cats.map(r=>({value:r.device_id,ariaLabel:r.name,icon:ae(r.avatar?a`<img src=${r.avatar} alt="" style=${Oe} />`:a`<ha-icon icon="mdi:cat"></ha-icon>`,r.name)}));if(i.unknown.waiting>0){let r=`Unknown (${i.unknown.waiting})`;n.push({value:i.unknown.device_id,ariaLabel:r,icon:ae(a`<ha-icon icon="mdi:help"></ha-icon>`,r)})}return n.length<2?d:a`
    <ha-control-select
      class="cats"
      .options=${n}
      .value=${e}
      .label=${"Cat"}
      @value-changed=${r=>{r.stopPropagation(),s(r.detail.value)}}
    ></ha-control-select>
  `}function Ne(i,e,t){let s=T[i.type],n=R(i.start),r=e?`${v(i.start.slice(0,10))} ${n}`:n,o=i.note?a`<ha-icon class="memo" icon="mdi:note-text-outline"></ha-icon>`:d,c=i.abnormal_reasons[0]??"Abnormal",l=i.abnormal?a`<span slot="features-inline" class="chip">${c}</span>`:d,h=i.cover?a`<img class="cover" src=${i.cover} alt="" loading="lazy" />`:d,p=i.stool?a`<img class="stool" src=${i.stool} alt="Stool photo" loading="lazy" />`:d,u=i.has_video?d:a`<span class="camera-only">On camera only</span>`;return a`
    <ha-tile-container
      class="visit ${i.type}"
      data-event=${i.event_id}
      .interactive=${!0}
      @action=${()=>t(i)}
    >
      <ha-tile-icon
        slot="icon"
        .icon=${s.icon}
        style="--tile-icon-color: ${s.color}"
      ></ha-tile-icon>
      <ha-tile-info slot="info">
        <span slot="primary">${r}</span>
        <span slot="secondary">${s.label} · ${K(i.duration)} ${o}</span>
      </ha-tile-info>
      ${l}
      <div slot="features" class="poster">${h} ${p} ${u}</div>
    </ha-tile-container>
  `}function pt(i,e,t){return i===void 0?d:i.length===0?a`<div class="message empty">${e?"No visits are waiting.":"No visits on this day."}</div>`:a`<div class="timeline">
    ${i.map(s=>Ne(s,e,t))}
  </div>`}function _t(i){return{cats:i.cats.flatMap(e=>e.device_id?[e.device_id]:[]),type:i.type==="unknown"?null:i.type,note:i.note}}function Ve(i,e){return i.length===e.length&&i.every(t=>e.includes(t))}function _e(i,e,t={}){let s=_t(i),n={event_id:i.event_id},r=!Ve(s.cats,e.cats);if(r){if(e.cats.length===0)return{data:null,reason:"no_cat"};n.cats=e.cats}if(e.type!==null&&(t.sendType||e.type!==s.type)&&(n.type=e.type),r&&i.type==="unknown"&&n.type===void 0)return{data:null,reason:"type_required"};let o=e.note.trim();return o!==i.note&&(n.note=o),Object.keys(n).length===1?{data:null,reason:"no_change"}:{data:n,reason:null}}var J=L`
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
`;var fe=200,Ue=5e3,Ie=["pee","poop","lingering"],Be="display: inline-flex; align-items: center; gap: 8px; max-width: 100%; white-space: nowrap",qe="overflow: hidden; text-overflow: ellipsis; min-width: 0";function je(i,e){return a`<span style=${Be}
    >${i}<span style=${qe}>${e}</span></span
  >`}var ft=class extends m{constructor(){super();this._resolveSeq=0;this.cats=[],this._busy=!1,this._armed=!1,this._partialEdit=!1}static{this.properties={hass:{attribute:!1},visit:{attribute:!1},cats:{attribute:!1},_baseline:{state:!0},_form:{state:!0},_video:{state:!0},_videoNote:{state:!0},_error:{state:!0},_busy:{state:!0},_armed:{state:!0},_partialEdit:{state:!0}}}static{this.styles=[J,L`
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
        height: auto;
        object-fit: contain;
        border-radius: var(--ha-border-radius-lg, 12px);
      }
      .stool-label {
        color: var(--primary-text-color);
        font-size: var(--ha-font-size-m, 14px);
        font-weight: var(--ha-font-weight-medium, 500);
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
    `]}disconnectedCallback(){super.disconnectedCallback(),clearTimeout(this._disarm),this._armed=!1}willUpdate(t){if(!t.has("visit")||!this.visit)return;if(t.get("visit")?.event_id===this.visit.event_id){this.visit.has_video&&!this._isVideoPlaying()&&this._resolveVideo(this.visit.event_id);return}this._baseline=this.visit,this._form=_t(this.visit),this._video=void 0,this._videoNote=this.visit.has_video?void 0:"Recording is on the camera only.",this._error=void 0,this._partialEdit=!1,this.visit.has_video&&this._resolveVideo(this.visit.event_id)}_isVideoPlaying(){let t=this.renderRoot.querySelector("video");return t!==null&&!t.paused}_isVideoActive(){let t=this.renderRoot.querySelector("video");return t!==null&&(!t.paused||t.currentTime>0)}async _resolveVideo(t){let s=++this._resolveSeq,n=this._video!==void 0;try{let r=await Jt(this.hass,t);if(this.visit?.event_id!==t||s!==this._resolveSeq||this._isVideoActive())return;this._video=r,this._videoNote=void 0}catch(r){this.visit?.event_id===t&&s===this._resolveSeq&&!n&&(this._videoNote=f(r))}}_close(t){let s={changed:t,eventId:this.visit.event_id};this.dispatchEvent(new CustomEvent("siipet-close",{detail:s}))}_setBusy(t){this._busy=t,this.dispatchEvent(new CustomEvent("siipet-busy",{detail:{busy:t}}))}_back(){this._busy||this._close(!1)}_toggleCat(t){if(this._busy)return;let s=this._form,n=s.cats.includes(t);if(n&&s.cats.length===1)return;let r=n?s.cats.filter(o=>o!==t):[...s.cats,t];this._form={...s,cats:r}}async _save(t){this._setBusy(!0),this._error=void 0;try{await Zt(this.hass,t),this._partialEdit=!1,this._close(!0)}catch(s){this._error=f(s),te(s)&&(this._partialEdit=!0)}finally{this._setBusy(!1)}}async _delete(){if(!this._armed){this._armed=!0,this._disarm=setTimeout(()=>{this._armed=!1},Ue);return}clearTimeout(this._disarm),this._armed=!1,this._setBusy(!0),this._error=void 0;try{await Xt(this.hass,this.visit.event_id),this._close(!0)}catch(t){this._error=f(t)}finally{this._setBusy(!1)}}render(){let t=this._baseline,s=this.visit,n=this._form;if(!t||!s||!n)return d;let r=_e(t,n,{sendType:this._partialEdit}),o=r.reason==="type_required"?"Pick a type as well.":void 0;return a`
      ${this._renderHeader(t)}
      <div class="editor">
        ${this._renderVideo(s.cover)} ${this._renderStool(t,s.stool)}
        ${this._renderCats(n)} ${this._renderType(n)} ${this._renderMemo(n)}
        ${o?a`<div class="hint">${o}</div>`:d}
        ${this._error?a`<div class="error">${this._error}</div>`:d}
        ${this._renderActions(r.data)}
      </div>
    `}_renderHeader(t){let s=T[t.type],n=t.cats.map(o=>o.name).join(", ")||"Unknown",r=[v(t.start.slice(0,10)),s.label,K(t.duration),...t.abnormal_reasons.slice(0,1)].join(" \xB7 ");return a`
      <ha-tile-container class="header" .interactive=${!0} @action=${()=>this._back()}>
        <ha-tile-icon slot="icon" .icon=${"mdi:arrow-left"}></ha-tile-icon>
        <ha-tile-info slot="info">
          <span slot="primary">${R(t.start)} · ${n}</span>
          <span slot="secondary">${r}</span>
        </ha-tile-info>
      </ha-tile-container>
    `}_renderType(t){let s=Ie.map(n=>({value:n,ariaLabel:T[n].label,icon:je(a`<ha-icon icon=${T[n].icon}></ha-icon>`,T[n].label)}));return a`
      <ha-control-select
        class="type"
        .options=${s}
        .value=${t.type??void 0}
        .label=${"Type"}
        .disabled=${this._busy}
        @value-changed=${n=>{n.stopPropagation(),!this._busy&&(this._form={...t,type:n.detail.value})}}
      ></ha-control-select>
    `}_renderMemo(t){return a`
      <div class="memo-field">
        <input
          class="memo-input"
          type="text"
          maxlength=${fe}
          placeholder="Memo"
          aria-label="Memo"
          .value=${t.note}
          .disabled=${this._busy}
          @input=${s=>{this._busy||(this._form={...t,note:s.target.value})}}
        />
        <span class="counter">${t.note.length}/${fe}</span>
      </div>
    `}_renderActions(t){let s=this.hass?.user?.is_admin?a`
          <ha-control-button
            class="delete ${this._armed?"armed":""}"
            .label=${this._armed?"Tap again to delete":"Delete"}
            .disabled=${this._busy}
            @click=${()=>this._delete()}
          >
            ${this._armed?"Tap again to delete":"Delete"}
          </ha-control-button>
        `:d;return a`
      <ha-control-button-group class="actions">
        <ha-control-button
          class="save"
          .label=${"Save"}
          .disabled=${t===null||this._busy}
          @click=${()=>t&&this._save(t)}
        >
          Save
        </ha-control-button>
        ${s}
      </ha-control-button-group>
    `}_renderVideo(t){return this._videoNote!==void 0?a`<div class="video-note">${this._videoNote}</div>`:a`
      <video
        controls
        playsinline
        preload="none"
        poster=${t??d}
        src=${this._video??d}
        @error=${()=>{this._videoNote="This browser cannot play the recording. Safari and the Home Assistant app can."}}
      ></video>
    `}_renderStool(t,s){return!s&&t.abnormal_reasons.length===0?d:a`
      <div class="stool-row">
        ${s?a`<img class="stool-photo" src=${s} alt="Stool photo" />`:d}
        <div>
          ${s?a`<div class="stool-label">Stool photo</div>`:d}
          <span class="reasons">${t.abnormal_reasons.join(", ")}</span>
        </div>
      </div>
    `}_renderCats(t){return a`
      <ha-control-button-group class="cat-toggles">
        ${this.cats.map(s=>a`
            <ha-control-button
              class="cat ${t.cats.includes(s.device_id)?"on":""}"
              .label=${s.name}
              .disabled=${this._busy}
              @click=${()=>this._toggleCat(s.device_id)}
            >
              ${s.avatar?a`<img src=${s.avatar} alt="" />`:d}
              <span>${s.name}</span>
            </ha-control-button>
          `)}
      </ha-control-button-group>
    `}};customElements.get("siipet-visit-editor")||customElements.define("siipet-visit-editor",ft);var We="M3.3 21.92C3.18 21.86 3.11 21.79 3.06 21.67C2.98 21.51 2.98 21.46 2.98 17.06C2.98 12.2 2.98 12.23 3.2 11.75C3.38 11.38 5.74 7.98 5.82 7.98C5.96 7.98 5.98 8.06 5.98 8.51C5.98 8.8 6 9 6.04 9.08C6.09 9.22 7.28 10.38 7.46 10.47C7.54 10.52 7.75 10.54 8.21 10.55C8.83 10.57 8.86 10.58 8.87 10.66C8.87 10.71 8.72 11.04 8.51 11.44C7.63 13.11 7.55 13.28 7.55 13.39C7.55 13.47 7.86 13.96 8.76 15.24C9.43 16.2 10.04 17.1 10.11 17.24C10.18 17.39 10.29 17.66 10.35 17.85L10.45 18.19L10.47 19.89C10.48 21.53 10.48 21.59 10.4 21.71C10.36 21.78 10.28 21.87 10.22 21.91C10.12 21.98 9.91 21.98 6.79 21.99C3.49 22 3.46 22 3.3 21.92ZM12.35 21.93C12.28 21.89 12.18 21.81 12.14 21.75C12.06 21.64 12.06 21.62 12.04 17.01L12.02 12.37L11.93 12.1C11.88 11.95 11.78 11.73 11.72 11.61C11.6 11.4 8.55 7.28 8.47 7.23C8.36 7.15 8.39 7.3 8.64 8.03C8.79 8.46 8.91 8.84 8.9 8.86C8.89 8.89 8.84 8.94 8.79 8.97C8.71 9.02 8.65 9.02 8.18 8.91C7.89 8.85 7.63 8.78 7.6 8.75C7.56 8.72 7.55 8.49 7.55 7.55C7.55 6.82 7.56 6.34 7.59 6.27C7.61 6.19 7.92 5.87 8.42 5.39C8.85 4.98 9.64 4.22 10.16 3.72C10.69 3.22 11.3 2.63 11.52 2.42C11.81 2.14 11.95 2.04 12.05 2.02C12.16 2 12.48 2.09 13.79 2.53C14.67 2.82 15.42 3.09 15.46 3.12C15.53 3.19 15.53 3.36 15.45 3.81C15.34 4.49 15.29 4.48 14.21 3.68C13.74 3.33 13.35 3.06 13.34 3.07C13.33 3.08 13.41 3.16 13.51 3.25C13.62 3.34 15.2 4.91 17.03 6.73C20.65 10.34 20.6 10.29 20.83 10.96C20.89 11.13 20.96 11.43 20.98 11.61C21.01 11.82 21.02 13.62 21.02 16.72C21.02 21.47 21.02 21.51 20.94 21.67C20.88 21.79 20.82 21.86 20.7 21.92C20.53 22 20.49 22 16.51 22C12.76 22 12.48 22 12.35 21.93Z",mt=window;mt.customIcons||(mt.customIcons={});mt.customIcons.siipet={async getIcon(i){return{path:i==="logo"?We:""}},async getIconList(){return[{name:"logo",keywords:["siipet","litter","cat"]}]}};var Fe=["ha-card","ha-tile-container","ha-tile-icon","ha-tile-info","ha-control-button","ha-control-button-group","ha-control-select","ha-icon"];async function me(i=customElements,e=window){return e.loadCardHelpers&&await e.loadCardHelpers(),Fe.filter(t=>i.get(t)===void 0)}var ze=1800*1e3,Ge=3e3*1e3,Ye=300*1e3,Qe=12,ge="siipet_visit",vt="siipet-visits-changed",gt=0;function yt(){return new URLSearchParams(window.location.search).get(ge)||void 0}function Ke(){let i=new URL(window.location.href);i.searchParams.delete(ge),history.replaceState(history.state,"",`${i.pathname}${i.search}${i.hash}`)}var ve=new WeakMap,Je={};function Ze(i){let e=ve.get(i);return e===void 0&&(e=Object.values(i).filter(t=>t.platform==="siipet"&&t.entity_id.startsWith("event.")).map(t=>t.entity_id),ve.set(i,e)),e}function Xe(i){return Ze(i.entities??Je).map(e=>`${e}=${i.states[e]?.state??""}`).join("|")}var $t=class extends m{constructor(){super();this._started=!1;this._partsLoaded=!1;this._daySeq=0;this._queueSeq=0;this._calendarSeq=new Map;this._trailing=!1;this._onVisibilityChange=()=>{document.visibilityState==="visible"&&this._due()&&this._run(()=>this._refresh())};this._onReady=()=>{this._run(()=>this._refresh())};this._onVisitsChanged=t=>{this._started&&t.detail?.source!==this&&this._run(()=>this._refresh())};this._onNavigate=()=>{this._linkEvent=void 0,this._holdingEditor=void 0,this._onLocationChange()};this._onLocationChange=()=>{this._newLink()!==void 0&&this._cats&&this._run(()=>this._followLink())};this._calendars={},this._calendarOpen=!1}static{this.properties={hass:{attribute:!1},_config:{state:!0},_missing:{state:!0},_cats:{state:!0},_cat:{state:!0},_date:{state:!0},_month:{state:!0},_calendars:{state:!0},_first:{state:!0},_calendarOpen:{state:!0},_day:{state:!0},_queue:{state:!0},_error:{state:!0},_editing:{state:!0}}}static{this.styles=J}static getConfigForm(){return{schema:[{name:"cat",selector:{device:{filter:{integration:"siipet",model:"Cat"}}}},{name:"hide_cat_picker",selector:{boolean:{}}}],computeLabel:t=>t.name==="cat"?"Cat":t.name==="hide_cat_picker"?"Hide the cat picker":void 0,computeHelper:t=>t.name==="cat"?"Optional. Without a cat, the card starts with the first cat.":t.name==="hide_cat_picker"?"Keep the card on one cat.":void 0}}setConfig(t){if(t.cat!==void 0&&(typeof t.cat!="string"||t.cat===""))throw new Error("The cat option must be a device ID.");if(t.hide_cat_picker!==void 0&&typeof t.hide_cat_picker!="boolean")throw new Error("The hide_cat_picker option must be true or false.");let s=this._started&&(t.cat!==this._config?.cat||!!t.hide_cat_picker!=!!this._config?.hide_cat_picker);this._config=t,s&&(this._started=!1,this._cats=void 0,this._cat=void 0,this._calendars={},this._first=void 0,this._calendarOpen=!1,this._day=void 0,this._queue=void 0,this._error=void 0,this._editing=void 0,this._linkEvent=void 0,this._holdingEditor=void 0)}getCardSize(){return 8}getGridOptions(){return{columns:12,min_columns:6,rows:"auto"}}connectedCallback(){super.connectedCallback(),document.addEventListener("visibilitychange",this._onVisibilityChange),window.addEventListener("location-changed",this._onNavigate),window.addEventListener("popstate",this._onLocationChange),window.addEventListener(vt,this._onVisitsChanged),this._listen(),this._onLocationChange();let t=this._changesSeen!==void 0&&this._changesSeen!==gt;this._due()||t?this._run(()=>this._refresh()):this._armTimer()}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("visibilitychange",this._onVisibilityChange),window.removeEventListener("location-changed",this._onNavigate),window.removeEventListener("popstate",this._onLocationChange),window.removeEventListener(vt,this._onVisitsChanged),this._connection?.removeEventListener("ready",this._onReady),this._connection=void 0,this._clearTimer()}shouldUpdate(t){let s=!1;if(this.hass&&this._config&&(this._started||(this._started=!0,s=!0,this._run(()=>this._start())),t.has("hass"))){this._listen();let r=Xe(this.hass);this._signature!==void 0&&r!==this._signature&&this._showsLatest()&&(s=!0,this._run(()=>this._refresh())),this._signature=r}let n=t.size===1&&t.has("hass");return s||!this.hasUpdated||!n}_run(t){return this._active?(this._trailing=!0,this._active):(this._active=this._execute(t),this._active)}async _execute(t){try{await t()}catch(s){this._error=f(s)}finally{this._active=void 0,this._trailing&&(this._trailing=!1,this._run(()=>this._refresh()))}}_lastRead(){let t=[this._catsRead,this._dataRead].filter(s=>s!==void 0);return t.length>0?Math.min(...t):void 0}_due(){let t=Date.now(),s=this._lastRead();return s!==void 0&&t-s>ze||this._dueAt!==void 0&&t>=this._dueAt}_scheduleRenew(){this._dueAt=this._lastRead()+Ge,this._armTimer()}_scheduleRetry(t){ie(t)||(this._dueAt=Date.now()+Ye,this._armTimer())}_clearTimer(){this._timer!==void 0&&(clearTimeout(this._timer),this._timer=void 0)}_armTimer(){this._clearTimer(),!(!this.isConnected||this._dueAt===void 0)&&(this._timer=setTimeout(()=>{this._timer=void 0,this.isConnected&&document.visibilityState==="visible"&&this._run(()=>this._refresh())},Math.max(this._dueAt-Date.now(),0)))}_listen(){let t=this.hass?.connection;!this.isConnected||!t||t===this._connection||(this._connection?.removeEventListener("ready",this._onReady),t.addEventListener("ready",this._onReady),this._connection=t)}_refreshEditing(t){if(!this._editing)return;let s=t.find(n=>n.event_id===this._editing.event_id);s&&(this._editing=s)}_isQueue(){return this._cat!==void 0&&this._cat===this._cats?.unknown.device_id}_fixed(){return this._config?.hide_cat_picker===!0}_showsLatest(){return this._cats?this._isQueue()||this._date!==void 0&&this._date===this._cats.today:!0}_firstCat(t){return t.cats[0]?.device_id}_fallbackCat(t){return this._firstCat(t)??(t.unknown.waiting>0?t.unknown.device_id:void 0)}_catGone(t){let s=this._config?.cat;return this._fixed()&&s!==void 0&&s!==t.unknown.device_id&&!t.cats.some(n=>n.device_id===s)}_startCat(t){let s=this._config?.cat;if(s===t.unknown.device_id&&(this._fixed()||t.unknown.waiting>0))return s;if(!this._catGone(t))return t.cats.find(n=>n.device_id===s)?.device_id??this._fallbackCat(t)}async _start(){await this._loadParts()&&(await this._readCatsAndInit(),await this._followLink())}async _loadParts(){if(this._partsLoaded)return!0;let t;try{t=await me()}catch(s){return this._error=f(s),!1}return t.length>0?(this._missing=t,!1):(this._partsLoaded=!0,!0)}async _readCatsAndInit(){let t=await this._readCats();t&&await this._init(t)}async _init(t){this._date=t.today,this._month=g(t.today),this._cat=this._startCat(t),await this._loadSelection()}async _readCats(){this._changesSeen=gt;try{return this._cats=await zt(this.hass),this._catsRead=Date.now(),this._cats}catch(t){this._error=f(t),this._scheduleRetry(t);return}}async _loadSelection(){if(!(this._cat===void 0||this._date===void 0)){if(this._isQueue()){await this._loadQueue();return}await Promise.all([this._loadDay(),this._loadCalendar(g(this._date))])}}async _loadDay(){let t=this._cat,s=this._date,n=++this._daySeq,r=()=>n===this._daySeq&&t===this._cat&&s===this._date;try{let o=await Gt(this.hass,s,t);r()&&(this._day=o,this._dataRead=Date.now(),this._scheduleRenew(),this._refreshEditing(o.visits))}catch(o){r()&&(this._error=f(o),this._scheduleRetry(o))}}async _loadQueue(){let t=this._cat,s=++this._queueSeq,n=()=>s===this._queueSeq&&t===this._cat;try{let r=await Yt(this.hass);if(!n())return;if(this._dataRead=Date.now(),this._scheduleRenew(),this._cats&&(this._cats={...this._cats,unknown:{...this._cats.unknown,waiting:r.visits.length}}),r.visits.length===0&&!this._fixed()){let o=this._cats&&this._firstCat(this._cats);if(o!==void 0){this._selectCat(o);return}}this._queue=r,this._refreshEditing(r.visits)}catch(r){n()&&(this._error=f(r),this._scheduleRetry(r))}}async _loadCalendar(t){let s=this._cat,n=(this._calendarSeq.get(t)??0)+1;this._calendarSeq.set(t,n);let r=()=>n===this._calendarSeq.get(t)&&s===this._cat;try{let o=await Kt(this.hass,t,s);r()&&(this._calendars={...this._calendars,[t]:o},this._first=o.first)}catch(o){r()&&(this._error=f(o))}}async _refresh(){await this._readAgain(),await this._followLink()}async _readAgain(){if(this._error=void 0,this._dueAt=void 0,this._clearTimer(),this._missing?.length)return;if(!this._cats){await this._loadParts()&&await this._readCatsAndInit();return}let t=this._date,s=t===this._cats.today,n=await this._readCats();if(n){if(s&&this._date===t&&t!==n.today&&(this._date=n.today,this._month=g(n.today)),this._cat===void 0){await this._init(n);return}if(this._isQueue()&&n.unknown.waiting===0&&!this._fixed()){let r=this._firstCat(n);if(r!==void 0){this._selectCat(r);return}}await this._loadSelection()}}_newLink(){let t=yt();return t===void 0&&(this._linkEvent=void 0),t!==this._linkEvent?t:void 0}_editorElement(){return this.renderRoot.querySelector("siipet-visit-editor")}_onEditorBusy(t){t.detail.busy?this._busyEditor=t.target??void 0:this._busyEditor===t.target&&(this._busyEditor=void 0)}_linkWaits(){let t=this._editing?this._editorElement():null;return t===null?!1:t===this._busyEditor?(this._holdingEditor=t,!0):t===this._holdingEditor}async _followLink(){let t=this._newLink();if(t===void 0||!this._cats||this._linkWaits()||this._fixed()&&this._cat===void 0)return;this._linkEvent=t;let s;try{s=await Qt(this.hass,t)}catch(r){this._linkFailed(t,r);return}if(!this.isConnected){this._linkEvent=void 0;return}if(!this._cats||yt()!==t)return;if(this._linkWaits()){this._linkEvent=void 0;return}let n=this._linkedCat(this._cats,s.visit);n!==void 0&&(Ke(),this._linkEvent=void 0,this._openLinked(n,s))}_linkFailed(t,s){(!this.isConnected||!ee(s))&&(this._linkEvent=void 0),yt()===t&&(this._error=f(s))}_linkedCat(t,s){let n=s.cats.length>0?s.cats.flatMap(r=>r.device_id!==null?[r.device_id]:[]):[t.unknown.device_id];return this._cat!==void 0&&n.includes(this._cat)?this._cat:this._fixed()?void 0:n[0]}_openLinked(t,{date:s,visit:n}){let r=t===this._cats?.unknown.device_id;t!==this._cat?(r||(this._date=s,this._month=g(s)),this._selectCat(t)):!r&&s!==this._date&&this._goToDay(s),this._editing=n}_selectCat(t){t!==this._cat&&(this._cat=t,this._calendars={},this._first=void 0,this._calendarOpen=!1,this._day=void 0,this._queue=void 0,this._error=void 0,this._loadSelection())}_goToDay(t){this._date=t,this._month=g(t),this._calendarOpen=!1,this._day=void 0,this._error=void 0,this._loadDay(),this._month in this._calendars||this._loadCalendar(this._month)}_shiftMonth(t){this._month=ht(this._month,t),this._error=void 0,this._loadCalendar(this._month)}async _closeEditor(t){let{changed:s,eventId:n}=t.detail,r=t.target===this._editorElement()&&this._editing?.event_id===n;if(r&&(this._editing=void 0,this._holdingEditor=void 0),s){gt+=1;let c={source:this};window.dispatchEvent(new CustomEvent(vt,{detail:c})),await this._run(()=>this._refresh())}else r&&this._onLocationChange();if(!r)return;await this.updateComplete,[...this.shadowRoot?.querySelectorAll(".visit")??[]].find(c=>c.dataset.event===n)?.scrollIntoView({block:"nearest"})}_toggleCalendar(){this._month=g(this._date),this._calendarOpen=!this._calendarOpen}render(){if(this._missing?.length)return a`
        <ha-card>
          <div class="message alone missing">
            The card cannot start. The Home Assistant frontend has no ${this._missing.join(", ")}.
          </div>
        </ha-card>
      `;let t=this._cats,s=this._cat,n=t!==void 0&&s!==void 0;return a`
      <ha-card style="--tile-color: var(--state-icon-color)">
        ${t&&!t.available?this._renderNotice(t):d}
        ${t&&s===void 0?this._renderNoCat(t):d}
        ${t&&s!==void 0?this._renderMain(t,s):d}
        ${!n&&this._error?a`<div class="error">${this._error}</div>`:d}
      </ha-card>
    `}_renderNoCat(t){let s=this._catGone(t)?"The cat of this card is not in the SiiPet account.":"The SiiPet account has no cats.";return a`<div class="message alone">${s}</div>`}_renderNotice(t){let s=v(t.updated_at.slice(0,10));return a`
      <div class="notice">
        SiiPet is not updating. Last update: ${s} ${R(t.updated_at)}.
      </div>
    `}_renderMain(t,s){return this._editing?a`${qt(this._editing.event_id,a`
          <siipet-visit-editor
            .hass=${this.hass}
            .visit=${this._editing}
            .cats=${t.cats}
            @siipet-busy=${n=>this._onEditorBusy(n)}
            @siipet-close=${n=>this._closeEditor(n)}
          ></siipet-visit-editor>
        `)}`:a`
      ${this._renderView(t,s)}
      ${this._error?a`<div class="error">${this._error}</div>`:d}
      ${this._renderVisits()}
    `}_renderView(t,s){let n=pe(t,s,this._fixed(),_=>this._selectCat(_));if(this._isQueue())return ut({icon:"mdi:help",primary:"Unknown",secondary:ce(this._queue?.visits.length??t.unknown.waiting),features:a`${n}`});let r=t.cats.find(_=>_.device_id===s),o=this._date,c=this._month??g(o),l=this._first,h=g(t.today),p=he({date:o,canGoBack:l===void 0||ct(o,-1)>=l,canGoForward:o<t.today,marked:this._calendars[g(o)]?.days[o]?.marked??!1,onShift:_=>this._goToDay(ct(o,_)),onToggle:()=>this._toggleCalendar()}),u=this._calendarOpen?ue({month:c,calendar:this._calendars[c],selected:o,canGoBack:c>ht(h,-Qe),canGoForward:c<h,onShiftMonth:_=>this._shiftMonth(_),onOpenDay:_=>this._goToDay(_)}):d;return ut({imageUrl:r?.avatar??void 0,icon:r?.avatar?void 0:"mdi:cat",primary:r?.name??"",secondary:this._day?le(o,this._day.summary):v(o),features:a`${p} ${u} ${n}`})}_renderVisits(){let t=s=>{this._editing=s};return this._isQueue()?pt(this._queue?.visits,!0,t):pt(this._day?.visits,!1,t)}};customElements.get("siipet-visits-card")||customElements.define("siipet-visits-card",$t);var Z=window;Z.customCards=Z.customCards??[];Z.customCards.some(i=>i.type==="siipet-visits-card")||Z.customCards.push({type:"siipet-visits-card",name:"SiiPet visits",description:"The litter box visits of each cat, day by day.",preview:!0});export{$t as SiiPetVisitsCard};
