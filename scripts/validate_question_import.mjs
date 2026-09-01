import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateQuestionImport } from "../lib/question-import.js";

const path=process.argv[2];
if(!path){console.error("Usage: node scripts/validate_question_import.mjs <questions.json>");process.exit(2)}
const payload=JSON.parse(readFileSync(resolve(path),"utf8"));
const result=validateQuestionImport(Array.isArray(payload)?payload:payload.records);
console.log(JSON.stringify({valid:result.valid,total:result.total,validCount:result.validRecords.length,errors:result.errors},null,2));
process.exit(result.valid?0:1);
