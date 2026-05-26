import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import ReactMarkdown from 'react-markdown';

// Process inline math ($...$) within React children strings
function processInlineMath(children) {
  return Array.isArray(children)
    ? children.flatMap((child, ci) => typeof child === 'string' ? splitInlineMath(child, ci) : [child])
    : typeof children === 'string'
    ? splitInlineMath(children, 0)
    : [children];
}

function splitInlineMath(str, keyPrefix) {
  const parts = [];
  const regex = /\$([^\$\n]+?)\$/g;
  let last = 0, match, i = 0;
  while ((match = regex.exec(str)) !== null) {
    if (match.index > last) parts.push(str.slice(last, match.index));
    parts.push(<InlineMath key={`${keyPrefix}-${i++}`} math={match[1]} />);