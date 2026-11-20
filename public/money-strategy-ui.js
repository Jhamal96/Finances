/* Money Strategy & Insights — read-only dashboard, bank connections intentionally deferred.
   Reuses the authenticated finance app's in-memory data. No external reads or writes. */
(function(){
  'use strict';
  const usd = n => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n)||0);
  const day = x => String(x||'').slice(0,10);
  const today = () => {const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
  const el = id => document.getElementById(id);
  const esc = x => String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sum = (items, fn) => items.reduce((n,x)=>n+(Number(fn(x))||0),0);
  const cents = x => Number(x||0)/100;
  const valid = d => /^\d{4}-\d{2}-\d{2}$/.test(d);
  const weekStart = (date, start=6) => {const d=new Date(date+'T12:00:00'); d.setDate(d.getDate()-(d.getDay()-start+7)%7);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
  const daysFrom = (d,n) => {const date=new Date(d+'T12:00:00'); date.setDate(date.getDate()+n);return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');};
  function records(data){
    const obligations=[];
    const seen=new Set();
    function push(kind,source,label,date,amount,paid,owner,id) {
      date=day(date);amount=Number(amount)||0;
      if(!valid(date)||!Number.isFinite(amount)||amount<0)return;
      const key=[kind,source,String(id??''),date].join(':');
      if(seen.has(key))return;
      seen.add(key);
      obligations.push({key,kind,label:String(label||kind),date,amount,paid:!!paid,owner:String(owner||'together')});
    }
    Object.entries(data.months||{}).forEach(([month,entry])=>{
      for(const owner of ['his','her']){
        (Array.isArray(entry?.[owner])?entry[owner]:[]).forEach((x,i)=>push('Bill',month,x.name||x.title,x.dueDate,x.amount,x.isPaid||x.paid,owner,x.id??i));
      }
    });
    (data.esso||[]).forEach((x,i)=>push('ESSO','esso',x.name||x.title,x.dueDate,x.amount,x.isPaid||x.paid,'together',x.id??i));
    (data.payFourPlans||[]).forEach((p,pi)=> (p.installments||[]).forEach((x,i)=>push('Pay in 4',p.id??pi,p.provider||p.store||'Installment',x.dueDate,cents(x.amountCents),x.paid,p.owner,p.id?i:pi+':'+i)));
    const expenses=(Array.isArray(data.monthlyExpenses)?data.monthlyExpenses:[]).filter(x=>valid(day(x.date)));
    const incomes=[];
    Object.entries(data.months||{}).forEach(([month,entry])=>{
      for(const [key,owner] of [['hisPay','his'],['herPay','her']]){
        (Array.isArray(entry?.[key])?entry[key]:[]).forEach((x,i)=>{const dt=day(x.date||x.payDate||x.receivedDate);if(valid(dt))incomes.push({date:dt,amount:Number(x.amount)||0,owner,id:x.id??i});});
      }
    });
    return {obligations:obligations.sort((a,b)=>a.date.localeCompare(b.date)),expenses,incomes};
  }
  function settingsKey(){return 'finance_strategy_preferences_v1_'+(typeof financeAuthUser!=='undefined'&&financeAuthUser?.id||'locked');}
  function preferences(){try{return JSON.parse(localStorage.getItem(settingsKey())||'{}');}catch{return {};}}
  function savePreferences(){if(!financeAuthUser)return;const p={balance:Math.max(0,Number(el('strategyBalance').value)||0),reserve:Math.max(0,Number(el('strategyReserve').value)||0),weekStart:Number(el('strategyWeekStart').value),checkIn:el('strategyCheckIn').checked};localStorage.setItem(settingsKey(),JSON.stringify(p));moneyStrategyRender();}
  function report(){
    if(!financeAuthUser)return;
    const data=getStoredData(), {obligations,expenses,incomes}=records(data);
    const prefs=preferences(), now=today(), month=now.slice(0,7),end=daysFrom(now,30);
    const unpaid=obligations.filter(x=>!x.paid);
    const upcoming=unpaid.filter(x=>x.date>=now&&x.date<=end);
    const overdue=unpaid.filter(x=>x.date<now);
    const remaining=sum(upcoming,x=>x.amount)+sum(overdue,x=>x.amount);
    const balance=Number(prefs.balance)||0,reserve=Number(prefs.reserve)||0;
    const spend=Math.round((balance-remaining-reserve)*100)/100;
    const currentWeek=weekStart(now,Number(prefs.weekStart??6)),weekEnd=daysFrom(currentWeek,6);
    const prevWeek=daysFrom(currentWeek,-7);
    const inRange=(d,a,b)=>d>=a&&d<=b;
    const expenseAmount=x=>cents(x.amountCents);
    const weekly=sum(expenses.filter(x=>inRange(x.date,currentWeek,weekEnd)),expenseAmount);
    const previous=sum(expenses.filter(x=>inRange(x.date,prevWeek,daysFrom(currentWeek,-1))),expenseAmount);
    const trend=[];
    for(let i=5;i>=0;i--){const d=new Date(now+'T12:00:00');d.setDate(1);d.setMonth(d.getMonth()-i);const m=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');trend.push({month:m,spent:sum(expenses.filter(x=>day(x.date).startsWith(m)),expenseAmount),income:sum(incomes.filter(x=>day(x.date).startsWith(m)),x=>x.amount)});}
    const max=Math.max(1,...trend.flatMap(x=>[x.spent,x.income]));
    el('strategyMetrics').innerHTML=[
      ['Upcoming 30 days',usd(sum(upcoming,x=>x.amount))],
      ['Overdue',usd(sum(overdue,x=>x.amount))],
      ['Pay in 4 remaining',usd(sum(unpaid.filter(x=>x.kind==='Pay in 4'),x=>x.amount))],
      ['Safe-to-spend estimate',usd(spend)]
    ].map(([name,value])=>'<div class="strategy-metric"><small>'+esc(name)+'</small><strong>'+esc(value)+'</strong></div>').join('');
    el('strategySafety').textContent='Estimate only: '+usd(balance)+' manually entered balance − '+usd(remaining)+' overdue/upcoming obligations − '+usd(reserve)+' reserve. It is not a verified bank balance. Payments already logged as paid are excluded; wallets and pending card activity are not yet reconciled.';
    el('strategyWeek').textContent='Saturday–Friday by default · '+currentWeek+' to '+weekEnd+' · '+usd(weekly)+' recorded spending ('+(weekly>=previous?'+':'−')+usd(Math.abs(weekly-previous))+' versus prior week).';
    el('strategyTrends').innerHTML=trend.map(x=>'<div class="strategy-chart-row"><span>'+esc(x.month)+'</span><div><div class="strategy-chart-spend" style="width:'+Math.max(1,Math.round(100*x.spent/max))+'%"></div><div class="strategy-chart-income" style="width:'+Math.max(1,Math.round(100*x.income/max))+'%"></div></div><span>'+esc(usd(x.spent))+'</span></div>').join('');
    el('strategyUpcoming').innerHTML=(overdue.concat(upcoming).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,30).map(x=>'<li><strong>'+esc(x.label)+'</strong> · '+esc(x.kind)+' · '+esc(x.date)+' · '+esc(usd(x.amount))+(x.date<now?' <em>Overdue</em>':'')+'</li>').join(''))||'<li>No upcoming or overdue items were found in the existing records.</li>';
    const year=now.slice(0,4);
    const yearExpense=sum(expenses.filter(x=>x.date.startsWith(year)),expenseAmount);
    const yearIncome=sum(incomes.filter(x=>x.date.startsWith(year)),x=>x.amount);
    el('strategyYear').textContent=year+' recorded expenses '+usd(yearExpense)+' · recorded paycheck entries '+usd(yearIncome)+'. These figures reflect recorded activity, not verified savings.';
    el('strategyBalance').value=balance;
    el('strategyReserve').value=reserve;
    el('strategyWeekStart').value=String(prefs.weekStart??6);
    el('strategyCheckIn').checked=prefs.checkIn!==false;
    el('strategyAlert').hidden=!overdue.length;
    el('strategyAlert').textContent=overdue.length+' overdue obligation(s) detected. Review the payment status in the original tracker.';
    if(prefs.checkIn!==false && !localStorage.getItem('strategy_checkin_'+now+'_'+financeAuthUser.id) && !document.hidden){
      localStorage.setItem('strategy_checkin_'+now+'_'+financeAuthUser.id,'1');
      el('strategyCheckInNotice').hidden=false;
      el('strategyCheckInNotice').textContent='Daily check-in: '+upcoming.length+' payments due within 30 days, '+overdue.length+' overdue. Estimated safe-to-spend: '+usd(spend)+'.';
    }
  }
  window.moneyStrategyRender=report;
  window.moneyStrategySavePreferences=savePreferences;
  window.moneyStrategyDismissCheckIn=()=>{el('strategyCheckInNotice').hidden=true;};
  window.moneyStrategySettingsNotice=()=>alert('Settings are saved only to this signed-in browser at present. Do not assume they are cloud-synced. Bank connectivity and cross-account wallet approvals are deferred.');
})();