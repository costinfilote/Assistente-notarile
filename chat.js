
const URL="https://kyshgcgehilsvkofuped.supabase.co",KEY="sb_publishable_kA_uCDT_PGRuLQFt8D5ucw_sInoQz5i";
function norm(s){return String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9\s]/g," ")}
function score(q,r){const words=norm(q).split(/\s+/).filter(w=>w.length>2);const hay=norm(`${r.category} ${r.question} ${r.answer}`);return words.reduce((n,w)=>n+(hay.includes(w)?1:0),0)}
export default async function handler(req,res){
 if(req.method!=="POST")return res.status(405).json({error:"Metodo non consentito"});
 if(!process.env.OPENAI_API_KEY)return res.status(503).json({error:"Chiave OpenAI mancante"});
 const question=String(req.body?.question||"").trim();if(!question)return res.status(400).json({error:"Domanda mancante"});
 try{
  const fr=await fetch(`${URL}/rest/v1/faqs?select=category,question,answer&published=eq.true&order=sort_order.asc`,{headers:{apikey:KEY,Authorization:`Bearer ${KEY}`}});
  const rows=await fr.json();const ranked=rows.map(r=>({...r,s:score(question,r)})).filter(r=>r.s>0).sort((a,b)=>b.s-a.s).slice(0,4);
  if(!ranked.length)return res.status(200).json({answer:"Non dispongo di informazioni approvate sufficienti per rispondere. Contatta direttamente lo studio notarile.",sources:[]});
  const context=ranked.map((r,i)=>`FONTE ${i+1}\nCategoria: ${r.category}\nDomanda: ${r.question}\nRisposta: ${r.answer}`).join("\n\n");
  const instructions=`Rispondi in italiano ESCLUSIVAMENTE usando le fonti approvate fornite. Non usare conoscenze esterne, non inventare, non fare consulenza personalizzata e non stimare costi o imposte. Se le fonti non bastano, rispondi: "Non dispongo di informazioni approvate sufficienti per rispondere. Contatta direttamente lo studio notarile." Massimo 140 parole.`;
  const or=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-5-mini",instructions,input:`DOMANDA:\n${question}\n\nFONTI:\n${context}`,max_output_tokens:300})});
  const data=await or.json();if(!or.ok)throw new Error(data?.error?.message||"Errore OpenAI");const answer=data.output_text||(data.output||[]).flatMap(x=>x.content||[]).find(x=>x.type==="output_text")?.text;
  res.status(200).json({answer,sources:ranked.map(r=>`${r.category} — ${r.question}`)});
 }catch(e){console.error(e);res.status(500).json({error:"Errore servizio"})}
}
