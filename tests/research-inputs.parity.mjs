// Run explicitly with the research Python environment installed. No fitting or file writes.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const root=fileURLToPath(new URL("../",import.meta.url));
const source=readFileSync(path.join(root,"src/lib/researchInputs.ts"),"utf8");
const compiledTrace={exports:{}};
vm.runInThisContext(`(function(exports){${ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText}\n})`)(compiledTrace.exports);
const {researchInputTrace}=compiledTrace.exports;
const model=JSON.parse(readFileSync(path.join(root,"data/research/model.json"),"utf8"));
const examples=JSON.parse(readFileSync(path.join(root,"data/research/examples.json"),"utf8"));
const keys=["heartRate","respRate","tempC","spo2"];
const rows=Array.from({length:10},(_,hour)=>({hour,heartRate:null,respRate:null,tempC:null,spo2:null,risk:null}));
Object.assign(rows[0],{heartRate:82,respRate:18,tempC:36.17});
Object.assign(rows[6],{heartRate:250,spo2:100});
Object.assign(rows[7],{respRate:0,tempC:46,spo2:49});
Object.assign(rows[9],{heartRate:20,respRate:2,tempC:25,spo2:50});
const records=[{id:"boundary-fixture",hours:rows},...examples.records];
const python=process.env.RESEARCH_PYTHON || path.join(root,".venv-research/bin/python");
const results=JSON.parse(execFileSync(python,["-c",`
import json, sys
import numpy as np
from scripts.research.data import features
from scripts.research.model import predict_export
payload=json.load(sys.stdin)
result=[]
for rows in payload["records"]:
    x,scorable=features(np.asarray(rows,dtype=float))
    filled=np.where(np.isnan(x),payload["model"]["imputation"],x)
    scores=predict_export(payload["model"],x)
    result.append({"features":filled.tolist(),"scorable":scorable.tolist(),"scores":scores.tolist()})
print(json.dumps(result,allow_nan=False))
`],{cwd:root,input:JSON.stringify({model,records:records.map(r=>r.hours.map(h=>keys.map(k=>h[k])))}),encoding:"utf8"}));
let hours=0;
for(let r=0;r<records.length;r++) for(let i=0;i<records[r].hours.length;i++) {
  const trace=researchInputTrace(records[r].hours.slice(0,i+1),model.imputation);
  assert.deepEqual(trace.features,results[r].features[i],`${records[r].id} h${i} features`);
  assert.equal(trace.scorable,results[r].scorable[i],`${records[r].id} h${i} scorable`);
  if(r>0){
    const published=records[r].hours[i].risk;
    assert.equal(published!==null,trace.scorable,`${records[r].id} h${i} published score availability`);
    if(published!==null) assert.ok(Math.abs(published-results[r].scores[i])<1e-12,`${records[r].id} h${i} score parity`);
  }
  hours++;
}
console.log(`PASS: ${hours} hourly traces match the Python pipeline; both published records match exported scores within 1e-12.`);
