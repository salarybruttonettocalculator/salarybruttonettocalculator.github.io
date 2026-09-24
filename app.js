const $ = id => document.getElementById(id);
const rules = window.SALARY_RULES;
const deRules = rules.germany, itRules = rules.italy;
const t = window.siteText;
const format = value => new Intl.NumberFormat(({de:'de-DE',it:'it-IT'})[window.SITE_LANG] || 'en-IE', {style:'currency', currency:'EUR', maximumFractionDigits:0}).format(value);
const amount = id => Math.max(0, Number($(id).value) || 0);
let country = 'de', worker = 'employee', mode = 'gross';

// 2026 § 32a EStG. This is an annual tariff, not the full official payroll algorithm.
function germanTariff(income) {
  const x = Math.floor(Math.max(0, income));
  const y = (x - deRules.brackets.basic) / 10000, z = (x - deRules.brackets.second) / 10000;
  return Math.max(0, Math.floor(x <= deRules.brackets.basic ? 0 : x <= deRules.brackets.second ? (914.51*y+1400)*y : x <= deRules.brackets.third ? (173.10*z+2397)*z+1034.87 : x <= deRules.brackets.fourth ? .42*x-11135.63 : .45*x-19470.38));
}

function italianTariff(income) {
  const x = Math.max(0, income);
  return Math.min(x, itRules.firstBracket)*itRules.firstRate + Math.min(Math.max(x-itRules.firstBracket,0),itRules.secondBracket-itRules.firstBracket)*itRules.secondRate + Math.max(x-itRules.secondBracket,0)*itRules.thirdRate;
}

function estimate(gross) {
  let social=0, tax=0, local=0, benefit=0, expenses=0, notes=[], steps=[], otherLabel=t('Other taxes');
  if (worker==='employee' && country==='de') {
    const pension = Math.min(gross,deRules.pensionCeiling)*deRules.employeePension;
    const unemployment = Math.min(gross,deRules.pensionCeiling)*deRules.employeeUnemployment;
    const children = amount('children');
    const saxony = $('saxony').value==='yes';
    const careRate = (children===0 ? ($('under23').value==='yes' ? deRules.careParent : deRules.careChildless) : deRules.careParent-Math.min(children-1,4)*deRules.careChildDiscount) + (saxony ? deRules.saxonyCareDifference : 0);
    const publicCover = $('health').value==='public';
    const care = publicCover ? Math.min(gross,deRules.healthCeiling)*careRate : 0;
    const health = publicCover ? Math.min(gross,deRules.healthCeiling)*(deRules.employeeHealth+amount('extra')/200) : amount('privateCost')*12;
    social = pension+unemployment+care+health;
    const cls = $('taxclass').value;
    const allowance = (cls==='6' ? 0 : deRules.employeeAllowance) + (cls==='2' ? deRules.singleParentAllowance : 0);
    // Private premium is entered net of employer support; the actual basic premium
    // deductible for wage withholding may differ. This is only an approximation.
    const taxable = Math.max(0,gross-social-allowance);
    if (cls==='3') tax = 2*germanTariff(taxable/2);
    else if (cls==='5' || cls==='6') tax = Math.max(taxable*.14,2*(germanTariff(taxable*1.25)-germanTariff(taxable*.75)));
    else tax = germanTariff(taxable);
    const threshold = cls==='3' ? deRules.solidarityJointThreshold : deRules.solidarityThreshold;
    const soli = tax>threshold ? Math.min(tax*.055,(tax-threshold)*.119) : 0;
    local = soli + tax*amount('church');
    otherLabel = t('Church tax + solidarity surcharge');
    notes = [t('Uses the 2026 German tax tariff, contribution ceilings and the insurance settings you chose.'), t('Tax withholding is simplified; class V/VI and private insurance can differ noticeably from a payslip.')];
    steps = [t('Pension (9.3%) and unemployment (1.3%) apply up to €101,400 gross. Public health and care apply up to €69,750.'), t('Public health is 7.3% plus half your fund’s additional rate. Care depends on children and Saxony. Private cover uses your stated out-of-pocket amount instead.'), t('Estimated taxable pay subtracts social payments and the employee allowance where applicable. The 2026 tax tariff and relevant church tax or solidarity surcharge follow.')];
  } else if (worker==='employee') {
    const inpsBase = gross*amount('inps')/100;
    // This simplified model applies the extra 1% above the annual threshold.
    const extraInps = Math.max(0,gross-itRules.extraInpsThreshold)*itRules.extraInpsRate;
    social = inpsBase+extraInps;
    const taxable = Math.max(0,gross-social);
    const base = italianTariff(taxable);
    let credit = taxable<=15000 ? 1955 : taxable<=itRules.firstBracket ? 1910+1190*(itRules.firstBracket-taxable)/13000 : taxable<=itRules.secondBracket ? 1910*(itRules.secondBracket-taxable)/22000 : 0;
    if (taxable>25000 && taxable<=35000) credit+=65;
    const extraCredit = taxable>20000 && taxable<=32000 ? 1000 : taxable<=40000 && taxable>32000 ? 1000*(40000-taxable)/8000 : 0;
    benefit = gross<=8500 ? gross*.071 : gross<=15000 ? gross*.053 : gross<=20000 ? gross*.048 : 0;
    tax = Math.max(0,base-credit-extraCredit);
    local = taxable*(amount('region')+amount('municipal'))/100;
    otherLabel = t('Regional + municipal tax');
    notes = [t('Local rates are entered by you. The estimate applies them as flat percentages, though local thresholds and bands can differ.'), t('Assumes a full year with one employer, standard employment deductions and no special tax relief.')];
    steps = [t('Subtract your employee INPS rate. The model also applies an extra 1% to pay above €56,224.'), t('Apply 2026 IRPEF: 23% to €28,000 of taxable income, 33% from €28,000 to €50,000 and 43% above €50,000.'), t('Subtract estimated full-year employment credits, add your regional and municipal tax rates, and include any estimated low-income employee benefit.')];
  } else {
    expenses = Math.min(gross,amount('expenses'));
    const profit = Math.max(0,gross-expenses);
    social = profit*amount('selfRate')/100;
    const taxable = Math.max(0,profit-social);
    tax = country==='de' ? germanTariff(taxable) : italianTariff(taxable);
    notes = [t('Uses the ordinary income tax tariff and the contribution rate you entered. Insurance and business regimes differ by activity.'), t('Excludes VAT, trade tax, Italy’s forfettario scheme, advance payments and other personal deductions.')];
    steps = [t('Deduct the yearly business expenses you entered from gross revenue.'), t('Estimate social contributions from the remaining profit using your selected rate.'), t('Apply the ordinary national income tax tariff. Special business and personal rules are excluded.')];
  }
  return {gross, expenses, social, tax, local, benefit, net:gross-expenses-social-tax-local+benefit, notes, steps, otherLabel};
}

// Find the smallest gross in a nearby bracket that reaches the desired net.
// Sampling brackets accommodates the small steps in low-income Italian relief.
function grossForNet(target) {
  if (target<=0) return 0;
  const max=10000000, step=500;
  let low=0, high=step;
  while (high<=max && estimate(high).net<target) {low=high;high+=step}
  if (high>max) return null;
  for(let i=0;i<25;i++) {const mid=(low+high)/2;if(estimate(mid).net>=target) high=mid;else low=mid}
  let result=Math.ceil(high);
  while (result>0 && estimate(result-1).net>=target) result--;
  return result;
}

function render() {
  const safeYear = new Date().getFullYear()===rules.taxYear;
  const reviewAge=(Date.now()-new Date(rules.reviewedAt+'T00:00:00Z').getTime())/86400000;
  const stale=reviewAge>35;
  $('ruleStatus').textContent=!safeYear?t('These {year} rates have expired. Results are paused until the next tax year is verified.',{year:rules.taxYear}):stale?t('Tax year {year} · Last checked {date}. This review is overdue; confirm current rules before relying on a result.',{year:rules.taxYear,date:rules.reviewedAt}):t('Tax year {year} · Rules checked {date} · Scheduled review',{year:rules.taxYear,date:rules.reviewedAt});
  $('ruleStatus').classList.toggle('notice',!safeYear||stale);
  const banksStale=(Date.now()-new Date(rules.banksReviewedAt+'T00:00:00Z').getTime())/86400000>35;
  $('bankStatus').textContent=t('Bank terms checked {date}. ',{date:rules.banksReviewedAt})+(banksStale?t('Review overdue: confirm card fees and limits with each provider. '):'')+t('“No opening minimum” describes account opening, not the balance needed to spend or activate a card.');
  $('bankStatus').classList.toggle('notice',banksStale);
  if(!safeYear){$('monthly').textContent=t('Update pending');$('annual').textContent=t('Next tax year under review');$('breakdown').classList.add('hidden');return}
  const annualInput=amount('salary')*($('basis').value==='month'?12:1);
  const gross=mode==='gross'?annualInput:grossForNet(annualInput);
  if(gross===null){$('monthly').textContent=t('Outside supported range');$('annual').textContent=t('Try a lower target');$('breakdown').classList.add('hidden');return}
  $('breakdown').classList.remove('hidden');
  const r=estimate(gross);
  const reverse=mode==='net';
  $('resultHeading').textContent=reverse?t('Gross salary needed'):t('Estimated take home');
  $('monthly').innerHTML=format((reverse?r.gross:r.net)/12)+' <small>'+t('/ month')+'</small>';
  $('annual').textContent=format(reverse?r.gross:r.net)+t(' / year');
  $('netBar').style.width=(r.gross?Math.max(0,Math.min(100,r.net/r.gross*100)):0)+'%';
  $('outGross').textContent=format(r.gross);
  $('outExpenses').textContent='− '+format(r.expenses);
  $('expensesRow').classList.toggle('hidden',worker==='employee');
  $('outSocial').textContent='− '+format(r.social);
  $('outTax').textContent='− '+format(r.tax);
  $('outLocal').textContent='− '+format(r.local);
  $('localLabel').textContent=r.otherLabel;
  $('localRow').classList.toggle('hidden',worker==='self');
  $('benefitRow').classList.toggle('hidden',r.benefit===0);
  $('outBenefit').textContent='+ '+format(r.benefit);
  $('outNet').textContent=format(r.net);
  const payPeriods=Number($('payments').value);
  $('periodNote').textContent=(reverse?t('Target net: {target} monthly equivalent. Estimated net: {net} per month. ',{target:format(annualInput/12),net:format(r.net/12)}):'')+
    (country==='it'&&worker==='employee'&&payPeriods>12?t('Average over {periods} payslips: {amount} net each. Monthly equivalent divides the yearly amount by 12.',{periods:payPeriods,amount:format(r.net/payPeriods)}):t('Monthly equivalent divides the yearly amount by 12.'));
  $('assumptions').textContent=r.notes.join(' ');
  $('explanation').replaceChildren(...r.steps.map(s=>{const li=document.createElement('li');li.textContent=s;return li}));
}

function update() {
  const de=country==='de', employee=worker==='employee';
  $('deFields').classList.toggle('hidden',!de||!employee);
  $('itFields').classList.toggle('hidden',de||!employee);
  $('employeeFields').classList.toggle('hidden',!employee);
  $('selfFields').classList.toggle('hidden',employee);
  $('extraField').classList.toggle('hidden',$('health').value==='private');
  $('privateField').classList.toggle('hidden',$('health').value!=='private');
  $('salaryLabel').textContent=mode==='gross'?(employee?t('Gross salary (€)'):t('Gross business revenue (€)')):t('Desired take home (€)');
  $('salary').setAttribute('aria-label',$('salaryLabel').textContent);
  $('lead').textContent=mode==='gross'?t('Enter gross pay to estimate your monthly and yearly net income.'):t('Enter your desired net income to estimate the gross amount needed with the tax settings below.');
  render();
}

for(const id of ['country','worker','mode']) $(id).addEventListener('click',event=>{
  const button=event.target.closest('button[data-value]');if(!button)return;
  $(id).querySelectorAll('button').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button))});
  if(id==='country')country=button.dataset.value;
  else if(id==='worker')worker=button.dataset.value;
  else {mode=button.dataset.value;$('salary').value=mode==='gross'?'51600':'3000';$('basis').value=mode==='gross'?'year':'month'}
  update();
});
document.querySelectorAll('input,select').forEach(el=>el.addEventListener('input',update));
update();
