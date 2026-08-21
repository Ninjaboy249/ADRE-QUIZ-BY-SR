const superscripts={0:"⁰",1:"¹",2:"²",3:"³",4:"⁴",5:"⁵",6:"⁶",7:"⁷",8:"⁸",9:"⁹"};

const corrections={
 "2022-p5-q43":{question:"In the equation x² − 2x + 1 = 0, the value of x³ − 1/x³ is:",options:["0","1","−1","2"]},
 "2022-p5-q44":{question:"How many cubes of volume 1 cm³ each can be cut out from a single cube of volume 1 m³?",options:["10⁸","10⁶","10⁴","10²"]},
 "2022-p5-q54":{question:"0.2̅3̅ is equivalent to the fraction:",options:["23/99","23/990","23/999","23/90"]},
 "2022-p5-q56":{question:"The angle 54° when converted to radians is:",options:["π/10","3π/10","7π/10","9π/10"]},
 "2022-p5-q57":{question:"The decimal representation of 2.5/50 is:",options:["0.5","0.25","0.05","0.025"]},
 "2022-p5-q58":{question:"Find the value of x if x/128 = 162/x.",options:["12","14","196","144"]},
 "2022-p5-q59":{question:"If a − b = 5 and a² + b² = 41, then the value of ab is:",options:["10","5","7","8"]},
 "2022-p4-q82":{question:"If x/y = 2/3, then (3x + 5y)/(3x − 5y) + (6x + 4y)/(6x − y) is equal to:",options:["1/3","2/3","−1/3","−2/3"]},
 "2022-p4-q85":{options:["13⅔%","14⅔%","15⅔%","16⅔%"]},
 "2022-p4-q88":{question:"The conversion of 0.03̅7̅ into fractional form is:",options:["37/990","37/999","37/100","37/1000"]},
 "2022-p3-q45":{question:"The smallest among 1/2, 1/3, 1/4 and 2/3 is:",options:["2/3","1/2","1/3","1/4"]},
 "2022-p3-q50":{options:["20%","25%","12½%","16⅔%"]},
 "2022-p3-q52":{question:"If cos θ = b/a, then the value of sec θ will be:"},
 "2022-p2-q63":{question:"The numerator of a fraction is 2 less than its denominator. If the numerator is multiplied by 2 and the denominator by 3, the fraction becomes 2/9. The fraction is:",options:["1/3","3/5","5/7","7/9"]},
 "2022-p2-q76":{question:"Fill in the blank: 149,600,000 = ______ × 10⁷",options:["1496","149.6","14.96","1.496"]},
 "2022-p2-q77":{options:["2x² + 3x","2x² + 4x","2x² + 7x","2x² + 12x"]},
 "2022-p2-q80":{options:["½ × (sum of the diagonal lengths)","2 × (sum of the diagonal lengths)","½ × (product of the diagonal lengths)","2 × (product of the diagonal lengths)"]},
 "2022-p2-q81":{question:"Division of x² − 5x + 6 by x − 3 results in:",options:["1","x − 2","0","x + 2"]},
 "2022-p2-q83":{question:"The HCF of x²y and xy² is:",options:["x","y","x + y","xy"]},
 "2022-p1-q64":{question:"If 1296 = x², then the value of x will be:",options:["5","6","7","8"]},
 "2022-p1-q68":{question:"Which of the following is a factor of the polynomial x² − x − 2?",options:["(x − 4)","(x + 5)","(x − 2)","(x + 4)"]},
 "2022-p1-q70":{question:"The number that replaces ? in 0.003 ÷ ? = 0.3 is:",options:["0.01","1.0","0.0001","0.001"]},
 "2022-p1-q71":{question:"Which fraction is the largest: 11/12, 12/13, 13/14, 14/15?",options:["14/15","13/14","12/13","11/12"]},
 "2022-p1-q73":{question:"If a/b = 8/6, then the value of (6a + 2b)/(4a − 2b) is:",options:["5","3","2","1"]},
 "2022-p1-q77":{question:"If x + 1/x = 4, then the value of x² + 1/x² is:",options:["10","12","13","14"]},
 "2022-p1-q78":{options:["12√3 cm²","24√3 cm²","30√3 cm²","36√3 cm²"]},
 "2022-p1-q82":{options:["1/2","1/3","2/3","1/4"]},
 "2024-p1-q44":{question:"(−1)⁵ + (−1)⁶ equals:",options:["1","−1","0","−11"]},
 "2024-p1-q45":{question:"The value of √1849 is:",options:["33","43","53","63"]},
 "2024-p1-q48":{question:"(x² − 3x − 4) ÷ (x + 1) = ? (x ≠ −1)",options:["x − 4","x − 3","x − 2","x − 1"]},
 "2024-p1-q49":{options:["507/90","517/99","517/90","507/99"]},
 "2024-p1-q52":{options:["100 cm²","50 cm²","64 cm²","48 cm²"]},
 "2024-p2-q67":{question:"The equivalent fraction of the decimal number 2.25 is:",options:["9/4","9/5","9/7","9/8"]},
 "2024-p2-q78":{question:"The sum of 2/3 + 5/6 equals:",options:["6/5","3/2","5/3","1"]},
 "2024-p2-q80":{question:"What must be added to (a − b)² in order to get (a + b)²?"},
 "2024-p2-q81":{question:"1/2 + 1/3 + 1/4 is equal to:",options:["13/12","13/24","12/13","24/13"]},
 "2024-p2-q83":{options:["48 cm³","480 cm³","240 cm³","42 cm³"]}
};

export function normalizeMathText(value=""){
 let text=String(value).replace(/[\uf020\u200b]/g,"").replace(/[\uf0b4\uf0d7]/g,"×").replace(/\uf0b8/g,"÷").replace(/\uf02b/g,"+").replace(/\uf03d/g,"=").replace(/\uf070/g,"π").replace(/\uf071/g,"θ").replace(/[º˚]/g,"°");
 text=text.replace(/[\uf0e8\uf8eb]/g,"(").replace(/[\uf0f8\uf8f8]/g,")").replace(/[\uf0e7\uf0e6\uf0f7\uf0f6\uf8ec\uf8ed\uf8f6\uf8f7]/g,"");
 text=text.replace(/\b(cm|mm|km|m)\s*([23])\b/g,(_,unit,power)=>unit+superscripts[power]).replace(/\b([A-Za-z])([234])\b/g,(_,letter,power)=>letter+superscripts[power]).replace(/\)\s*([234])\b/g,(_,power)=>")"+superscripts[power]).replace(/\b10\s+([2-9])\b/g,(_,power)=>"10"+superscripts[power]);
 return text.replace(/\s*([=+×÷≠])\s*/g," $1 ").replace(/\s{2,}/g," ").trim();
}

export function normalizedQuestion(question){
 const correction=corrections[question.id]||{};
 return {...question,question:normalizeMathText(correction.question||question.question),options:(correction.options||question.options).map(normalizeMathText)};
}
