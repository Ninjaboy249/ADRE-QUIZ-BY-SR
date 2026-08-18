import json
import re
import sys
from pathlib import Path

from pypdf import PdfReader


SOURCE = Path(r"C:\Users\shiva\Downloads\ADRE_merged.pdf")
OUTPUT = Path("data/questions.json")

PAPERS = [
    ("2022-p5", "ADRE 2022 - Paper V", 6, 64, 100),
    ("2022-p4", "ADRE 2022 - Paper IV", 70, 128, 100),
    ("2022-p3", "ADRE 2022 - Paper III", 134, 192, 100),
    ("2022-p2", "ADRE 2022 - Paper II", 198, 288, 135),
    ("2022-p1", "ADRE 2022 - Paper I", 294, 384, 135),
    ("2024-p5", "ADRE 2024 - Paper V", 390, 456, 100),
    ("2024-p4", "ADRE 2024 - Paper IV", 462, 536, 150),
    ("2024-p3", "ADRE 2024 - Paper III", 542, 632, 150),
    ("2024-p2", "ADRE 2024 - Paper II", 638, 728, 135),
    ("2024-p1", "ADRE 2024 - Paper I", 734, 800, 100),
]

MANUAL = {
    ("2024-p5", 56): (
        "Fill in the blank: Raju __________ his intention to contest in the next elections.",
        ["Wished", "Conditioned", "Declared", "Promised"],
        411,
    ),
    ("2024-p4", 56): (
        "Fill in the blank: January was the __________ month last year.",
        ["Cold", "Colder", "Coldest", "Cool"],
        489,
    ),
    ("2024-p4", 135): (
        "Okapis stay within the forest interior. The passage relates this to the __________ of the Okapi.",
        ["scarcity", "mind", "culture", "size"],
        528,
    ),
    ("2024-p4", 144): (
        "This application was written __________ a pen.",
        ["by", "with", "off", "nib"],
        531,
    ),
    ("2024-p4", 145): (
        "Choose the correct pair to fill up the blanks: He put some __________ on the hinge, so that it should not __________.",
        ["oil, squeak", "water, spill", "colour, stand", "paper, seat"],
        531,
    ),
    ("2024-p4", 147): (
        "Everyone admired __________ his courage.",
        ["at", "of", "for", "no word required"],
        531,
    ),
    ("2024-p1", 7): (
        "Fill in the blank: Yasmin __________ on paying the bill for her whole group.",
        ["requested", "promised", "suggested", "insisted"],
        734,
    ),
}

START_RE = re.compile(r"(?m)^\s*(\d{1,3})\.\s+")
OPTION_RE = re.compile(r"\(([A-D])\)\s*")


def clean(value: str) -> str:
    value = value.replace("\u00ad", "").replace("\uf0b7", "")
    value = value.replace("", ".").replace("", "°")
    value = re.sub(r"_{10,}", " ", value)
    value = re.sub(r"\s+", " ", value)
    return value.strip(" \n\r\t-")


def candidate_blocks(text: str, matches: list[re.Match], number: int):
    same = [m for m in matches if int(m.group(1)) == number]
    for index, start_match in enumerate(same):
        if index + 1 < len(same):
            end = same[index + 1].start()
        else:
            separator = re.search(r"_{10,}", text[start_match.end():])
            candidates = [len(text)]
            if separator:
                candidates.append(start_match.end() + separator.start())
            end = min(candidates)
        yield text[start_match.end():end]


COMMON_ENGLISH = set(
    "the a an of in on for to from by with which what who whom whose where when how is are was were "
    "has have had does do not following correct select find given statement statements conclusion word "
    "india assam number value one two three four only among according would country river city year".split()
)


def english_quality(question: str, options: list[str]) -> float:
    value = f"{question} {' '.join(options)}"
    if not value:
        return -1
    conventional = sum(c.isascii() and (c.isalnum() or c.isspace() or c in ".,?!:;'\"()[]{}+-–—×÷/%₹°") for c in value)
    words = re.findall(r"[A-Za-z]+", value.lower())
    common = sum(word in COMMON_ENGLISH for word in words)
    return conventional / len(value) + min(common, 10) * 0.08


def parse_block(block: str):
    markers = list(OPTION_RE.finditer(block))
    if len(markers) < 4:
        return None
    question = clean(block[: markers[0].start()])
    options = []
    for i, marker in enumerate(markers[:4]):
        end = markers[i + 1].start() if i < 3 else len(block)
        options.append(clean(block[marker.end():end]))
    return question, options


def main():
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else SOURCE
    reader = PdfReader(source)
    result = []
    warnings = []

    for paper_id, title, first_page, last_page, expected in PAPERS:
        found = {}
        for page_no in range(first_page, last_page + 1):
            text = reader.pages[page_no - 1].extract_text() or ""
            matches = list(START_RE.finditer(text))
            numbers = []
            for match in matches:
                number = int(match.group(1))
                if 1 <= number <= expected and number not in numbers:
                    numbers.append(number)
            for number in numbers:
                parsed_candidates = [parse_block(block) for block in candidate_blocks(text, matches, number)]
                parsed_candidates = [parsed for parsed in parsed_candidates if parsed]
                if not parsed_candidates:
                    warnings.append(f"{paper_id} Q{number}: could not parse four options (page {page_no})")
                    continue
                question, options = (
                    parsed_candidates[0]
                    if paper_id.startswith("2024-")
                    else max(parsed_candidates, key=lambda parsed: english_quality(*parsed))
                )
                candidate = {
                    "id": f"{paper_id}-q{number}",
                    "paperId": paper_id,
                    "paper": title,
                    "number": number,
                    "question": question,
                    "options": options,
                    "sourcePage": page_no,
                    "_quality": english_quality(question, options),
                }
                if number not in found or (
                    not paper_id.startswith("2024-") and candidate["_quality"] > found[number]["_quality"]
                ):
                    found[number] = candidate
        for number in sorted(set(range(1, expected + 1)) - set(found)):
            manual = MANUAL.get((paper_id, number))
            if manual:
                question, options, source_page = manual
                found[number] = {
                    "id": f"{paper_id}-q{number}",
                    "paperId": paper_id,
                    "paper": title,
                    "number": number,
                    "question": question,
                    "options": options,
                    "sourcePage": source_page,
                    "_quality": 99,
                }
        missing = sorted(set(range(1, expected + 1)) - set(found))
        if missing:
            warnings.append(f"{paper_id}: missing {missing}")
        for number in sorted(found):
            found[number].pop("_quality", None)
            result.append(found[number])
        print(f"{paper_id}: {len(found)}/{expected}")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {len(result)} questions to {OUTPUT}")
    for warning in warnings:
        print("WARNING", warning)


if __name__ == "__main__":
    main()
