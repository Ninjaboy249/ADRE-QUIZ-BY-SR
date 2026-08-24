import { createHash } from "node:crypto";

const statuses=new Set(["pending","verified","rejected","needs_review"]);
const difficulties=new Set(["easy","medium","hard"]);
const optionTypes=new Set(["single_correct_mcq","multiple_correct_mcq","multiple_statement","assertion_reason","match_following","matrix_match","image_map","passage"]);
const numericTypes=new Set(["numerical","integer_answer"]);
const descriptiveTypes=new Set(["descriptive_short","descriptive_long","essay"]);
const questionTypes=new Set([...optionTypes,...numericTypes,...descriptiveTypes,"true_false","passage"]);
const clean=value=>typeof value==="string"?value.trim():"";

export function validateQuestionRecord(input,index=0){
 const type=(clean(input.question_type)||"single_correct_mcq").toLowerCase().replaceAll("-","_");
 const answer=Array.isArray(input.correct_answer)?input.correct_answer.map(x=>clean(x).toUpperCase()):clean(input.correct_answer).toUpperCase();
 const record={...input,exam:clean(input.exam),exam_version:clean(input.exam_version),stage:clean(input.stage),paper:clean(input.paper),session:clean(input.session),question_number:clean(input.question_number),subject:clean(input.subject),chapter:clean(input.chapter),topic:clean(input.topic),question:clean(input.question),question_type:type,explanation:clean(input.explanation),model_answer:clean(input.model_answer),source:clean(input.source),source_url:clean(input.source_url),answer_key_source:clean(input.answer_key_source),language:clean(input.language)||"English",difficulty:clean(input.difficulty).toLowerCase()||"medium",verification_status:clean(input.verification_status).toLowerCase()||"pending",correct_answer:answer};
 const errors=[];
 for(const field of ["exam","subject","chapter","topic","question","source"])if(!record[field])errors.push(`${field} is required`);
 if(!descriptiveTypes.has(type)&&!record.answer_key_source)errors.push("answer_key_source is required for objective questions");
 if(/^(JEE|UPSC|RBI)/i.test(record.exam)&&!record.paper)errors.push("paper is required for staged exam imports");
 if(/^(UPSC|RBI)/i.test(record.exam)&&(!record.exam_version||!record.stage))errors.push("exam_version and stage are required for UPSC/RBI imports");
 if(/^(UPSC|RBI)/i.test(record.exam)&&!/^https:\/\//i.test(record.source_url))errors.push("source_url must be an HTTPS URL for UPSC/RBI imports");
 if(/^(UPSC|RBI)/i.test(record.exam)&&(!input.license_metadata||typeof input.license_metadata!=="object"||Array.isArray(input.license_metadata)))errors.push("license_metadata is required for UPSC/RBI imports");
 if(!questionTypes.has(type))errors.push("question_type is not supported");
 const normalizedOptions=Array.isArray(input.options)?input.options.map(clean):[];
 if(optionTypes.has(type)){if(normalizedOptions.length<2)errors.push("option-based questions require at least two options");else if(normalizedOptions.some(option=>!option))errors.push("every option must contain text")}
 else if(!descriptiveTypes.has(type)&&normalizedOptions.length)errors.push("numerical/integer questions must not include options");
 const validOptionKeys=new Set(normalizedOptions.map((_,i)=>String.fromCharCode(65+i)));
 if(type==="single_correct_mcq"&&(!/^[A-Z]$/.test(answer)||!validOptionKeys.has(answer)))errors.push("single-correct answer must reference an existing option key");
 if(type==="multiple_correct_mcq"&&(!Array.isArray(answer)||!answer.length||answer.some(x=>!validOptionKeys.has(x))))errors.push("multiple-correct answer must reference existing option keys");
 if(numericTypes.has(type)&&(!Number.isFinite(Number(input.numeric_answer))))errors.push("numeric_answer is required for numerical/integer questions");
 if(descriptiveTypes.has(type)&&input.word_limit!==undefined&&(!Number.isInteger(Number(input.word_limit))||Number(input.word_limit)<=0))errors.push("word_limit must be a positive integer");
 if(!Number.isInteger(Number(input.year))||Number(input.year)<2000||Number(input.year)>2200)errors.push("year must be a valid four-digit exam year");
 if(!difficulties.has(record.difficulty))errors.push("difficulty must be easy, medium, or hard");
 if(!statuses.has(record.verification_status))errors.push("verification_status is invalid");
 if(input.is_pyq===true&&!record.explanation)errors.push("verified PYQ imports require an explanation");
 for(const field of ["image_url","diagram_url"])if(input[field]&&!/^https:\/\//i.test(input[field]))errors.push(`${field} must be an HTTPS URL`);
 const contentHash=createHash("sha256").update(`${record.exam}|${record.year}|${record.paper}|${record.session}|${record.question.toLowerCase()}|${normalizedOptions.join("|").toLowerCase()}`).digest("hex");
 return {index,valid:errors.length===0,errors,record:{...record,year:Number(input.year),numeric_answer:numericTypes.has(type)?Number(input.numeric_answer):null,word_limit:descriptiveTypes.has(type)&&input.word_limit?Number(input.word_limit):null,statements:Array.isArray(input.statements)?input.statements.map(clean):[],key_points:Array.isArray(input.key_points)?input.key_points.map(clean):[],options:normalizedOptions,is_pyq:input.is_pyq===true,is_ai_generated:input.is_ai_generated===true,image_url:input.image_url||null,diagram_url:input.diagram_url||null,license_metadata:input.license_metadata||{},content_hash:contentHash}};
}

export function validateQuestionImport(records){
 if(!Array.isArray(records))return {valid:false,total:0,validRecords:[],errors:[{index:-1,errors:["records must be an array"]}]};
 const results=records.map(validateQuestionRecord),seen=new Map;
 for(const result of results){const previous=seen.get(result.record.content_hash);if(previous!==undefined){result.valid=false;result.errors.push(`duplicate of import row ${previous+1}`)}else seen.set(result.record.content_hash,result.index)}
 return {valid:results.every(x=>x.valid),total:results.length,validRecords:results.filter(x=>x.valid).map(x=>x.record),errors:results.filter(x=>!x.valid).map(({index,errors})=>({index,errors}))};
}
