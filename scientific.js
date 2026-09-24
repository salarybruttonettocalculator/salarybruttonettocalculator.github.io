const scientificInput=document.getElementById('scientificExpression');
const scientificResult=document.getElementById('scientificResult');
let degrees=true, previousAnswer=0;

function evaluateScientific(source) {
  const normalized=source.replaceAll('×','*').replaceAll('÷','/').replaceAll('−','-').replaceAll('π','pi').replaceAll('√','sqrt');
  const tokens=[];
  const pattern=/\s*(\d+(?:\.\d*)?|\.\d+)(?:[eE]([+-]?\d+))?|\s*([a-zA-Z]+|[()+\-*/^%!])/gy;
  let index=0;
  while(index<normalized.length){
    pattern.lastIndex=index;
    const match=pattern.exec(normalized);
    if(!match)throw Error(window.siteText('Invalid character'));
    tokens.push(match[1]!==undefined ? {type:'number',value:Number(match[0].trim())} : {type:match[3].toLowerCase()});
    index=pattern.lastIndex;
  }
  let pos=0;
  const peek=()=>tokens[pos]?.type;
  const take=type=>{if(peek()!==type)throw Error(window.siteText('Check the expression'));pos++};
  function factorial(value){if(!Number.isInteger(value)||value<0||value>170)throw Error(window.siteText('Factorial needs an integer from 0 to 170'));let out=1;for(let i=2;i<=value;i++)out*=i;return out}
  function prefix(){
    const next=tokens[pos++];if(!next)throw Error(window.siteText('Incomplete expression'));
    if(next.type==='number')return next.value;
    if(next.type==='-')return -parse(25);
    if(next.type==='+')return parse(25);
    if(next.type==='('){const n=parse(0);take(')');return n}
    if(next.type==='pi')return Math.PI;
    if(next.type==='e')return Math.E;
    if(next.type==='ans')return previousAnswer;
    const functions={sin:n=>Math.sin(degrees?n*Math.PI/180:n),cos:n=>Math.cos(degrees?n*Math.PI/180:n),tan:n=>Math.tan(degrees?n*Math.PI/180:n),asin:n=>degrees?Math.asin(n)*180/Math.PI:Math.asin(n),acos:n=>degrees?Math.acos(n)*180/Math.PI:Math.acos(n),atan:n=>degrees?Math.atan(n)*180/Math.PI:Math.atan(n),sqrt:Math.sqrt,ln:Math.log,log:Math.log10,abs:Math.abs};
    if(functions[next.type]){take('(');const n=parse(0);take(')');return functions[next.type](n)}
    throw Error(window.siteText('Check the expression'));
  }
  function parse(minPower){
    let left=prefix();
    while(true){
      const op=peek();
      if((op==='!'||op==='%')&&40>=minPower){pos++;left=op==='!'?factorial(left):left/100;continue}
      const binding={'+':[10,11],'-':[10,11],'*':[20,21],'/':[20,21],'^':[30,30]}[op];
      if(!binding||binding[0]<minPower)break;
      pos++;const right=parse(binding[1]);
      left=op==='+'?left+right:op==='-'?left-right:op==='*'?left*right:op==='/'?left/right:Math.pow(left,right);
    }
    return left;
  }
  if(!tokens.length)throw Error(window.siteText('Enter an expression'));
  const result=parse(0);
  if(pos!==tokens.length)throw Error(window.siteText('Check the expression'));
  if(!Number.isFinite(result))throw Error(window.siteText('Undefined result'));
  return Math.abs(result)<1e-12?0:result;
}

function displayNumber(value){return Number(value.toPrecision(12)).toString()}
function updateScientific(final=false){
  try{
    const result=evaluateScientific(scientificInput.value);
    scientificResult.textContent=displayNumber(result);
    scientificResult.classList.remove('error');
    if(final){previousAnswer=result;scientificInput.value=displayNumber(result)}
  }catch(error){scientificResult.textContent=final?error.message:'—';scientificResult.classList.toggle('error',final)}
}

document.getElementById('scientificKeys').addEventListener('click',event=>{
  const key=event.target.closest('button[data-key]');if(!key)return;
  const action=key.dataset.key;
  if(action==='clear')scientificInput.value='';
  else if(action==='back')scientificInput.value=scientificInput.value.slice(0,-1);
  else if(action==='equals')updateScientific(true);
  else scientificInput.value+=action;
  if(action!=='equals')updateScientific();
  scientificInput.focus();
});
scientificInput.addEventListener('input',()=>updateScientific());
scientificInput.addEventListener('keydown',event=>{
  if(event.key==='Enter'){event.preventDefault();updateScientific(true)}
  if(event.key==='Escape'){scientificInput.value='';updateScientific()}
});
document.getElementById('angleUnit').addEventListener('click',()=>{
  degrees=!degrees;
  document.getElementById('angleUnit').textContent=degrees?'DEG':'RAD';
  document.getElementById('angleUnit').setAttribute('aria-label',degrees?window.siteText('Angle mode: degrees. Switch to radians'):window.siteText('Angle mode: radians. Switch to degrees'));
  updateScientific();
});
document.getElementById('sectionTabs').addEventListener('click',event=>{
  const tab=event.target.closest('button[data-section]');if(!tab)return;
  for(const button of document.querySelectorAll('#sectionTabs button')){
    const selected=button===tab;button.classList.toggle('active',selected);button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;
  }
  const scientific=tab.dataset.section==='scientific';
  document.getElementById('salarySection').hidden=tab.dataset.section!=='salary';
  document.getElementById('scientificSection').hidden=!scientific;
  document.getElementById('banksSection').hidden=tab.dataset.section!=='banks';
  if(scientific)scientificInput.focus();
});
