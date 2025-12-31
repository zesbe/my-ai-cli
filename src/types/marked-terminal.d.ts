declare module 'marked-terminal' {
  import { MarkedExtension, Renderer } from 'marked';

  interface TerminalRendererOptions {
    code?: (code: string, lang?: string) => string;
    codespan?: (code: string) => string;
    heading?: (text: string, level: number) => string;
    strong?: (text: string) => string;
    em?: (text: string) => string;
    del?: (text: string) => string;
    link?: (href: string, title: string, text: string) => string;
    list?: (body: string, ordered: boolean) => string;
    listitem?: (text: string) => string;
    blockquote?: (text: string) => string;
    hr?: () => string;
    paragraph?: (text: string) => string;
    table?: (header: string, body: string) => string;
    tablerow?: (content: string) => string;
    tablecell?: (content: string, flags: { header?: boolean; align?: string }) => string;
    [key: string]: any;
  }

  class TerminalRenderer extends Renderer {
    constructor(options?: TerminalRendererOptions);
  }

  export default TerminalRenderer;
}
