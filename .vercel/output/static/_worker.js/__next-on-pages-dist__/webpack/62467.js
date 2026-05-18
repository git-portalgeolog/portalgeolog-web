var x={},v=(D,S,O)=>(x.__chunk_62467=(P,g,$)=>{"use strict";function c(e){let t=["","Primeiro","Segundo","Terceiro","Quarto","Quinto","Sexto","S\xE9timo","Oitavo","Nono"];if(e>=1&&e<=9)return t[e];if(e>=10&&e<=19)return{10:"D\xE9cimo",11:"D\xE9cimo Primeiro",12:"D\xE9cimo Segundo",13:"D\xE9cimo Terceiro",14:"D\xE9cimo Quarto",15:"D\xE9cimo Quinto",16:"D\xE9cimo Sexto",17:"D\xE9cimo S\xE9timo",18:"D\xE9cimo Oitavo",19:"D\xE9cimo Nono"}[e]||"";if(e>=20&&e<=99){let i=Math.floor(e/10),o=e%10,n={2:"Vig\xE9simo",3:"Trig\xE9simo",4:"Quadrag\xE9simo",5:"Quinquag\xE9simo",6:"Sexag\xE9simo",7:"Septuag\xE9simo",8:"Octog\xE9simo",9:"Nonag\xE9simo"}[i]||"",r=o>0?t[o]:"";return n&&r?`${n} ${r}`:n||r||String(e)}return e===100?"Cent\xE9simo":String(e)}function m(e){let t=e.kind==="return"?"Retorno":"Itiner\xE1rio";return`${c(e.ordinal)} - ${t}`}function N(e){return`NOVO ATENDIMENTO - ${m(e).toUpperCase()}`}function b(e){if(!Array.isArray(e))return[];let t=[];for(let i of e){if(typeof i!="object"||i===null)continue;let o=Number(i.itineraryIndex),n=Number(i.sequenceOrder),r=Number(i.ordinal),l=i.kind==="return"?"return":"itinerary";Number.isFinite(o)&&Number.isFinite(n)&&Number.isFinite(r)&&t.push({itineraryIndex:o,sequenceOrder:n,kind:l,ordinal:r,title:typeof i.title=="string"&&i.title.trim()?i.title:m({kind:l,ordinal:r}),state:i.state||"pending",messageSentAt:typeof i.messageSentAt=="string"?i.messageSentAt:null,acceptedAt:typeof i.acceptedAt=="string"?i.acceptedAt:null,startedAt:typeof i.startedAt=="string"?i.startedAt:null,finishedAt:typeof i.finishedAt=="string"?i.finishedAt:null,kmInitial:typeof i.kmInitial=="number"?i.kmInitial:Number.isFinite(Number(i.kmInitial))?Number(i.kmInitial):null,kmFinal:typeof i.kmFinal=="number"?i.kmFinal:Number.isFinite(Number(i.kmFinal))?Number(i.kmFinal):null})}return t.sort((i,o)=>i.sequenceOrder-o.sequenceOrder)}function d(e,t){return e.find(i=>i.itineraryIndex===t)}function k(e,t){let i=d(e,t);if(i)return e.find(o=>o.sequenceOrder===i.sequenceOrder+1)}function h(e){return e.find(t=>t.state!=="completed"&&t.state!=="cancelled")}function _(e){if(e.length===0)return"Pendente";let t=e.map(o=>o.state);if(t.some(o=>o==="awaiting_finish"||o==="awaiting_km_finish"))return"Em Rota";if(t.some(o=>o==="awaiting_accept"||o==="awaiting_start"||o==="awaiting_km_start"))return"Aguardando";let i=e.filter(o=>o.state!=="cancelled");return i.length>0&&i.every(o=>o.state==="completed")?"Finalizado":i.length===0?"Cancelado":"Pendente"}function f(e){return e.length===0?"":e.map(t=>{let i=t.title||(t.index<0?`\u{1F504} *${c(Math.abs(t.index))} Retorno*`:`\u{1F4CD} *${c(t.index+1)} Itiner\xE1rio*`),o=t.dateTime?` \u2014 ${t.dateTime}`:"",n=t.stops.map((r,l)=>{let s="";return r.isOrigin?s=`   \u{1F7E2} *Origem:* ${r.label}`:r.isDestination?s=`   \u{1F535} *Destino Final:* ${r.label}`:s=`   \u{1F518} *Parada ${t.stops.filter((u,a)=>a<l&&!u.isOrigin&&!u.isDestination).length+1}:* ${r.label}`,r.dateTime&&(s+=` (${r.dateTime})`),r.isPassengerAddress&&(s+=" \u{1F4CD} (seu endere\xE7o)"),s}).join(`
`);return`\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
${i}${o}

${n}
`}).join(`
`)}function A(e){let t=e.osNumber?`*OS:* ${e.osNumber.toUpperCase()}
`:"",i=e.data||"N\xE3o informado",o=e.hora||"N\xE3o informado",n=e.veiculoTipo?e.veiculoTipo.charAt(0).toUpperCase()+e.veiculoTipo.slice(1):"N\xE3o informado",r=e.veiculoPlaca||"N\xE3o informada",l=e.passageiros.length>0?e.passageiros.map(a=>`* ${a.nome}${a.celular?` \u2013 ${a.celular}`:""}`).join(`
`):"N\xE3o informado",s=f(e.itineraries),p=e.acceptLink?`
\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
\u{1F447} *Aceitar Servi\xE7o:*
${e.acceptLink}`:"",u=e.startRouteLink?`
\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
\u{1F447} *Quando estiver pronto, clique para iniciar a rota:*
${e.startRouteLink}`:"";return`\u{1F4C3} *Protocolo:* ${e.protocolo}

*Data:* ${i}
*Hor\xE1rio:* ${o}

*Empresa:* ${e.empresa}
*Solicitante:* ${e.solicitante||"N\xE3o informado"}
*C. Custo:* ${e.centroCusto||"N\xE3o informado"}
${t}
*Fornecedor:* Geolog Transporte Executivo

\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
\u{1F465} *Passageiros:*
_Por ordem de origem_

${l}

\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
\u{1F4CD} *Itiner\xE1rio(s):*

${s}
\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
\u{1F468}\u200D\u2708\uFE0F *Motorista:*

*${e.motorista}*
*Contato:* ${e.motoristaTelefone||"N\xE3o informado"}
*Ve\xEDculo:* ${n}
*Placa:* ${r}

_Portal Geolog_`+p+u}function T(e){let t=e.veiculoTipo?e.veiculoTipo.charAt(0).toUpperCase()+e.veiculoTipo.slice(1):"N\xE3o informado",i=e.veiculoPlaca||"N\xE3o informada",o=e.passageiros.length>0?e.passageiros.map(r=>`* ${r.nome}${r.celular?` \u2013 ${r.celular}`:""}`).join(`
`):"N\xE3o informado",n=f(e.itineraries);return`\u{1F4CB} *Protocolo:* ${e.protocolo}

*Fornecedor:* ${e.fornecedor||"Geolog Transporte Executivo"}
*Empresa:* ${e.empresa}
*Solicitante:* ${e.solicitante||"N\xE3o informado"}

\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
\u{1F468}\u200D\u2708\uFE0F *Motorista:* ${e.motorista}

*Contato:* ${e.motoristaTelefone||"N\xE3o informado"}
*Ve\xEDculo:* ${t}
*Marca/Modelo:* ${e.veiculoMarcaModelo||"N\xE3o informado"}
*Placa:* ${i}

\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
\u{1F465} *Passageiro(s):*

${o}

${n}
_Portal Geolog_`}$.d(g,{$S:()=>N,Hk:()=>d,KC:()=>h,V_:()=>A,X2:()=>b,i:()=>k,iu:()=>T,pU:()=>m,rF:()=>_})},x);export{v as __getNamedExports};
