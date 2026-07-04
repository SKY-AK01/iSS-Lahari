/**
 * QuestionText — renders exam question strings with proper formatting.
 *
 * Handles two patterns that appear in question bank data:
 *  1. Literal \n newlines in the string
 *  2. Numbered statements inline: "...? 1. statement one 2. statement two"
 *     These get split onto their own lines with slight indentation.
 */

interface Props {
  text: string;
  style?: React.CSSProperties;
}

export default function QuestionText({ text, style }: Props) {
  // Split on explicit newlines first, then detect inline numbering
  const segments = parseQuestion(text);

  return (
    <p className="question-text" style={style}>
      {segments.map((seg, i) => (
        <span key={i}>
          {seg.isNumbered ? (
            <span style={{ display: 'block', paddingLeft: '1.5rem', textIndent: '-1.5rem', marginTop: '0.4rem' }}>
              {seg.text}
            </span>
          ) : (
            <>
              {i > 0 && <br />}
              {seg.text}
            </>
          )}
        </span>
      ))}
    </p>
  );
}

interface Segment {
  text: string;
  isNumbered: boolean;
}

function parseQuestion(raw: string): Segment[] {
  // Normalise \n literals (some JSON has \\n) and real newlines
  const normalised = raw.replace(/\\n/g, '\n');

  const result: Segment[] = [];

  // Split on real newlines first
  const lines = normalised.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    // Within each line, detect inline numbered points: "blah blah? 1. point one 2. point two"
    // Pattern: a digit(s) followed by ". " that is NOT at the very start of the segment
    // We split on the boundary just before a number that is preceded by a space
    const parts = splitOnInlineNumbers(line);
    parts.forEach((part, i) => {
      result.push({
        text: part,
        isNumbered: i > 0 && /^\d+\./.test(part),
      });
    });
  }

  return result;
}

function splitOnInlineNumbers(text: string): string[] {
  // Split at positions where: (space)(digit+)(.) pattern appears
  // but only when the number is 1-9 (avoid splitting "100." dates etc.)
  // Lookahead: split BEFORE a single/double digit followed by ". " or end
  const parts = text.split(/(?<=\s)(?=\d{1,2}\.\s)/);
  return parts.map(p => p.trim()).filter(Boolean);
}
