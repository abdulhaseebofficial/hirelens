import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders model-generated markdown.
 *
 * react-markdown does not render raw HTML unless rehype-raw is added, so CV
 * content cannot inject markup here. Styling lives in the `.markdown` rules
 * in index.css.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
